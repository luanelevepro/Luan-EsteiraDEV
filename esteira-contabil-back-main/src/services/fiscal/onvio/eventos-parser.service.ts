import { prisma } from '../../prisma';
import { Builder } from 'xml2js';
import {
  OrigemExtracao,
  StatusDocumento,
  TipoDocumento,
  Prisma,
} from '@prisma/client';
import { processarEventosPendentes } from '../sieg/sieg.service';
// import { PerformanceTimer } from '@/utils/performance-timer';
import pLimit from 'p-limit';

/*
 * Tipos comuns
 */
export interface CommonEventoDTO {
  tipoDocumento: 'NFE' | 'CTE' | 'NFSE' | 'NFCE';
  eventoId: string;
  chaveDocumento: string;
  codigoEvento: string;
  descricaoEvento?: string;
  sequencia: number;
  dataEvento: string;
  justificativa?: string;
  protocolo?: string;
  statusRetorno?: string;
  rawXml: string;
}

export interface EventoProcessResult {
  evento: Prisma.fis_evento_dfeCreateInput | null;
  status: 'OK' | 'ORFAO' | 'ERROR';
  error?: string;
  id_documento_dfe?: string;
}

export interface EventoParser {
  supports(xml: any): boolean;
  extract(xml: any, rawXml: string): CommonEventoDTO;
}

/*
 * Parsers específicos
 */
export class NfeEventParser implements EventoParser {
  supports(xml: any) {
    return !!xml.procEventoNFe;
  }
  extract(xml: any, raw: string): CommonEventoDTO {
    const proc = xml.procEventoNFe;
    const evt = proc.evento[0];
    const inf = evt.infEvento[0];
    const ret = proc.retEvento?.[0]?.infEvento?.[0];
    const det = inf.detEvento?.[0];

    return {
      tipoDocumento: 'NFE',
      rawXml: raw,
      eventoId: inf.$.Id,
      chaveDocumento: inf.chNFe[0],
      descricaoEvento: det?.xEvento?.[0] || det?.descEvento?.[0],
      codigoEvento: inf.tpEvento[0],
      sequencia: parseInt(inf.nSeqEvento[0], 10),
      dataEvento: inf.dhEvento[0],
      justificativa: inf.detEvento?.[0]?.xJust?.[0],
      protocolo: ret?.nProt?.[0],
      statusRetorno: ret ? `${ret.cStat[0]}-${ret.xMotivo[0]}` : undefined,
    };
  }
}

export class CteEventParser implements EventoParser {
  supports(xml: any) {
    return !!xml.procEventoCTe;
  }
  extract(xml: any, raw: string): CommonEventoDTO {
    const proc = xml.procEventoCTe;
    const evt = proc.eventoCTe[0];
    const inf = evt.infEvento[0];
    const ret = proc.retEventoCTe?.[0]?.infEvento?.[0];
    const det = inf.detEvento?.[0];
    const descricaoEvento =
      det?.descEvento?.[0] ||
      det?.evCancCTe?.[0]?.descEvento?.[0] ||
      det?.evCTeAutorizadoMDFe?.descEvento?.[0] ||
      det?.evCCeCTe?.[0]?.descEvento?.[0];

    return {
      tipoDocumento: 'CTE',
      rawXml: raw,
      eventoId: inf.$.Id,
      chaveDocumento: inf.chCTe[0],
      codigoEvento: inf.tpEvento[0],
      descricaoEvento: descricaoEvento,
      sequencia: parseInt(inf.nSeqEvento[0], 10),
      dataEvento: inf.dhEvento[0],
      justificativa: inf.detEvento?.[0]?.descEvento?.[0],
      protocolo: ret?.nProt?.[0],
      statusRetorno: ret ? `${ret.cStat[0]}-${ret.xMotivo[0]}` : undefined,
    };
  }
}

/*  NFSe   –  diversos layouts         */
export class NfseEventParser implements EventoParser {
  supports(xml: any) {
    return !!xml.evento && xml.evento.$?.xmlns?.includes('nfse');
  }
  extract(xml: any, raw: string): CommonEventoDTO {
    const evt = xml.evento;
    const inf = evt.infEvento[0];
    const ped = inf.pedRegEvento?.[0]?.infPedReg?.[0];
    const evtTag =
      ped.e101101?.[0] ||
      ped.e101102?.[0] ||
      ped.e101103?.[0] ||
      ped.e101104?.[0];

    const descricaoEvento = evtTag?.xDesc?.[0];

    /* Em algumas prefeituras o código do evento vem como <e101101> … */
    const codEvt = Object.keys(ped).find((k) => k.startsWith('e')) ?? '';
    return {
      tipoDocumento: 'NFSE',
      rawXml: raw,
      eventoId: inf.$.Id,
      chaveDocumento: ped.chNFSe[0],
      descricaoEvento: descricaoEvento,
      codigoEvento: codEvt.substring(1), // remove prefixo "e"
      sequencia: parseInt(inf.nSeqEvento?.[0] ?? ped.nPedRegEvento[0], 10),
      dataEvento: ped.dhEvento[0],
      justificativa: ped[codEvt]?.[0]?.xMotivo?.[0],
      protocolo: undefined,
      statusRetorno: undefined,
    };
  }
}

/*
 * Serviço principal
 */
export class ImportarXmlEventoService {
  private parsers: EventoParser[] = [
    new NfeEventParser(),
    new CteEventParser(),
    new NfseEventParser(),
  ];

  /**
   * Processa um único evento XML e retorna os dados preparados para inserção
   */
  async processXmlData(
    xmlData: any,
    idFisEmpresas: string,
    origemSistema: OrigemExtracao = 'DFE_SIEG',
    dsStatus: StatusDocumento = StatusDocumento.IMPORTADO,
    tipoDocHint?: 'NFE' | 'CTE' | 'NFSE' | 'NFCE'
  ): Promise<EventoProcessResult> {
    // const timer = new PerformanceTimer();
    // timer.start('processXmlData-Evento');

    /* serializa de volta p/ raw XML*/
    const builder = new Builder({ headless: true, renderOpts: { indent: '' } });
    const rawXml = builder.buildObject(xmlData);

    // timer.mark('find-parser');
    /* escolhe o parser*/
    const parser =
      this.parsers.find((p) => p.supports(xmlData)) ??
      this.parsers.find((p) => p instanceof NfeEventParser); // fallback

    if (!parser) {
      return {
        evento: null,
        status: 'ERROR',
        error: 'Nenhum parser de evento reconheceu o XML.',
      };
    }

    // timer.lap('extract-dto');
    const dto = parser.extract(xmlData, rawXml);
    if (tipoDocHint) dto.tipoDocumento = tipoDocHint;

    // timer.lap('prepare-data');
    return this.prepareEventoData(dto, idFisEmpresas, origemSistema, dsStatus);
  }

  /**
   * Processa múltiplos eventos XML e retorna uma lista de dados preparados
   */
  async processMultipleXmlData(
    xmlDataList: any[],
    idFisEmpresas: string,
    origemSistema: OrigemExtracao = 'DFE_SIEG',
    dsStatus: StatusDocumento = StatusDocumento.IMPORTADO,
    tipoDocHint?: 'NFE' | 'CTE' | 'NFSE' | 'NFCE'
  ): Promise<EventoProcessResult[]> {
    // const timer = new PerformanceTimer();
    // timer.start('processMultipleXmlData-Eventos');
    const limit = pLimit(50);
    const results: EventoProcessResult[] = [];
    // Processa múltiplos XMLs em paralelo com limite de concorrência
    const tasks = xmlDataList.map((xmlData) =>
      limit(() =>
        this.processXmlData(
          xmlData,
          idFisEmpresas,
          origemSistema,
          dsStatus,
          tipoDocHint
        )
      )
    );
    const processedResults = await Promise.all(tasks);
    results.push(...processedResults);

    // timer.end();
    return results;
  }

  /**
   * Prepara os dados do evento para inserção no banco
   */
  private async prepareEventoData(
    dto: CommonEventoDTO,
    idFisEmpresas: string,
    origemSistema: OrigemExtracao,
    dsStatus: StatusDocumento
  ): Promise<EventoProcessResult> {
    // const timer = new PerformanceTimer();
    // timer.start('prepareEventoData');

    let fisDocumento: { id: string } | null = null;
    let docDfePai: { id: string } | null = null;

    // timer.mark('find-document');
    if (dto.tipoDocumento === 'NFE') {
      const nfe = await prisma.fis_nfe.findFirst({
        where: { ds_chave: dto.chaveDocumento },
        select: { id: true },
      });
      if (nfe) {
        fisDocumento = await prisma.fis_documento.findFirst({
          where: { id_nfe: nfe.id },
          select: { id: true },
        });
        docDfePai = await prisma.fis_documento_dfe.findFirst({
          where: { id_nfe: nfe.id },
        });
      }
    } else if (dto.tipoDocumento === 'CTE') {
      const cte = await prisma.fis_cte.findFirst({
        where: { ds_chave: dto.chaveDocumento },
        select: { id: true },
      });
      if (cte) {
        fisDocumento = await prisma.fis_documento.findFirst({
          where: { id_cte: cte.id },
          select: { id: true },
        });
        docDfePai = await prisma.fis_documento_dfe.findFirst({
          where: { id_cte: cte.id },
        });
      }
    } else {
      const nfse = await prisma.fis_nfse.findFirst({
        where: { ds_codigo_verificacao: dto.chaveDocumento.slice(-8) },
        select: { id: true },
      });
      if (nfse) {
        fisDocumento = await prisma.fis_documento.findFirst({
          where: { id_nfse: nfse.id },
          select: { id: true },
        });
        docDfePai = await prisma.fis_documento_dfe.findFirst({
          where: { id_nfse: nfse.id },
        });
      }
    }

    // timer.lap('build-evento-data');
    /* quando NÃO existe documento_dfe para vincular*/
    if (!docDfePai) {
      const eventoData: Prisma.fis_evento_dfeCreateInput = {
        ds_raw: dto.rawXml,
        ds_evento_id: dto.eventoId,
        ds_chave_doc: dto.chaveDocumento,
        cd_codigo_evento: dto.codigoEvento,
        ds_descricao_evento: dto.descricaoEvento || '',
        ds_seq_evento: dto.sequencia,
        dt_evento: new Date(dto.dataEvento),
        ds_justificativa_evento: dto.justificativa,
        ds_protocolo: dto.protocolo,
        ds_status_retorno: dto.statusRetorno,
        // será órfão - não vincula com documento_dfe
      };

      // timer.end();
      return {
        evento: eventoData,
        status: 'ORFAO',
        error: 'Documento DFE não localizado para vincular o evento',
      };
    }

    const eventoData: Prisma.fis_evento_dfeCreateInput = {
      ds_raw: dto.rawXml,
      ds_evento_id: dto.eventoId,
      ds_chave_doc: dto.chaveDocumento,
      ds_descricao_evento: dto.descricaoEvento || '',
      cd_codigo_evento: dto.codigoEvento,
      ds_seq_evento: dto.sequencia,
      dt_evento: new Date(dto.dataEvento),
      ds_justificativa_evento: dto.justificativa,
      ds_protocolo: dto.protocolo,
      ds_status_retorno: dto.statusRetorno,
      fis_documento_dfe: { connect: { id: docDfePai.id } },
      ds_situacao_integracao: 'IMPORTADO',
    };

    // timer.end();
    return {
      evento: eventoData,
      status: 'OK',
      id_documento_dfe: docDfePai.id,
    };
  }

  /**
   * Salva uma lista de eventos preparados em lote
   */
  async saveEventosBatch(eventosResults: EventoProcessResult[]): Promise<{
    success: number;
    orphaned: number;
    errors: number;
    eventosIds: string[];
  }> {
    // const timer = new PerformanceTimer();
    // timer.start('saveEventosBatch');

    let success = 0;
    let orphaned = 0;
    let errors = 0;
    const eventosIds: string[] = [];

    // Separar eventos válidos dos órfãos e erros
    const validEventos = eventosResults.filter(
      (r) => r.status === 'OK' && r.evento
    );
    const orphanEventos = eventosResults.filter(
      (r) => r.status === 'ORFAO' && r.evento
    );
    const errorEventos = eventosResults.filter((r) => r.status === 'ERROR');

    // Processar em lotes para melhor performance
    const BATCH_SIZE = 100;

    // Processar eventos válidos
    for (let i = 0; i < validEventos.length; i += BATCH_SIZE) {
      const batch = validEventos.slice(i, i + BATCH_SIZE);

      try {
        // Usar transação para garantir consistência
        await prisma.$transaction(
          async (prisma) => {
            for (const resultado of batch) {
              if (!resultado.evento || !resultado.id_documento_dfe) continue;

              const evento = await prisma.fis_evento_dfe.upsert({
                where: {
                  uniq_raw_evento_por_dfe: {
                    ds_evento_id: resultado.evento.ds_evento_id,
                    id_fis_documento_dfe: resultado.id_documento_dfe,
                  },
                },
                update: {
                  ds_status_retorno: resultado.evento.ds_status_retorno,
                  ds_protocolo: resultado.evento.ds_protocolo,
                  dt_evento: resultado.evento.dt_evento,
                  ds_descricao_evento: resultado.evento.ds_descricao_evento,
                },
                create: resultado.evento,
              });

              eventosIds.push(evento.id);
              success++;
            }
          },
          { timeout: 200000, maxWait: 200000 }
        );
      } catch (error) {
        console.error('Erro ao salvar lote de eventos:', error);
        errors += batch.length;
      }
    }

    // Processar eventos órfãos (usar createMany em lotes para evitar transações longas)
    for (let i = 0; i < orphanEventos.length; i += BATCH_SIZE) {
      const batch = orphanEventos.slice(i, i + BATCH_SIZE);

      try {
        const eventosToCreate = batch
          .filter((r) => r.evento)
          .map((r) => ({
            ds_raw: r.evento.ds_raw,
            ds_evento_id: r.evento.ds_evento_id,
            ds_chave_doc: r.evento.ds_chave_doc,
            cd_codigo_evento: r.evento.cd_codigo_evento,
            ds_descricao_evento: r.evento.ds_descricao_evento,
            ds_seq_evento: r.evento.ds_seq_evento,
            dt_evento: r.evento.dt_evento,
            ds_justificativa_evento: r.evento.ds_justificativa_evento,
            ds_protocolo: r.evento.ds_protocolo,
            ds_status_retorno: r.evento.ds_status_retorno,
            ds_error: 'Documento DFE não localizado para vincular o evento',
            ds_situacao_integracao: r.evento.ds_situacao_integracao,
          }));

        if (eventosToCreate.length) {
          // createMany não retorna IDs e é mais eficiente para inserts em lote
          await prisma.fis_evento_dfe.createMany({
            data: eventosToCreate,
            skipDuplicates: false,
          });
          orphaned += eventosToCreate.length;
        }
      } catch (error) {
        console.error('Erro ao salvar lote de eventos órfãos:', error);
        errors += batch.length;
      }
    }

    errors += errorEventos.length;

    // timer.end();
    return { success, orphaned, errors, eventosIds };
  }
  /**
   * Método para compatibilidade com código existente
   * @deprecated Use processXmlData + saveEventosBatch para melhor performance
   */
  async processAndSaveXmlData(
    xmlData: any,
    idFisEmpresas: string,
    origemSistema: OrigemExtracao = 'DFE_SIEG',
    dsStatus: StatusDocumento = StatusDocumento.IMPORTADO,
    tipoDocHint?: 'NFE' | 'CTE' | 'NFSE'
  ): Promise<{
    status: 'OK' | 'ORFAO' | 'ERROR';
    id_documento_dfe?: string;
    error?: string;
  }> {
    const result = await this.processXmlData(
      xmlData,
      idFisEmpresas,
      origemSistema,
      dsStatus,
      tipoDocHint
    );

    if (result.status === 'ERROR') {
      return {
        status: 'ERROR',
        error: result.error,
      };
    }

    if (!result.evento) {
      return {
        status: 'ERROR',
        error: 'Falha ao preparar dados do evento',
      };
    }

    // Salvar imediatamente para compatibilidade
    try {
      if (result.status === 'ORFAO') {
        const eventoOrfaoData = {
          ds_raw: result.evento.ds_raw,
          ds_evento_id: result.evento.ds_evento_id,
          ds_chave_doc: result.evento.ds_chave_doc,
          cd_codigo_evento: result.evento.cd_codigo_evento,
          ds_descricao_evento: result.evento.ds_descricao_evento,
          ds_seq_evento: result.evento.ds_seq_evento,
          dt_evento: result.evento.dt_evento,
          ds_justificativa_evento: result.evento.ds_justificativa_evento,
          ds_protocolo: result.evento.ds_protocolo,
          ds_status_retorno: result.evento.ds_status_retorno,
          ds_error: 'Documento DFE não localizado para vincular o evento',
          ds_situacao_integracao: result.evento.ds_situacao_integracao,
        };

        await prisma.fis_evento_dfe.create({
          data: eventoOrfaoData,
        });

        return { status: 'ORFAO', id_documento_dfe: undefined };
      }

      if (!result.id_documento_dfe) {
        return {
          status: 'ERROR',
          error: 'ID do documento DFE não encontrado',
        };
      }

      await prisma.fis_evento_dfe.upsert({
        where: {
          uniq_raw_evento_por_dfe: {
            ds_evento_id: result.evento.ds_evento_id,
            id_fis_documento_dfe: result.id_documento_dfe,
          },
        },
        update: {
          ds_status_retorno: result.evento.ds_status_retorno,
          ds_protocolo: result.evento.ds_protocolo,
          dt_evento: result.evento.dt_evento,
          ds_descricao_evento: result.evento.ds_descricao_evento,
        },
        create: result.evento,
      });

      return { status: 'OK', id_documento_dfe: result.id_documento_dfe };
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      return {
        status: 'ERROR',
        error: `Erro ao salvar evento: ${error}`,
      };
    }
  }
}
