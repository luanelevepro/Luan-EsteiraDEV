import { prisma } from '@/services/prisma';
import { getFiscalEmpresa } from '../fiscal/fiscal-empresa.service';
import { fis_documento_dfe, Prisma, tms_viagem_despesas } from '@prisma/client';
import { getIdTmsEmpresaFromCteId, syncCteFromDto, type CteDtoForSync } from './sync-parse-to-entities.service';
import { StandardCteParser } from '../fiscal/onvio/cte-parser.service';
import { parseStringPromise } from 'xml2js';
import { classificarDocumentoDfe } from '@/utils/tms/classificar-documento-dfe';

/**
 * Interface para representar um grupo de documentos relacionados
 */
export interface DocumentoRelacionadoGroup {
  id: string; // ID temporário do grupo
  documentos: Array<{
    id: string;
    tipo: 'CTE' | 'NFE';
    numero?: string | null;
    chave?: string | null;
    emitente?: string | null;
    /** Recebedor (CT-e); usado como destino da entrega quando preenchido */
    recebedor?: string | null;
    destinatario?: string | null;
    ds_endereco_destino?: string | null;
    ds_complemento_destino?: string | null;
  }>;
  destino: {
    nome: string;
    id?: number;
  };
  origem: {
    nome: string;
    id?: number;
  };
  sequencia?: number;
}

/**
 * Busca documentos disponíveis para uma empresa
 * Documentos que ainda não foram vinculados a uma entrega
 */
const selectDocumentoDisponivel = {
  id: true,
  ds_tipo: true,
  dt_emissao: true,
  ds_controle: true,
  js_cte: {
    select: {
      id: true,
      ds_numero: true,
      ds_chave: true,
      ds_serie: true,
      vl_total: true,
      ds_razao_social_emitente: true,
      ds_razao_social_destinatario: true,
      ds_razao_social_recebedor: true,
      ds_nome_mun_ini: true,
      ds_nome_mun_fim: true,
      ds_endereco_destino: true,
      ds_complemento_destino: true,
      js_documentos_anteriores: true,
      js_chaves_nfe: true,
      id_fis_empresa_emitente: true,
      id_fis_empresa_subcontratada: true,
    },
  },
  js_nfe: {
    select: {
      id: true,
      ds_numero: true,
      ds_chave: true,
      ds_serie: true,
      vl_nf: true,
      ds_razao_social_emitente: true,
      ds_razao_social_destinatario: true,
      js_nfes_referenciadas: true,
      id_fis_empresa_transportadora: true,
    },
  },
  fis_documento_relacionado: {
    where: { fl_ativo: true },
    select: {
      id: true,
      fis_documento_origem: {
        select: {
          id: true,
          ds_tipo: true,
          js_cte: { select: { ds_numero: true, ds_serie: true, ds_chave: true } },
          js_nfe: { select: { ds_numero: true, ds_serie: true, ds_chave: true } },
        },
      },
    },
  },
  fis_documento_origem: {
    where: { fl_ativo: true },
    select: {
      id: true,
      fis_documento_referenciado: {
        select: {
          id: true,
          ds_tipo: true,
          js_cte: { select: { ds_numero: true, ds_serie: true, ds_chave: true } },
          js_nfe: { select: { ds_numero: true, ds_serie: true, ds_chave: true } },
        },
      },
    },
  },
} as const;

const cteParser = new StandardCteParser();

/** Parse ds_raw (XML ou JSON) para objeto. */
async function parseRawCte(dsRaw: string): Promise<any> {
  const trimmed = (dsRaw || '').trim();
  if (!trimmed) throw new Error('ds_raw vazio');
  if (trimmed.startsWith('<')) {
    return parseStringPromise(trimmed, { explicitArray: true });
  }
  return JSON.parse(trimmed) as any;
}

/** Select de js_cte usado para re-buscar após backfill. */
const selectJsCteParaBackfill = {
  id: true,
  ds_numero: true,
  ds_chave: true,
  ds_serie: true,
  vl_total: true,
  ds_razao_social_emitente: true,
  ds_razao_social_destinatario: true,
  ds_razao_social_recebedor: true,
  ds_nome_mun_ini: true,
  ds_nome_mun_fim: true,
  ds_endereco_destino: true,
  ds_complemento_destino: true,
  ds_endereco_remetente: true,
  ds_complemento_remetente: true,
  js_documentos_anteriores: true,
  js_chaves_nfe: true,
  id_fis_empresa_subcontratada: true,
} as const;

export const getDocumentosDisponiveis = async (
  empresaId: string,
  filtros?: {
    search?: string;
    tipo?: 'CTE' | 'NFE' | 'AMBOS';
    dataInicio?: string;
    dataFim?: string;
    /** Incluir documentos já anexados a esta carga (para exibir no topo na aba DOCUMENTOS) */
    idCargaIncluir?: string;
    /** Executar backfill de endereço/recebedor em CT-es com campos nulos (default true). false = resposta rápida. */
    backfill?: boolean;
  }
): Promise<any[]> => {
  try {
    const fisEmp = await getFiscalEmpresa(empresaId);

    const dataInicio = (filtros?.dataInicio || '').trim();
    const dataFim = (filtros?.dataFim || '').trim();
    const dataInicioValida = dataInicio && !Number.isNaN(new Date(dataInicio).getTime());
    const dataFimValida = dataFim && !Number.isNaN(new Date(dataFim).getTime());
    const filtrarPorData = dataInicioValida && dataFimValida;

    const whereClause: any = {
      AND: [
          {
            OR: [
              {
                js_cte: {
                  OR: [
                    { id_fis_empresa_emitente: fisEmp.id },
                    { id_fis_empresa_subcontratada: fisEmp.id },
                    { id_fis_empresa_emitente: fisEmp.id },
                  ],
                },
              },
              {
                js_nfe: {
                  id_fis_empresa_transportadora: fisEmp.id,
                },
              },
            ],
          },
          { OR: [{ ds_tipo: 'CTE' }, { ds_tipo: 'NFE' }] },
          // Documentos SEM relação com nenhuma carga (NOT EXISTS)
          {
            AND: [
              {
                NOT: {
                  js_cte: {
                    tms_cargas_ctes: {
                      some: {},
                    },
                  },
                },
              },
              {
                NOT: {
                  js_nfe: {
                    tms_cargas_nfe: {
                      some: {},
                    },
                  },
                },
              },
            ],
          },
        ],
      };

    if (filtrarPorData) {
      whereClause.dt_emissao = {
        gte: new Date(dataInicio),
        lte: new Date(dataFim),
      };
    }

    const documentos = await prisma.fis_documento_dfe.findMany({
      where: whereClause,
      select: selectDocumentoDisponivel,
    });

    // Incluir documentos já anexados à carga selecionada (para exibir no topo na aba DOCUMENTOS)
    if (filtros?.idCargaIncluir) {
      const idsJaIncluidos = new Set(documentos.map((d: any) => d.id));
      const docsDaCarga = await prisma.fis_documento_dfe.findMany({
        where: {
          OR: [
            {
              js_cte: {
                tms_cargas_ctes: { some: { id_carga: filtros.idCargaIncluir! } },
              },
            },
            {
              js_nfe: {
                tms_cargas_nfe: { some: { id_carga: filtros.idCargaIncluir! } },
              },
            },
          ],
        },
        select: selectDocumentoDisponivel,
      });
      const novos = docsDaCarga.filter((d: any) => !idsJaIncluidos.has(d.id));
      documentos.unshift(...novos);
    }

    // Backfill: para CT-es com endereço/complemento/recebedor/destinatário nulos, extrair do ds_raw e atualizar fis_cte (opcional)
    const runBackfill = filtros?.backfill !== false;
    if (runBackfill) {
      const idsParaBackfill = (documentos as any[])
        .filter(
          (d: any) =>
            d.ds_tipo === 'CTE' &&
            d.js_cte?.id &&
            (d.js_cte.ds_endereco_destino == null ||
              d.js_cte.ds_complemento_destino == null ||
              d.js_cte.ds_endereco_remetente == null ||
              (d.js_cte.ds_razao_social_recebedor == null && d.js_cte.ds_razao_social_destinatario == null))
        )
        .map((d: any) => d.id);
      const cteIdsBackfilled: string[] = [];
      if (idsParaBackfill.length > 0) {
        const docsParaBackfill = await prisma.fis_documento_dfe.findMany({
          where: { id: { in: idsParaBackfill } },
          select: { id: true, ds_raw: true, id_cte: true },
        });
        for (const doc of docsParaBackfill) {
          if (!doc.id_cte || !doc.ds_raw) continue;
          try {
            const rawObj = await parseRawCte(doc.ds_raw);
            if (!cteParser.supports(rawObj)) continue;
            const dto = cteParser.extract(rawObj);
            const idTmsEmpresa = await getIdTmsEmpresaFromCteId(doc.id_cte);
            await syncCteFromDto(doc.id_cte, dto as CteDtoForSync, idTmsEmpresa ?? null);
            cteIdsBackfilled.push(doc.id_cte);
          } catch (e: any) {
            console.warn('[getDocumentosDisponiveis] backfill endereço doc=', doc.id, e?.message || e);
          }
        }
        if (cteIdsBackfilled.length > 0) {
          const ctesAtualizados = await prisma.fis_cte.findMany({
            where: { id: { in: cteIdsBackfilled } },
            select: selectJsCteParaBackfill,
          });
          const cteById = new Map(ctesAtualizados.map((c) => [c.id, c]));
          for (const doc of documentos as any[]) {
            if (doc.ds_tipo === 'CTE' && doc.js_cte?.id) {
              const atualizado = cteById.get(doc.js_cte.id);
              if (atualizado) doc.js_cte = atualizado;
            }
          }
        }
      }
    }

    // Classificação única no backend: CT-e próprio vs DF-e relacionado (fonte da verdade para o modal Nova Carga)
    const docBucketFromClassificacao = (cls: string): 'CTE_PROPRIO' | 'DFE_RELACIONADO' => {
      if (cls === 'LEFT_CTE_PROPRIO') return 'CTE_PROPRIO';
      return 'DFE_RELACIONADO'; // RIGHT_CTE_SUBCONTRATADO, RIGHT_NFE_TRANSPORTADORA, IGNORAR
    };
    for (const doc of documentos as any[]) {
      const classificacao = classificarDocumentoDfe(doc, fisEmp.id);
      doc.docBucket = docBucketFromClassificacao(classificacao);
    }

    return documentos;
  } catch (error: any) {
    console.error('Erro ao buscar documentos disponíveis:', error);
    throw new Error(`Erro ao buscar documentos: ${error.message}`);
  }
};

/** Contrato de resposta do endpoint disponiveis-separados */
export interface DisponiveisSeparadosFiltros {
  competencia?: string;
  dataInicio?: string;
  dataFim?: string;
  search?: string;
  incluirRelacionamentos?: boolean;
}

export interface DisponiveisSeparadosResumo {
  ctesProprios: number;
  dfesRelacionados: number;
  total: number;
}

export interface CteProprioItem {
  idDocumentoDfe: string;
  idCte: string;
  numero: string | null;
  serie: string | null;
  chave: string | null;
  emissao: string;
  valorTotal: number | null;
  origem: string | null;
  destino: string | null;
  relacionamentos?: {
    documentosAnteriores?: string[];
    chavesNfe?: string[];
  };
}

export interface DfeRelacionadoItem {
  idDocumentoDfe: string;
  tipo: 'CTE_SUBCONTRATADO' | 'NFE_TRANSPORTADORA';
  idCte?: string;
  idNfe?: string;
  numero: string | null;
  chave: string | null;
  empresaEhSubcontratada?: boolean;
  empresaEhTransportadora?: boolean;
}

export interface DisponiveisSeparadosLink {
  sourceId: string;
  targetId: string;
  tipoRelacao: string;
  fonte: string;
}

export interface DisponiveisSeparadosResponse {
  filtros: DisponiveisSeparadosFiltros;
  resumo: DisponiveisSeparadosResumo;
  left: { ctesProprios: CteProprioItem[] };
  right: { dfesRelacionados: DfeRelacionadoItem[] };
  links: DisponiveisSeparadosLink[];
}

/**
 * Busca documentos disponíveis segmentados: CT-e próprio (left) e DFe relacionados (right).
 * GET /api/tms/documentos/disponiveis-separados
 */
export const getDocumentosDisponiveisSeparados = async (
  empresaId: string,
  filtros?: {
    competencia?: string;
    dataInicio?: string;
    dataFim?: string;
    search?: string;
    incluirRelacionamentos?: boolean;
    backfill?: boolean;
  }
): Promise<DisponiveisSeparadosResponse> => {
  const fisEmp = await getFiscalEmpresa(empresaId);

  let dataInicio = (filtros?.dataInicio || '').trim();
  let dataFim = (filtros?.dataFim || '').trim();
  if (filtros?.competencia) {
    const [anoStr, mesStr] = filtros.competencia.split('-');
    const ano = Number(anoStr);
    const mes = Number(mesStr);
    if (!Number.isNaN(ano) && !Number.isNaN(mes)) {
      dataInicio = `${filtros.competencia}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      dataFim = `${filtros.competencia}-${String(ultimoDia).padStart(2, '0')}`;
    }
  }
  const dataInicioValida = dataInicio && !Number.isNaN(new Date(dataInicio).getTime());
  const dataFimValida = dataFim && !Number.isNaN(new Date(dataFim).getTime());
  const filtrarPorData = dataInicioValida && dataFimValida;

  const whereClause: any = {
    AND: [
      {
        OR: [
          {
            js_cte: {
              OR: [
                { id_fis_empresa_emitente: fisEmp.id },
                { id_fis_empresa_subcontratada: fisEmp.id },
              ],
            },
          },
          {
            js_nfe: {
              id_fis_empresa_transportadora: fisEmp.id,
            },
          },
        ],
      },
      { OR: [{ ds_tipo: 'CTE' }, { ds_tipo: 'NFE' }] },
      {
        AND: [
          {
            NOT: {
              js_cte: {
                tms_cargas_ctes: { some: {} },
              },
            },
          },
          {
            NOT: {
              js_nfe: {
                tms_cargas_nfe: { some: {} },
              },
            },
          },
        ],
      },
    ],
  };

  if (filtrarPorData) {
    whereClause.dt_emissao = {
      gte: new Date(dataInicio),
      lte: new Date(dataFim),
    };
  }

  if (filtros?.search) {
    const text = String(filtros.search).trim();
    if (text.length) {
      const orClauses: any[] = [];
      if (/^\d+$/.test(text)) {
        orClauses.push({ ds_controle: parseInt(text, 10) });
      }
      const upper = text.toUpperCase();
      if (upper === 'NFE' || upper === 'CTE') {
        orClauses.push({ ds_tipo: upper });
      }
      orClauses.push({
        js_cte: { ds_numero: { contains: text, mode: 'insensitive' } },
      });
      orClauses.push({
        js_cte: { ds_chave: { contains: text } },
      });
      orClauses.push({
        js_nfe: { ds_numero: { contains: text, mode: 'insensitive' } },
      });
      orClauses.push({ js_nfe: { ds_chave: { contains: text } } });
      if (orClauses.length) {
        whereClause.AND.push({ OR: orClauses });
      }
    }
  }

  const documentos = await prisma.fis_documento_dfe.findMany({
    where: whereClause,
    select: selectDocumentoDisponivel,
    orderBy: { dt_emissao: 'desc' },
  });

  const leftCtes: CteProprioItem[] = [];
  const rightDfes: DfeRelacionadoItem[] = [];
  const linksMap = new Map<string, DisponiveisSeparadosLink>();
  const incluirRel = filtros?.incluirRelacionamentos !== false;

  for (const doc of documentos as any[]) {
    const classificacao = classificarDocumentoDfe(doc, fisEmp.id);
    if (classificacao === 'IGNORAR') continue;
    if (classificacao === 'LEFT_CTE_PROPRIO') {
      const cte = doc.js_cte;
      leftCtes.push({
        idDocumentoDfe: doc.id,
        idCte: cte?.id ?? '',
        numero: cte?.ds_numero ?? null,
        serie: cte?.ds_serie ?? null,
        chave: cte?.ds_chave ?? null,
        emissao: doc.dt_emissao ? new Date(doc.dt_emissao).toISOString() : '',
        valorTotal: cte?.vl_total ?? null,
        origem: cte?.ds_nome_mun_ini ?? null,
        destino: cte?.ds_nome_mun_fim ?? null,
        relacionamentos: incluirRel
          ? {
              documentosAnteriores: Array.isArray(cte?.js_documentos_anteriores) ? cte.js_documentos_anteriores : undefined,
              chavesNfe: Array.isArray(cte?.js_chaves_nfe) ? cte.js_chaves_nfe : undefined,
            }
          : undefined,
      });
      if (incluirRel) {
        for (const rel of doc.fis_documento_origem ?? []) {
          const ref = rel.fis_documento_referenciado;
          if (ref?.id) {
            const key = `${ref.id}-${doc.id}`;
            if (!linksMap.has(key)) {
              linksMap.set(key, {
                sourceId: ref.id,
                targetId: doc.id,
                tipoRelacao: 'REFERENCIADO_EM_CTE',
                fonte: 'fis_documento_relacionado',
              });
            }
          }
        }
        for (const rel of doc.fis_documento_relacionado ?? []) {
          const orig = rel.fis_documento_origem;
          if (orig?.id) {
            const key = `${doc.id}-${orig.id}`;
            if (!linksMap.has(key)) {
              linksMap.set(key, {
                sourceId: doc.id,
                targetId: orig.id,
                tipoRelacao: 'REFERENCIA',
                fonte: 'fis_documento_relacionado',
              });
            }
          }
        }
      }
      continue;
    }
    if (classificacao === 'RIGHT_CTE_SUBCONTRATADO') {
      const cte = doc.js_cte;
      rightDfes.push({
        idDocumentoDfe: doc.id,
        tipo: 'CTE_SUBCONTRATADO',
        idCte: cte?.id,
        numero: cte?.ds_numero ?? null,
        chave: cte?.ds_chave ?? null,
        empresaEhSubcontratada: true,
      });
      if (incluirRel) {
        for (const rel of doc.fis_documento_origem ?? []) {
          const ref = rel.fis_documento_referenciado;
          if (ref?.id) {
            const key = `${ref.id}-${doc.id}`;
            if (!linksMap.has(key)) {
              linksMap.set(key, {
                sourceId: ref.id,
                targetId: doc.id,
                tipoRelacao: 'REFERENCIADO_EM_CTE',
                fonte: 'fis_documento_relacionado',
              });
            }
          }
        }
      }
      continue;
    }
    if (classificacao === 'RIGHT_NFE_TRANSPORTADORA') {
      const nfe = doc.js_nfe;
      rightDfes.push({
        idDocumentoDfe: doc.id,
        tipo: 'NFE_TRANSPORTADORA',
        idNfe: nfe?.id,
        numero: nfe?.ds_numero ?? null,
        chave: nfe?.ds_chave ?? null,
        empresaEhTransportadora: true,
      });
      if (incluirRel) {
        for (const rel of doc.fis_documento_origem ?? []) {
          const ref = rel.fis_documento_referenciado;
          if (ref?.id) {
            const key = `${ref.id}-${doc.id}`;
            if (!linksMap.has(key)) {
              linksMap.set(key, {
                sourceId: ref.id,
                targetId: doc.id,
                tipoRelacao: 'REFERENCIADO_EM_CTE',
                fonte: 'fis_documento_relacionado',
              });
            }
          }
        }
      }
    }
  }

  const resumo: DisponiveisSeparadosResumo = {
    ctesProprios: leftCtes.length,
    dfesRelacionados: rightDfes.length,
    total: leftCtes.length + rightDfes.length,
  };

  return {
    filtros: {
      competencia: filtros?.competencia,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      search: filtros?.search,
      incluirRelacionamentos: incluirRel,
    },
    resumo,
    left: { ctesProprios: leftCtes },
    right: { dfesRelacionados: rightDfes },
    links: Array.from(linksMap.values()),
  };
};

/**
 * Busca somente documentos de despesas (NFe / NFSe) onde a empresa é destinatário
 */
export const getDocumentosDespesasDisponiveis = async (
  empresaId: string,
  filtros?: {
    search?: string;
    competencia?: string;
  }
): Promise<any[]> => {
  try {
    const [anoStr, mesStr] = filtros?.competencia?.split('-') || []; // "2025", "02"
    const ano = Number(anoStr);
    const mes = Number(mesStr);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${filtros?.competencia}-${String(ultimoDia).padStart(2, '0')}`;
    const fisEmp = await getFiscalEmpresa(empresaId);
    const whereClause: Prisma.fis_documento_dfeWhereInput = {
      AND: [
        // Apenas NFE e NFSE
        { OR: [{ ds_tipo: 'NFE' }, { ds_tipo: 'NFSE' }] },
      ],
    } as any;

    if (filtros?.competencia) {
      whereClause.dt_emissao = {
        gte: filtros?.competencia
          ? new Date(`${filtros.competencia}-01`)
          : undefined,
        lte: filtros?.competencia ? new Date(fim) : undefined,
      };
    }

    // Monta filtro por destinatário usando o CNPJ/CPF ou nome da empresa quando disponível
    const destinatarioClauses: Prisma.fis_documento_dfeWhereInput[] = [];
    if (fisEmp.id) {
      // NFe where the company is the destinatário
      destinatarioClauses.push({
        js_nfe: {
          is: {
            id_fis_empresa_destinatario: fisEmp?.id,
          },
        },
      });

      // NFSe: where the NFSe belongs to the company AND has no despesas linked
      // (use relation filter `none: {}` to ensure there are no tms_viagem_despesas)
      destinatarioClauses.push({
        js_nfse: {
          is: {
            id_fis_empresas: fisEmp?.id,
          },
        },
      });

      // NFe: at least one item that does NOT have a tms_viagem_despesas linked
      destinatarioClauses.push({
        js_nfe: {
          id_fis_empresa_destinatario: fisEmp?.id,
        },
      });
    }
    // if (sisEmpresa?.ds_nome) {
    //   destinatarioClauses.push({
    //     js_nfe: {
    //       ds_razao_social_destinatario: {
    //         contains: sisEmpresa.ds_nome,
    //         mode: 'insensitive',
    //       },
    //     },
    //   });
    //   destinatarioClauses.push({
    //     js_nfse: {
    //       fis_fornecedor: {
    //         ds_nome: { contains: sisEmpresa.ds_nome, mode: 'insensitive' },
    //       },
    //     },
    //   });
    // }

    if (destinatarioClauses.length > 0) {
      // Garantir que AND seja um array para podermos usar push com segurança
      if (!whereClause.AND || !Array.isArray(whereClause.AND)) {
        whereClause.AND = whereClause.AND ? [whereClause.AND as any] : [];
      }
      (whereClause.AND as any[]).push({ OR: destinatarioClauses });
    }

    // filtro de busca simples
    if (filtros?.search) {
      const text = String(filtros.search).trim();
      if (text.length) {
        const orClauses: any[] = [];

        // If the search is numeric, try matching ds_controle (stored as Int)
        if (/^\d+$/.test(text)) {
          orClauses.push({ ds_controle: parseInt(text, 10) });
        }

        // If the search equals known tipo values, match enum directly
        const upper = text.toUpperCase();
        if (upper === 'NFE' || upper === 'NFSE') {
          orClauses.push({ ds_tipo: upper });
        }

        // Match common nested string fields: NF number, NF chave, NFSe number
        orClauses.push({
          js_nfe: { ds_numero: { contains: text, mode: 'insensitive' } },
        });
        orClauses.push({
          js_nfse: { ds_numero: { contains: text, mode: 'insensitive' } },
        });
        orClauses.push({ js_nfe: { ds_chave: { contains: text } } });

        if (orClauses.length > 0) {
          // Ensure AND is an array before pushing (normalize like earlier in the file)
          if (!whereClause.AND || !Array.isArray(whereClause.AND)) {
            whereClause.AND = whereClause.AND ? [whereClause.AND as any] : [];
          }
          whereClause.AND.push({ OR: orClauses });
        }
      }
    }
    const documentos = await prisma.fis_documento_dfe.findMany({
      where: whereClause,
      orderBy: { dt_emissao: 'desc' },
      select: {
        id: true,
        ds_tipo: true,
        dt_emissao: true,
        ds_controle: true,
        js_nfe: {
          select: {
            id: true,
            ds_numero: true,
            ds_chave: true,
            vl_nf: true,
            dt_emissao: true,
            ds_razao_social_destinatario: true,
            ds_documento_destinatario: true,
            ds_razao_social_emitente: true,
            fis_nfe_itens: {
              select: {
                id: true,
                ds_produto: true,
                vl_total: true,
                vl_unitario: true,
                vl_quantidade: true,
                vl_desconto: true,
              },
            },
          },
        },
        js_nfse: {
          select: {
            id: true,
            ds_numero: true,
            ds_codigo_verificacao: true,
            ds_valor_servicos: true,
            dt_emissao: true,
            ds_item_lista_servico: true,
            ds_discriminacao: true,
            js_servicos: true,
            fis_fornecedor: { select: { ds_nome: true, ds_documento: true } },
          },
        },
      },
    });
    return documentos;
  } catch (error: any) {
    console.error('Erro ao buscar documentos de despesas:', error);
    throw new Error(error?.message || 'Erro ao buscar documentos de despesas');
  }
};

/**
 * Agrupa documentos de forma inteligente baseado em relacionamentos
 *
 * REGRAS DE AGRUPAMENTO:
 * 1. Cada CT-e gera UMA entrega separada (documento principal)
 * 2. CT-e + documentos relacionados (CT-e ou NF-e) = MESMA entrega
 * 3. CT-es com MESMO DESTINO podem ser mescladas pelo USUÁRIO (não automático)
 * 4. NF-es SEM CT-e relacionada = criar UMA entrega com todas as NF-es órfãs
 *
 * Retorna grupos prontos para criar entregas
 */
export const agruparDocumentosParaEntregas = async (
  documentosIds: string[]
): Promise<DocumentoRelacionadoGroup[]> => {
  try {
    // Buscar documentos completos com relacionamentos
    const documentos = await prisma.fis_documento_dfe.findMany({
      where: {
        id: { in: documentosIds },
      },
      select: {
        id: true,
        ds_tipo: true,
        dt_emissao: true,
        js_cte: {
          select: {
            id: true,
            ds_numero: true,
            ds_chave: true,
            ds_nome_mun_ini: true,
            ds_nome_mun_fim: true,
            ds_razao_social_emitente: true,
            ds_razao_social_destinatario: true,
            ds_razao_social_recebedor: true,
            ds_endereco_destino: true,
            ds_complemento_destino: true,
            js_chaves_nfe: true,
            js_documentos_anteriores: true,
          },
        },
        js_nfe: {
          select: {
            id: true,
            ds_numero: true,
            ds_chave: true,
            ds_razao_social_emitente: true,
            ds_razao_social_destinatario: true,
            js_nfes_referenciadas: true,
          },
        },
        fis_documento_relacionado: {
          select: {
            id: true,
            id_documento_referenciado: true,
            fis_documento_referenciado: {
              select: {
                id: true,
                ds_tipo: true,
                js_cte: {
                  select: {
                    ds_numero: true,
                    ds_chave: true,
                    ds_razao_social_emitente: true,
                    ds_razao_social_destinatario: true,
                    ds_razao_social_recebedor: true,
                    ds_endereco_destino: true,
                    ds_complemento_destino: true,
                  },
                },
                js_nfe: {
                  select: {
                    ds_numero: true,
                    ds_chave: true,
                    ds_razao_social_emitente: true,
                    ds_razao_social_destinatario: true,
                  },
                },
              },
            },
          },
        },
        fis_documento_origem: {
          select: {
            id: true,
            id_documento_referenciado: true,
            fis_documento_referenciado: {
              select: {
                id: true,
                ds_tipo: true,
                js_cte: {
                  select: {
                    ds_numero: true,
                    ds_chave: true,
                    ds_razao_social_emitente: true,
                    ds_razao_social_destinatario: true,
                    ds_razao_social_recebedor: true,
                    ds_endereco_destino: true,
                    ds_complemento_destino: true,
                  },
                },
                js_nfe: {
                  select: {
                    ds_numero: true,
                    ds_chave: true,
                    ds_razao_social_emitente: true,
                    ds_razao_social_destinatario: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const grupos: Map<string, DocumentoRelacionadoGroup> = new Map();
    const documentosProcessados = new Set<string>();

    // Separar CTes e NFes
    const ctes = documentos.filter((d) => d.ds_tipo === 'CTE');
    const nfes = documentos.filter((d) => d.ds_tipo === 'NFE');
    let sequencia = 1;

    // REGRA 1 e 2: Processar CTes - cada CTe vira UMA entrega
    // Inclui automaticamente documentos relacionados (CTe ou NFe) na MESMA entrega
    for (const cte of ctes) {
      if (documentosProcessados.has(cte.id)) continue;

      const grupoId = `grupo-${sequencia}`;
      const docsGrupo: DocumentoRelacionadoGroup['documentos'] = [
        {
          id: cte.id,
          tipo: 'CTE',
          numero: cte.js_cte?.ds_numero,
          chave: cte.js_cte?.ds_chave,
          emitente: cte.js_cte?.ds_razao_social_emitente,
          recebedor: cte.js_cte?.ds_razao_social_recebedor ?? undefined,
          destinatario: cte.js_cte?.ds_razao_social_destinatario,
          ds_endereco_destino: cte.js_cte?.ds_endereco_destino ?? undefined,
          ds_complemento_destino: cte.js_cte?.ds_complemento_destino ?? undefined,
        },
      ];

      documentosProcessados.add(cte.id);
      // Buscar NFes relacionadas via js_chaves_nfe (CTe referencia NFe)
      if (
        cte.js_cte?.js_chaves_nfe &&
        Array.isArray(cte.js_cte.js_chaves_nfe)
      ) {
        for (const nfeChave of cte.js_cte.js_chaves_nfe) {
          const nfeRel = nfes.find((nfe) => nfe.js_nfe?.ds_chave === nfeChave);
          if (nfeRel && !documentosProcessados.has(nfeRel.id)) {
            docsGrupo.push({
              id: nfeRel.id,
              tipo: 'NFE',
              numero: nfeRel.js_nfe?.ds_numero,
              chave: nfeRel.js_nfe?.ds_chave,
              emitente: nfeRel.js_nfe?.ds_razao_social_emitente,
              destinatario: nfeRel.js_nfe?.ds_razao_social_destinatario,
            });
            documentosProcessados.add(nfeRel.id);
          }
          Array.isArray(nfeRel?.js_nfe?.js_nfes_referenciadas) &&
            nfeRel.js_nfe.js_nfes_referenciadas.forEach((nfeRef) => {
              const nfeReferenciada = nfes.find(
                (nfe) => nfe.js_nfe?.ds_chave === nfeRef
              );
              if (
                nfeReferenciada &&
                !documentosProcessados.has(nfeReferenciada.id)
              ) {
                docsGrupo.push({
                  id: nfeReferenciada.id,
                  tipo: 'NFE',
                  numero: nfeReferenciada.js_nfe?.ds_numero,
                  chave: nfeReferenciada.js_nfe?.ds_chave,
                  emitente: nfeReferenciada.js_nfe?.ds_razao_social_emitente,
                  destinatario:
                    nfeReferenciada.js_nfe?.ds_razao_social_destinatario,
                });
                documentosProcessados.add(nfeReferenciada.id);
              }
            });
        }
      }
      // Buscar documentos anteriores (CTe referencia CTe)
      if (
        cte.js_cte?.js_documentos_anteriores &&
        Array.isArray(cte.js_cte.js_documentos_anteriores)
      ) {
        for (const cteChave of cte.js_cte.js_documentos_anteriores) {
          const cteRel = ctes.find((c) => c.js_cte?.ds_chave === cteChave);
          if (cteRel && !documentosProcessados.has(cteRel.id)) {
            docsGrupo.push({
              id: cteRel.id,
              tipo: 'CTE',
              numero: cteRel.js_cte?.ds_numero,
              chave: cteRel.js_cte?.ds_chave,
              emitente: cteRel.js_cte?.ds_razao_social_emitente,
              recebedor: cteRel.js_cte?.ds_razao_social_recebedor ?? undefined,
              destinatario: cteRel.js_cte?.ds_razao_social_destinatario,
              ds_endereco_destino: cteRel.js_cte?.ds_endereco_destino ?? undefined,
              ds_complemento_destino: cteRel.js_cte?.ds_complemento_destino ?? undefined,
            });
            documentosProcessados.add(cteRel.id);
          }
          Array.isArray(cteRel?.js_cte?.js_documentos_anteriores) &&
            cteRel?.js_cte?.js_documentos_anteriores?.forEach((cteRef) => {
              const cteReferenciado = ctes.find(
                (c) => c.js_cte?.ds_chave === cteRef
              );
              if (
                cteReferenciado &&
                !documentosProcessados.has(cteReferenciado.id)
              ) {
                docsGrupo.push({
                  id: cteReferenciado.id,
                  tipo: 'CTE',
                  numero: cteReferenciado.js_cte?.ds_numero,
                  chave: cteReferenciado.js_cte?.ds_chave,
                  emitente: cteReferenciado.js_cte?.ds_razao_social_emitente,
                  recebedor: cteReferenciado.js_cte?.ds_razao_social_recebedor ?? undefined,
                  destinatario:
                    cteReferenciado.js_cte?.ds_razao_social_destinatario,
                  ds_endereco_destino: cteReferenciado.js_cte?.ds_endereco_destino ?? undefined,
                  ds_complemento_destino: cteReferenciado.js_cte?.ds_complemento_destino ?? undefined,
                });
                documentosProcessados.add(cteReferenciado.id);
              }
            });
          Array.isArray(cteRel?.js_cte?.js_chaves_nfe) &&
            cteRel.js_cte.js_chaves_nfe.forEach((nfeChave) => {
              const nfeRel = nfes.find(
                (nfe) => nfe.js_nfe?.ds_chave === nfeChave
              );
              if (nfeRel && !documentosProcessados.has(nfeRel.id)) {
                docsGrupo.push({
                  id: nfeRel.id,
                  tipo: 'NFE',
                  numero: nfeRel.js_nfe?.ds_numero,
                  chave: nfeRel.js_nfe?.ds_chave,
                  emitente: nfeRel.js_nfe?.ds_razao_social_emitente,
                  destinatario: nfeRel.js_nfe?.ds_razao_social_destinatario,
                });
                documentosProcessados.add(nfeRel.id);
              }
              if (nfeRel?.js_nfe?.ds_chave) {
                for (const doc of documentos) {
                  if (doc.js_nfe?.js_nfes_referenciadas) {
                    Array.isArray(doc.js_nfe.js_nfes_referenciadas) &&
                      doc.js_nfe.js_nfes_referenciadas.forEach((cteChave) => {
                        if (cteChave === nfeRel.js_nfe?.ds_chave) {
                          if (!documentosProcessados.has(doc.id)) {
                            docsGrupo.push({
                              id: doc.id,
                              tipo: doc.ds_tipo as 'CTE' | 'NFE',
                              numero:
                                doc.ds_tipo === 'CTE'
                                  ? doc.js_cte?.ds_numero
                                  : doc.js_nfe?.ds_numero,
                              chave:
                                doc.ds_tipo === 'CTE'
                                  ? doc.js_cte?.ds_chave
                                  : doc.js_nfe?.ds_chave,
                              emitente:
                                doc.ds_tipo === 'CTE'
                                  ? doc.js_cte?.ds_razao_social_emitente
                                  : doc.js_nfe?.ds_razao_social_emitente,
                              destinatario:
                                doc.ds_tipo === 'CTE'
                                  ? doc.js_cte?.ds_razao_social_destinatario
                                  : doc.js_nfe?.ds_razao_social_destinatario,
                            });
                            documentosProcessados.add(doc.id);
                          }
                        }
                      });
                  }
                }
                Array.isArray(nfeRel?.js_nfe?.js_nfes_referenciadas) &&
                  nfeRel.js_nfe.js_nfes_referenciadas.forEach((nfeRef) => {
                    const nfeReferenciada = nfes.find(
                      (nfe) => nfe.js_nfe?.ds_chave === nfeRef
                    );
                    if (
                      nfeReferenciada &&
                      !documentosProcessados.has(nfeReferenciada.id)
                    ) {
                      docsGrupo.push({
                        id: nfeReferenciada.id,
                        tipo: 'NFE',
                        numero: nfeReferenciada.js_nfe?.ds_numero,
                        chave: nfeReferenciada.js_nfe?.ds_chave,
                        emitente:
                          nfeReferenciada.js_nfe?.ds_razao_social_emitente,
                        destinatario:
                          nfeReferenciada.js_nfe?.ds_razao_social_destinatario,
                      });
                      documentosProcessados.add(nfeReferenciada.id);
                    }
                  });
              }
            });
        }
      }

      // Buscar relacionamentos via tabela fis_documentos_relacionados
      // Documentos que ESTE CT-e referencia
      for (const rel of cte.fis_documento_relacionado) {
        const docRel = documentos.find(
          (d) => d.id === rel.id_documento_referenciado
        );
        if (docRel && !documentosProcessados.has(docRel.id)) {
          docsGrupo.push({
            id: docRel.id,
            tipo: docRel.ds_tipo as 'CTE' | 'NFE',
            numero:
              docRel.ds_tipo === 'CTE'
                ? docRel.js_cte?.ds_numero
                : docRel.js_nfe?.ds_numero,
            chave:
              docRel.ds_tipo === 'CTE'
                ? docRel.js_cte?.ds_chave
                : docRel.js_nfe?.ds_chave,
            emitente:
              docRel.ds_tipo === 'CTE'
                ? docRel.js_cte?.ds_razao_social_emitente
                : docRel.js_nfe?.ds_razao_social_emitente,
            recebedor: docRel.ds_tipo === 'CTE' ? (docRel.js_cte?.ds_razao_social_recebedor ?? undefined) : undefined,
            destinatario:
              docRel.ds_tipo === 'CTE'
                ? docRel.js_cte?.ds_razao_social_destinatario
                : docRel.js_nfe?.ds_razao_social_destinatario,
            ds_endereco_destino: docRel.ds_tipo === 'CTE' ? (docRel.js_cte?.ds_endereco_destino ?? undefined) : undefined,
            ds_complemento_destino: docRel.ds_tipo === 'CTE' ? (docRel.js_cte?.ds_complemento_destino ?? undefined) : undefined,
          });
          documentosProcessados.add(docRel.id);
        }
      }
      // Buscar relacionamentos REVERSOS via fis_documento_origem
      // Documentos que REFERENCIAM este CT-e
      for (const rel of cte.fis_documento_origem) {
        const docRef = rel.fis_documento_referenciado;
        if (docRef && !documentosProcessados.has(docRef.id)) {
          docsGrupo.push({
            id: docRef.id,
            tipo: docRef.ds_tipo as 'CTE' | 'NFE',
            numero:
              docRef.ds_tipo === 'CTE'
                ? docRef.js_cte?.ds_numero
                : docRef.js_nfe?.ds_numero,
            chave:
              docRef.ds_tipo === 'CTE'
                ? docRef.js_cte?.ds_chave
                : docRef.js_nfe?.ds_chave,
            emitente:
              docRef.ds_tipo === 'CTE'
                ? docRef.js_cte?.ds_razao_social_emitente
                : docRef.js_nfe?.ds_razao_social_emitente,
            recebedor: docRef.ds_tipo === 'CTE' ? (docRef.js_cte?.ds_razao_social_recebedor ?? undefined) : undefined,
            destinatario:
              docRef.ds_tipo === 'CTE'
                ? docRef.js_cte?.ds_razao_social_destinatario
                : docRef.js_nfe?.ds_razao_social_destinatario,
            ds_endereco_destino: docRef.ds_tipo === 'CTE' ? (docRef.js_cte?.ds_endereco_destino ?? undefined) : undefined,
            ds_complemento_destino: docRef.ds_tipo === 'CTE' ? (docRef.js_cte?.ds_complemento_destino ?? undefined) : undefined,
          });
          documentosProcessados.add(docRef.id);
        }
      }

      // Também traz documentos que referenciam este CT-e via chave (mesmo sem registro em fis_documento_origem)
      if (cte.js_cte?.ds_chave) {
        for (const doc of documentos) {
          const referenciaCte =
            Array.isArray(doc.js_cte?.js_documentos_anteriores) &&
            doc.js_cte.js_documentos_anteriores.includes(cte.js_cte.ds_chave);

          const nfeReferenciaCte =
            Array.isArray(doc.js_nfe?.js_nfes_referenciadas) &&
            doc.js_nfe.js_nfes_referenciadas.includes(cte.js_cte.ds_chave);

          if (
            (referenciaCte || nfeReferenciaCte) &&
            !documentosProcessados.has(doc.id)
          ) {
            docsGrupo.push({
              id: doc.id,
              tipo: doc.ds_tipo as 'CTE' | 'NFE',
              numero:
                doc.ds_tipo === 'CTE'
                  ? doc.js_cte?.ds_numero
                  : doc.js_nfe?.ds_numero,
              chave:
                doc.ds_tipo === 'CTE'
                  ? doc.js_cte?.ds_chave
                  : doc.js_nfe?.ds_chave,
              emitente:
                doc.ds_tipo === 'CTE'
                  ? doc.js_cte?.ds_razao_social_emitente
                  : doc.js_nfe?.ds_razao_social_emitente,
              recebedor: doc.ds_tipo === 'CTE' ? (doc.js_cte?.ds_razao_social_recebedor ?? undefined) : undefined,
              destinatario:
                doc.ds_tipo === 'CTE'
                  ? doc.js_cte?.ds_razao_social_destinatario
                  : doc.js_nfe?.ds_razao_social_destinatario,
              ds_endereco_destino: doc.ds_tipo === 'CTE' ? (doc.js_cte?.ds_endereco_destino ?? undefined) : undefined,
              ds_complemento_destino: doc.ds_tipo === 'CTE' ? (doc.js_cte?.ds_complemento_destino ?? undefined) : undefined,
            });
            documentosProcessados.add(doc.id);
          }
        }
      }
      const destino = cte.js_cte?.ds_nome_mun_fim || 'SEM DESTINO DEFINIDO';
      const origem = cte.js_cte?.ds_nome_mun_ini || 'SEM ORIGEM DEFINIDA';

      grupos.set(grupoId, {
        id: grupoId,
        documentos: docsGrupo,
        destino: { nome: destino },
        origem: { nome: origem },
        sequencia,
      });

      sequencia++;
    }

    // REGRA 4: Processar NFes órfãs (sem relacionamento com CTe)
    // Todas as NFes órfãs viram UMA ÚNICA entrega
    const nfesOrfas = nfes.filter((nfe) => !documentosProcessados.has(nfe.id));

    if (nfesOrfas.length > 0) {
      const grupoId = `grupo-${sequencia}`;
      const docsNfes = nfesOrfas.map((nfe) => {
        documentosProcessados.add(nfe.id);
        return {
          id: nfe.id,
          tipo: 'NFE' as const,
          numero: nfe.js_nfe?.ds_numero,
          chave: nfe.js_nfe?.ds_chave,
          emitente: nfe.js_nfe?.ds_razao_social_emitente,
          destinatario: nfe.js_nfe?.ds_razao_social_destinatario,
        };
      });

      grupos.set(grupoId, {
        id: grupoId,
        documentos: docsNfes,
        destino: {
          nome:
            nfesOrfas[0]?.js_nfe?.ds_razao_social_destinatario || 'SEM DESTINO',
        },
        origem: { nome: 'SEM ORIGEM' },
        sequencia,
      });

      sequencia++;
    }

    return Array.from(grupos.values());
  } catch (error: any) {
    console.error('Erro ao agrupar documentos:', error);
    throw new Error(`Erro ao agrupar documentos: ${error.message}`);
  }
};

/**
 * Busca relacionamentos de um documento específico
 */
export const getDocumentoRelacionamentos = async (
  documentoId: string
): Promise<{
  relacionadoComo: Array<{ id: string; tipo: 'CTE' | 'NFE' }>;
  temRelacoesCom: Array<{ id: string; tipo: 'CTE' | 'NFE' }>;
}> => {
  try {
    const documento = await prisma.fis_documento_dfe.findUnique({
      where: { id: documentoId },
      select: {
        id: true,
        ds_tipo: true,
        fis_documento_relacionado: {
          select: {
            id_documento_referenciado: true,
            fis_documento_referenciado: {
              select: {
                id: true,
                ds_tipo: true,
              },
            },
          },
        },
        fis_documento_origem: {
          select: {
            id_documento_origem: true,
            fis_documento_origem: {
              select: {
                id: true,
                ds_tipo: true,
              },
            },
          },
        },
      },
    });

    if (!documento) {
      throw new Error('Documento não encontrado');
    }

    return {
      relacionadoComo: documento.fis_documento_relacionado.map((rel) => ({
        id: rel.fis_documento_referenciado.id,
        tipo: rel.fis_documento_referenciado.ds_tipo as 'CTE' | 'NFE',
      })),
      temRelacoesCom: documento.fis_documento_origem.map((rel) => ({
        id: rel.fis_documento_origem.id,
        tipo: rel.fis_documento_origem.ds_tipo as 'CTE' | 'NFE',
      })),
    };
  } catch (error: any) {
    console.error('Erro ao buscar relacionamentos:', error);
    throw new Error(`Erro ao buscar relacionamentos: ${error.message}`);
  }
};
