/**
 * Parser on-demand de fis_documento_dfe.ds_raw para pré-preenchimento de carga.
 * Lê ds_raw (JSON ou XML), extrai cliente, embarcador, origem, destino, entregas e características.
 */

import { prisma } from '@/services/prisma';
import { getFiscalEmpresa } from '../fiscal/fiscal-empresa.service';
import { getTmsEmpresa } from './tms-empresa.service';
import { StandardCteParser } from '../fiscal/onvio/cte-parser.service';
import { parseStringPromise } from 'xml2js';
import {
  syncCteFromDto,
  type CteDtoForSync,
} from './sync-parse-to-entities.service';
import {
  agruparDocumentosParaEntregas,
  type DocumentoRelacionadoGroup,
} from './documentos-relacionados.service';

// --- DTO padronizado (saída do parser) ---

export interface EnderecoDTO {
  ds_cep?: string;
  ds_logradouro?: string;
  ds_numero?: string;
  ds_complemento?: string;
  ds_bairro?: string;
  ds_uf?: string;
  cd_municipio_ibge?: string;
}

export interface ClienteOuEmbarcadorDTO {
  ds_nome: string;
  ds_documento?: string;
  ds_ie?: string;
  endereco?: EnderecoDTO;
  cd_municipio_ibge?: string;
}

export interface OrigemDestinoDTO {
  id_cidade?: number;
  cd_municipio_ibge?: string;
  ds_nome_mun?: string;
  ds_uf?: string;
}

export interface CaracteristicasCargaDTO {
  vl_peso_bruto?: number;
  vl_cubagem?: number;
  vl_qtd_volumes?: number;
  vl_mercadoria?: number;
  ds_produto_predominante?: string;
}

export interface DocumentoEntregasDTO {
  id: string;
  tipo: 'CTE' | 'NFE';
}

export interface EntregaPreenchidaDTO {
  id_cidade_destino?: number;
  cd_municipio_ibge?: string;
  ds_nome_mun?: string;
  ds_uf?: string;
  ds_endereco?: string;
  ds_complemento?: string;
  ds_nome_recebedor?: string;
  ds_documento_recebedor?: string;
  ds_nome_destinatario?: string;
  ds_documento_destinatario?: string;
  vl_total_mercadoria?: number;
  js_produtos?: string[];
  documentos: DocumentoEntregasDTO[];
}

export interface CargaPreenchidaDTO {
  cliente: ClienteOuEmbarcadorDTO | null;
  embarcador: ClienteOuEmbarcadorDTO | null;
  origem: OrigemDestinoDTO | null;
  destino: OrigemDestinoDTO | null;
  caracteristicas: CaracteristicasCargaDTO;
  entregas: EntregaPreenchidaDTO[];
  documentos: DocumentoEntregasDTO[];
}

export interface ParserWarning {
  codigo?: string;
  mensagem: string;
}

export interface ParseDocumentosParaCargaResult {
  dados: CargaPreenchidaDTO;
  warnings: ParserWarning[];
}

const cteParser = new StandardCteParser();

/**
 * Garante que ds_raw seja um objeto (parse de JSON ou XML).
 */
async function parseRaw(ds_raw: string): Promise<any> {
  const trimmed = (ds_raw || '').trim();
  if (!trimmed) {
    throw new Error('ds_raw vazio');
  }
  if (trimmed.startsWith('<')) {
    return parseStringPromise(trimmed, { explicitArray: true });
  }
  return JSON.parse(trimmed) as any;
}

/**
 * Resolve id_cidade a partir do código IBGE (7 dígitos) quando existir em sis_igbe_city.
 */
async function resolveIdCidade(
  cd_municipio_ibge: string | undefined
): Promise<number | undefined> {
  if (!cd_municipio_ibge || !/^\d{6,7}$/.test(cd_municipio_ibge))
    return undefined;
  const id = parseInt(cd_municipio_ibge, 10);
  const city = await prisma.sis_igbe_city.findUnique({
    where: { id },
    select: { id: true },
  });
  return city?.id;
}

/**
 * Extrai dados de um CT-e (objeto já parseado) para o DTO.
 */
function extrairDeCte(
  cteDto: {
    toma_CNPJ?: string;
    toma_xNome?: string;
    toma_CPF?: string;
    rem_CNPJ?: string;
    rem_xNome?: string;
    exped_CNPJ?: string;
    exped_xNome?: string;
    receb_CNPJ?: string;
    receb_xNome?: string;
    dest_CNPJ?: string;
    dest_xNome?: string;
    cd_mun_ini?: string;
    ds_nome_mun_ini?: string;
    ds_uf_ini?: string;
    cd_mun_fim?: string;
    ds_nome_mun_fim?: string;
    ds_uf_fim?: string;
    cargaItens?: Array<{
      ds_und: string;
      ds_tipo_medida: string;
      vl_qtd_carregada: string;
    }>;
    cargaComponentes?: Array<{ ds_nome: string; vl_comp: string }>;
    vl_total?: string;
    vl_mercadoria_carga?: string;
    ds_produto_predominante?: string;
  },
  idDfe: string,
  warnings: ParserWarning[]
): {
  cliente: ClienteOuEmbarcadorDTO | null;
  embarcador: ClienteOuEmbarcadorDTO | null;
  origem: OrigemDestinoDTO;
  destino: OrigemDestinoDTO;
  caracteristicas: CaracteristicasCargaDTO;
  entrega: EntregaPreenchidaDTO;
} {
  const docRef = { id: idDfe, tipo: 'CTE' as const };

  const tomaDoc = cteDto.toma_CNPJ || cteDto.toma_CPF;
  const cliente: ClienteOuEmbarcadorDTO | null =
    cteDto.toma_xNome || tomaDoc
      ? {
          ds_nome: cteDto.toma_xNome || tomaDoc || 'Tomador',
          ds_documento: tomaDoc ?? undefined,
        }
      : null;

  // Embarcador = expedidor (exped); se não houver exped, fallback para remetente (rem)
  const embarcador: ClienteOuEmbarcadorDTO | null =
    cteDto.exped_xNome || cteDto.exped_CNPJ
      ? {
          ds_nome: cteDto.exped_xNome || cteDto.exped_CNPJ || 'Expedidor',
          ds_documento: cteDto.exped_CNPJ,
        }
      : cteDto.rem_xNome || cteDto.rem_CNPJ
        ? {
            ds_nome: cteDto.rem_xNome || cteDto.rem_CNPJ || 'Expedidor',
            ds_documento: cteDto.rem_CNPJ,
          }
        : null;

  const origem: OrigemDestinoDTO = {
    cd_municipio_ibge: cteDto.cd_mun_ini,
    ds_nome_mun: cteDto.ds_nome_mun_ini,
    ds_uf: cteDto.ds_uf_ini,
  };

  const destino: OrigemDestinoDTO = {
    cd_municipio_ibge: cteDto.cd_mun_fim,
    ds_nome_mun: cteDto.ds_nome_mun_fim,
    ds_uf: cteDto.ds_uf_fim,
  };

  let vl_peso_bruto: number | undefined;
  let vl_cubagem: number | undefined;
  let vl_qtd_volumes: number | undefined;
  let vl_mercadoria: number | undefined;

  if (cteDto.cargaItens?.length) {
    for (const item of cteDto.cargaItens) {
      const qtd = parseFloat(item.vl_qtd_carregada || '0');
      const tipo = (item.ds_tipo_medida || '').toUpperCase();
      if (tipo.includes('PESO') || tipo === 'KG' || tipo === 'TON') {
        vl_peso_bruto = (vl_peso_bruto ?? 0) + qtd;
      } else if (tipo.includes('M3') || tipo.includes('CUB')) {
        vl_cubagem = (vl_cubagem ?? 0) + qtd;
      } else {
        vl_qtd_volumes = (vl_qtd_volumes ?? 0) + Math.round(qtd) || 1;
      }
    }
  }
  // Valor da mercadoria: preferir vCargaAverb/vCarga (infCarga), não vTPrest (valor do CT-e)
  if (cteDto.vl_mercadoria_carga) {
    const v = parseFloat(cteDto.vl_mercadoria_carga);
    if (!Number.isNaN(v)) vl_mercadoria = v;
  }
  if (vl_mercadoria === undefined && cteDto.cargaComponentes?.length) {
    for (const c of cteDto.cargaComponentes) {
      const v = parseFloat(c.vl_comp || '0');
      if (c.ds_nome?.toUpperCase().includes('MERCADORIA')) {
        vl_mercadoria = v;
        break;
      }
    }
  }
  if (vl_mercadoria === undefined && cteDto.vl_total) {
    const v = parseFloat(cteDto.vl_total);
    if (!Number.isNaN(v)) vl_mercadoria = v;
  }

  const caracteristicas: CaracteristicasCargaDTO = {};
  if (vl_peso_bruto != null) caracteristicas.vl_peso_bruto = vl_peso_bruto;
  if (vl_cubagem != null) caracteristicas.vl_cubagem = vl_cubagem;
  if (vl_qtd_volumes != null) caracteristicas.vl_qtd_volumes = vl_qtd_volumes;
  if (vl_mercadoria != null) caracteristicas.vl_mercadoria = vl_mercadoria;
  if (cteDto.ds_produto_predominante?.trim())
    caracteristicas.ds_produto_predominante =
      cteDto.ds_produto_predominante.trim();

  const js_produtos: string[] = caracteristicas.ds_produto_predominante
    ? [caracteristicas.ds_produto_predominante]
    : [];

  const entrega: EntregaPreenchidaDTO = {
    cd_municipio_ibge: cteDto.cd_mun_fim,
    ds_nome_mun: cteDto.ds_nome_mun_fim,
    ds_uf: cteDto.ds_uf_fim,
    ds_nome_recebedor: cteDto.receb_xNome,
    ds_documento_recebedor: cteDto.receb_CNPJ,
    ds_nome_destinatario: cteDto.dest_xNome,
    ds_documento_destinatario: cteDto.dest_CNPJ,
    vl_total_mercadoria: caracteristicas.vl_mercadoria,
    js_produtos: js_produtos.length ? js_produtos : undefined,
    documentos: [docRef],
  };

  return { cliente, embarcador, origem, destino, caracteristicas, entrega };
}

/**
 * Extrai dados de uma NF-e (objeto já parseado) para entregas e características.
 * Cliente e embarcador ficam vazios (preenchimento manual).
 */
function extrairDeNfe(
  nfeObj: any,
  idDfe: string,
  warnings: ParserWarning[]
): {
  origem: OrigemDestinoDTO | null;
  destino: OrigemDestinoDTO | null;
  caracteristicas: CaracteristicasCargaDTO;
  entrega: EntregaPreenchidaDTO;
} {
  const docRef = { id: idDfe, tipo: 'NFE' as const };

  let dest: any = {};
  let emit: any = {};
  let ide: any = {};
  let total: any = {};
  let det: any[] = [];

  const infNFe =
    nfeObj?.nfeProc?.[0]?.NFe?.[0]?.infNFe?.[0] ??
    nfeObj?.NFe?.[0]?.infNFe?.[0] ??
    nfeObj?.infNFe?.[0];

  if (infNFe) {
    ide = infNFe.ide?.[0] ?? {};
    dest = infNFe.dest?.[0] ?? {};
    emit = infNFe.emit?.[0] ?? {};
    total = infNFe.total?.[0]?.ICMSTot?.[0] ?? {};
    det = Array.isArray(infNFe.det) ? infNFe.det : [];
  }

  const cdMun = ide.cMunFG?.[0] ?? dest.cMun?.[0];
  const xMun = dest.xMun?.[0];
  const uf = dest.UF?.[0];
  const origem: OrigemDestinoDTO | null = null;
  const destino: OrigemDestinoDTO = {
    cd_municipio_ibge: cdMun,
    ds_nome_mun: xMun,
    ds_uf: uf,
  };

  let vl_peso_bruto: number | undefined;
  let vl_mercadoria: number | undefined;
  const vProd = parseFloat(total.vProd?.[0] || '0');
  if (!Number.isNaN(vProd)) vl_mercadoria = vProd;

  const js_produtos_nfe: string[] = [];
  for (const d of det) {
    const prod = d.prod?.[0];
    if (!prod) continue;
    const peso = parseFloat(prod.pesoB?.[0] || prod.pesoL?.[0] || '0');
    if (!Number.isNaN(peso) && peso > 0)
      vl_peso_bruto = (vl_peso_bruto ?? 0) + peso;
    const xProd = (prod.xProd?.[0] ?? '').trim();
    if (xProd) js_produtos_nfe.push(xProd);
  }
  const js_produtos = Array.from(new Set(js_produtos_nfe));

  const caracteristicas: CaracteristicasCargaDTO = {};
  if (vl_peso_bruto != null) caracteristicas.vl_peso_bruto = vl_peso_bruto;
  if (vl_mercadoria != null) caracteristicas.vl_mercadoria = vl_mercadoria;

  const destDoc = dest.CNPJ?.[0] || dest.CPF?.[0];
  const destNome = dest.xNome?.[0] || 'Destinatário';

  const entrega: EntregaPreenchidaDTO = {
    cd_municipio_ibge: cdMun,
    ds_nome_mun: xMun,
    ds_uf: uf,
    ds_nome_destinatario: destNome,
    ds_documento_destinatario: destDoc,
    vl_total_mercadoria: vl_mercadoria,
    js_produtos: js_produtos.length ? js_produtos : undefined,
    documentos: [docRef],
  };

  return { origem, destino, caracteristicas, entrega };
}

/**
 * Parseia uma lista de fis_documento_dfe (por IDs), lê ds_raw e retorna DTO padronizado + warnings.
 */
export async function parseDocumentosParaCarga(
  empresaId: string,
  documentoDfeIds: string[]
): Promise<ParseDocumentosParaCargaResult> {
  const warnings: ParserWarning[] = [];

  if (!documentoDfeIds?.length) {
    return {
      dados: {
        cliente: null,
        embarcador: null,
        origem: null,
        destino: null,
        caracteristicas: {},
        entregas: [],
        documentos: [],
      },
      warnings: [
        { codigo: 'EMPTY', mensagem: 'Nenhum documento selecionado.' },
      ],
    };
  }

  const [fisEmpresa, tmsEmpresa] = await Promise.all([
    getFiscalEmpresa(empresaId),
    getTmsEmpresa(empresaId),
  ]);

  const docs = await prisma.fis_documento_dfe.findMany({
    where: {
      AND: [
        {
          OR: [
            { id: { in: documentoDfeIds } },
            { js_nfe: { ds_chave: { in: documentoDfeIds } } },
            { js_cte: { ds_chave: { in: documentoDfeIds } } },
          ],
        },
        {
          OR: [
            {
              js_cte: {
                OR: [
                  { id_fis_empresa_emitente: fisEmpresa.id },
                  { id_fis_empresa_subcontratada: fisEmpresa.id },
                ],
              },
            },
            { js_nfe: { id_fis_empresa_transportadora: fisEmpresa.id } },
          ],
        },
      ],
    },
    select: {
      id: true,
      ds_raw: true,
      ds_tipo: true,
      id_nfe: true,
      id_cte: true,
    },
  });

  if (docs.length !== documentoDfeIds.length) {
    warnings.push({
      codigo: 'DOC_NOT_FOUND',
      mensagem:
        'Um ou mais documentos não foram encontrados ou não pertencem à empresa.',
    });
  }

  const resultado: CargaPreenchidaDTO = {
    cliente: null,
    embarcador: null,
    origem: null,
    destino: null,
    caracteristicas: {},
    entregas: [],
    documentos: [],
  };

  const docById = new Map(docs.map((d) => [d.id, d]));

  for (const doc of docs) {
    resultado.documentos.push({
      id: doc.id,
      tipo: doc.ds_tipo === 'NFE' ? 'NFE' : 'CTE',
    });

    if (doc.ds_tipo === 'CTE' && doc.id_cte) {
      // Fluxo seção 1: banco primeiro → se vazio, parsear ds_raw, persistir, usar do banco
      let fisCteFromDb = await prisma.fis_cte.findUnique({
        where: { id: doc.id_cte },
        select: {
          ds_documento_tomador: true,
          ds_razao_social_tomador: true,
          ds_razao_social_expedidor: true,
          ds_documento_expedidor: true,
          ds_razao_social_recebedor: true,
          ds_documento_recebedor: true,
          ds_razao_social_destinatario: true,
          ds_documento_destinatario: true,
          ds_endereco_destino: true,
          ds_complemento_destino: true,
        },
      });

      const tomadorPreenchidoNoBanco = Boolean(
        fisCteFromDb &&
          (fisCteFromDb.ds_razao_social_tomador ||
            fisCteFromDb.ds_documento_tomador)
      );
      if (!tomadorPreenchidoNoBanco && doc.ds_raw) {
        let rawObjSync: any;
        try {
          rawObjSync = await parseRaw(doc.ds_raw);
        } catch {
          rawObjSync = null;
        }
        if (rawObjSync && cteParser.supports(rawObjSync)) {
          const cteDtoSync = cteParser.extract(rawObjSync);
          if (tmsEmpresa?.id) {
            await syncCteFromDto(
              doc.id_cte,
              cteDtoSync as CteDtoForSync,
              tmsEmpresa.id
            ).catch((err) =>
              console.warn(
                '[parser-carga] Sync fis_cte/tomador/embarcadores:',
                err?.message
              )
            );
          }
          fisCteFromDb = await prisma.fis_cte.findUnique({
            where: { id: doc.id_cte },
            select: {
              ds_documento_tomador: true,
              ds_razao_social_tomador: true,
              ds_razao_social_expedidor: true,
              ds_documento_expedidor: true,
              ds_razao_social_recebedor: true,
              ds_documento_recebedor: true,
              ds_razao_social_destinatario: true,
              ds_documento_destinatario: true,
              ds_endereco_destino: true,
              ds_complemento_destino: true,
            },
          });
        }
      }

      let clienteFromDb: ClienteOuEmbarcadorDTO | null = null;
      if (
        fisCteFromDb &&
        (fisCteFromDb.ds_razao_social_tomador ||
          fisCteFromDb.ds_documento_tomador)
      ) {
        clienteFromDb = {
          ds_nome: fisCteFromDb.ds_razao_social_tomador ?? 'Tomador',
          ds_documento: fisCteFromDb.ds_documento_tomador ?? undefined,
        };
      }

      if (
        fisCteFromDb &&
        (fisCteFromDb.ds_razao_social_expedidor ||
          fisCteFromDb.ds_documento_expedidor) &&
        !resultado.embarcador
      ) {
        resultado.embarcador = {
          ds_nome: fisCteFromDb.ds_razao_social_expedidor ?? 'Expedidor',
          ds_documento: fisCteFromDb.ds_documento_expedidor ?? undefined,
        };
      }

      if (doc.ds_raw) {
        let rawObjForRest: any;
        try {
          rawObjForRest = await parseRaw(doc.ds_raw);
        } catch (e: any) {
          warnings.push({
            codigo: 'PARSE_ERROR',
            mensagem: `Documento ${doc.id}: não foi possível interpretar ds_raw (${e?.message || 'erro'}).`,
          });
          rawObjForRest = null;
        }
        if (rawObjForRest && cteParser.supports(rawObjForRest)) {
          const cteDto = cteParser.extract(rawObjForRest);
          const resolved = extrairDeCte(cteDto, doc.id, warnings);
          const entregaFromParser = resolved.entrega;

          const entregaFinal: EntregaPreenchidaDTO = {
            ...entregaFromParser,
          };

          if (fisCteFromDb) {
            if (
              fisCteFromDb.ds_razao_social_recebedor ||
              fisCteFromDb.ds_documento_recebedor
            ) {
              entregaFinal.ds_nome_recebedor =
                fisCteFromDb.ds_razao_social_recebedor ??
                entregaFinal.ds_nome_recebedor;
              entregaFinal.ds_documento_recebedor =
                fisCteFromDb.ds_documento_recebedor ??
                entregaFinal.ds_documento_recebedor;
            }
            if (
              fisCteFromDb.ds_razao_social_destinatario ||
              fisCteFromDb.ds_documento_destinatario
            ) {
              entregaFinal.ds_nome_destinatario =
                fisCteFromDb.ds_razao_social_destinatario ??
                entregaFinal.ds_nome_destinatario;
              entregaFinal.ds_documento_destinatario =
                fisCteFromDb.ds_documento_destinatario ??
                entregaFinal.ds_documento_destinatario;
            }
            if (
              fisCteFromDb.ds_endereco_destino ||
              fisCteFromDb.ds_complemento_destino
            ) {
              entregaFinal.ds_endereco =
                fisCteFromDb.ds_endereco_destino ?? entregaFinal.ds_endereco;
              entregaFinal.ds_complemento =
                fisCteFromDb.ds_complemento_destino ??
                entregaFinal.ds_complemento;
            }
          }

          const clienteFinal = resolved.cliente ?? clienteFromDb;

          if (clienteFinal && !resultado.cliente) {
            resultado.cliente = clienteFinal;
          } else if (!clienteFinal) {
            warnings.push({
              codigo: 'CTE_SEM_TOMADOR',
              mensagem:
                'Tomador não identificado no CT-e; defina o cliente manualmente.',
            });
          }

          if (!resultado.origem) resultado.origem = resolved.origem;
          if (resolved.destino) resultado.destino = resolved.destino;
          if (resolved.embarcador && !resultado.embarcador)
            resultado.embarcador = resolved.embarcador;
          if (resolved.caracteristicas.vl_peso_bruto != null)
            resultado.caracteristicas.vl_peso_bruto =
              (resultado.caracteristicas.vl_peso_bruto ?? 0) +
              resolved.caracteristicas.vl_peso_bruto!;
          if (resolved.caracteristicas.vl_cubagem != null)
            resultado.caracteristicas.vl_cubagem =
              (resultado.caracteristicas.vl_cubagem ?? 0) +
              resolved.caracteristicas.vl_cubagem!;
          if (resolved.caracteristicas.vl_qtd_volumes != null)
            resultado.caracteristicas.vl_qtd_volumes =
              (resultado.caracteristicas.vl_qtd_volumes ?? 0) +
              resolved.caracteristicas.vl_qtd_volumes!;
          if (resolved.caracteristicas.vl_mercadoria != null)
            resultado.caracteristicas.vl_mercadoria =
              (resultado.caracteristicas.vl_mercadoria ?? 0) +
              resolved.caracteristicas.vl_mercadoria!;
          if (
            resolved.caracteristicas.ds_produto_predominante &&
            !resultado.caracteristicas.ds_produto_predominante
          )
            resultado.caracteristicas.ds_produto_predominante =
              resolved.caracteristicas.ds_produto_predominante;
        }
      }
      continue;
    }

    let rawObj: any;
    try {
      rawObj = await parseRaw(doc.ds_raw);
    } catch (e: any) {
      warnings.push({
        codigo: 'PARSE_ERROR',
        mensagem: `Documento ${doc.id}: não foi possível interpretar ds_raw (${e?.message || 'erro'}).`,
      });
      continue;
    }

    if (doc.ds_tipo === 'CTE' && cteParser.supports(rawObj)) {
      const cteDto = cteParser.extract(rawObj);
      const resolved = extrairDeCte(cteDto, doc.id, warnings);

      if (doc.id_cte && tmsEmpresa?.id) {
        await syncCteFromDto(
          doc.id_cte,
          cteDto as CteDtoForSync,
          tmsEmpresa.id
        ).catch((err) =>
          console.warn(
            '[parser-carga] Sync fis_cte/tms_embarcadores:',
            err?.message
          )
        );
      }

      if (!resolved.cliente && doc.id_cte) {
        const fisCte = await prisma.fis_cte.findUnique({
          where: { id: doc.id_cte },
          select: { ds_documento_tomador: true, ds_razao_social_tomador: true },
        });
        if (
          fisCte &&
          (fisCte.ds_razao_social_tomador || fisCte.ds_documento_tomador)
        ) {
          resolved.cliente = {
            ds_nome: fisCte.ds_razao_social_tomador ?? 'Tomador',
            ds_documento: fisCte.ds_documento_tomador ?? undefined,
          };
        }
      }
      if (!resolved.cliente) {
        warnings.push({
          codigo: 'CTE_SEM_TOMADOR',
          mensagem:
            'Tomador não identificado no CT-e; defina o cliente manualmente.',
        });
      }
      if (resolved.cliente && !resultado.cliente)
        resultado.cliente = resolved.cliente;
      if (resolved.embarcador && !resultado.embarcador)
        resultado.embarcador = resolved.embarcador;
      if (resolved.origem && !resultado.origem)
        resultado.origem = resolved.origem;
      if (resolved.destino) resultado.destino = resolved.destino;

      if (resolved.caracteristicas.vl_peso_bruto != null)
        resultado.caracteristicas.vl_peso_bruto =
          (resultado.caracteristicas.vl_peso_bruto ?? 0) +
          resolved.caracteristicas.vl_peso_bruto!;
      if (resolved.caracteristicas.vl_cubagem != null)
        resultado.caracteristicas.vl_cubagem =
          (resultado.caracteristicas.vl_cubagem ?? 0) +
          resolved.caracteristicas.vl_cubagem!;
      if (resolved.caracteristicas.vl_qtd_volumes != null)
        resultado.caracteristicas.vl_qtd_volumes =
          (resultado.caracteristicas.vl_qtd_volumes ?? 0) +
          resolved.caracteristicas.vl_qtd_volumes!;
      if (resolved.caracteristicas.vl_mercadoria != null)
        resultado.caracteristicas.vl_mercadoria =
          (resultado.caracteristicas.vl_mercadoria ?? 0) +
          resolved.caracteristicas.vl_mercadoria!;
      if (
        resolved.caracteristicas.ds_produto_predominante &&
        !resultado.caracteristicas.ds_produto_predominante
      )
        resultado.caracteristicas.ds_produto_predominante =
          resolved.caracteristicas.ds_produto_predominante;
    } else if (
      doc.ds_tipo === 'NFE' ||
      rawObj?.nfeProc ||
      rawObj?.NFe ||
      rawObj?.infNFe
    ) {
      const nfeRes = extrairDeNfe(rawObj, doc.id, warnings);
      if (nfeRes.destino) resultado.destino = nfeRes.destino;
      if (nfeRes.origem && !resultado.origem) resultado.origem = nfeRes.origem;
      if (nfeRes.caracteristicas.vl_peso_bruto != null)
        resultado.caracteristicas.vl_peso_bruto =
          (resultado.caracteristicas.vl_peso_bruto ?? 0) +
          nfeRes.caracteristicas.vl_peso_bruto!;
      if (nfeRes.caracteristicas.vl_mercadoria != null)
        resultado.caracteristicas.vl_mercadoria =
          (resultado.caracteristicas.vl_mercadoria ?? 0) +
          nfeRes.caracteristicas.vl_mercadoria!;

      if (!resultado.cliente && !resultado.embarcador) {
        warnings.push({
          codigo: 'NFE_SEM_CTE',
          mensagem:
            'Seleção apenas de NF-e: cliente e embarcador devem ser preenchidos manualmente.',
        });
      }
    } else {
      warnings.push({
        codigo: 'TIPO_NAO_SUPORTADO',
        mensagem: `Documento ${doc.id}: tipo não reconhecido ou estrutura inválida.`,
      });
    }
  }

  // Uma entrega por grupo (CT-e raiz + cadeia de documentos relacionados)
  const grupos = await agruparDocumentosParaEntregas(documentoDfeIds);
  for (const grupo of grupos) {
    const rootDoc = grupo.documentos[0];
    const docDfe = docById.get(rootDoc.id);
    let cd_municipio_ibge: string | undefined;
    let ds_nome_mun: string | undefined;
    let ds_uf: string | undefined;
    let ds_nome_recebedor: string | undefined;
    let ds_documento_recebedor: string | undefined;
    let ds_nome_destinatario: string | undefined;
    let ds_documento_destinatario: string | undefined;
    let ds_endereco: string | undefined;
    let ds_complemento: string | undefined;

    if (rootDoc.tipo === 'CTE' && docDfe?.id_cte) {
      const fisCte = await prisma.fis_cte.findUnique({
        where: { id: docDfe.id_cte },
        select: {
          cd_mun_fim: true,
          ds_nome_mun_fim: true,
          ds_uf_fim: true,
          ds_razao_social_recebedor: true,
          ds_documento_recebedor: true,
          ds_razao_social_destinatario: true,
          ds_documento_destinatario: true,
          ds_endereco_destino: true,
          ds_complemento_destino: true,
        },
      });
      if (fisCte) {
        cd_municipio_ibge = fisCte.cd_mun_fim ?? undefined;
        ds_nome_mun = fisCte.ds_nome_mun_fim ?? undefined;
        ds_uf = fisCte.ds_uf_fim ?? undefined;
        ds_nome_recebedor =
          fisCte.ds_razao_social_recebedor ?? rootDoc.recebedor ?? undefined;
        ds_documento_recebedor =
          fisCte.ds_documento_recebedor ?? undefined;
        ds_nome_destinatario =
          fisCte.ds_razao_social_destinatario ?? rootDoc.destinatario ?? undefined;
        ds_documento_destinatario =
          fisCte.ds_documento_destinatario ?? undefined;
        ds_endereco = fisCte.ds_endereco_destino ?? rootDoc.ds_endereco_destino ?? undefined;
        ds_complemento = fisCte.ds_complemento_destino ?? rootDoc.ds_complemento_destino ?? undefined;
      } else {
        ds_nome_mun = grupo.destino.nome;
        ds_nome_recebedor = rootDoc.recebedor ?? undefined;
        ds_nome_destinatario = rootDoc.destinatario ?? undefined;
        ds_endereco = rootDoc.ds_endereco_destino ?? undefined;
        ds_complemento = rootDoc.ds_complemento_destino ?? undefined;
      }
    } else {
      ds_nome_mun = grupo.destino.nome;
      ds_nome_destinatario = rootDoc.destinatario ?? undefined;
    }

    const documentosEntregas: DocumentoEntregasDTO[] = grupo.documentos.map(
      (d) => ({ id: d.id, tipo: d.tipo })
    );

    resultado.entregas.push({
      cd_municipio_ibge,
      ds_nome_mun,
      ds_uf,
      ds_endereco,
      ds_complemento,
      ds_nome_recebedor,
      ds_documento_recebedor,
      ds_nome_destinatario,
      ds_documento_destinatario,
      documentos: documentosEntregas,
    });
  }

  for (const ent of resultado.entregas) {
    if (ent.cd_municipio_ibge) {
      const idCidade = await resolveIdCidade(ent.cd_municipio_ibge);
      if (idCidade != null) ent.id_cidade_destino = idCidade;
    }
  }
  if (resultado.origem?.cd_municipio_ibge) {
    resultado.origem.id_cidade =
      (await resolveIdCidade(resultado.origem.cd_municipio_ibge)) ?? undefined;
  }
  if (resultado.destino?.cd_municipio_ibge) {
    resultado.destino.id_cidade =
      (await resolveIdCidade(resultado.destino.cd_municipio_ibge)) ?? undefined;
  }

  if (resultado.entregas.length === 0 && resultado.documentos.length > 0) {
    warnings.push({
      codigo: 'NENHUMA_ENTREGA',
      mensagem: 'Nenhuma entrega foi gerada; verifique os documentos.',
    });
  }

  return { dados: resultado, warnings };
}
