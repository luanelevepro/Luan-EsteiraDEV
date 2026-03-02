import pLimit from 'p-limit';
import { prisma } from '@/services/prisma';
import { parseStringPromise } from 'xml2js';
import { ImportarXmlNfseService } from '../onvio/nfse-parser.service';
import { ImportarXmlNfeService as ImportarNfeService } from '../onvio/nfe-parser.service';
import { ImportarXmlCteService as ImportarCteService } from '../onvio/cte-parser.service';
import { getFiscalEmpresa } from '../fiscal-empresa.service';
import { StatusDocumento, StatusExtracao, TipoDocumento } from '@prisma/client';
import { createConsumoIntegracao } from '@/services/administrativo/consumo-integracao.service';
import { ImportarXmlEventoService as ImportarEventoService } from '../onvio/eventos-parser.service';
import {
  createDocumentoHistorico,
  setCtesContra,
  setNfesProcessados,
  setNfesRelacionadasProcessados,
} from '../documento.service';
import { sincronizarDominioNfseByEmpresaId } from '../nota-fiscal.service';
import { sincronizarFornecedoresByEmpresaId } from '../fornecedor.service';
// import { PerformanceTimer } from '../../../utils/performance-timer';

// ----------- Sinc ----------- //
export const sincSiegEntradasDocs = async (
  empresaId: string,
  competencia: string
) => {
  try {
    await Promise.all([
      coletarNfseSieg(empresaId, competencia),
      coletarNfeSieg(empresaId, competencia),
      coletarCteSieg(empresaId, competencia),
    ]);
  } catch {
    throw new Error('[SIEG] erro ao coletar documentos');
  }
};

export const sincSiegSaidasDocs = async (
  empresaId: string,
  competencia: string
) => {
  try {
    await Promise.all([
      coletarNfseSaidaSieg(empresaId, competencia),
      coletarNfeSaidaSieg(empresaId, competencia),
      coletarCteSaidaSieg(empresaId, competencia),
    ]);
  } catch {
    throw new Error('[SIEG] erro ao coletar documentos');
  }
};

// ----------- Helpers ----------- //

const cleanCnpj = (cnpj: string): string => cnpj?.replace(/[^\d]/g, '') ?? '';

async function fetchBaixarXmlsWithRetry(
  apiKey: string,
  payload: any,
  label: string
): Promise<Response> {
  const MAX_ATTEMPTS = 4; // 1 tentativa inicial + 3 retries
  const BASE_DELAY_MS = 2000;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const resp = await fetch(
      `https://api.sieg.com/BaixarXmls?api_key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    // Retry simples para timeouts
    if (resp.status === 504 && attempt + 1 < MAX_ATTEMPTS) {
      const delay = BASE_DELAY_MS;
      console.warn(
        `[SIEG] BaixarXmls retornou 504 (tentativa ${attempt + 1}) em ${label}; retry após ${delay}ms`
      );
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    // Tratamento de 429 (rate limit): respeita Retry-After quando presente
    if (resp.status === 429 && attempt + 1 < MAX_ATTEMPTS) {
      const retryAfterHeader = resp.headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader
        ? Number(retryAfterHeader)
        : undefined;
      const delay =
        retryAfterSeconds && !isNaN(retryAfterSeconds)
          ? Math.max(1000, retryAfterSeconds * 1000)
          : BASE_DELAY_MS * (attempt + 1);

      console.warn(
        `[SIEG] BaixarXmls retornou 429 (tentativa ${attempt + 1}) em ${label}; retry após ${delay}ms`
      );
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    return resp;
  }

  // fallback: deveria ter retornado no loop
  throw new Error(
    `[SIEG] BaixarXmls falhou após ${MAX_ATTEMPTS} tentativas em ${label}`
  );
}

// separador de doc e evento
const splitDocsEventos = (xmlNodes: any[]): { docs: any[]; eventos: any[] } => {
  const docs: any[] = [];
  const eventos: any[] = [];

  for (const node of xmlNodes) {
    // NFe/CTe - consulta de evento sempre vem como <procEventoNFe> ou <procEventoCTe>
    if (node.procEventoNFe || node.procEventoCTe || node.procEventoNFSe) {
      eventos.push(node);
      continue;
    }
    // NF-e autorizada via <NFe>, NFSe via <CompNfse>, CTe via <CTe>, etc.
    docs.push(node);
  }
  return { docs, eventos };
};

// parser de eventos
const eventoImporter = new ImportarEventoService();

// ----------- Coletores ----------- //

// ----------- Entradas ----------- //
export const coletarNfseSieg = async (
  empresaId: string,
  competencia: string // formato "YYYY-MM"
): Promise<{ importedCount: number; importedIds: string[] }> => {
  console.log('[SIEG] iniciar coleta NFSE - Entrada');

  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      ds_documento: true,
      is_escritorio: true,
      id_escritorio: true,
    },
  });
  if (!empresa?.ds_documento) {
    throw new Error(`Empresa ${empresaId} não encontrada ou sem CNPJ.`);
  }
  const cnpjDest = empresa.ds_documento;
  const fisEmp = await getFiscalEmpresa(empresa.id);
  const integracao = await prisma.sis_integracao.findFirst({
    where: { ds_nome: 'SIEG' },
    select: { id: true },
  });

  // busca config da integração pela empresa, senão pelo escritório
  let cfg = await prisma.sis_integracao_config.findFirst({
    where: { id_sis_empresas: empresaId, id_integracao: integracao?.id },
    select: { ds_valores_config: true },
  });
  if (!cfg && !empresa.is_escritorio && empresa.id_escritorio) {
    cfg = await prisma.sis_integracao_config.findFirst({
      where: {
        id_sis_empresas: empresa.id_escritorio!,
        id_integracao: integracao?.id,
      },
      select: { ds_valores_config: true },
    });
  }

  let importedCount = 0;
  const importedIds: string[] = [];
  if (!cfg) return { importedCount, importedIds };

  const apiKey = (cfg.ds_valores_config as Record<string, string>).api_key;
  if (!apiKey) {
    throw new Error(`api_key não configurada para empresa ${empresaId}`);
  }

  const importer = new ImportarXmlNfseService();

  const limit = pLimit(8); // máx. 8 tarefas em paralelo (reduz pico de heap)
  let consumo = 0;
  let consultaEventos = false;
  const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;

  for (let i = 0; i < 2; i++) {
    const take = 50;
    const docDfeBuffer: any[] = [];
    const eventosPendentes: any[] = [];
    let skip = 0;
    // while para manter a procura em casos onde existirem mais de 50 NFSe
    while (true) {
      const payload: any = {
        XmlType: 3,
        Take: take,
        Skip: skip,
        DataEmissaoInicio: `${competencia}-01`,
        DataEmissaoFim: fim,
        Downloadevent: consultaEventos,
        CnpjDest: cnpjDest,
      };

      const resp = await fetchBaixarXmlsWithRetry(
        apiKey,
        payload,
        'NFSe BaixarXmls'
      );
      if (resp.status === 404) {
        break;
      }
      if (!resp.ok) {
        const detail = await resp.text().catch(() => resp.statusText);
        throw new Error(`SIEG NFS-e erro (${resp.status}): ${detail}`);
      }

      let raw: string | null = await resp.text();
      // 1ª camada de parse
      let first: string | null;
      try {
        first = JSON.parse(raw);
      } catch {
        first = raw;
      } finally {
        raw = null;
      }
      // 2ª camada: se veio string contendo um JSON-array
      let arrBase64: string[] = [];
      if (Array.isArray(first)) {
        arrBase64 = first;
      } else if (typeof first === 'string' && first.trim().startsWith('[')) {
        try {
          arrBase64 = JSON.parse(first);
        } catch {
          arrBase64 = [first];
        }
      } else if (typeof first === 'string') {
        arrBase64 = [first];
      }
      first = null;
      if (arrBase64.length === 0) break;
      // processa em paralelo (máx. 50)
      const CHUNK_SIZE = 8;
      for (let j = 0; j < arrBase64.length; j += CHUNK_SIZE) {
        const chunk = arrBase64.slice(j, j + CHUNK_SIZE);
        await Promise.all(
          chunk.map((b64raw) =>
            limit(async () => {
              // console.log(b64raw);
              if (!b64raw || typeof b64raw !== 'string') return;

              let xml: string | null = null;
              let parsed: any = null;
              let lista: any = null;
              let docs: any[] | null = null;
              let eventos: any[] | null = null;
              let saved: Awaited<
                ReturnType<(typeof importer)['processXmlData']>
              > | null = null;
              try {
                try {
                  xml = Buffer.from(b64raw, 'base64').toString('utf-8');
                } catch {
                  console.warn('[SIEG] base64 inválido');
                  return;
                }

                if (xml.trim().startsWith('[')) {
                  try {
                    xml = JSON.parse(xml).join('');
                  } catch {
                    /* mantém xml */
                  }
                }

                try {
                  parsed = await parseStringPromise(xml, {
                    explicitArray: true,
                  });
                } catch {
                  console.warn('[SIEG] XML inválido');
                  return;
                }

                lista = parsed.ConsultarNfseServicoPrestadoResposta
                  ?.ListaNfse?.[0]?.CompNfse ?? [parsed];
                const split = splitDocsEventos(lista);
                docs = split.docs;
                eventos = split.eventos;
                parsed = null;
                lista = null;
                eventosPendentes.push(...(eventos ?? []));
                if (!docs || docs.length === 0) return;

                // console.log(JSON.stringify(xmlData, null, 2)); // debug
                try {
                  saved = await importer['processXmlData'](
                    docs[0],
                    empresaId,
                    'api_sieg',
                    'IMPORTADO',
                    false
                  );
                  importedCount++;
                  importedIds.push(saved.nfse.id);
                  let statusDeImportacao: StatusExtracao = 'INTEGRADO';
                  if (
                    saved.resposta
                      ?.toString()
                      .includes(
                        'Formato XML não suportado (abrasf/siegAPI/sieg/tecnoSpeed).'
                      )
                  ) {
                    docDfeBuffer.push({
                      ds_error: saved.resposta?.toString(),
                      ds_raw: JSON.stringify(docs[0]),
                      ds_situacao_integracao: StatusExtracao.ERRO,
                      ds_origem: 'DFE_SIEG',
                      ds_tipo: 'NFSE',
                    });
                  } else if (
                    saved.resposta
                      ?.toString()
                      .includes(
                        `Nota ${saved.nfse.ds_numero} já existe para esta empresa.`
                      )
                  ) {
                    return;
                  } else if (saved.resposta === null) {
                    const exists = await prisma.fis_nfse.findFirst({
                      where: {
                        id_fis_empresas: fisEmp.id,
                        ds_numero: saved.nfse.ds_numero,
                      },
                    });
                    // if (exists && cancelada) {
                    //   const documentoExists = await prisma.fis_documento.findFirst({
                    //     where: {
                    //       id_nfse: exists.id,
                    //       ds_status: {
                    //         notIn: [
                    //           StatusDocumento.CANCELADO,
                    //           StatusDocumento.CONFERIDO_FISCAL,
                    //           StatusDocumento.DIGITADO_FISCAL,
                    //         ],
                    //       },
                    //     },
                    //   });
                    //   if (documentoExists) {
                    //     await prisma.fis_documento.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //     await prisma.fis_documento_dfe.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //   }
                    // }
                    let nota: any = null;
                    if (!exists) {
                      nota = await prisma.fis_nfse.create({
                        data: { ...saved.nfse },
                      });
                    } else {
                      nota = saved.nfse;
                    }

                    const fornecedor = await prisma.fis_fornecedores.findFirst({
                      where: {
                        id: nota.id_fis_fornecedor,
                      },
                    });
                    const existsDocDfe =
                      await prisma.fis_documento_dfe.findFirst({
                        where: {
                          id_nfse: nota.id,
                        },
                      });
                    if (!existsDocDfe) {
                      docDfeBuffer.push({
                        id_nfse: nota.id,
                        ds_raw: JSON.stringify(docs[0]),
                        ds_error: saved.resposta?.toString() || null,
                        dt_emissao: saved.nfse.dt_emissao,
                        ds_origem: 'DFE_SIEG',
                        ds_documento_emitente: fornecedor.ds_documento,
                        ds_documento_tomador: empresa.ds_documento,
                        ds_situacao_integracao: 'IMPORTADO',
                        ds_tipo: 'NFSE',
                      });
                    } else {
                      // Se origem diferente, salvar em histórico
                      if (existsDocDfe.ds_origem !== 'DFE_SIEG') {
                        await prisma.fis_documento_dfe_historico.create({
                          data: {
                            id_fis_documento_dfe: existsDocDfe.id,
                            ds_raw: JSON.stringify(docs[0]),
                            ds_origem: 'DFE_SIEG',
                            ds_error: null,
                          },
                        });
                        console.log(
                          `[SIEG] NFSe ${nota.ds_numero}: salvo em histórico (origem=${existsDocDfe.ds_origem} → DFE_SIEG)`
                        );
                      }
                      return;
                    }
                    consumo++;
                    importedIds.push(nota.id);
                    nota = null;
                  }
                } catch (e) {
                  console.error('[SIEG] falha na importação:', e);
                }
              } finally {
                // cleanup para permitir GC liberar memória rapidamente
                try {
                  parsed = null;
                  lista = null;
                  if (docs) {
                    docs.length = 0;
                    docs = null;
                  }
                  if (eventos) {
                    eventos.length = 0;
                    eventos = null;
                  }
                  if (saved) {
                    delete saved.nfse;
                    delete saved.documento;
                  }
                  saved = null;
                  xml = null;
                } catch (e) {
                  /* ignore cleanup errors */
                }
              }
            })
          )
        );
        // flush parcial dos buffers para evitar crescimento indefinido
        if (docDfeBuffer.length >= 200) {
          try {
            await prisma.fis_documento_dfe.createMany({
              data: docDfeBuffer.splice(0, docDfeBuffer.length),
              skipDuplicates: true,
            });
          } catch (e) {
            console.error(
              '[SIEG] erro ao gravar lote parcial fis_documento_dfe:',
              e
            );
          }
        }
        if (eventosPendentes.length >= 200) {
          try {
            const eventosChunk = eventosPendentes.splice(
              0,
              eventosPendentes.length
            );
            const eventosResult = await eventoImporter.processMultipleXmlData(
              eventosChunk,
              fisEmp.id,
              'DFE_SIEG',
              'IMPORTADO',
              'NFE'
            );
            await eventoImporter.saveEventosBatch(eventosResult);
          } catch (e) {
            console.error('[SIEG-EVT] falha ao importar evento parcial:', e);
          }
        }
      }

      // for (const xmlEvento of eventosPendentes) {
      //   try {
      //     await eventoImporter.processXmlData(
      //       xmlEvento, // XML do evento
      //       fisEmp.id, // empresa “da casa”
      //       'DFE_SIEG', // origem
      //       'IMPORTADO', // status
      //       'NFSE' // tipo de documento que estamos coletando
      //     );
      //   } catch (e) {
      //     console.error('[SIEG-EVT] falha ao importar evento:', e);
      //   }
      // }
      // fecha loop se < 50
      if (arrBase64.length < take) break;
      skip += take;
      arrBase64.length = 0;
    }
    if (docDfeBuffer.length) {
      try {
        await prisma.fis_documento_dfe.createMany({
          data: docDfeBuffer,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[SIEG] erro ao gravar lote fis_documento_dfe:', e);
      } finally {
        docDfeBuffer.length = 0;
      }
    }
    if (eventosPendentes.length) {
      try {
        const eventosResult = await eventoImporter.processMultipleXmlData(
          eventosPendentes,
          fisEmp.id,
          'DFE_SIEG',
          'IMPORTADO',
          'NFSE'
        );
        await eventoImporter.saveEventosBatch(eventosResult);
      } catch (e) {
        console.error('[SIEG-EVT] falha ao importar evento:', e);
      } finally {
        eventosPendentes.length = 0;
      }
    }
    createConsumoIntegracao({
      empresaId: empresa.id,
      dt_competencia: competencia,
      ds_consumo: consumo,
      ds_tipo_consumo: 'NFSE_SIEG',
      integracaoId: integracao.id,
    });
    consultaEventos = true;
  }
  await inclusaoNfseSieg(empresaId, competencia);
  return { importedCount, importedIds };
};
// ----------- Saídas ----------- //
export const coletarNfseSaidaSieg = async (
  empresaId: string,
  competencia: string // formato "YYYY-MM"
): Promise<{ importedCount: number; importedIds: string[] }> => {
  console.log('[SIEG] iniciar coleta NFSE - Saída');

  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      ds_documento: true,
      is_escritorio: true,
      id_escritorio: true,
    },
  });
  if (!empresa?.ds_documento) {
    throw new Error(`Empresa ${empresaId} não encontrada ou sem CNPJ.`);
  }
  const cnpjDest = cleanCnpj(empresa.ds_documento);
  const fisEmp = await getFiscalEmpresa(empresa.id);
  const integracao = await prisma.sis_integracao.findFirst({
    where: { ds_nome: 'SIEG' },
    select: { id: true },
  });

  // busca config da integração pela empresa, senão pelo escritório
  let cfg = await prisma.sis_integracao_config.findFirst({
    where: { id_sis_empresas: empresaId, id_integracao: integracao?.id },
    select: { ds_valores_config: true },
  });
  if (!cfg && !empresa.is_escritorio && empresa.id_escritorio) {
    cfg = await prisma.sis_integracao_config.findFirst({
      where: {
        id_sis_empresas: empresa.id_escritorio!,
        id_integracao: integracao?.id,
      },
      select: { ds_valores_config: true },
    });
  }

  let importedCount = 0;
  const importedIds: string[] = [];
  if (!cfg) return { importedCount, importedIds };

  const apiKey = (cfg.ds_valores_config as Record<string, string>).api_key;
  if (!apiKey) {
    throw new Error(`api_key não configurada para empresa ${empresaId}`);
  }

  const importer = new ImportarXmlNfseService();

  const limit = pLimit(8); // máx. 8 tarefas em paralelo (reduz pico de heap)
  let consumo = 0;
  // while para manter a procura em casos onde existirem mais de 50 NFSe
  let consultaEventos = false;
  for (let i = 0; i < 2; i++) {
    const take = 50;
    const docDfeBuffer: any[] = [];
    const eventosPendentes: any[] = [];
    let skip = 0;
    while (true) {
      const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
      const ano = Number(anoStr);
      const mes = Number(mesStr);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;

      const payload: any = {
        XmlType: 3,
        Take: take,
        Skip: skip,
        DataEmissaoInicio: `${competencia}-01`,
        DataEmissaoFim: fim,
        Downloadevent: consultaEventos,
        CnpjEmit: cnpjDest,
      };

      const resp = await fetchBaixarXmlsWithRetry(
        apiKey,
        payload,
        'NFSe Saída BaixarXmls'
      );
      if (resp.status === 404) {
        break;
      }
      if (!resp.ok) {
        const detail = await resp.text().catch(() => resp.statusText);
        throw new Error(`SIEG NFS-e erro (${resp.status}): ${detail}`);
      }

      let raw = await resp.text();
      // 1ª camada de parse
      let first: any;
      try {
        first = JSON.parse(raw);
      } catch {
        first = raw;
      } finally {
        raw = null;
      }
      // 2ª camada: se veio string contendo um JSON-array
      let arrBase64: string[] = [];
      if (Array.isArray(first)) {
        arrBase64 = first;
      } else if (typeof first === 'string' && first.trim().startsWith('[')) {
        try {
          arrBase64 = JSON.parse(first);
        } catch {
          arrBase64 = [first];
        }
      } else if (typeof first === 'string') {
        arrBase64 = [first];
      }
      first = null;
      if (arrBase64.length === 0) break;
      // processa em paralelo (máx. 8)
      const CHUNK_SIZE = 8;
      for (let j = 0; j < arrBase64.length; j += CHUNK_SIZE) {
        const chunk = arrBase64.slice(j, j + CHUNK_SIZE);
        await Promise.all(
          chunk.map((b64raw) =>
            limit(async () => {
              // console.log(b64raw);
              if (!b64raw || typeof b64raw !== 'string') return;

              let xml: string | null = null;
              let parsed: any = null;
              let lista: any = null;
              let docs: any[] | null = null;
              let eventos: any[] | null = null;
              let saved: Awaited<
                ReturnType<(typeof importer)['processXmlData']>
              > | null = null;
              try {
                xml = Buffer.from(b64raw, 'base64').toString('utf-8');
              } catch {
                console.warn('[SIEG] base64 inválido');
                return;
              }

              if (xml.trim().startsWith('[')) {
                try {
                  xml = JSON.parse(xml).join('');
                } catch {
                  /* mantém xml */
                }
              }
              try {
                try {
                  parsed = await parseStringPromise(xml, {
                    explicitArray: true,
                  });
                } catch {
                  console.warn('[SIEG] XML inválido');
                  return;
                }

                lista = parsed.ConsultarNfseServicoPrestadoResposta
                  ?.ListaNfse?.[0]?.CompNfse ?? [parsed];
                const split = splitDocsEventos(lista);
                docs = split.docs;
                eventos = split.eventos;
                parsed = null;
                lista = null;
                eventosPendentes.push(...(eventos ?? []));
                if (!docs || docs.length === 0) return;

                // console.log(JSON.stringify(xmlData, null, 2)); // debug
                try {
                  saved = await importer['processXmlData'](
                    docs[0],
                    empresaId,
                    'api_sieg',
                    'IMPORTADO',
                    true
                  );
                  importedCount++;
                  // importedIds.push(saved.nfse.id);
                  if (
                    saved.resposta
                      ?.toString()
                      .includes(
                        'Formato XML não suportado (abrasf/siegAPI/sieg/tecnoSpeed).'
                      )
                  ) {
                    docDfeBuffer.push({
                      ds_error: saved.resposta?.toString(),
                      ds_raw: JSON.stringify(docs[0]),
                      ds_situacao_integracao: StatusExtracao.ERRO,
                      ds_origem: 'DFE_SIEG',
                      ds_tipo: 'NFSE',
                    });
                  } else if (
                    saved.resposta
                      ?.toString()
                      .includes(
                        `Nota ${saved.nfse.ds_numero} já existe para esta empresa.`
                      )
                  ) {
                    return;
                  } else if (saved.resposta === null) {
                    const exists = await prisma.fis_nfse.findFirst({
                      where: {
                        id_fis_empresas: fisEmp.id,
                        ds_numero: saved.nfse.ds_numero,
                      },
                    });
                    // if (exists && cancelada) {
                    //   const documentoExists = await prisma.fis_documento.findFirst({
                    //     where: {
                    //       id_nfse: exists.id,
                    //       ds_status: {
                    //         notIn: [
                    //           StatusDocumento.CANCELADO,
                    //           StatusDocumento.CONFERIDO_FISCAL,
                    //           StatusDocumento.DIGITADO_FISCAL,
                    //         ],
                    //       },
                    //     },
                    //   });
                    //   if (documentoExists) {
                    //     await prisma.fis_documento.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //     await prisma.fis_documento_dfe.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //   }
                    // }
                    let nota: any = null;
                    if (!exists) {
                      nota = await prisma.fis_nfse.create({
                        data: { ...saved.nfse },
                      });
                    } else {
                      nota = saved.nfse;
                    }
                    const existsDocDfe =
                      await prisma.fis_documento_dfe.findFirst({
                        where: {
                          id_nfse: nota.id,
                        },
                      });
                    if (!existsDocDfe) {
                      docDfeBuffer.push({
                        id_nfse: nota.id,
                        ds_raw: JSON.stringify(docs[0]),
                        ds_error: saved.resposta?.toString() || null,
                        dt_emissao: saved.nfse.dt_emissao,
                        ds_origem: 'DFE_SIEG',
                        ds_documento_emitente: empresa.ds_documento,
                        ds_documento_tomador: nota.ds_documento_tomador,
                        ds_situacao_integracao: 'IMPORTADO',
                        ds_tipo: 'NFSE',
                      });
                    } else {
                      // Se origem diferente, salvar em histórico
                      if (existsDocDfe.ds_origem !== 'DFE_SIEG') {
                        await prisma.fis_documento_dfe_historico.create({
                          data: {
                            id_fis_documento_dfe: existsDocDfe.id,
                            ds_raw: JSON.stringify(docs[0]),
                            ds_origem: 'DFE_SIEG',
                            ds_error: null,
                          },
                        });
                        console.log(
                          `[SIEG] NFSe ${nota.ds_numero}: salvo em histórico (origem=${existsDocDfe.ds_origem} → DFE_SIEG)`
                        );
                      }
                      return;
                    }
                    consumo++;
                    importedIds.push(nota.id);
                    nota = null;
                  }
                } catch (e) {
                  console.error('[SIEG] falha na importação:', e);
                }
              } finally {
                // cleanup para permitir GC liberar memória rapidamente
                try {
                  parsed = null;
                  lista = null;
                  if (docs) {
                    docs.length = 0;
                    docs = null;
                  }
                  if (eventos) {
                    eventos.length = 0;
                    eventos = null;
                  }
                  if (saved) {
                    delete saved.nfse;
                    delete saved.documento;
                  }
                  saved = null;
                  xml = null;
                } catch (e) {
                  /* ignore cleanup errors */
                }
              }
            })
          )
        );
        // flush parcial dos buffers para evitar crescimento indefinido
        if (docDfeBuffer.length >= 200) {
          try {
            await prisma.fis_documento_dfe.createMany({
              data: docDfeBuffer.splice(0, docDfeBuffer.length),
              skipDuplicates: true,
            });
          } catch (e) {
            console.error(
              '[SIEG] erro ao gravar lote parcial fis_documento_dfe:',
              e
            );
          }
        }
        if (eventosPendentes.length >= 200) {
          try {
            const eventosChunk = eventosPendentes.splice(
              0,
              eventosPendentes.length
            );
            const eventosResult = await eventoImporter.processMultipleXmlData(
              eventosChunk,
              fisEmp.id,
              'DFE_SIEG',
              'IMPORTADO',
              'NFE'
            );
            await eventoImporter.saveEventosBatch(eventosResult);
          } catch (e) {
            console.error('[SIEG-EVT] falha ao importar evento parcial:', e);
          }
        }
      }
      // garantir que o array externo seja esvaziado após processar
      // for (const xmlEvento of eventosPendentes) {
      //   try {
      //     await eventoImporter.processXmlData(
      //       xmlEvento, // XML do evento
      //       fisEmp.id, // empresa “da casa”
      //       'DFE_SIEG', // origem
      //       'IMPORTADO', // status
      //       'NFSE' // tipo de documento que estamos coletando
      //     );
      //   } catch (e) {
      //     console.error('[SIEG-EVT] falha ao importar evento:', e);
      //   }
      // }
      // fecha loop se < 50
      if (arrBase64.length < take) break;
      skip += take;
      arrBase64.length = 0;
    }
    if (docDfeBuffer.length) {
      try {
        await prisma.fis_documento_dfe.createMany({
          data: docDfeBuffer,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[SIEG] erro ao gravar lote fis_documento_dfe:', e);
      } finally {
        docDfeBuffer.length = 0;
      }
    }
    if (eventosPendentes.length) {
      try {
        const eventosResult = await eventoImporter.processMultipleXmlData(
          eventosPendentes,
          fisEmp.id,
          'DFE_SIEG',
          'IMPORTADO',
          'NFSE'
        );
        await eventoImporter.saveEventosBatch(eventosResult);
      } catch (e) {
        console.error('[SIEG-EVT] falha ao importar evento:', e);
      } finally {
        eventosPendentes.length = 0;
      }
    }
    createConsumoIntegracao({
      empresaId: empresa.id,
      dt_competencia: competencia,
      ds_consumo: consumo,
      ds_tipo_consumo: 'NFSE_SIEG',
      integracaoId: integracao.id,
    });
    consultaEventos = true; // na 2ª iteração, consulta eventos pendentes
  }
  await inclusaoNfseSieg(empresaId, competencia);
  return { importedCount, importedIds };
};

// ----------- Coleta NFE ----------- //

// ----------- Entradas ----------- //
export const coletarNfeSieg = async (
  empresaId: string,
  competencia: string // formato "YYYY-MM"
): Promise<{ importedCount: number; importedIds: string[] }> => {
  // const timer = new PerformanceTimer();
  // timer.start(`coletarNfeSieg ${empresaId} ${competencia}`);

  console.log('[SIEG] iniciar coleta NFE - Entrada');

  // timer.mark('setup-empresa');
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      ds_documento: true,
      is_escritorio: true,
      id_escritorio: true,
    },
  });
  if (!empresa?.ds_documento) {
    throw new Error(`Empresa ${empresaId} não encontrada ou sem CNPJ.`);
  }
  const cnpjDest = cleanCnpj(empresa.ds_documento);
  const fisEmp = await getFiscalEmpresa(empresa.id);
  const integracao = await prisma.sis_integracao.findFirst({
    where: { ds_nome: 'SIEG' },
    select: { id: true },
  });

  // busca config da integração pela empresa, senão pelo escritório
  let cfg = await prisma.sis_integracao_config.findFirst({
    where: { id_sis_empresas: empresaId, id_integracao: integracao?.id },
    select: { ds_valores_config: true },
  });
  if (!cfg && !empresa.is_escritorio && empresa.id_escritorio) {
    cfg = await prisma.sis_integracao_config.findFirst({
      where: {
        id_sis_empresas: empresa.id_escritorio!,
        id_integracao: integracao?.id,
      },
      select: { ds_valores_config: true },
    });
  }

  let importedCount = 0;
  const importedIds: string[] = [];
  if (!cfg) return { importedCount, importedIds };

  const apiKey = (cfg.ds_valores_config as Record<string, string>).api_key;
  if (!apiKey) {
    throw new Error(`api_key não configurada para empresa ${empresaId}`);
  }

  // timer.lap('create-importer');
  const importer = new ImportarNfeService();

  const limit = pLimit(8); // máx. 8 tarefas em paralelo (reduz pico de heap)
  let consumo = 0;
  // while para manter a procura em casos onde existirem mais de 50 NFSe
  let consultaEventos = false;

  // timer.lap('inicio-loops');
  for (let i = 0; i < 2; i++) {
    const take = 50;
    const docDfeBuffer: any[] = [];
    const eventosPendentes: any[] = [];
    let skip = 0;
    while (true) {
      const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
      const ano = Number(anoStr);
      const mes = Number(mesStr);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;

      const payload: any = {
        XmlType: 1,
        Take: take,
        Skip: skip,
        DataEmissaoInicio: `${competencia}-01`,
        DataEmissaoFim: fim,
        Downloadevent: consultaEventos,
        CnpjDest: cnpjDest,
      };

      // timer.mark(`loop-${i}-req-${skip}`);

      // const requestStart = performance.now();
      const resp = await fetchBaixarXmlsWithRetry(
        apiKey,
        payload,
        'NFe BaixarXmls'
      );
      // const requestEnd = performance.now();
      // timer.lap(`loop-${i}-response-${skip}`);

      if (resp.status === 404) {
        break;
      }
      if (!resp.ok) {
        const detail = await resp.text().catch(() => resp.statusText);
        throw new Error(`SIEG NF-e erro (${resp.status}): ${detail}`);
      }

      let raw = await resp.text();
      // 1ª camada de parse
      let first: any;
      try {
        first = JSON.parse(raw);
      } catch {
        first = raw;
      } finally {
        raw = null;
      }
      // 2ª camada: se veio string contendo um JSON-array
      let arrBase64: string[] = [];
      if (Array.isArray(first)) {
        arrBase64 = first;
      } else if (typeof first === 'string' && first.trim().startsWith('[')) {
        try {
          arrBase64 = JSON.parse(first);
        } catch {
          arrBase64 = [first];
        }
      } else if (typeof first === 'string') {
        arrBase64 = [first];
      }
      first = null;
      if (arrBase64.length === 0) break;

      // timer.mark(`loop-${i}-parallel-start-${skip}`);
      // processa em paralelo, mas em chunks para evitar criação de um grande array de promises
      const CHUNK_SIZE = 8;
      for (let j = 0; j < arrBase64.length; j += CHUNK_SIZE) {
        const chunk = arrBase64.slice(j, j + CHUNK_SIZE);
        await Promise.all(
          chunk.map((b64raw) =>
            limit(async () => {
              if (!b64raw || typeof b64raw !== 'string') return;

              let xml: string | null = null;
              let parsed: any = null;
              let lista: any = null;
              let docs: any[] | null = null;
              let eventos: any[] | null = null;
              let saved: Awaited<
                ReturnType<(typeof importer)['processXmlData']>
              > | null = null;
              try {
                try {
                  xml = Buffer.from(b64raw, 'base64').toString('utf-8');
                } catch {
                  console.warn('[SIEG] base64 inválido');
                  return;
                }

                if (xml.trim().startsWith('[')) {
                  try {
                    xml = JSON.parse(xml).join('');
                  } catch {
                    /* mantém xml */
                  }
                }

                try {
                  parsed = await parseStringPromise(xml, {
                    explicitArray: true,
                  });
                } catch {
                  console.warn('[SIEG] XML inválido');
                  return;
                }

                lista = parsed.ConsultarNfseServicoPrestadoResposta
                  ?.ListaNfse?.[0]?.CompNfse ?? [parsed];
                const split = splitDocsEventos(lista);
                docs = split.docs;
                eventos = split.eventos;
                parsed = null;
                lista = null;
                eventosPendentes.push(...(eventos ?? []));
                if (!docs || docs.length === 0) return;
                // console.log(JSON.stringify(docs, null, 2)); // debug
                try {
                  saved = await importer['processXmlData'](docs[0], 'api_sieg');
                  importedCount++;
                  if (
                    saved.resposta
                      ?.toString()
                      .includes('Formato XML de NFe não suportado')
                  ) {
                    docDfeBuffer.push({
                      ds_error: saved.resposta?.toString(),
                      ds_raw: JSON.stringify(docs[0]),
                      ds_situacao_integracao: StatusExtracao.ERRO,
                      ds_origem: 'DFE_SIEG',
                      ds_tipo: 'NFE',
                    });
                  } else if (
                    saved.resposta?.toString().includes(`NFe já importada`) ||
                    saved.resposta
                      ?.toString()
                      .includes(`NFe existente teve vínculo atualizado`)
                  ) {
                    const existsDocDfe =
                      await prisma.fis_documento_dfe.findFirst({
                        where: {
                          id_nfe: saved.nfe.id,
                        },
                      });
                    if (!existsDocDfe) {
                      docDfeBuffer.push({
                        id_nfe: saved.nfe.id,
                        ds_raw: JSON.stringify(docs[0]),
                        ds_error: saved.resposta?.toString() || null,
                        dt_emissao: saved.nfe.dt_emissao,
                        ds_origem: 'DFE_SIEG',
                        ds_documento_emitente: saved.nfe.ds_documento_emitente,
                        ds_documento_destinatario: empresa.ds_documento,
                        ds_documento_transportador:
                          saved.nfe.ds_documento_transportador,
                        ds_situacao_integracao: 'IMPORTADO',
                        ds_tipo: 'NFE',
                      });
                    } else {
                      if (existsDocDfe.ds_origem !== 'DFE_SIEG') {
                        await prisma.fis_documento_dfe_historico.create({
                          data: {
                            id_fis_documento_dfe: existsDocDfe.id,
                            ds_raw: JSON.stringify(docs[0]),
                            ds_origem: 'DFE_SIEG',
                            ds_error: null,
                          },
                        });
                        console.log(
                          `[SIEG] NFe ${saved.nfe.ds_chave}: salvo em histórico (origem=${existsDocDfe.ds_origem} → DFE_SIEG)`
                        );
                      }
                      return;
                    }
                  } else if (saved.resposta === null) {
                    const exists = await prisma.fis_nfe.findFirst({
                      where: {
                        id_fis_empresa_destinatario: fisEmp.id,
                        ds_chave: saved.nfe.ds_chave,
                      },
                    });
                    let nota: any = null;
                    if (!exists) {
                      const dataToCreate: any = { ...saved.nfe };
                      // evita colisão caso venha id de reconstrução anterior
                      delete dataToCreate.id;

                      nota = await prisma.fis_nfe.create({
                        data: dataToCreate,
                      });
                    } else {
                      nota = saved.nfe;
                    }

                    const existsDocDfe =
                      await prisma.fis_documento_dfe.findFirst({
                        where: {
                          id_nfe: nota.id,
                        },
                      });
                    if (!existsDocDfe) {
                      docDfeBuffer.push({
                        id_nfe: nota.id,
                        ds_raw: JSON.stringify(docs[0]),
                        ds_error: saved.resposta?.toString() || null,
                        dt_emissao: saved.nfe.dt_emissao,
                        ds_origem: 'DFE_SIEG',
                        ds_documento_emitente: nota.ds_documento_emitente,
                        ds_documento_destinatario: empresa.ds_documento,
                        ds_documento_transportador:
                          nota.ds_documento_transportador,
                        ds_situacao_integracao: 'IMPORTADO',
                        ds_tipo: 'NFE',
                      });
                    } else {
                      if (existsDocDfe.ds_origem !== 'DFE_SIEG') {
                        await prisma.fis_documento_dfe_historico.create({
                          data: {
                            id_fis_documento_dfe: existsDocDfe.id,
                            ds_raw: JSON.stringify(docs[0]),
                            ds_origem: 'DFE_SIEG',
                            ds_error: null,
                          },
                        });
                        console.log(
                          `[SIEG] NFe ${nota.ds_chave}: salvo em histórico (origem=${existsDocDfe.ds_origem} → DFE_SIEG)`
                        );
                      }
                      return;
                    }
                    consumo++;
                    importedIds.push(nota.id);
                    nota = null;
                  }
                } catch (e) {
                  console.error('[SIEG] falha na importação:', e);
                }
              } finally {
                // cleanup para permitir GC liberar memória rapidamente
                try {
                  parsed = null;
                  lista = null;
                  if (docs) {
                    docs.length = 0;
                    docs = null;
                  }
                  if (eventos) {
                    eventos.length = 0;
                    eventos = null;
                  }
                  if (saved) {
                    delete saved.nfe;
                  }
                  saved = null;
                  xml = null;
                } catch (e) {
                  /* ignore cleanup errors */
                }
              }
            })
          )
        );

        // flush parcial dos buffers para evitar crescimento indefinido
        if (docDfeBuffer.length >= 200) {
          try {
            await prisma.fis_documento_dfe.createMany({
              data: docDfeBuffer.splice(0, docDfeBuffer.length),
              skipDuplicates: true,
            });
          } catch (e) {
            console.error(
              '[SIEG] erro ao gravar lote parcial fis_documento_dfe:',
              e
            );
          }
        }
        if (eventosPendentes.length >= 200) {
          try {
            const eventosChunk = eventosPendentes.splice(
              0,
              eventosPendentes.length
            );
            const eventosResult = await eventoImporter.processMultipleXmlData(
              eventosChunk,
              fisEmp.id,
              'DFE_SIEG',
              'IMPORTADO',
              'NFE'
            );
            await eventoImporter.saveEventosBatch(eventosResult);
          } catch (e) {
            console.error('[SIEG-EVT] falha ao importar evento parcial:', e);
          }
        }
      }
      // timer.lap(`loop-${i}-parallel-complete-${skip}`);
      // for (const xmlEvento of eventosPendentes) {
      //   try {
      //     await eventoImporter.processXmlData(
      //       xmlEvento, // XML do evento
      //       fisEmp.id, // empresa “da casa”
      //       'DFE_SIEG', // origem
      //       'IMPORTADO', // status
      //       'NFE' // tipo de documento que estamos coletando
      //     );
      //   } catch (e) {
      //     console.error('[SIEG-EVT] falha ao importar evento:', e);
      //   }
      // }
      // fecha loop se < 50
      if (arrBase64.length < take) {
        break;
      }
      skip += take;
      arrBase64.length = 0;
    }
    if (docDfeBuffer.length) {
      try {
        await prisma.fis_documento_dfe.createMany({
          data: docDfeBuffer,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[SIEG] erro ao gravar lote:', e);
      } finally {
        docDfeBuffer.length = 0;
      }
    }
    if (eventosPendentes.length) {
      try {
        const eventosResult = await eventoImporter.processMultipleXmlData(
          eventosPendentes,
          fisEmp.id,
          'DFE_SIEG',
          'IMPORTADO',
          'NFE'
        );
        await eventoImporter.saveEventosBatch(eventosResult);
      } catch (e) {
        console.error('[SIEG-EVT] falha ao importar evento:', e);
      } finally {
        eventosPendentes.length = 0;
      }
    }
    createConsumoIntegracao({
      empresaId: empresa.id,
      dt_competencia: competencia,
      ds_consumo: consumo,
      ds_tipo_consumo: 'NFE_SIEG',
      integracaoId: integracao.id,
    });
    consultaEventos = true;
  }
  await inclusaoNfeSieg(empresaId);
  setNfesProcessados({ empresaId: empresaId, competencia: competencia });
  setNfesRelacionadasProcessados({
    empresaId: empresaId,
    competencia: competencia,
  });
  // timer.end('coletarNfeSieg-total');
  return { importedCount, importedIds };
};
// ----------- Saídas ----------- //
export const coletarNfeSaidaSieg = async (
  empresaId: string,
  competencia: string // formato "YYYY-MM"
): Promise<{ importedCount: number; importedIds: string[] }> => {
  console.log('[SIEG] iniciar coleta NFE - Saída');

  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      ds_documento: true,
      is_escritorio: true,
      id_escritorio: true,
    },
  });
  if (!empresa?.ds_documento) {
    throw new Error(`Empresa ${empresaId} não encontrada ou sem CNPJ.`);
  }
  const cnpjDest = cleanCnpj(empresa.ds_documento);
  const fisEmp = await getFiscalEmpresa(empresa.id);
  const integracao = await prisma.sis_integracao.findFirst({
    where: { ds_nome: 'SIEG' },
    select: { id: true },
  });

  // busca config da integração pela empresa, senão pelo escritório
  let cfg = await prisma.sis_integracao_config.findFirst({
    where: { id_sis_empresas: empresaId, id_integracao: integracao?.id },
    select: { ds_valores_config: true },
  });
  if (!cfg && !empresa.is_escritorio && empresa.id_escritorio) {
    cfg = await prisma.sis_integracao_config.findFirst({
      where: {
        id_sis_empresas: empresa.id_escritorio!,
        id_integracao: integracao?.id,
      },
      select: { ds_valores_config: true },
    });
  }

  let importedCount = 0;
  const importedIds: string[] = [];
  if (!cfg) return { importedCount, importedIds };

  const apiKey = (cfg.ds_valores_config as Record<string, string>).api_key;
  if (!apiKey) {
    throw new Error(`api_key não configurada para empresa ${empresaId}`);
  }

  const importer = new ImportarNfeService();

  const limit = pLimit(8); // máx. 8 tarefas em paralelo (reduz pico de heap)
  let consumo = 0;
  let consultaEventos = false;
  for (let i = 0; i < 2; i++) {
    const take = 50;
    const docDfeBuffer: any[] = [];
    const eventosPendentes: any[] = [];
    let skip = 0;
    // while para manter a procura em casos onde existirem mais de 50 NFSe
    while (true) {
      const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
      const ano = Number(anoStr);
      const mes = Number(mesStr);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;

      const payload: any = {
        XmlType: 1,
        Take: take,
        Skip: skip,
        DataEmissaoInicio: `${competencia}-01`,
        DataEmissaoFim: fim,
        Downloadevent: consultaEventos,
        CnpjEmit: cnpjDest,
      };

      const resp = await fetchBaixarXmlsWithRetry(
        apiKey,
        payload,
        'NFe Saída BaixarXmls'
      );
      if (resp.status === 404) {
        break;
      }
      if (!resp.ok) {
        const detail = await resp.text().catch(() => resp.statusText);
        throw new Error(`SIEG NF-e erro (${resp.status}): ${detail}`);
      }

      let raw = await resp.text();
      // 1ª camada de parse
      let first: any;
      try {
        first = JSON.parse(raw);
      } catch {
        first = raw;
      } finally {
        raw = null;
      }
      // 2ª camada: se veio string contendo um JSON-array
      let arrBase64: string[] = [];
      if (Array.isArray(first)) {
        arrBase64 = first;
      } else if (typeof first === 'string' && first.trim().startsWith('[')) {
        try {
          arrBase64 = JSON.parse(first);
        } catch {
          arrBase64 = [first];
        }
      } else if (typeof first === 'string') {
        arrBase64 = [first];
      }
      first = null;
      if (arrBase64.length === 0) break;
      // processa em paralelo (máx. 8)
      const CHUNK_SIZE = 8;
      for (let j = 0; j < arrBase64.length; j += CHUNK_SIZE) {
        const chunk = arrBase64.slice(j, j + CHUNK_SIZE);
        await Promise.all(
          chunk.map((b64raw) =>
            limit(async () => {
              // console.log(b64raw);
              if (!b64raw || typeof b64raw !== 'string') return;

              let xml: string | null = null;
              let parsed: any = null;
              let lista: any = null;
              let docs: any[] | null = null;
              let eventos: any[] | null = null;
              let saved: Awaited<
                ReturnType<(typeof importer)['processXmlData']>
              > | null = null;
              try {
                try {
                  xml = Buffer.from(b64raw, 'base64').toString('utf-8');
                } catch {
                  console.warn('[SIEG] base64 inválido');
                  return;
                }

                if (xml.trim().startsWith('[')) {
                  try {
                    xml = JSON.parse(xml).join('');
                  } catch {
                    /* mantém xml */
                  }
                }

                try {
                  parsed = await parseStringPromise(xml, {
                    explicitArray: true,
                  });
                } catch {
                  console.warn('[SIEG] XML inválido');
                  return;
                }

                lista = parsed.ConsultarNfseServicoPrestadoResposta
                  ?.ListaNfse?.[0]?.CompNfse ?? [parsed];
                const split = splitDocsEventos(lista);
                docs = split.docs;
                eventos = split.eventos;
                parsed = null;
                lista = null;
                eventosPendentes.push(...(eventos ?? []));
                if (!docs || docs.length === 0) return;
                // console.log(JSON.stringify(xmlData, null, 2)); // debug
                try {
                  const saved = await importer['processXmlData'](
                    docs[0],
                    'api_sieg'
                  );
                  importedCount++;
                  // importedIds.push(saved.nfe.id);
                  let statusDeImportacao: StatusExtracao = 'INTEGRADO';
                  if (
                    saved.resposta
                      ?.toString()
                      .includes('Formato XML de NFe não suportado')
                  ) {
                    docDfeBuffer.push({
                      ds_error: saved.resposta?.toString(),
                      ds_raw: JSON.stringify(docs[0]),
                      ds_situacao_integracao: StatusExtracao.ERRO,
                      ds_origem: 'DFE_SIEG',
                      ds_tipo: 'NFE',
                    });
                  } else if (
                    saved.resposta?.toString().includes(`NFe já importada`) ||
                    saved.resposta
                      ?.toString()
                      .includes(`NFe existente teve vínculo atualizado`)
                  ) {
                    return;
                  } else if (saved.resposta === null) {
                    const exists = await prisma.fis_nfe.findFirst({
                      where: {
                        id_fis_empresa_emitente: fisEmp.id,
                        ds_chave: saved.nfe.ds_chave,
                      },
                    });
                    // if (exists && cancelada) {
                    //   const documentoExists = await prisma.fis_documento.findFirst({
                    //     where: {
                    //       id_nfse: exists.id,
                    //       ds_status: {
                    //         notIn: [
                    //           StatusDocumento.CANCELADO,
                    //           StatusDocumento.CONFERIDO_FISCAL,
                    //           StatusDocumento.DIGITADO_FISCAL,
                    //         ],
                    //       },
                    //     },
                    //   });
                    //   if (documentoExists) {
                    //     await prisma.fis_documento.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //     await prisma.fis_documento_dfe.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //   }
                    // }
                    let nota: any = null;
                    if (!exists) {
                      nota = await prisma.fis_nfe.create({
                        data: { ...saved.nfe },
                      });
                    } else {
                      nota = saved.nfe;
                    }

                    const existsDocDfe =
                      await prisma.fis_documento_dfe.findFirst({
                        where: {
                          id_nfe: nota.id,
                        },
                      });
                    if (!existsDocDfe) {
                      docDfeBuffer.push({
                        id_nfe: nota.id,
                        ds_raw: JSON.stringify(docs[0]),
                        ds_error: saved.resposta?.toString() || null,
                        dt_emissao: saved.nfe.dt_emissao,
                        ds_origem: 'DFE_SIEG',
                        ds_documento_emitente: empresa.ds_documento,
                        ds_documento_destinatario:
                          nota.ds_documento_destinatario,
                        ds_documento_transportador:
                          nota.ds_documento_transportador,
                        ds_situacao_integracao: 'IMPORTADO',
                        ds_tipo: 'NFE',
                      });
                    } else {
                      if (existsDocDfe.ds_origem !== 'DFE_SIEG') {
                        await prisma.fis_documento_dfe_historico.create({
                          data: {
                            id_fis_documento_dfe: existsDocDfe.id,
                            ds_raw: JSON.stringify(docs[0]),
                            ds_origem: 'DFE_SIEG',
                            ds_error: null,
                          },
                        });
                        console.log(
                          `[SIEG] NFe ${nota.ds_chave}: salvo em histórico (origem=${existsDocDfe.ds_origem} → DFE_SIEG)`
                        );
                      }
                      return;
                    }
                    consumo++;
                    importedIds.push(nota.id);
                    nota = null;
                  }
                  // console.log(saved);
                  // console.log(saved.nfe.fis_nfe_itens);
                } catch (e) {
                  console.error('[SIEG] falha na importação:', e);
                }
              } finally {
                // cleanup para permitir GC liberar memória rapidamente
                try {
                  parsed = null;
                  lista = null;
                  if (docs) {
                    docs.length = 0;
                    docs = null;
                  }
                  if (eventos) {
                    eventos.length = 0;
                    eventos = null;
                  }
                  if (saved) {
                    delete saved.nfe;
                  }
                  saved = null;
                  xml = null;
                } catch (e) {
                  /* ignore cleanup errors */
                }
              }
            })
          )
        );
        // flush parcial dos buffers para evitar crescimento indefinido
        if (docDfeBuffer.length >= 200) {
          try {
            await prisma.fis_documento_dfe.createMany({
              data: docDfeBuffer.splice(0, docDfeBuffer.length),
              skipDuplicates: true,
            });
          } catch (e) {
            console.error(
              '[SIEG] erro ao gravar lote parcial fis_documento_dfe:',
              e
            );
          }
        }
        if (eventosPendentes.length >= 200) {
          try {
            const eventosChunk = eventosPendentes.splice(
              0,
              eventosPendentes.length
            );
            const eventosResult = await eventoImporter.processMultipleXmlData(
              eventosChunk,
              fisEmp.id,
              'DFE_SIEG',
              'IMPORTADO',
              'NFE'
            );
            await eventoImporter.saveEventosBatch(eventosResult);
          } catch (e) {
            console.error('[SIEG-EVT] falha ao importar evento parcial:', e);
          }
        }
      }
      // for (const xmlEvento of eventosPendentes) {
      //   try {
      //     await eventoImporter.processXmlData(
      //       xmlEvento, // XML do evento
      //       fisEmp.id, // empresa “da casa”
      //       'DFE_SIEG', // origem
      //       'IMPORTADO', // status
      //       'NFE' // tipo de documento que estamos coletando
      //     );
      //   } catch (e) {
      //     console.error('[SIEG-EVT] falha ao importar evento:', e);
      //   }
      // }
      // fecha loop se < 50
      if (arrBase64.length < take) break;
      skip += take;
      arrBase64.length = 0;
    }
    if (docDfeBuffer.length) {
      try {
        await prisma.fis_documento_dfe.createMany({
          data: docDfeBuffer,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[SIEG] erro ao gravar lote fis_documento_dfe:', e);
      } finally {
        docDfeBuffer.length = 0;
      }
    }
    if (eventosPendentes.length) {
      try {
        const eventosResult = await eventoImporter.processMultipleXmlData(
          eventosPendentes,
          fisEmp.id,
          'DFE_SIEG',
          'IMPORTADO',
          'NFE'
        );
        await eventoImporter.saveEventosBatch(eventosResult);
      } catch (e) {
        console.error('[SIEG-EVT] falha ao importar evento:', e);
      } finally {
        eventosPendentes.length = 0;
      }
    }
    createConsumoIntegracao({
      empresaId: empresa.id,
      dt_competencia: competencia,
      ds_consumo: consumo,
      ds_tipo_consumo: 'NFE_SIEG',
      integracaoId: integracao.id,
    });
    consultaEventos = true; // na 2ª iteração, consulta eventos pendentes
  }
  await inclusaoNfeSieg(empresaId);
  setNfesProcessados({ empresaId: empresaId, competencia: competencia });
  setNfesRelacionadasProcessados({
    empresaId: empresaId,
    competencia: competencia,
  });
  return { importedCount, importedIds };
};

// ----------- Coleta CTE ----------- //

// ----------- Entradas ----------- //
export const coletarCteSieg = async (
  empresaId: string,
  competencia: string // formato "YYYY-MM"
): Promise<{ importedCount: number; importedIds: string[] }> => {
  console.log('[SIEG] iniciar coleta CTE - Entrada');

  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      ds_documento: true,
      is_escritorio: true,
      id_escritorio: true,
    },
  });
  if (!empresa?.ds_documento) {
    throw new Error(`Empresa ${empresaId} não encontrada ou sem CNPJ.`);
  }
  const cnpjDest = cleanCnpj(empresa.ds_documento);
  const fisEmp = await getFiscalEmpresa(empresa.id);
  const integracao = await prisma.sis_integracao.findFirst({
    where: { ds_nome: 'SIEG' },
    select: { id: true },
  });

  // busca config da integração pela empresa, senão pelo escritório
  let cfg = await prisma.sis_integracao_config.findFirst({
    where: { id_sis_empresas: empresaId, id_integracao: integracao?.id },
    select: { ds_valores_config: true },
  });
  if (!cfg && !empresa.is_escritorio && empresa.id_escritorio) {
    cfg = await prisma.sis_integracao_config.findFirst({
      where: {
        id_sis_empresas: empresa.id_escritorio!,
        id_integracao: integracao?.id,
      },
      select: { ds_valores_config: true },
    });
  }

  let importedCount = 0;
  const importedIds: string[] = [];
  if (!cfg) return { importedCount, importedIds };

  const apiKey = (cfg.ds_valores_config as Record<string, string>).api_key;
  if (!apiKey) {
    throw new Error(`api_key não configurada para empresa ${empresaId}`);
  }

  const importer = new ImportarCteService();

  const limit = pLimit(8); // máx. 8 tarefas em paralelo (reduz pico de heap)
  let consumo = 0;
  let consultaEventos = false;
  for (let i = 0; i < 2; i++) {
    const take = 50;
    const docDfeBuffer: any[] = [];
    const eventosPendentes: any[] = [];
    let skip = 0;
    let pickTomador = false;
    // while para manter a procura em casos onde existirem mais de 50 NFSe
    while (true) {
      const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
      const ano = Number(anoStr);
      const mes = Number(mesStr);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;
      const payload: any = {
        XmlType: 2,
        Take: take,
        Skip: skip,
        DataEmissaoInicio: `${competencia}-01`,
        DataEmissaoFim: fim,
        Downloadevent: consultaEventos,
        ...(pickTomador === true
          ? { CnpjTom: cnpjDest }
          : { CnpjDest: cnpjDest }),
      };

      const resp = await fetchBaixarXmlsWithRetry(
        apiKey,
        payload,
        'CTe BaixarXmls'
      );
      if (resp.status === 404) {
        break;
      }
      if (!resp.ok) {
        const detail = await resp.text().catch(() => resp.statusText);
        throw new Error(`SIEG CT-e erro (${resp.status}): ${detail}`);
      }

      let raw = await resp.text();
      // 1ª camada de parse
      let first: any;
      try {
        first = JSON.parse(raw);
      } catch {
        first = raw;
      } finally {
        raw = null;
      }
      // 2ª camada: se veio string contendo um JSON-array
      let arrBase64: string[] = [];
      if (Array.isArray(first)) {
        arrBase64 = first;
      } else if (typeof first === 'string' && first.trim().startsWith('[')) {
        try {
          arrBase64 = JSON.parse(first);
        } catch {
          arrBase64 = [first];
        }
      } else if (typeof first === 'string') {
        arrBase64 = [first];
      }
      first = null;
      if (arrBase64.length === 0) break;

      // processa em paralelo (máx. 8)
      const CHUNK_SIZE = 8;
      for (let j = 0; j < arrBase64.length; j += CHUNK_SIZE) {
        const chunk = arrBase64.slice(j, j + CHUNK_SIZE);
        await Promise.all(
          chunk.map((b64raw) =>
            limit(async () => {
              // console.log(b64raw);
              if (!b64raw || typeof b64raw !== 'string') return;

              let xml: string | null = null;
              let parsed: any = null;
              let lista: any = null;
              let docs: any[] | null = null;
              let eventos: any[] | null = null;
              let saved: Awaited<
                ReturnType<(typeof importer)['processXmlData']>
              > | null = null;

              try {
                try {
                  xml = Buffer.from(b64raw, 'base64').toString('utf-8');
                } catch {
                  console.warn('[SIEG] base64 inválido');
                  return;
                }

                if (xml.trim().startsWith('[')) {
                  try {
                    xml = JSON.parse(xml).join('');
                  } catch {
                    /* mantém xml */
                  }
                }

                try {
                  parsed = await parseStringPromise(xml, {
                    explicitArray: true,
                  });
                } catch {
                  console.warn('[SIEG] XML inválido');
                  return;
                }

                lista = parsed.ConsultarNfseServicoPrestadoResposta
                  ?.ListaNfse?.[0]?.CompNfse ?? [parsed];
                const split = splitDocsEventos(lista);
                docs = split.docs;
                eventos = split.eventos;
                parsed = null;
                lista = null;
                eventosPendentes.push(...(eventos ?? []));
                if (!docs || docs.length === 0) return;
                // console.log(JSON.stringify(docs[0], null, 2)); // debug
                try {
                  const saved = await importer['processXmlData'](
                    docs[0],
                    'api_sieg'
                  );
                  importedCount++;
                  // importedIds.push(saved.cte.id);
                  if (
                    saved.resposta
                      ?.toString()
                      .includes('Formato XML de CTe não suportado')
                  ) {
                    docDfeBuffer.push({
                      ds_error: saved.resposta?.toString(),
                      ds_raw: JSON.stringify(docs[0]),
                      ds_situacao_integracao: StatusExtracao.ERRO,
                      ds_origem: 'DFE_SIEG',
                      ds_tipo: 'CTE',
                    });
                  } else if (
                    saved.resposta
                      ?.toString()
                      .includes(`CTe ${saved.cte.ds_numero} já importado.`)
                  ) {
                    return;
                  } else if (saved.resposta === null) {
                    const exists = await prisma.fis_cte.findFirst({
                      where: {
                        OR: [
                          { id_fis_empresa_destinatario: fisEmp.id },
                          { id_fis_empresa_tomador: fisEmp.id },
                        ],
                        ds_numero: saved.cte.ds_numero,
                      },
                    });
                    // if (exists && cancelada) {
                    //   const documentoExists = await prisma.fis_documento.findFirst({
                    //     where: {
                    //       id_nfse: exists.id,
                    //       ds_status: {
                    //         notIn: [
                    //           StatusDocumento.CANCELADO,
                    //           StatusDocumento.CONFERIDO_FISCAL,
                    //           StatusDocumento.DIGITADO_FISCAL,
                    //         ],
                    //       },
                    //     },
                    //   });
                    //   if (documentoExists) {
                    //     await prisma.fis_documento.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //     await prisma.fis_documento_dfe.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //   }
                    // }
                    let nota: any = null;
                    if (!exists) {
                      nota = await prisma.fis_cte.create({
                        data: { ...saved.cte },
                      });
                    } else {
                      nota = exists;
                    }
                    const existsDocDfe =
                      await prisma.fis_documento_dfe.findFirst({
                        where: {
                          id_cte: nota.id,
                        },
                      });
                    if (!existsDocDfe) {
                      docDfeBuffer.push({
                        id_cte: nota.id,
                        ds_raw: JSON.stringify(docs[0]),
                        ds_error: saved.resposta?.toString() || null,
                        dt_emissao: saved.cte.dt_emissao,
                        ds_origem: 'DFE_SIEG',
                        ds_documento_emitente: nota.ds_documento_emitente,
                        ds_documento_destinatario: empresa.ds_documento,
                        ds_documento_tomador: nota.ds_documento_tomador,
                        ds_documento_remetente: nota.ds_documento_remetente,
                        ds_documento_subcontratada:
                          nota.ds_documento_subcontratada,
                        ds_situacao_integracao: 'IMPORTADO',
                        ds_tipo: 'CTE',
                      });
                    } else {
                      if (existsDocDfe.ds_origem !== 'DFE_SIEG') {
                        await prisma.fis_documento_dfe_historico.create({
                          data: {
                            id_fis_documento_dfe: existsDocDfe.id,
                            ds_raw: JSON.stringify(docs[0]),
                            ds_origem: 'DFE_SIEG',
                            ds_error: null,
                          },
                        });
                        console.log(
                          `[SIEG] CTe ${nota.ds_chave}: salvo em histórico (origem=${existsDocDfe.ds_origem} → DFE_SIEG)`
                        );
                      }
                      return;
                    }
                    consumo++;
                    importedIds.push(nota.id);
                    nota = null;
                  }
                  // console.log(saved);
                  // console.log(saved.cte.fis_cte_comp_carga);
                  // console.log(saved.cte.fis_cte_carga);
                } catch (e) {
                  console.error('[SIEG] falha na importação:', e);
                }
              } finally {
                // cleanup para permitir GC liberar memória rapidamente
                try {
                  parsed = null;
                  lista = null;
                  if (docs) {
                    docs.length = 0;
                    docs = null;
                  }
                  if (eventos) {
                    eventos.length = 0;
                    eventos = null;
                  }
                  if (saved) {
                    delete saved.cte;
                  }
                  saved = null;
                  xml = null;
                } catch (e) {
                  /* ignore cleanup errors */
                }
              }
            })
          )
        );
        // flush parcial dos buffers para evitar crescimento indefinido
        if (docDfeBuffer.length >= 200) {
          try {
            await prisma.fis_documento_dfe.createMany({
              data: docDfeBuffer.splice(0, docDfeBuffer.length),
              skipDuplicates: true,
            });
          } catch (e) {
            console.error(
              '[SIEG] erro ao gravar lote parcial fis_documento_dfe:',
              e
            );
          }
        }
        if (eventosPendentes.length >= 200) {
          try {
            const eventosChunk = eventosPendentes.splice(
              0,
              eventosPendentes.length
            );
            const eventosResult = await eventoImporter.processMultipleXmlData(
              eventosChunk,
              fisEmp.id,
              'DFE_SIEG',
              'IMPORTADO',
              'NFE'
            );
            await eventoImporter.saveEventosBatch(eventosResult);
          } catch (e) {
            console.error('[SIEG-EVT] falha ao importar evento parcial:', e);
          }
        }
      }

      // for (const xmlEvento of eventosPendentes) {
      //   try {
      //     await eventoImporter.processXmlData(
      //       xmlEvento, // XML do evento
      //       fisEmp.id, // empresa “da casa”
      //       'DFE_SIEG', // origem
      //       'IMPORTADO', // status
      //       'CTE' // tipo de documento que estamos coletando
      //     );
      //   } catch (e) {
      //     console.error('[SIEG-EVT] falha ao importar evento:', e);
      //   }
      // }
      // fecha loop se < 50
      if (arrBase64.length < take) {
        if (!pickTomador) {
          pickTomador = true;
          skip = 0;
          continue;
        } else {
          break;
        }
      }
      skip += take;
      arrBase64.length = 0;
    }
    if (docDfeBuffer.length) {
      try {
        await prisma.fis_documento_dfe.createMany({
          data: docDfeBuffer,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[SIEG] erro ao gravar lote fis_documento_dfe:', e);
      } finally {
        docDfeBuffer.length = 0;
      }
    }
    if (eventosPendentes.length) {
      try {
        const eventosResult = await eventoImporter.processMultipleXmlData(
          eventosPendentes,
          fisEmp.id,
          'DFE_SIEG',
          'IMPORTADO',
          'CTE'
        );
        await eventoImporter.saveEventosBatch(eventosResult);
      } catch (e) {
        console.error('[SIEG-EVT] falha ao importar evento:', e);
      } finally {
        eventosPendentes.length = 0;
      }
    }
    createConsumoIntegracao({
      empresaId: empresa.id,
      dt_competencia: competencia,
      ds_consumo: consumo,
      ds_tipo_consumo: 'CTE_SIEG',
      integracaoId: integracao.id,
    });
    consultaEventos = true;
  }
  await inclusaoCteSieg(empresaId);
  setCtesContra({ empresaId: empresaId, competencia: competencia });
  return { importedCount, importedIds };
};
// ----------- Saídas ----------- //
export const coletarCteSaidaSieg = async (
  empresaId: string,
  competencia: string // formato "YYYY-MM"
): Promise<{ importedCount: number; importedIds: string[] }> => {
  console.log('[SIEG] iniciar coleta CTE - Saída');

  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      ds_documento: true,
      is_escritorio: true,
      id_escritorio: true,
    },
  });
  if (!empresa?.ds_documento) {
    throw new Error(`Empresa ${empresaId} não encontrada ou sem CNPJ.`);
  }
  const cnpjDest = cleanCnpj(empresa.ds_documento);
  const fisEmp = await getFiscalEmpresa(empresa.id);
  const integracao = await prisma.sis_integracao.findFirst({
    where: { ds_nome: 'SIEG' },
    select: { id: true },
  });

  // busca config da integração pela empresa, senão pelo escritório
  let cfg = await prisma.sis_integracao_config.findFirst({
    where: { id_sis_empresas: empresaId, id_integracao: integracao?.id },
    select: { ds_valores_config: true },
  });
  if (!cfg && !empresa.is_escritorio && empresa.id_escritorio) {
    cfg = await prisma.sis_integracao_config.findFirst({
      where: {
        id_sis_empresas: empresa.id_escritorio!,
        id_integracao: integracao?.id,
      },
      select: { ds_valores_config: true },
    });
  }

  let importedCount = 0;
  const importedIds: string[] = [];
  if (!cfg) return { importedCount, importedIds };

  const apiKey = (cfg.ds_valores_config as Record<string, string>).api_key;
  if (!apiKey) {
    throw new Error(`api_key não configurada para empresa ${empresaId}`);
  }

  const importer = new ImportarCteService();

  const limit = pLimit(8); // máx. 8 tarefas em paralelo (reduz pico de heap)
  let consumo = 0;
  let consultaEventos = false;
  for (let i = 0; i < 2; i++) {
    const take = 50;
    const docDfeBuffer: any[] = [];
    const eventosPendentes: any[] = [];
    let skip = 0;
    // while para manter a procura em casos onde existirem mais de 50 NFSe
    while (true) {
      const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
      const ano = Number(anoStr);
      const mes = Number(mesStr);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;

      const payload: any = {
        XmlType: 2,
        Take: take,
        Skip: skip,
        DataEmissaoInicio: `${competencia}-01`,
        DataEmissaoFim: fim,
        Downloadevent: consultaEventos,
        CnpjEmit: cnpjDest,
      };

      const resp = await fetchBaixarXmlsWithRetry(
        apiKey,
        payload,
        'CTe Saída BaixarXmls'
      );
      if (resp.status === 404) {
        break;
      }
      if (!resp.ok) {
        const detail = await resp.text().catch(() => resp.statusText);
        throw new Error(`SIEG CT-e erro (${resp.status}): ${detail}`);
      }

      let raw = await resp.text();
      // 1ª camada de parse
      let first: any;
      try {
        first = JSON.parse(raw);
      } catch {
        first = raw;
      } finally {
        raw = null;
      }
      // 2ª camada: se veio string contendo um JSON-array
      let arrBase64: string[] = [];
      if (Array.isArray(first)) {
        arrBase64 = first;
      } else if (typeof first === 'string' && first.trim().startsWith('[')) {
        try {
          arrBase64 = JSON.parse(first);
        } catch {
          arrBase64 = [first];
        }
      } else if (typeof first === 'string') {
        arrBase64 = [first];
      }
      first = null;
      if (arrBase64.length === 0) break;
      // processa em paralelo (máx. 8)
      const CHUNK_SIZE = 8;
      for (let j = 0; j < arrBase64.length; j += CHUNK_SIZE) {
        const chunk = arrBase64.slice(j, j + CHUNK_SIZE);
        await Promise.all(
          chunk.map((b64raw) =>
            limit(async () => {
              // console.log(b64raw);
              if (!b64raw || typeof b64raw !== 'string') return;

              let xml: string | null = null;
              let parsed: any = null;
              let lista: any = null;
              let docs: any[] | null = null;
              let eventos: any[] | null = null;
              let saved: Awaited<
                ReturnType<(typeof importer)['processXmlData']>
              > | null = null;
              try {
                try {
                  xml = Buffer.from(b64raw, 'base64').toString('utf-8');
                } catch {
                  console.warn('[SIEG] base64 inválido');
                  return;
                }

                if (xml.trim().startsWith('[')) {
                  try {
                    xml = JSON.parse(xml).join('');
                  } catch {
                    /* mantém xml */
                  }
                }

                try {
                  parsed = await parseStringPromise(xml, {
                    explicitArray: true,
                  });
                } catch {
                  console.warn('[SIEG] XML inválido');
                  return;
                }

                lista = parsed.ConsultarNfseServicoPrestadoResposta
                  ?.ListaNfse?.[0]?.CompNfse ?? [parsed];
                const split = splitDocsEventos(lista);
                docs = split.docs;
                eventos = split.eventos;
                parsed = null;
                lista = null;
                eventosPendentes.push(...(eventos ?? []));
                if (!docs || docs.length === 0) return;
                // console.log(JSON.stringify(xmlData, null, 2)); // debug
                try {
                  saved = await importer['processXmlData'](docs[0], 'api_sieg');
                  importedCount++;
                  // importedIds.push(saved.cte.id);
                  if (
                    saved.resposta
                      ?.toString()
                      .includes('Formato XML de CTe não suportado')
                  ) {
                    docDfeBuffer.push({
                      ds_error: saved.resposta?.toString(),
                      ds_raw: JSON.stringify(docs[0]),
                      ds_situacao_integracao: StatusExtracao.ERRO,
                      ds_origem: 'DFE_SIEG',
                      ds_tipo: 'CTE',
                    });
                  } else if (
                    saved.resposta
                      ?.toString()
                      .includes(`CTe ${saved.cte.ds_numero} já importado.`)
                  ) {
                    return;
                  } else if (saved.resposta === null) {
                    const exists = await prisma.fis_cte.findFirst({
                      where: {
                        id_fis_empresa_emitente: fisEmp.id,
                        ds_numero: saved.cte.ds_numero,
                      },
                    });
                    // if (exists && cancelada) {
                    //   const documentoExists = await prisma.fis_documento.findFirst({
                    //     where: {
                    //       id_nfse: exists.id,
                    //       ds_status: {
                    //         notIn: [
                    //           StatusDocumento.CANCELADO,
                    //           StatusDocumento.CONFERIDO_FISCAL,
                    //           StatusDocumento.DIGITADO_FISCAL,
                    //         ],
                    //       },
                    //     },
                    //   });
                    //   if (documentoExists) {
                    //     await prisma.fis_documento.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //     await prisma.fis_documento_dfe.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //   }
                    // }
                    let nota: any = null;
                    if (!exists) {
                      nota = await prisma.fis_cte.create({
                        data: { ...saved.cte },
                      });
                    } else {
                      nota = exists;
                    }
                    const existsDocDfe =
                      await prisma.fis_documento_dfe.findFirst({
                        where: {
                          id_cte: nota.id,
                        },
                      });
                    if (!existsDocDfe) {
                      docDfeBuffer.push({
                        id_cte: nota.id,
                        ds_raw: JSON.stringify(docs[0]),
                        ds_error: saved.resposta?.toString() || null,
                        dt_emissao: saved.cte.dt_emissao,
                        ds_origem: 'DFE_SIEG',
                        ds_documento_emitente: empresa.ds_documento,
                        ds_documento_destinatario:
                          nota.ds_documento_destinatario,
                        ds_documento_tomador: nota.ds_documento_tomador,
                        ds_documento_remetente: nota.ds_documento_remetente,
                        ds_documento_subcontratada:
                          nota.ds_documento_subcontratada,
                        ds_situacao_integracao: 'IMPORTADO',
                        ds_tipo: 'CTE',
                      });
                    } else {
                      if (existsDocDfe.ds_origem !== 'DFE_SIEG') {
                        await prisma.fis_documento_dfe_historico.create({
                          data: {
                            id_fis_documento_dfe: existsDocDfe.id,
                            ds_raw: JSON.stringify(docs[0]),
                            ds_origem: 'DFE_SIEG',
                            ds_error: null,
                          },
                        });
                        console.log(
                          `[SIEG] CTe ${nota.ds_chave}: salvo em histórico (origem=${existsDocDfe.ds_origem} → DFE_SIEG)`
                        );
                      }
                      return;
                    }
                    consumo++;
                    importedIds.push(nota.id);
                    nota = null;
                  }
                  // console.log(saved);
                  // console.log(saved.cte.fis_cte_comp_carga);
                  // console.log(saved.cte.fis_cte_carga);
                } catch (e) {
                  console.error('[SIEG] falha na importação:', e);
                }
              } finally {
                // cleanup para permitir GC liberar memória rapidamente
                try {
                  parsed = null;
                  lista = null;
                  if (docs) {
                    docs.length = 0;
                    docs = null;
                  }
                  if (eventos) {
                    eventos.length = 0;
                    eventos = null;
                  }
                  if (saved) {
                    delete saved.cte;
                  }
                  saved = null;
                  xml = null;
                } catch (e) {
                  /* ignore cleanup errors */
                }
              }
            })
          )
        );

        // flush parcial dos buffers para evitar crescimento indefinido
        if (docDfeBuffer.length >= 200) {
          try {
            await prisma.fis_documento_dfe.createMany({
              data: docDfeBuffer.splice(0, docDfeBuffer.length),
              skipDuplicates: true,
            });
          } catch (e) {
            console.error(
              '[SIEG] erro ao gravar lote parcial fis_documento_dfe:',
              e
            );
          }
        }
        if (eventosPendentes.length >= 200) {
          try {
            const eventosChunk = eventosPendentes.splice(
              0,
              eventosPendentes.length
            );
            const eventosResult = await eventoImporter.processMultipleXmlData(
              eventosChunk,
              fisEmp.id,
              'DFE_SIEG',
              'IMPORTADO',
              'NFE'
            );
            await eventoImporter.saveEventosBatch(eventosResult);
          } catch (e) {
            console.error('[SIEG-EVT] falha ao importar evento parcial:', e);
          }
        }
      }

      // for (const xmlEvento of eventosPendentes) {
      //   try {
      //     await eventoImporter.processXmlData(
      //       xmlEvento, // XML do evento
      //       fisEmp.id, // empresa “da casa”
      //       'DFE_SIEG', // origem
      //       'IMPORTADO', // status
      //       'CTE' // tipo de documento que estamos coletando
      //     );
      //   } catch (e) {
      //     console.error('[SIEG-EVT] falha ao importar evento:', e);
      //   }
      // }
      // fecha loop se < 50
      if (arrBase64.length < take) break;
      skip += take;
      arrBase64.length = 0;
    }
    if (docDfeBuffer.length) {
      try {
        await prisma.fis_documento_dfe.createMany({
          data: docDfeBuffer,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[SIEG] erro ao gravar lote fis_documento_dfe:', e);
      } finally {
        docDfeBuffer.length = 0;
      }
    }
    if (eventosPendentes.length) {
      try {
        const eventosResult = await eventoImporter.processMultipleXmlData(
          eventosPendentes,
          fisEmp.id,
          'DFE_SIEG',
          'IMPORTADO',
          'CTE'
        );
        await eventoImporter.saveEventosBatch(eventosResult);
      } catch (e) {
        console.error('[SIEG-EVT] falha ao importar evento:', e);
      } finally {
        eventosPendentes.length = 0;
      }
    }
    createConsumoIntegracao({
      empresaId: empresa.id,
      dt_competencia: competencia,
      ds_consumo: consumo,
      ds_tipo_consumo: 'CTE_SIEG',
      integracaoId: integracao.id,
    });
    consultaEventos = true; // na 2ª iteração, consulta eventos pendentes
  }
  await inclusaoCteSieg(empresaId);
  setCtesContra({ empresaId: empresaId, competencia: competencia });
  return { importedCount, importedIds };
};

// ----------- Coleta NFCE ----------- //

// ----------- Entradas ----------- //
export const coletarNfceSieg = async (
  empresaId: string,
  competencia: string // formato "YYYY-MM"
): Promise<{ importedCount: number; importedIds: string[] }> => {
  // const timer = new PerformanceTimer();
  // timer.start(`coletarNfeSieg ${empresaId} ${competencia}`);

  console.log('[SIEG] iniciar coleta NFCE - Entrada');

  // timer.mark('setup-empresa');
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      ds_documento: true,
      is_escritorio: true,
      id_escritorio: true,
    },
  });
  if (!empresa?.ds_documento) {
    throw new Error(`Empresa ${empresaId} não encontrada ou sem CNPJ.`);
  }
  const cnpjDest = cleanCnpj(empresa.ds_documento);
  const fisEmp = await getFiscalEmpresa(empresa.id);
  const integracao = await prisma.sis_integracao.findFirst({
    where: { ds_nome: 'SIEG' },
    select: { id: true },
  });

  // busca config da integração pela empresa, senão pelo escritório
  let cfg = await prisma.sis_integracao_config.findFirst({
    where: { id_sis_empresas: empresaId, id_integracao: integracao?.id },
    select: { ds_valores_config: true },
  });
  if (!cfg && !empresa.is_escritorio && empresa.id_escritorio) {
    cfg = await prisma.sis_integracao_config.findFirst({
      where: {
        id_sis_empresas: empresa.id_escritorio!,
        id_integracao: integracao?.id,
      },
      select: { ds_valores_config: true },
    });
  }

  let importedCount = 0;
  const importedIds: string[] = [];
  if (!cfg) return { importedCount, importedIds };

  const apiKey = (cfg.ds_valores_config as Record<string, string>).api_key;
  if (!apiKey) {
    throw new Error(`api_key não configurada para empresa ${empresaId}`);
  }

  // timer.lap('create-importer');
  const importer = new ImportarNfeService();

  const limit = pLimit(8); // máx. 8 tarefas em paralelo (reduz pico de heap)
  let consumo = 0;
  // while para manter a procura em casos onde existirem mais de 50 NFSe
  let consultaEventos = false;

  // timer.lap('inicio-loops');
  for (let i = 0; i < 2; i++) {
    const take = 50;
    const docDfeBuffer: any[] = [];
    const eventosPendentes: any[] = [];
    let skip = 0;
    while (true) {
      const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
      const ano = Number(anoStr);
      const mes = Number(mesStr);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;

      const payload: any = {
        XmlType: 4,
        Take: take,
        Skip: skip,
        DataEmissaoInicio: `${competencia}-01`,
        DataEmissaoFim: fim,
        Downloadevent: consultaEventos,
        CnpjDest: cnpjDest,
      };

      // timer.mark(`loop-${i}-req-${skip}`);

      const requestStart = performance.now();
      const resp = await fetchBaixarXmlsWithRetry(
        apiKey,
        payload,
        'NFCe BaixarXmls'
      );
      const requestEnd = performance.now();
      // timer.lap(`loop-${i}-response-${skip}`);

      if (resp.status === 404) {
        break;
      }
      if (!resp.ok) {
        const detail = await resp.text().catch(() => resp.statusText);
        throw new Error(`SIEG NFC-e erro (${resp.status}): ${detail}`);
      }

      let raw = await resp.text();
      // 1ª camada de parse
      let first: any;
      try {
        first = JSON.parse(raw);
      } catch {
        first = raw;
      } finally {
        raw = null;
      }
      // 2ª camada: se veio string contendo um JSON-array
      let arrBase64: string[] = [];
      if (Array.isArray(first)) {
        arrBase64 = first;
      } else if (typeof first === 'string' && first.trim().startsWith('[')) {
        try {
          arrBase64 = JSON.parse(first);
        } catch {
          arrBase64 = [first];
        }
      } else if (typeof first === 'string') {
        arrBase64 = [first];
      }
      first = null;
      if (arrBase64.length === 0) break;

      // timer.mark(`loop-${i}-parallel-start-${skip}`);
      // processa em paralelo (máx. 8)
      const CHUNK_SIZE = 8;
      for (let j = 0; j < arrBase64.length; j += CHUNK_SIZE) {
        const chunk = arrBase64.slice(j, j + CHUNK_SIZE);
        await Promise.all(
          chunk.map((b64raw) =>
            limit(async () => {
              // console.log(b64raw);
              if (!b64raw || typeof b64raw !== 'string') return;

              let xml: string | null = null;
              let parsed: any = null;
              let lista: any = null;
              let docs: any[] | null = null;
              let eventos: any[] | null = null;
              let saved: Awaited<
                ReturnType<(typeof importer)['processXmlData']>
              > | null = null;
              try {
                try {
                  xml = Buffer.from(b64raw, 'base64').toString('utf-8');
                } catch {
                  console.warn('[SIEG] base64 inválido');
                  return;
                }

                if (xml.trim().startsWith('[')) {
                  try {
                    xml = JSON.parse(xml).join('');
                  } catch {
                    /* mantém xml */
                  }
                }

                try {
                  parsed = await parseStringPromise(xml, {
                    explicitArray: true,
                  });
                } catch {
                  console.warn('[SIEG] XML inválido');
                  return;
                }

                lista = parsed.ConsultarNfseServicoPrestadoResposta
                  ?.ListaNfse?.[0]?.CompNfse ?? [parsed];
                const split = splitDocsEventos(lista);
                docs = split.docs;
                eventos = split.eventos;
                parsed = null;
                lista = null;
                eventosPendentes.push(...(eventos ?? []));
                if (!docs || docs.length === 0) return;
                // console.log(JSON.stringify(docs, null, 2)); // debug
                try {
                  const saved = await importer['processXmlData'](
                    docs[0],
                    'api_sieg'
                  );
                  importedCount++;
                  // importedIds.push(saved.nfe.id);
                  let statusDeImportacao: StatusExtracao = 'INTEGRADO';
                  if (
                    saved.resposta
                      ?.toString()
                      .includes('Formato XML de NFCe não suportado')
                  ) {
                    docDfeBuffer.push({
                      ds_error: saved.resposta?.toString(),
                      ds_raw: JSON.stringify(docs[0]),
                      ds_situacao_integracao: StatusExtracao.ERRO,
                      ds_origem: 'DFE_SIEG',
                      ds_tipo: 'NFCE',
                    });
                  } else if (
                    saved.resposta?.toString().includes(`NFCe já importada`) ||
                    saved.resposta
                      ?.toString()
                      .includes(`NFCe existente teve vínculo atualizado`)
                  ) {
                    return;
                  } else if (saved.resposta === null) {
                    const exists = await prisma.fis_nfe.findFirst({
                      where: {
                        id_fis_empresa_destinatario: fisEmp.id,
                        ds_chave: saved.nfe.ds_chave,
                      },
                    });
                    // if (exists && cancelada) {
                    //   const documentoExists = await prisma.fis_documento.findFirst({
                    //     where: {
                    //       id_nfse: exists.id,
                    //       ds_status: {
                    //         notIn: [
                    //           StatusDocumento.CANCELADO,
                    //           StatusDocumento.CONFERIDO_FISCAL,
                    //           StatusDocumento.DIGITADO_FISCAL,
                    //         ],
                    //       },
                    //     },
                    //   });
                    //   if (documentoExists) {
                    //     await prisma.fis_documento.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //     await prisma.fis_documento_dfe.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //   }
                    // }
                    let nota: any = null;
                    if (!exists) {
                      nota = await prisma.fis_nfe.create({
                        data: { ...saved.nfe },
                      });
                    } else {
                      nota = saved.nfe;
                    }

                    // const fornecedor = await prisma.fis_fornecedores.findFirst({
                    //   where: {
                    //     id: nota.id_fis_fornecedor,
                    //   },
                    // });
                    const existsDocDfe =
                      await prisma.fis_documento_dfe.findFirst({
                        where: {
                          id_nfe: nota.id,
                        },
                      });
                    if (!existsDocDfe) {
                      docDfeBuffer.push({
                        id_nfe: nota.id,
                        ds_raw: JSON.stringify(docs[0]),
                        ds_error: saved.resposta?.toString() || null,
                        dt_emissao: saved.nfe.dt_emissao,
                        ds_origem: 'DFE_SIEG',
                        ds_documento_emitente: nota.ds_documento_emitente,
                        ds_documento_destinatario: empresa.ds_documento,
                        ds_documento_transportador:
                          nota.ds_documento_transportador,
                        ds_situacao_integracao: 'IMPORTADO',
                        ds_tipo: 'NFCE',
                      });
                    } else {
                      if (existsDocDfe.ds_origem !== 'DFE_SIEG') {
                        await prisma.fis_documento_dfe_historico.create({
                          data: {
                            id_fis_documento_dfe: existsDocDfe.id,
                            ds_raw: JSON.stringify(docs[0]),
                            ds_origem: 'DFE_SIEG',
                            ds_error: null,
                          },
                        });
                        console.log(
                          `[SIEG] NFCe ${nota.ds_chave}: salvo em histórico (origem=${existsDocDfe.ds_origem} → DFE_SIEG)`
                        );
                      }
                      return;
                    }
                    consumo++;
                    importedIds.push(nota.id);
                    nota = null;
                  }
                  // console.log(saved);
                  // console.log(saved.nfe.fis_nfe_itens);
                } catch (e) {
                  console.error('[SIEG] falha na importação:', e);
                }
              } finally {
                // cleanup para permitir GC liberar memória rapidamente
                try {
                  parsed = null;
                  lista = null;
                  if (docs) {
                    docs.length = 0;
                    docs = null;
                  }
                  if (eventos) {
                    eventos.length = 0;
                    eventos = null;
                  }
                  if (saved) {
                    delete saved.nfe;
                  }
                  saved = null;
                  xml = null;
                } catch (e) {
                  /* ignore cleanup errors */
                }
              }
              //
            })
          )
        );

        // flush parcial dos buffers para evitar crescimento indefinido
        if (docDfeBuffer.length >= 200) {
          try {
            await prisma.fis_documento_dfe.createMany({
              data: docDfeBuffer.splice(0, docDfeBuffer.length),
              skipDuplicates: true,
            });
          } catch (e) {
            console.error(
              '[SIEG] erro ao gravar lote parcial fis_documento_dfe:',
              e
            );
          }
        }
        if (eventosPendentes.length >= 200) {
          try {
            const eventosChunk = eventosPendentes.splice(
              0,
              eventosPendentes.length
            );
            const eventosResult = await eventoImporter.processMultipleXmlData(
              eventosChunk,
              fisEmp.id,
              'DFE_SIEG',
              'IMPORTADO',
              'NFE'
            );
            await eventoImporter.saveEventosBatch(eventosResult);
          } catch (e) {
            console.error('[SIEG-EVT] falha ao importar evento parcial:', e);
          }
        }
      }
      // timer.lap(`loop-${i}-parallel-complete-${skip}`);
      // for (const xmlEvento of eventosPendentes) {
      //   try {
      //     await eventoImporter.processXmlData(
      //       xmlEvento, // XML do evento
      //       fisEmp.id, // empresa “da casa”
      //       'DFE_SIEG', // origem
      //       'IMPORTADO', // status
      //       'NFE' // tipo de documento que estamos coletando
      //     );
      //   } catch (e) {
      //     console.error('[SIEG-EVT] falha ao importar evento:', e);
      //   }
      // }
      // fecha loop se < 50
      if (arrBase64.length < take) {
        break;
      }
      skip += take;
      arrBase64.length = 0;
    }
    if (docDfeBuffer.length) {
      try {
        await prisma.fis_documento_dfe.createMany({
          data: docDfeBuffer,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[SIEG] erro ao gravar lote:', e);
      } finally {
        docDfeBuffer.length = 0;
      }
    }
    if (eventosPendentes.length) {
      try {
        const eventosResult = await eventoImporter.processMultipleXmlData(
          eventosPendentes,
          fisEmp.id,
          'DFE_SIEG',
          'IMPORTADO',
          'NFCE'
        );
        await eventoImporter.saveEventosBatch(eventosResult);
      } catch (e) {
        console.error('[SIEG-EVT] falha ao importar evento:', e);
      } finally {
        eventosPendentes.length = 0;
      }
    }

    createConsumoIntegracao({
      empresaId: empresa.id,
      dt_competencia: competencia,
      ds_consumo: consumo,
      ds_tipo_consumo: 'NFCE_SIEG',
      integracaoId: integracao.id,
    });
    consultaEventos = true;
  }
  await inclusaoNfceSieg(empresaId);

  // timer.end('coletarNfeSieg-total');
  return { importedCount, importedIds };
};
// ----------- Saídas ----------- //
export const coletarNfceSaidaSieg = async (
  empresaId: string,
  competencia: string // formato "YYYY-MM"
): Promise<{ importedCount: number; importedIds: string[] }> => {
  console.log('[SIEG] iniciar coleta NFCE - Saída');

  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      ds_documento: true,
      is_escritorio: true,
      id_escritorio: true,
    },
  });
  if (!empresa?.ds_documento) {
    throw new Error(`Empresa ${empresaId} não encontrada ou sem CNPJ.`);
  }
  const cnpjDest = cleanCnpj(empresa.ds_documento);
  const fisEmp = await getFiscalEmpresa(empresa.id);
  const integracao = await prisma.sis_integracao.findFirst({
    where: { ds_nome: 'SIEG' },
    select: { id: true },
  });

  // busca config da integração pela empresa, senão pelo escritório
  let cfg = await prisma.sis_integracao_config.findFirst({
    where: { id_sis_empresas: empresaId, id_integracao: integracao?.id },
    select: { ds_valores_config: true },
  });
  if (!cfg && !empresa.is_escritorio && empresa.id_escritorio) {
    cfg = await prisma.sis_integracao_config.findFirst({
      where: {
        id_sis_empresas: empresa.id_escritorio!,
        id_integracao: integracao?.id,
      },
      select: { ds_valores_config: true },
    });
  }

  let importedCount = 0;
  const importedIds: string[] = [];
  if (!cfg) return { importedCount, importedIds };

  const apiKey = (cfg.ds_valores_config as Record<string, string>).api_key;
  if (!apiKey) {
    throw new Error(`api_key não configurada para empresa ${empresaId}`);
  }

  const importer = new ImportarNfeService();

  const limit = pLimit(8); // máx. 8 tarefas em paralelo (reduz pico de heap)
  let consumo = 0;
  let consultaEventos = false;
  for (let i = 0; i < 2; i++) {
    const take = 50;
    const docDfeBuffer: any[] = [];
    const eventosPendentes: any[] = [];
    let skip = 0;
    // while para manter a procura em casos onde existirem mais de 50 NFSe
    while (true) {
      const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
      const ano = Number(anoStr);
      const mes = Number(mesStr);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;

      const payload: any = {
        XmlType: 4,
        Take: take,
        Skip: skip,
        DataEmissaoInicio: `${competencia}-01`,
        DataEmissaoFim: fim,
        Downloadevent: consultaEventos,
        CnpjEmit: cnpjDest,
      };

      const resp = await fetchBaixarXmlsWithRetry(
        apiKey,
        payload,
        'NFCe Saída BaixarXmls'
      );
      if (resp.status === 404) {
        break;
      }
      if (!resp.ok) {
        const detail = await resp.text().catch(() => resp.statusText);
        throw new Error(`SIEG NFC-e erro (${resp.status}): ${detail}`);
      }

      let raw = await resp.text();
      // 1ª camada de parse
      let first: any;
      try {
        first = JSON.parse(raw);
      } catch {
        first = raw;
      } finally {
        raw = null;
      }
      // 2ª camada: se veio string contendo um JSON-array
      let arrBase64: string[] = [];
      if (Array.isArray(first)) {
        arrBase64 = first;
      } else if (typeof first === 'string' && first.trim().startsWith('[')) {
        try {
          arrBase64 = JSON.parse(first);
        } catch {
          arrBase64 = [first];
        }
      } else if (typeof first === 'string') {
        arrBase64 = [first];
      }
      first = null;
      if (arrBase64.length === 0) break;
      // processa em paralelo (máx. 8)
      const CHUNK_SIZE = 8;
      for (let j = 0; j < arrBase64.length; j += CHUNK_SIZE) {
        const chunk = arrBase64.slice(j, j + CHUNK_SIZE);
        await Promise.all(
          chunk.map((b64raw) =>
            limit(async () => {
              // console.log(b64raw);
              if (!b64raw || typeof b64raw !== 'string') return;

              let xml: string | null = null;
              let parsed: any = null;
              let lista: any = null;
              let docs: any[] | null = null;
              let eventos: any[] | null = null;
              let saved: Awaited<
                ReturnType<(typeof importer)['processXmlData']>
              > | null = null;
              try {
                try {
                  xml = Buffer.from(b64raw, 'base64').toString('utf-8');
                } catch {
                  console.warn('[SIEG] base64 inválido');
                  return;
                }

                if (xml.trim().startsWith('[')) {
                  try {
                    xml = JSON.parse(xml).join('');
                  } catch {
                    /* mantém xml */
                  }
                }

                try {
                  parsed = await parseStringPromise(xml, {
                    explicitArray: true,
                  });
                } catch {
                  console.warn('[SIEG] XML inválido');
                  return;
                }

                lista = parsed.ConsultarNfseServicoPrestadoResposta
                  ?.ListaNfse?.[0]?.CompNfse ?? [parsed];
                const split = splitDocsEventos(lista);
                docs = split.docs;
                eventos = split.eventos;
                parsed = null;
                lista = null;
                eventosPendentes.push(...(eventos ?? []));
                if (!docs || docs.length === 0) return;
                // console.log(JSON.stringify(xmlData, null, 2)); // debug
                try {
                  saved = await importer['processXmlData'](docs[0], 'api_sieg');
                  importedCount++;
                  // importedIds.push(saved.nfe.id);
                  let statusDeImportacao: StatusExtracao = 'INTEGRADO';
                  if (
                    saved.resposta
                      ?.toString()
                      .includes('Formato XML de NFe não suportado')
                  ) {
                    docDfeBuffer.push({
                      ds_error: saved.resposta?.toString(),
                      ds_raw: JSON.stringify(docs[0]),
                      ds_situacao_integracao: StatusExtracao.ERRO,
                      ds_origem: 'DFE_SIEG',
                      ds_tipo: 'NFCE',
                    });
                  } else if (
                    saved.resposta?.toString().includes(`NFCe já importada`) ||
                    saved.resposta
                      ?.toString()
                      .includes(`NFCe existente teve vínculo atualizado`)
                  ) {
                    return;
                  } else if (saved.resposta === null) {
                    const exists = await prisma.fis_nfe.findFirst({
                      where: {
                        id_fis_empresa_emitente: fisEmp.id,
                        ds_chave: saved.nfe.ds_chave,
                      },
                    });
                    // if (exists && cancelada) {
                    //   const documentoExists = await prisma.fis_documento.findFirst({
                    //     where: {
                    //       id_nfse: exists.id,
                    //       ds_status: {
                    //         notIn: [
                    //           StatusDocumento.CANCELADO,
                    //           StatusDocumento.CONFERIDO_FISCAL,
                    //           StatusDocumento.DIGITADO_FISCAL,
                    //         ],
                    //       },
                    //     },
                    //   });
                    //   if (documentoExists) {
                    //     await prisma.fis_documento.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //     await prisma.fis_documento_dfe.update({
                    //       where: {
                    //         id_nfse: exists.id,
                    //       },
                    //       data: {
                    //         ds_status: StatusDocumento.CANCELADO,
                    //       },
                    //     });
                    //   }
                    // }
                    let nota: any = null;
                    if (!exists) {
                      nota = await prisma.fis_nfe.create({
                        data: { ...saved.nfe },
                      });
                    } else {
                      nota = saved.nfe;
                    }

                    const existsDocDfe =
                      await prisma.fis_documento_dfe.findFirst({
                        where: {
                          id_nfe: nota.id,
                        },
                      });
                    if (!existsDocDfe) {
                      docDfeBuffer.push({
                        id_nfe: nota.id,
                        ds_raw: JSON.stringify(docs[0]),
                        ds_error: saved.resposta?.toString() || null,
                        dt_emissao: saved.nfe.dt_emissao,
                        ds_origem: 'DFE_SIEG',
                        ds_documento_emitente: empresa.ds_documento,
                        ds_documento_destinatario:
                          nota.ds_documento_destinatario,
                        ds_documento_transportador:
                          nota.ds_documento_transportador,
                        ds_situacao_integracao: 'IMPORTADO',
                        ds_tipo: 'NFCE',
                      });
                    } else {
                      if (existsDocDfe.ds_origem !== 'DFE_SIEG') {
                        await prisma.fis_documento_dfe_historico.create({
                          data: {
                            id_fis_documento_dfe: existsDocDfe.id,
                            ds_raw: JSON.stringify(docs[0]),
                            ds_origem: 'DFE_SIEG',
                            ds_error: null,
                          },
                        });
                        console.log(
                          `[SIEG] NFCe ${nota.ds_chave}: salvo em histórico (origem=${existsDocDfe.ds_origem} → DFE_SIEG)`
                        );
                      }
                      return;
                    }
                    consumo++;
                    importedIds.push(nota.id);
                    nota = null;
                  }
                  // console.log(saved);
                  // console.log(saved.nfe.fis_nfe_itens);
                } catch (e) {
                  console.error('[SIEG] falha na importação:', e);
                }
              } finally {
                // cleanup para permitir GC liberar memória rapidamente
                try {
                  parsed = null;
                  lista = null;
                  if (docs) {
                    docs.length = 0;
                    docs = null;
                  }
                  if (eventos) {
                    eventos.length = 0;
                    eventos = null;
                  }
                  if (saved) {
                    delete saved.nfe;
                  }
                  saved = null;
                  xml = null;
                } catch (e) {
                  /* ignore cleanup errors */
                }
              }
            })
          )
        );
        // flush parcial dos buffers para evitar crescimento indefinido
        if (docDfeBuffer.length >= 200) {
          try {
            await prisma.fis_documento_dfe.createMany({
              data: docDfeBuffer.splice(0, docDfeBuffer.length),
              skipDuplicates: true,
            });
          } catch (e) {
            console.error(
              '[SIEG] erro ao gravar lote parcial fis_documento_dfe:',
              e
            );
          }
        }
        if (eventosPendentes.length >= 200) {
          try {
            const eventosChunk = eventosPendentes.splice(
              0,
              eventosPendentes.length
            );
            const eventosResult = await eventoImporter.processMultipleXmlData(
              eventosChunk,
              fisEmp.id,
              'DFE_SIEG',
              'IMPORTADO',
              'NFE'
            );
            await eventoImporter.saveEventosBatch(eventosResult);
          } catch (e) {
            console.error('[SIEG-EVT] falha ao importar evento parcial:', e);
          }
        }
      }
      // for (const xmlEvento of eventosPendentes) {
      //   try {
      //     await eventoImporter.processXmlData(
      //       xmlEvento, // XML do evento
      //       fisEmp.id, // empresa “da casa”
      //       'DFE_SIEG', // origem
      //       'IMPORTADO', // status
      //       'NFE' // tipo de documento que estamos coletando
      //     );
      //   } catch (e) {
      //     console.error('[SIEG-EVT] falha ao importar evento:', e);
      //   }
      // }
      // fecha loop se < 50
      if (arrBase64.length < take) break;
      skip += take;
      arrBase64.length = 0;
    }
    if (docDfeBuffer.length) {
      try {
        await prisma.fis_documento_dfe.createMany({
          data: docDfeBuffer,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[SIEG] erro ao gravar lote fis_documento_dfe:', e);
      } finally {
        docDfeBuffer.length = 0;
      }
    }
    if (eventosPendentes.length) {
      try {
        const eventosResult = await eventoImporter.processMultipleXmlData(
          eventosPendentes,
          fisEmp.id,
          'DFE_SIEG',
          'IMPORTADO',
          'NFCE'
        );
        await eventoImporter.saveEventosBatch(eventosResult);
      } catch (e) {
        console.error('[SIEG-EVT] falha ao importar evento:', e);
      } finally {
        eventosPendentes.length = 0;
      }
    }
    createConsumoIntegracao({
      empresaId: empresa.id,
      dt_competencia: competencia,
      ds_consumo: consumo,
      ds_tipo_consumo: 'NFCE_SIEG',
      integracaoId: integracao.id,
    });
    consultaEventos = true; // na 2ª iteração, consulta eventos pendentes
  }
  await inclusaoNfceSieg(empresaId);
  return { importedCount, importedIds };
};

export const coletarAllSieg = async (
  empresaId: string,
  competencia: string // formato "YYYY-MM"
): Promise<{ importedCount: number; importedIds: string[] }> => {
  console.log('[SIEG] iniciar coleta');

  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      ds_documento: true,
      is_escritorio: true,
      id_escritorio: true,
    },
  });
  if (!empresa?.ds_documento) {
    throw new Error(`Empresa ${empresaId} não encontrada ou sem CNPJ.`);
  }
  const cnpjDest = cleanCnpj(empresa.ds_documento);
  const fisEmp = await getFiscalEmpresa(empresa.id);
  const integracao = await prisma.sis_integracao.findFirst({
    where: { ds_nome: 'SIEG' },
    select: { id: true },
  });

  // busca config da integração pela empresa, senão pelo escritório
  let cfg = await prisma.sis_integracao_config.findFirst({
    where: { id_sis_empresas: empresaId, id_integracao: integracao?.id },
    select: { ds_valores_config: true },
  });
  if (!cfg && !empresa.is_escritorio && empresa.id_escritorio) {
    cfg = await prisma.sis_integracao_config.findFirst({
      where: {
        id_sis_empresas: empresa.id_escritorio!,
        id_integracao: integracao?.id,
      },
      select: { ds_valores_config: true },
    });
  }

  let importedCount = 0;
  const importedIds: string[] = [];
  if (!cfg) return { importedCount, importedIds };

  const apiKey = (cfg.ds_valores_config as Record<string, string>).api_key;
  if (!apiKey) {
    throw new Error(`api_key não configurada para empresa ${empresaId}`);
  }

  const importer = new ImportarXmlNfseService();
  const take = 50;
  let skip = 0;
  const limit = pLimit(8); // máx. 8 tarefas em paralelo (reduz pico de heap)
  let tipoXml = 1;
  // while para manter a procura em casos onde existirem mais de 50 NFSe
  do {
    while (true) {
      const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
      const ano = Number(anoStr);
      const mes = Number(mesStr);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;
      let tipoXmlStr: TipoDocumento;
      switch (tipoXml) {
        case 1:
          console.log('nfe sieg');
          tipoXmlStr = 'NFE';
          break;
        case 2:
          console.log('cte sieg');
          tipoXmlStr = 'CTE';
          break;
        case 3:
          console.log('nfse sieg');
          tipoXmlStr = 'NFSE';
          break;
        case 4:
          console.log('nfce sieg');
          tipoXmlStr = 'NFCE';
          break;
        case 5:
          console.log('cfe sieg');
          tipoXmlStr = 'CFE';
          break;
        default:
          break;
      }
      const payload: any = {
        XmlType: tipoXml,
        Take: take,
        Skip: skip,
        DataEmissaoInicio: `${competencia}-01`,
        DataEmissaoFim: fim,
        Downloadevent: false,
        CnpjDest: cnpjDest,
      };

      const resp = await fetchBaixarXmlsWithRetry(
        apiKey,
        payload,
        `${tipoXmlStr} BaixarXmls`
      );
      if (resp.status === 404) break;
      if (!resp.ok) {
        const detail = await resp.text().catch(() => resp.statusText);
        throw new Error(`SIEG erro (${resp.status}): ${detail}`);
      }

      const raw = await resp.text();
      // 1ª camada de parse
      let first: any;
      try {
        first = JSON.parse(raw);
      } catch {
        first = raw;
      }
      // 2ª camada: se veio string contendo um JSON-array
      let arrBase64: string[] = [];
      if (Array.isArray(first)) {
        arrBase64 = first;
      } else if (typeof first === 'string' && first.trim().startsWith('[')) {
        try {
          arrBase64 = JSON.parse(first);
        } catch {
          arrBase64 = [first];
        }
      } else if (typeof first === 'string') {
        arrBase64 = [first];
      }
      if (arrBase64.length === 0) break;
      // processa em paralelo (máx. 50)
      await Promise.all(
        arrBase64.map((b64raw) =>
          limit(async () => {
            // console.log(b64raw);
            if (!b64raw || typeof b64raw !== 'string') return;

            let xml: string;
            try {
              xml = Buffer.from(b64raw, 'base64').toString('utf-8');
            } catch {
              console.warn('[SIEG] base64 inválido');
              return;
            }

            if (xml.trim().startsWith('[')) {
              try {
                xml = JSON.parse(xml).join('');
              } catch {
                /* mantém xml */
              }
            }

            let parsed: any;
            try {
              parsed = await parseStringPromise(xml, { explicitArray: true });
            } catch {
              console.warn('[SIEG] XML inválido');
              return;
            }

            const lista = parsed.ConsultarNfseServicoPrestadoResposta
              ?.ListaNfse?.[0]?.CompNfse ?? [parsed];
            for (const xmlData of lista) {
              // console.log(JSON.stringify(xmlData, null, 2)); // debug
              try {
                const saved = await importer['processXmlData'](
                  xmlData,
                  empresaId,
                  'api_sieg',
                  'IMPORTADO',
                  false
                );
                importedCount++;

                if (
                  saved.resposta
                    ?.toString()
                    .includes(
                      'Formato XML não suportado (abrasf/siegAPI/sieg/tecnoSpeed).'
                    )
                ) {
                  const rawData = JSON.stringify(xmlData);
                  const exists = await prisma.fis_documento_dfe.findFirst({
                    where: {
                      ds_raw: rawData,
                      ds_tipo: tipoXmlStr,
                    },
                  });
                  if (!exists) {
                    await prisma.fis_documento_dfe.create({
                      data: {
                        ds_error: saved.resposta?.toString(),
                        ds_raw: rawData,
                        ds_situacao_integracao: StatusExtracao.ERRO,
                        ds_origem: 'DFE_SIEG',
                        ds_tipo: tipoXmlStr,
                      },
                    });
                  }
                } else if (
                  saved.resposta
                    ?.toString()
                    .includes(
                      `Nota ${saved.nfse.ds_numero} já existe para esta empresa.`
                    )
                ) {
                  continue;
                } else if (saved.resposta === null) {
                  const exists = await prisma.fis_nfse.findFirst({
                    where: {
                      id_fis_empresas: fisEmp.id,
                      ds_numero: saved.nfse.ds_numero,
                    },
                  });

                  const nota = await prisma.fis_nfse.create({
                    data: { ...saved.nfse },
                  });
                  const fornecedor = await prisma.fis_fornecedores.findFirst({
                    where: {
                      id: nota.id_fis_fornecedor,
                    },
                  });
                  const docDfe = await prisma.fis_documento_dfe.create({
                    data: {
                      id_nfse: nota.id,
                      ds_raw: JSON.stringify(xmlData),
                      ds_error: saved.resposta?.toString() || null,
                      dt_emissao: saved.nfse.dt_emissao,
                      ds_origem: 'DFE_SIEG',
                      ds_documento_emitente: fornecedor.ds_documento,
                      ds_documento_tomador: empresa.ds_documento,
                      ds_situacao_integracao: 'IMPORTADO',
                    },
                  });
                  importedIds.push(nota.id);
                }
              } catch (e) {
                console.error('[SIEG] falha na importação:', e);
              }
            }
          })
        )
      );
      // fecha loop se < 50
      if (arrBase64.length < take) break;
      skip += take;
    }
    tipoXml++;
    skip = 0;
  } while (tipoXml <= 5);

  return { importedCount, importedIds };
};

// ----------- Inclusores ----------- //

// ----------- Inclusão NFSe ----------- //
export const inclusaoNfseSieg = async (
  empresaId: string,
  competencia: string // formato "YYYY-MM"
): Promise<{ importedCount: number; importedIds: string[] }> => {
  let importedCount = 0;
  let importedIds: string[] = [];
  const fisEmp = await getFiscalEmpresa(empresaId);
  console.log('[SIEG] iniciar inclusão de NFSe');
  const primeiroDia = `${competencia}-01`;
  let docDfeSaidaImportados: any[] = [];
  let docDfeEntradaImportados: any[] = [];

  // Buscar NFSes de SAÍDA (empresa é emitente)
  docDfeSaidaImportados = await prisma.fis_documento_dfe.findMany({
    where: {
      id_fis_documento: null, // só os que ainda não foram importados
      ds_situacao_integracao: 'IMPORTADO',
      ds_origem: 'DFE_SIEG',
      ds_tipo: 'NFSE',
      dt_emissao: {
        gte: new Date(primeiroDia),
      },
      js_nfse: {
        id_fis_empresa_emitente: fisEmp.id,
      },
    },
    include: {
      js_nfse: true,
    },
  });

  // Buscar NFSes de ENTRADA (empresa é tomadora/receptora)
  docDfeEntradaImportados = await prisma.fis_documento_dfe.findMany({
    where: {
      id_fis_documento: null, // só os que ainda não foram importados
      ds_situacao_integracao: 'IMPORTADO',
      ds_origem: 'DFE_SIEG',
      ds_tipo: 'NFSE',
      dt_emissao: {
        gte: new Date(primeiroDia),
      },
      js_nfse: {
        id_fis_empresas: fisEmp.id,
      },
    },
    include: {
      js_nfse: true,
    },
  });

  let eventosDfe: any[] = [];

  if (
    docDfeSaidaImportados.length === 0 &&
    docDfeEntradaImportados.length === 0
  ) {
    console.log('[SIEG] Nenhum documento DFE importado para inclusão');
    return { importedCount: 0, importedIds: [] };
  } else {
    const idsIntegrados: string[] = [];

    // Processar NFSes de SAÍDA
    if (docDfeSaidaImportados.length > 0) {
      for (const docDfeSaida of docDfeSaidaImportados) {
        try {
          const docAlreadyExists = await prisma.fis_documento.findUnique({
            where: {
              uniq_nfse_por_empresa: {
                id_nfse: docDfeSaida.id_nfse,
                id_fis_empresas: docDfeSaida.js_nfse.id_fis_empresa_emitente,
              },
            },
          });
          if (docAlreadyExists) continue;

          const integrados = await prisma.fis_documento.create({
            data: {
              id_fis_empresas: docDfeSaida.js_nfse.id_fis_empresa_emitente,
              ds_tipo: 'NFSE',
              ds_status: 'IMPORTADO',
              id_nfse: docDfeSaida.id_nfse,
              ds_origem: { sistema: 'api_sieg' },
              ds_tipo_ef: 'SAIDA',
            },
          });
          createDocumentoHistorico({
            justificativa: 'Sincronização SIEG',
            id_documento: integrados.id,
            status_novo: integrados.ds_status,
          });
          await prisma.fis_documento_dfe.update({
            where: { id: docDfeSaida.id },
            data: {
              id_fis_documento: integrados.id,
              ds_situacao_integracao: 'INTEGRADO',
            },
          });
          idsIntegrados.push(integrados.id);
          importedIds.push(integrados.id);
          importedCount++;
        } catch (error) {
          console.error(
            `[SIEG] Erro ao processar DFE SAÍDA ${docDfeSaida.id}:`,
            error
          );
        }
      }
    }

    // Processar NFSes de ENTRADA
    if (docDfeEntradaImportados.length > 0) {
      for (const docDfeEntrada of docDfeEntradaImportados) {
        try {
          const docAlreadyExists = await prisma.fis_documento.findUnique({
            where: {
              uniq_nfse_por_empresa: {
                id_nfse: docDfeEntrada.id_nfse,
                id_fis_empresas: docDfeEntrada.js_nfse.id_fis_empresas,
              },
            },
          });
          if (docAlreadyExists) continue;

          const integrados = await prisma.fis_documento.create({
            data: {
              id_fis_empresas: docDfeEntrada.js_nfse.id_fis_empresas,
              ds_tipo: 'NFSE',
              ds_status: 'IMPORTADO',
              id_nfse: docDfeEntrada.id_nfse,
              ds_origem: { sistema: 'api_sieg' },
              ds_tipo_ef: 'ENTRADA',
            },
          });
          createDocumentoHistorico({
            justificativa: 'Sincronização SIEG',
            id_documento: integrados.id,
            status_novo: integrados.ds_status,
          });
          await prisma.fis_documento_dfe.update({
            where: { id: docDfeEntrada.id },
            data: {
              id_fis_documento: integrados.id,
              ds_situacao_integracao: 'INTEGRADO',
            },
          });
          idsIntegrados.push(integrados.id);
          importedIds.push(integrados.id);
          importedCount++;
        } catch (error) {
          console.error(
            `[SIEG] Erro ao processar DFE ENTRADA ${docDfeEntrada.id}:`,
            error
          );
        }
      }
    }

    // Processar eventos pendentes
    eventosDfe = await prisma.fis_evento_dfe.findMany({
      where: {
        OR: [
          {
            id_evento: null, // só os que ainda não foram integrados
            ds_situacao_integracao: 'IMPORTADO',
            id_fis_documento_dfe: {
              in: docDfeSaidaImportados.map((d) => d.id),
            },
          },
          {
            id_evento: null, // só os que ainda não foram integrados
            ds_situacao_integracao: 'IMPORTADO',
            id_fis_documento_dfe: {
              in: docDfeEntradaImportados.map((d) => d.id),
            },
          },
          { id_fis_documento_dfe: { not: null }, id_evento: null },
        ],
      },
      select: {
        id: true,
      },
    });
    if (eventosDfe.length) {
      await processarEventosPendentes(eventosDfe.map((e) => e.id));
    }

    return { importedCount, importedIds };
  }
};

// ----------- Inclusão NFe ----------- //
export const inclusaoNfeSieg = async (
  empresaId: string
): Promise<{ importedCount: number; importedIds: string[] }> => {
  let importedCount = 0;
  let importedIds: string[] = [];
  const fisEmp = await getFiscalEmpresa(empresaId);
  console.log('[SIEG] iniciar inclusão de NFe');
  let docDfeSaidaImportados: any[] = [];
  let docDfeEntradaImportados: any[] = [];
  docDfeSaidaImportados = await prisma.fis_documento_dfe.findMany({
    where: {
      OR: [
        { ds_origem: 'DFE_SIEG' },
        { ds_origem: 'API_IMPORTACAO_XML' },
        { ds_origem: 'API_EMAIL' },
      ],
      ds_tipo: 'NFE',
      js_nfe: {
        id_fis_empresa_emitente: fisEmp.id,
      },
    },
    include: {
      js_nfe: true,
    },
  });
  docDfeEntradaImportados = await prisma.fis_documento_dfe.findMany({
    where: {
      OR: [
        { ds_origem: 'DFE_SIEG' },
        { ds_origem: 'API_IMPORTACAO_XML' },
        { ds_origem: 'API_EMAIL' },
      ],
      ds_tipo: 'NFE',
      js_nfe: {
        id_fis_empresa_destinatario: fisEmp.id,
      },
    },
    include: {
      js_nfe: true,
    },
  });

  let eventosDfe: any[] = [];

  if (
    docDfeSaidaImportados.length === 0 &&
    docDfeEntradaImportados.length === 0
  ) {
    console.log('[SIEG] Nenhum documento DFE importado para inclusão');
    return { importedCount: 0, importedIds: [] };
  } else {
    const idsIntegrados: string[] = [];
    if (docDfeSaidaImportados.length > 0) {
      for (const docDfeSaida of docDfeSaidaImportados) {
        try {
          const docAlreadyExists = await prisma.fis_documento.findUnique({
            where: {
              uniq_nfe_por_empresa: {
                id_nfe: docDfeSaida.id_nfe,
                id_fis_empresas: docDfeSaida.js_nfe.id_fis_empresa_emitente,
              },
            },
          });
          if (docAlreadyExists) continue;
          const integrados = await prisma.fis_documento.create({
            data: {
              id_fis_empresas: docDfeSaida.js_nfe.id_fis_empresa_emitente,
              ds_tipo: 'NFE',
              ds_status: 'IMPORTADO',
              id_nfe: docDfeSaida.id_nfe,
              ds_origem:
                docDfeSaida.ds_origem === 'API_IMPORTACAO_XML' ||
                docDfeSaida.ds_origem === 'API_EMAIL'
                  ? { sistema: 'api_importacao_xml' }
                  : { sistema: 'api_sieg' },
              ds_tipo_ef: 'SAIDA',
            },
          });
          createDocumentoHistorico({
            justificativa: 'Sincronização SIEG',
            id_documento: integrados.id,
            status_novo: integrados.ds_status,
          });
          await prisma.fis_documento_dfe.update({
            where: { id: docDfeSaida.id },
            data: {
              id_fis_documento: integrados.id,
              ds_situacao_integracao: 'INTEGRADO',
            },
          });
          idsIntegrados.push(integrados.id);
          importedIds.push(integrados.id);
          importedCount++;
        } catch (error) {
          console.error(
            `[SIEG] Erro ao processar DFE ${docDfeSaida.id}:`,
            error
          );
        }
      }
    }
    if (docDfeEntradaImportados.length > 0) {
      for (const docDfeEntrada of docDfeEntradaImportados) {
        try {
          const docAlreadyExists = await prisma.fis_documento.findUnique({
            where: {
              uniq_nfe_por_empresa: {
                id_nfe: docDfeEntrada.id_nfe,
                id_fis_empresas:
                  docDfeEntrada.js_nfe.id_fis_empresa_destinatario,
              },
            },
          });
          if (docAlreadyExists) continue;
          const integrados = await prisma.fis_documento.create({
            data: {
              id_fis_empresas: docDfeEntrada.js_nfe.id_fis_empresa_destinatario,
              ds_tipo: 'NFE',
              ds_status: 'AGUARDANDO_VALIDACAO',
              id_nfe: docDfeEntrada.id_nfe,
              ds_origem:
                docDfeEntrada.ds_origem === 'API_IMPORTACAO_XML' ||
                docDfeEntrada.ds_origem === 'API_EMAIL'
                  ? { sistema: 'api_importacao_xml' }
                  : { sistema: 'api_sieg' },
              ds_tipo_ef: 'ENTRADA',
            },
          });
          createDocumentoHistorico({
            justificativa: 'Sincronização SIEG',
            id_documento: integrados.id,
            status_novo: integrados.ds_status,
          });
          await prisma.fis_documento_dfe.update({
            where: { id: docDfeEntrada.id },
            data: {
              id_fis_documento: integrados.id,
              ds_situacao_integracao: 'INTEGRADO',
            },
          });
          idsIntegrados.push(integrados.id);
          importedIds.push(integrados.id);
          importedCount++;
        } catch (error) {
          console.error(
            `[SIEG] Erro ao processar DFE ${docDfeEntrada.id}:`,
            error
          );
        }
      }
    }
    eventosDfe = await prisma.fis_evento_dfe.findMany({
      where: {
        OR: [
          {
            id_evento: null, // só os que ainda não foram integrados
            ds_situacao_integracao: 'IMPORTADO',
            id_fis_documento_dfe: {
              in: docDfeSaidaImportados.map((d) => d.id),
            },
          },
          {
            id_evento: null, // só os que ainda não foram integrados
            ds_situacao_integracao: 'IMPORTADO',
            id_fis_documento_dfe: {
              in: docDfeEntradaImportados.map((d) => d.id),
            },
          },
          { id_fis_documento_dfe: { not: null }, id_evento: null },
        ],
      },
      select: {
        id: true,
      },
    });
    if (eventosDfe.length) {
      await processarEventosPendentes(eventosDfe.map((e) => e.id));
    }
    console.log('inclusao saiu');
    return { importedCount, importedIds };
  }
};

// ----------- Inclusão CTe ----------- //
export const inclusaoCteSieg = async (
  empresaId: string
): Promise<{ importedCount: number; importedIds: string[] }> => {
  let importedCount = 0;
  let importedIds: string[] = [];
  const fisEmp = await getFiscalEmpresa(empresaId);
  console.log('[SIEG] iniciar inclusão de CTe');
  let docDfeSaidaImportados: any[] = [];
  let docDfeEntradaImportados: any[] = [];
  docDfeSaidaImportados = await prisma.fis_documento_dfe.findMany({
    where: {
      OR: [
        { ds_origem: 'DFE_SIEG' },
        { ds_origem: 'API_IMPORTACAO_XML' },
        { ds_origem: 'API_EMAIL' },
      ],
      ds_tipo: 'CTE',
      js_cte: {
        id_fis_empresa_emitente: fisEmp.id,
      },
    },
    include: {
      js_cte: true,
    },
  });
  docDfeEntradaImportados = await prisma.fis_documento_dfe.findMany({
    where: {
      OR: [
        { ds_origem: 'DFE_SIEG' },
        { ds_origem: 'API_IMPORTACAO_XML' },
        { ds_origem: 'API_EMAIL' },
      ],
      ds_tipo: 'CTE',
      js_cte: {
        id_fis_empresa_tomador: fisEmp.id,
      },
    },
    include: {
      js_cte: true,
    },
  });

  let eventosDfe: any[] = [];

  if (
    docDfeSaidaImportados.length === 0 &&
    docDfeEntradaImportados.length === 0
  ) {
    console.log('[SIEG] Nenhum documento DFE importado para inclusão');
    return { importedCount: 0, importedIds: [] };
  } else {
    if (docDfeSaidaImportados.length > 0) {
      for (const docDfeSaida of docDfeSaidaImportados) {
        try {
          const docAlreadyExists = await prisma.fis_documento.findUnique({
            where: {
              uniq_cte_por_empresa: {
                id_cte: docDfeSaida.id_cte,
                id_fis_empresas: docDfeSaida.js_cte.id_fis_empresa_emitente,
              },
            },
          });
          if (docAlreadyExists) continue;
          const integrados = await prisma.fis_documento.create({
            data: {
              id_fis_empresas: docDfeSaida.js_cte.id_fis_empresa_emitente,
              ds_tipo: 'CTE',
              ds_status: 'IMPORTADO',
              id_cte: docDfeSaida.id_cte,
              ds_origem:
                docDfeSaida.ds_origem === 'API_IMPORTACAO_XML' ||
                docDfeSaida.ds_origem === 'API_EMAIL'
                  ? { sistema: 'api_importacao_xml' }
                  : { sistema: 'api_sieg' },
              ds_tipo_ef: 'SAIDA',
            },
          });
          createDocumentoHistorico({
            justificativa: 'Sincronização SIEG',
            id_documento: integrados.id,
            status_novo: integrados.ds_status,
          });
          await prisma.fis_documento_dfe.update({
            where: { id: docDfeSaida.id },
            data: {
              id_fis_documento: integrados.id,
              ds_situacao_integracao: 'INTEGRADO',
            },
          });
          importedIds.push(integrados.id);
          importedCount++;
        } catch (error) {
          console.error(
            `[SIEG] Erro ao processar DFE ${docDfeSaida.id}:`,
            error
          );
        }
      }
    }
    if (docDfeEntradaImportados.length > 0) {
      for (const docDfeEntrada of docDfeEntradaImportados) {
        try {
          const docAlreadyExists = await prisma.fis_documento.findFirst({
            where: {
              id_cte: docDfeEntrada.id_cte,
              ...(fisEmp.id === docDfeEntrada.js_cte.id_fis_empresa_destinatario
                ? {
                    id_fis_empresas:
                      docDfeEntrada.js_cte.id_fis_empresa_destinatario,
                  }
                : {
                    id_fis_empresas:
                      docDfeEntrada.js_cte.id_fis_empresa_tomador,
                  }),
            },
          });
          if (docAlreadyExists) continue;
          const integrados = await prisma.fis_documento.create({
            data: {
              ...(fisEmp.id === docDfeEntrada.js_cte.id_fis_empresa_destinatario
                ? {
                    id_fis_empresas:
                      docDfeEntrada.js_cte.id_fis_empresa_destinatario,
                  }
                : {
                    id_fis_empresas:
                      docDfeEntrada.js_cte.id_fis_empresa_tomador,
                  }),
              ds_tipo: 'CTE',
              ds_status: 'IMPORTADO',
              id_cte: docDfeEntrada.id_cte,
              ds_origem:
                docDfeEntrada.ds_origem === 'API_IMPORTACAO_XML' ||
                docDfeEntrada.ds_origem === 'API_EMAIL'
                  ? { sistema: 'api_importacao_xml' }
                  : { sistema: 'api_sieg' },
              ds_tipo_ef: 'ENTRADA',
            },
          });
          createDocumentoHistorico({
            justificativa: 'Sincronização SIEG',
            id_documento: integrados.id,
            status_novo: integrados.ds_status,
          });
          await prisma.fis_documento_dfe.update({
            where: { id: docDfeEntrada.id },
            data: {
              id_fis_documento: integrados.id,
              ds_situacao_integracao: 'INTEGRADO',
            },
          });
          importedIds.push(integrados.id);
          importedCount++;
        } catch (error) {
          console.error(
            `[SIEG] Erro ao processar DFE ${docDfeEntrada.id}:`,
            error
          );
        }
      }
    }
    eventosDfe = await prisma.fis_evento_dfe.findMany({
      where: {
        OR: [
          {
            id_evento: null, // só os que ainda não foram integrados
            ds_situacao_integracao: 'IMPORTADO',
            id_fis_documento_dfe: {
              in: docDfeSaidaImportados.map((d) => d.id),
            },
          },
          {
            id_evento: null, // só os que ainda não foram integrados
            ds_situacao_integracao: 'IMPORTADO',
            id_fis_documento_dfe: {
              in: docDfeEntradaImportados.map((d) => d.id),
            },
          },
          { id_fis_documento_dfe: { not: null }, id_evento: null },
        ],
      },
      select: {
        id: true,
      },
    });
    if (eventosDfe.length) {
      await processarEventosPendentes(eventosDfe.map((e) => e.id));
    }

    return { importedCount, importedIds };
  }
};

// ----------- Inclusão NFe ----------- //
export const inclusaoNfceSieg = async (
  empresaId: string
): Promise<{ importedCount: number; importedIds: string[] }> => {
  let importedCount = 0;
  let importedIds: string[] = [];
  const fisEmp = await getFiscalEmpresa(empresaId);
  console.log('[SIEG] iniciar inclusão de NFCe');
  let docDfeSaidaImportados: any[] = [];
  let docDfeEntradaImportados: any[] = [];
  docDfeSaidaImportados = await prisma.fis_documento_dfe.findMany({
    where: {
      OR: [
        { ds_origem: 'DFE_SIEG' },
        { ds_origem: 'API_IMPORTACAO_XML' },
        { ds_origem: 'API_EMAIL' },
      ],
      ds_tipo: 'NFCE',
      js_nfe: {
        id_fis_empresa_emitente: fisEmp.id,
      },
    },
    include: {
      js_nfe: true,
    },
  });
  docDfeEntradaImportados = await prisma.fis_documento_dfe.findMany({
    where: {
      OR: [
        { ds_origem: 'DFE_SIEG' },
        { ds_origem: 'API_IMPORTACAO_XML' },
        { ds_origem: 'API_EMAIL' },
      ],
      ds_tipo: 'NFCE',
      js_nfe: {
        id_fis_empresa_destinatario: fisEmp.id,
      },
    },
    include: {
      js_nfe: true,
    },
  });

  let eventosDfe: any[] = [];

  if (
    docDfeEntradaImportados.length === 0 &&
    docDfeSaidaImportados.length === 0
  ) {
    console.log('[SIEG] Nenhum documento DFE importado para inclusão');
    return { importedCount: 0, importedIds: [] };
  } else {
    const idsIntegrados: string[] = [];
    if (docDfeSaidaImportados.length > 0) {
      for (const docDfeSaida of docDfeSaidaImportados) {
        try {
          const docAlreadyExists = await prisma.fis_documento.findUnique({
            where: {
              uniq_nfe_por_empresa: {
                id_nfe: docDfeSaida.id_nfe,
                id_fis_empresas: docDfeSaida.js_nfe.id_fis_empresa_emitente,
              },
            },
          });
          if (docAlreadyExists) continue;
          const integrados = await prisma.fis_documento.create({
            data: {
              id_fis_empresas: docDfeSaida.js_nfe.id_fis_empresa_emitente,
              ds_tipo: 'NFCE',
              ds_status: 'IMPORTADO',
              id_nfe: docDfeSaida.id_nfe,
              ds_origem:
                docDfeSaida.ds_origem === 'API_IMPORTACAO_XML' ||
                docDfeSaida.ds_origem === 'API_EMAIL'
                  ? { sistema: 'api_importacao_xml' }
                  : { sistema: 'api_sieg' },
              ds_tipo_ef: 'SAIDA',
            },
          });
          createDocumentoHistorico({
            justificativa: 'Sincronização SIEG',
            id_documento: integrados.id,
            status_novo: integrados.ds_status,
          });
          await prisma.fis_documento_dfe.update({
            where: { id: docDfeSaida.id },
            data: {
              id_fis_documento: integrados.id,
              ds_situacao_integracao: 'INTEGRADO',
            },
          });
          idsIntegrados.push(integrados.id);
          importedIds.push(integrados.id);
          importedCount++;
        } catch (error) {
          console.error(
            `[SIEG] Erro ao processar DFE ${docDfeSaida.id}:`,
            error
          );
        }
      }
    }
    if (docDfeEntradaImportados.length > 0) {
      for (const docDfeEntrada of docDfeEntradaImportados) {
        try {
          const docAlreadyExists = await prisma.fis_documento.findUnique({
            where: {
              uniq_nfe_por_empresa: {
                id_nfe: docDfeEntrada.id_nfe,
                id_fis_empresas:
                  docDfeEntrada.js_nfe.id_fis_empresa_destinatario,
              },
            },
          });
          if (docAlreadyExists) continue;
          const integrados = await prisma.fis_documento.create({
            data: {
              id_fis_empresas: docDfeEntrada.js_nfe.id_fis_empresa_destinatario,
              ds_tipo: 'NFCE',
              ds_status: 'AGUARDANDO_VALIDACAO',
              id_nfe: docDfeEntrada.id_nfe,
              ds_origem:
                docDfeEntrada.ds_origem === 'API_IMPORTACAO_XML' ||
                docDfeEntrada.ds_origem === 'API_EMAIL'
                  ? { sistema: 'api_importacao_xml' }
                  : { sistema: 'api_sieg' },
              ds_tipo_ef: 'ENTRADA',
            },
          });
          createDocumentoHistorico({
            justificativa: 'Sincronização SIEG',
            id_documento: integrados.id,
            status_novo: integrados.ds_status,
          });
          await prisma.fis_documento_dfe.update({
            where: { id: docDfeEntrada.id },
            data: {
              id_fis_documento: integrados.id,
              ds_situacao_integracao: 'INTEGRADO',
            },
          });
          idsIntegrados.push(integrados.id);
          importedIds.push(integrados.id);
          importedCount++;
        } catch (error) {
          console.error(
            `[SIEG] Erro ao processar DFE ${docDfeEntrada.id}:`,
            error
          );
        }
      }
    }
    eventosDfe = await prisma.fis_evento_dfe.findMany({
      where: {
        OR: [
          {
            id_evento: null, // só os que ainda não foram integrados
            ds_situacao_integracao: 'IMPORTADO',
            id_fis_documento_dfe: {
              in: docDfeEntradaImportados.map((d) => d.id),
            },
          },
          {
            id_evento: null, // só os que ainda não foram integrados
            ds_situacao_integracao: 'IMPORTADO',
            id_fis_documento_dfe: {
              in: docDfeSaidaImportados.map((d) => d.id),
            },
          },
          { id_fis_documento_dfe: { not: null }, id_evento: null },
        ],
      },
      select: {
        id: true,
      },
    });
    if (eventosDfe.length) {
      await processarEventosPendentes(eventosDfe.map((e) => e.id));
    }
    console.log('inclusao saiu');
    return { importedCount, importedIds };
  }
};

// ----------- Processamento de Eventos Pendentes ----------- //
const MAP_CANCELA = new Set(['110111', '101101']);
const MAP_DESCONHECIMENTO = new Set(['210220']); // Desconhecimento da Operação
const MAP_NAO_REALIZADA = new Set(['210240']); // Operação não Realizada
export async function processarEventosPendentes(
  eventosDfeIds: string[] // ids já filtrados na inclusão
) {
  /* carrega eventos + dfe + empresas numa única ida ao banco */
  const eventosRaw = await prisma.fis_evento_dfe.findMany({
    where: {
      OR: [
        { id: { in: eventosDfeIds }, id_evento: null },
        { id_fis_documento_dfe: { not: null }, id_evento: null },
      ],
    },
    select: {
      id: true,
      ds_evento_id: true,
      ds_chave_doc: true,
      cd_codigo_evento: true,
      ds_seq_evento: true,
      ds_descricao_evento: true,
      dt_evento: true,
      ds_justificativa_evento: true,
      ds_protocolo: true,
      ds_status_retorno: true,
      fis_documento_dfe: {
        select: {
          id: true,
          id_fis_documento: true,
        },
      },
    },
  });
  // transforma eventos em lista plana ignorando DFEs sem documento vinculado
  const items: Array<{
    eventoDfeId: string;
    ds_evento_id: string;
    ds_chave_doc: string | null;
    cd_codigo_evento: string | null;
    ds_seq_evento: number | null;
    ds_descricao_evento: string | null;
    dt_evento: string | Date | null;
    ds_justificativa_evento: string | null;
    ds_protocolo: string | null;
    ds_status_retorno: string | null;
    id_fis_documento: string | null;
    id_fis_documento_dfe: string | null;
  }> = [];

  for (const ev of eventosRaw) {
    const dfe = ev.fis_documento_dfe;
    if (!dfe || !dfe.id_fis_documento) continue; // mantém comportamento atual
    items.push({
      eventoDfeId: ev.id,
      ds_evento_id: ev.ds_evento_id,
      ds_chave_doc: ev.ds_chave_doc ?? null,
      cd_codigo_evento: ev.cd_codigo_evento ?? null,
      ds_seq_evento: ev.ds_seq_evento ?? null,
      ds_descricao_evento: ev.ds_descricao_evento ?? null,
      dt_evento: ev.dt_evento ?? null,
      ds_justificativa_evento: ev.ds_justificativa_evento ?? null,
      ds_protocolo: ev.ds_protocolo ?? null,
      ds_status_retorno: ev.ds_status_retorno ?? null,
      id_fis_documento: dfe.id_fis_documento,
      id_fis_documento_dfe: dfe.id,
    });
  }

  const chunkSize = 300;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    const dsIds = Array.from(new Set(chunk.map((c) => c.ds_evento_id)));
    const docIds = Array.from(new Set(chunk.map((c) => c.id_fis_documento)));

    // busca eventos já existentes para o conjunto (por ds_evento_id + id_fis_documento)
    const existing = await prisma.fis_evento.findMany({
      where: {
        ds_evento_id: { in: dsIds },
        id_fis_documento: { in: docIds },
      },
      select: { id: true, ds_evento_id: true, id_fis_documento: true },
    });
    const existingMap = new Map<string, string>();
    existing.forEach((e) =>
      existingMap.set(`${e.ds_evento_id}|${e.id_fis_documento}`, e.id)
    );

    // prepara inserts apenas para os que ainda não existem
    const toCreate = chunk
      .filter((c) => {
        const existsKey = `${c.ds_evento_id}|${c.id_fis_documento}`;
        return !existingMap.has(existsKey);
      })
      .map((c) => {
        return {
          ds_evento_id: c.ds_evento_id,
          ds_chave_doc: c.ds_chave_doc,
          cd_codigo_evento: c.cd_codigo_evento,
          ds_descricao_evento: c.ds_descricao_evento,
          ds_seq_evento: c.ds_seq_evento,
          dt_evento: c.dt_evento ? new Date(c.dt_evento) : null,
          ds_justificativa_evento: c.ds_justificativa_evento,
          ds_protocolo: c.ds_protocolo,
          ds_status_retorno: c.ds_status_retorno,
          id_fis_documento: c.id_fis_documento,
        };
      });

    if (toCreate.length) {
      try {
        await prisma.fis_evento.createMany({
          data: toCreate,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[SIEG] erro ao gravar lote de eventos:', e);
      }
    }

    // recupera todos (existentes + recém-criados) para mapear ids
    const all = await prisma.fis_evento.findMany({
      where: {
        ds_evento_id: { in: dsIds },
        id_fis_documento: { in: docIds },
      },
      select: { id: true, ds_evento_id: true, id_fis_documento: true },
    });
    const mapAll = new Map<string, string>();
    all.forEach((e) => {
      mapAll.set(`${e.ds_evento_id}|${e.id_fis_documento}`, e.id);
    });

    // prepara updates para fis_evento_dfe e possíveis eventos de status
    const updateOps: any[] = [];
    const cancelDocIds = new Set<{
      docId: string;
      dfeId: string | null;
      tipo: string;
    }>();
    for (const c of chunk) {
      const key = `${c.ds_evento_id}|${c.id_fis_documento}`;
      const eventoId = mapAll.get(key);
      if (eventoId) {
        updateOps.push(
          prisma.fis_evento_dfe.update({
            where: { id: c.eventoDfeId },
            data: {
              id_evento: eventoId,
              ds_situacao_integracao: 'INTEGRADO',
              ds_error: null,
            },
          })
        );
      }
      // marca documento por tipo de evento (cancelamento, desconhecimento ou operação não realizada)
      if (c.cd_codigo_evento) {
        if (MAP_CANCELA.has(c.cd_codigo_evento)) {
          cancelDocIds.add({
            docId: c.id_fis_documento as string,
            dfeId: c.id_fis_documento_dfe,
            tipo: 'CANCELADO',
          } as any);
        } else if (MAP_DESCONHECIMENTO.has(c.cd_codigo_evento)) {
          cancelDocIds.add({
            docId: c.id_fis_documento as string,
            dfeId: c.id_fis_documento_dfe,
            tipo: 'DESCONHECIMENTO_DA_OPERACAO',
          } as any);
        } else if (MAP_NAO_REALIZADA.has(c.cd_codigo_evento)) {
          cancelDocIds.add({
            docId: c.id_fis_documento as string,
            dfeId: c.id_fis_documento_dfe,
            tipo: 'OPERACAO_NAO_REALIZADA',
          } as any);
        }
      }
    }

    // inclui updates de status no mesmo batch de transaction
    for (const docInfo of Array.from(cancelDocIds)) {
      const { docId, dfeId, tipo } = docInfo as any;
      const statusMap: Record<string, StatusDocumento> = {
        CANCELADO: StatusDocumento.CANCELADO,
        DESCONHECIMENTO_DA_OPERACAO:
          StatusDocumento.DESCONHECIMENTO_DA_OPERACAO,
        OPERACAO_NAO_REALIZADA: StatusDocumento.OPERACAO_NAO_REALIZADA,
      };

      const novoStatus = statusMap[tipo];
      if (!novoStatus) continue;

      // Atualiza DFE se ainda não estiver cancelado
      if (dfeId) {
        updateOps.push(
          prisma.fis_documento_dfe.updateMany({
            where: { id: dfeId, ds_status: { not: 'CANCELADO' } },
            data: { ds_status: 'CANCELADO' },
          })
        );
      }

      updateOps.push(
        prisma.fis_documento.update({
          where: { id: docId },
          data: { ds_status: novoStatus },
        })
      );

      const documento = await prisma.fis_documento.findUnique({
        where: { id: docId },
        select: { id: true, ds_status: true },
      });

      const justificativaMap: Record<string, string> = {
        CANCELADO: 'Evento de Cancelamento',
        DESCONHECIMENTO_DA_OPERACAO: 'Evento de Desconhecimento da Operação',
        OPERACAO_NAO_REALIZADA: 'Evento de Operação não Realizada',
      };

      createDocumentoHistorico({
        justificativa: justificativaMap[tipo],
        id_documento: documento.id,
        status_novo: novoStatus,
        status_antigo: documento.ds_status,
      });
    }

    if (updateOps.length) {
      try {
        await prisma.$transaction(updateOps);
      } catch (e) {
        console.error('[SIEG] erro ao atualizar eventos pendentes em lote:', e);
      }
    }
  }
}

export const createConsultaAno = async (ano: number, escritorioId: string) => {
  const dataAtual = new Date();
  const anoAtual = dataAtual.getFullYear();
  let fimConsulta = `${ano}-12`;
  if (ano < 2010 || ano > anoAtual) {
    throw new Error('Ano inválido');
  }
  if (ano === anoAtual) {
    // se for o ano atual, consulta até o mês atual
    fimConsulta = `${ano}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;
  }
  console.log('[SIEG] Coleta por Ano');
  const empresas = await prisma.sis_empresas.findMany({
    where: {
      id_escritorio: escritorioId,
      js_access: {
        some: {
          js_modules: { has: 'FISCAL' },
        },
      },
      is_ativo: true,
    },
    select: { id: true },
  });
  // empresas.push({ id: escritorioId });
  for (const emp of empresas) {
    let verf = 1;
    try {
      await sincronizarFornecedoresByEmpresaId(emp.id);
      do {
        const competencia = `${ano}-${String(verf)}`;
        await coletarNfseSieg(emp.id, competencia);
        await coletarNfseSaidaSieg(emp.id, competencia);
        await coletarNfeSieg(emp.id, competencia);
        await coletarNfeSaidaSieg(emp.id, competencia);
        await coletarCteSieg(emp.id, competencia);
        await coletarCteSaidaSieg(emp.id, competencia);
        await inclusaoNfseSieg(emp.id, competencia);
        await sincronizarDominioNfseByEmpresaId(emp.id, competencia);
        verf++;
      } while (verf !== new Date(fimConsulta + '-01').getMonth() + 1);
    } catch (err) {
      console.error('Erro ao sincronizar dados:', err);
    } finally {
      continue;
    }
  }
};
