import {
  Prisma,
  StatusAlteracaoSubcontratacao,
  StatusDocumento,
} from '@prisma/client';
import { getFiscalEmpresa } from './fiscal-empresa.service';
import { prisma } from '../prisma';
import { xmlNFe } from './onvio/gerar-xml.service';
import {
  integrarNfeEntradaDominio,
  reverterIntegracaoNfeEntrada as reverterNfeEntradaDominio,
} from './onvio/envio-xml.service';
import pLimit from 'p-limit';

export const createDocumentoHistorico = async ({
  justificativa,
  id_documento,
  status_antigo,
  status_novo,
  id_usuario,
}: {
  justificativa: string;
  id_documento: string;
  status_antigo?: StatusDocumento;
  status_novo?: StatusDocumento;
  id_usuario?: string;
}) => {
  // Compensa o offset de timezone (-3h) para manter a hora correta no BD
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const compensatedDate = new Date(now.getTime() - offsetMs);

  return prisma.fis_documento_historico.create({
    data: {
      dt_created: compensatedDate,
      ds_motivo: justificativa,
      id_fis_documento: id_documento,
      ds_status_anterior: status_antigo,
      ds_status_novo: status_novo,
      id_usuario,
    },
  });
};

export const getNfeDocumento = async (id: string) => {
  const nota = await prisma.fis_nfe.findUnique({
    where: { id: id }, // ← id da fis_documento
    select: {
      /* cabeçalho */
      id: true,
      ds_numero: true,
      ds_serie: true,
      ds_modelo: true,
      ds_chave: true,
      dt_emissao: true,

      /* partes */
      ds_razao_social_emitente: true,
      ds_documento_emitente: true,
      ds_razao_social_destinatario: true,
      ds_documento_destinatario: true,

      /* totais */
      vl_nf: true,
      vl_produto: true,
      vl_icms: true,
      vl_frete: true,
      vl_seg: true,
      vl_desc: true,
      vl_outros: true,

      /* itens */
      fis_nfe_itens: {
        select: {
          ds_produto: true,
          cd_ncm: true,
          cd_cfop: true,
          vl_quantidade: true,
          vl_unitario: true,
          vl_total: true,
          ds_cst: true,
        },
      },
    },
  });
  return nota;
};

/* CTe -------------------------------------------------------------------- */
export const getCteDocumento = async (id: string) => {
  const nota = await prisma.fis_cte.findUnique({
    where: { id },

    select: {
      id: true,
      ds_chave: true,
      ds_numero: true,
      ds_serie: true,
      ds_modelo: true,
      dt_emissao: true,

      /* partes */
      ds_razao_social_emitente: true,
      ds_documento_emitente: true,
      ds_razao_social_remetente: true,
      ds_documento_remetente: true,
      ds_razao_social_destinatario: true,
      ds_documento_destinatario: true,

      /* locais */
      ds_nome_mun_ini: true,
      ds_uf_ini: true,
      ds_nome_mun_fim: true,
      ds_uf_fim: true,

      /* totais */
      vl_total: true,
      vl_rec: true,
      vl_total_trib: true,
      vl_base_calculo_icms: true,
      vl_icms: true,
      vl_porcentagem_icms: true,

      /* listas */
      fis_cte_comp_carga: {
        select: { ds_nome: true, vl_comp: true },
      },
      fis_cte_carga: {
        select: {
          ds_und: true,
          ds_tipo_medida: true,
          vl_qtd_carregada: true,
        },
      },
    },
  });
  return nota;
};
/* NFSe ------------------------------------------------------------------- */
export const getNfseDocumento = async (id: string) => {
  const nota = await prisma.fis_nfse.findUnique({
    where: { id },
    include: {
      fis_fornecedor: true,
    },
  });
  return nota;
};

type DocumentoCompleto = Prisma.fis_documentoGetPayload<{
  include: {
    js_nfse: {
      select: {
        ds_numero: true;
        ds_codigo_verificacao: true;
        ds_valor_servicos: true;
        dt_emissao: true;
        fis_fornecedor: {
          select: {
            ds_nome: true;
            ds_documento: true;
            ds_endereco: true;
            ds_telefone: true;
            ds_email: true;
            ds_inscricao_municipal: true;
          };
        };
      };
    };
    js_nfe: {
      select: {
        ds_numero: true;
        ds_chave: true;
        vl_nf: true;
        dt_emissao: true;
        fis_fornecedor: {
          select: {
            ds_nome: true;
            ds_documento: true;
            ds_endereco: true;
            ds_telefone: true;
            ds_email: true;
          };
        };
      };
    };
    js_cte: {
      select: {
        ds_numero: true;
        ds_chave: true;
        vl_total: true;
        dt_emissao: true;
        ds_razao_social_emitente: true;
        ds_documento_emitente: true;
      };
    };
  };
}>;

export const getDocumentosPaginacao = async (
  empresaId: string,
  page: number,
  pageSize: number,
  orderBy: 'asc' | 'desc',
  orderColumn: string,
  search: string,
  date?: string,
  status?: string[],
  tipos?: string[]
) => {
  // 1) monta orderBy / raw flag
  let orderByClause: any = {};
  let necessitaRaw = false;
  switch (orderColumn) {
    case 'dt_emissao':
      // Ordenação por data precisa considerar as datas das 3 tabelas
      // (nfse.dt_emissao, COALESCE(nfe.dt_saida_entrega, nfe.dt_emissao), cte.dt_emissao)
      // Para misturar corretamente documentos de tipos diferentes, usamos query RAW
      necessitaRaw = true;
      break;
    case 'ds_valor':
      necessitaRaw = true;
      break;
    case 'ds_chave':
      orderByClause = [
        { js_nfse: { ds_codigo_verificacao: orderBy } },
        { js_nfe: { ds_chave: orderBy } },
        { js_cte: { ds_chave: orderBy } },
      ];
      break;
    case 'ds_tipo':
      orderByClause = [{ ds_tipo: orderBy }];
      break;
    case 'ds_status':
      orderByClause = [{ ds_status: orderBy }];
      break;
    case 'fis_fornecedor.ds_nome':
      orderByClause = [
        { js_nfse: { fis_fornecedor: { ds_nome: orderBy } } },
        { js_nfe: { fis_fornecedor: { ds_nome: orderBy } } },
        { js_cte: { ds_razao_social_emitente: orderBy } },
      ];
      break;
  }

  // 2) filtros básicos
  const fis_empresa = await getFiscalEmpresa(empresaId);
  const whereClause: any = {
    id_fis_empresas: fis_empresa.id,
    ds_tipo_ef: 'ENTRADA',
  };
  if (status?.length) whereClause.ds_status = { in: status };
  if (tipos?.length) whereClause.ds_tipo = { in: tipos };

  // 3) filtro de data
  if (date) {
    const d = new Date(date);
    const startDate = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
    );
    const endDate = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)
    );
    whereClause.AND = [
      {
        OR: [
          { js_nfse: { dt_emissao: { gte: startDate, lte: endDate } } },
          {
            js_nfe: {
              OR: [
                { dt_saida_entrega: { gte: startDate, lte: endDate } },
                {
                  dt_emissao: { gte: startDate, lte: endDate },
                  dt_saida_entrega: null,
                },
              ],
            },
          },
          { js_cte: { dt_emissao: { gte: startDate, lte: endDate } } },
        ],
      },
    ];
  }

  // 4) filtro de texto/valor
  if (search) {
    const text = search.trim();
    const numericSearch = search.replace(/[^0-9.,]/g, '').trim();

    const hasNumeric = numericSearch.length > 0;
    const hasText = text.length > 0;

    const nfseFilters: any[] = [];
    const nfeFilters: any[] = [];
    const cteFilters: any[] = [];

    if (hasText) {
      nfseFilters.push(
        { ds_discriminacao: { contains: text, mode: 'insensitive' } },
        { ds_numero: { contains: text, mode: 'insensitive' } },
        { ds_codigo_verificacao: { contains: text, mode: 'insensitive' } },
        {
          fis_fornecedor: {
            is: {
              OR: [
                { ds_nome: { contains: text, mode: 'insensitive' } }, // começa com
              ],
            },
          },
        }
      );

      nfeFilters.push(
        { ds_numero: { contains: text, mode: 'insensitive' } },
        { ds_chave: { contains: text, mode: 'insensitive' } },
        {
          fis_fornecedor: {
            is: {
              OR: [{ ds_nome: { contains: text, mode: 'insensitive' } }],
            },
          },
        }
      );

      cteFilters.push(
        { ds_numero: { contains: text, mode: 'insensitive' } },
        { ds_chave: { contains: text, mode: 'insensitive' } },
        {
          fis_fornecedor: {
            is: {
              OR: [{ ds_nome: { contains: text, mode: 'insensitive' } }],
            },
          },
        }
      );
    }

    if (hasNumeric) {
      // Só adiciona se tiver números; evita ILIKE '%%'
      nfseFilters.push(
        { ds_valor_servicos: { contains: numericSearch, mode: 'insensitive' } },
        {
          fis_fornecedor: {
            is: {
              ds_documento: { contains: numericSearch, mode: 'insensitive' },
            },
          },
        }
      );
      nfeFilters.push(
        { vl_nf: { contains: numericSearch, mode: 'insensitive' } },
        {
          fis_fornecedor: {
            is: {
              ds_documento: { contains: numericSearch, mode: 'insensitive' },
            },
          },
        }
      );
      cteFilters.push(
        { vl_total: { contains: numericSearch, mode: 'insensitive' } },
        {
          fis_fornecedor: {
            is: {
              ds_documento: { contains: numericSearch, mode: 'insensitive' },
            },
          },
        },
        { id_fis_empresa_tomador: fis_empresa.id } // CTe de entrada: tomador é a empresa
      );
    }

    // Se nenhum filtro foi montado, não empurra o OR vazio
    const orBlocks: any[] = [];
    if (nfseFilters.length) orBlocks.push({ js_nfse: { OR: nfseFilters } });
    if (nfeFilters.length) orBlocks.push({ js_nfe: { OR: nfeFilters } });
    if (cteFilters.length) orBlocks.push({ js_cte: { OR: cteFilters } });

    if (orBlocks.length) {
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({ OR: orBlocks });
    }
  }
  // 5) total e páginas
  const total = await prisma.fis_documento.count({ where: whereClause });
  const totalPages = Math.ceil(total / pageSize);

  let notas: DocumentoCompleto[] = [];

  if (necessitaRaw) {
    const offset = (page - 1) * pageSize;
    const direction = orderBy.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Filtro de data (mês) – só se 'date' vier
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    if (date) {
      const d = new Date(date);
      startDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      endDate = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)
      );
    }

    // Termos de busca
    const text = (search ?? '').trim();
    const numericSearch = (search ?? '').replace(/[^0-9.,]/g, '').trim();
    const hasText = text.length > 0;
    const hasNumeric = numericSearch.length > 0;

    const likeText = `%${text}%`;
    const likeNumber = `%${numericSearch}%`;

    // ------- CAST para ENUMS -------
    // Ajuste o nome do ENUM de status abaixo se for diferente no seu banco (ex.: "StatusDocumento")
    const tiposFilterSql = tipos?.length
      ? Prisma.sql`AND d.ds_tipo IN (${Prisma.join(tipos.map((t) => Prisma.sql`${t}::"TipoDocumento"`))})`
      : Prisma.empty;

    const statusFilterSql = status?.length
      ? Prisma.sql`AND d.ds_status IN (${Prisma.join(status.map((s) => Prisma.sql`${s}::"StatusDocumento"`))})`
      : Prisma.empty;

    // Filtro de data opcional
    const dateFilterSql = date
      ? Prisma.sql`
      AND (
        nfse.dt_emissao BETWEEN ${startDate} AND ${endDate}
        OR COALESCE(nfe.dt_saida_entrega, nfe.dt_emissao) BETWEEN ${startDate} AND ${endDate}
        OR cte.dt_emissao  BETWEEN ${startDate} AND ${endDate}
      )
    `
      : Prisma.empty;

    // Blocos de busca (texto / numérico)
    const textBlock = hasText
      ? Prisma.sql`(
      nfse.ds_discriminacao ILIKE ${likeText}
      OR nfse.ds_numero ILIKE ${likeText}
      OR nfse.ds_codigo_verificacao ILIKE ${likeText}
      OR nfe.ds_numero ILIKE ${likeText}
      OR nfe.ds_chave  ILIKE ${likeText}
      OR cte.ds_numero ILIKE ${likeText}
      OR cte.ds_chave  ILIKE ${likeText}
      -- nome do fornecedor: contém em qualquer posição
      OR nfse_for.ds_nome ILIKE ${likeText}
      OR nfe_for.ds_nome  ILIKE ${likeText}
      OR cte_for.ds_nome  ILIKE ${likeText}
    )`
      : Prisma.empty;

    const numericBlock = hasNumeric
      ? Prisma.sql`(
      CAST(nfse.ds_valor_servicos AS TEXT) ILIKE ${likeNumber}
      OR CAST(nfe.vl_nf AS TEXT)            ILIKE ${likeNumber}
      OR CAST(cte.vl_total AS TEXT)         ILIKE ${likeNumber}
      OR nfse_for.ds_documento ILIKE ${likeNumber}
      OR nfe_for.ds_documento  ILIKE ${likeNumber}
      OR cte_for.ds_documento  ILIKE ${likeNumber}
    )`
      : Prisma.empty;

    const searchFilterSql =
      hasText && hasNumeric
        ? Prisma.sql`AND ( ${textBlock} OR ${numericBlock} )`
        : hasText
          ? Prisma.sql`AND ${textBlock}`
          : hasNumeric
            ? Prisma.sql`AND ${numericBlock}`
            : Prisma.empty;

    // ===== RAW =====
    let raw: any;
    if (orderColumn === 'dt_emissao') {
      // ordena por data unificada (COALESCE das possíveis datas)
      raw = await prisma.$queryRaw<any>(Prisma.sql`
  SELECT
    d.*,

    -- NFSe + fornecedor
    nfse.ds_numero               AS js_nfse_ds_numero,
    nfse.ds_codigo_verificacao   AS js_nfse_ds_codigo_verificacao,
    nfse.ds_valor_servicos       AS js_nfse_ds_valor_servicos,
    nfse.dt_emissao              AS js_nfse_dt_emissao,
    nfse_for.ds_nome             AS js_nfse_fis_fornecedor_ds_nome,
    nfse_for.ds_documento        AS js_nfse_fis_fornecedor_ds_documento,
    nfse_for.ds_endereco         AS js_nfse_fis_fornecedor_ds_endereco,
    nfse_for.ds_telefone         AS js_nfse_fis_fornecedor_ds_telefone,
    nfse_for.ds_email            AS js_nfse_fis_fornecedor_ds_email,
    nfse_for.ds_inscricao_municipal AS js_nfse_fis_fornecedor_ds_inscricao_municipal,

    -- NFe + fornecedor
    nfe.ds_numero                AS js_nfe_ds_numero,
    nfe.ds_chave                 AS js_nfe_ds_chave,
    nfe.cd_tipo_operacao         AS js_nfe_cd_tipo_operacao,
    nfe.cd_crt_emitente          AS js_nfe_cd_crt_emitente,
    nfe.vl_nf                    AS js_nfe_vl_nf,
    nfe.ds_serie                 AS js_nfe_ds_serie,
    nfe.dt_emissao               AS js_nfe_dt_emissao,
    nfe.ds_uf_emitente           AS js_nfe_ds_uf_emitente,
    nfe.ds_municipio_emitente    AS js_nfe_ds_municipio_emitente,
    nfe.dt_saida_entrega         AS js_nfe_dt_saida_entrega,
    nfe_for.ds_nome              AS js_nfe_fis_fornecedor_ds_nome,
    nfe_for.ds_documento         AS js_nfe_fis_fornecedor_ds_documento,
    nfe_for.ds_endereco          AS js_nfe_fis_fornecedor_ds_endereco,
    nfe_for.ds_telefone          AS js_nfe_fis_fornecedor_ds_telefone,
    nfe_for.ds_email             AS js_nfe_fis_fornecedor_ds_email,
    (
      SELECT json_agg(json_build_object('id', i.id))
      FROM fis_nfe_itens i
      WHERE i.id_fis_nfe = nfe.id
    ) AS js_nfe_fis_nfe_itens,

    -- CTe
    cte.ds_numero                AS js_cte_ds_numero,
    cte.ds_chave                      AS js_cte_ds_chave,
    cte.vl_total                      AS js_cte_vl_total,
    cte.dt_emissao                    AS js_cte_dt_emissao,
    cte.ds_razao_social_emitente      AS js_cte_ds_razao_social_emitente,
    cte.ds_documento_emitente         AS js_cte_ds_documento_emitente,
    cte.ds_razao_social_remetente     AS js_cte_ds_razao_social_remetente,
    cte.ds_razao_social_destinatario  AS js_cte_ds_razao_social_destinatario,

    -- coluna auxiliar p/ ordenação por data
    COALESCE(
      nfse.dt_emissao,
      COALESCE(nfe.dt_saida_entrega, nfe.dt_emissao),
      cte.dt_emissao
    ) AS emissao_dt

    -- historico do documento (agregado em JSON)
    ,(
      SELECT json_agg(
        json_build_object(
          'id', h.id,
          'ds_status_anterior', h.ds_status_anterior,
          'ds_status_novo', h.ds_status_novo,
          'ds_motivo', h.ds_motivo,
          'dt_created', h.dt_created,
          'js_profile', (
            SELECT json_build_object('ds_name', p.ds_name)
            FROM sis_profiles p
            WHERE p.id = h.id_usuario
          )
        )
      )
      FROM fis_documento_historico h
      WHERE h.id_fis_documento = d.id
    ) AS js_documento_historico
    ,(
      SELECT json_agg(json_build_object('id', a.id, 'js_inconsistencias', a.js_inconsistencias, 'dt_created', a.dt_created))
      FROM fis_auditoria_doc a
      WHERE a.id_fis_documento = d.id
    ) AS js_fis_auditoria_doc

  FROM fis_documento AS d
  LEFT JOIN fis_nfse  AS nfse ON nfse.id  = d.id_nfse
  LEFT JOIN fis_fornecedores AS nfse_for ON nfse_for.id = nfse.id_fis_fornecedor
  LEFT JOIN fis_nfe   AS nfe  ON nfe.id   = d.id_nfe
  LEFT JOIN fis_fornecedores AS nfe_for  ON nfe_for.id  = nfe.id_fis_fornecedor
  LEFT JOIN fis_cte   AS cte  ON cte.id   = d.id_cte
  LEFT JOIN fis_fornecedores AS cte_for ON cte_for.id = cte.id_fis_fornecedor

  WHERE
    d.id_fis_empresas = ${fis_empresa.id}
    AND d.ds_tipo_ef = 'ENTRADA'
    ${statusFilterSql}
    ${tiposFilterSql}
    ${dateFilterSql}
    ${searchFilterSql}

  ORDER BY emissao_dt ${Prisma.raw(direction)} NULLS LAST
  LIMIT  ${pageSize} OFFSET ${offset};
`);
    } else {
      raw = await prisma.$queryRaw<any>(Prisma.sql`
  SELECT
    d.*,

    -- NFSe + fornecedor
    nfse.ds_numero               AS js_nfse_ds_numero,
    nfse.ds_codigo_verificacao   AS js_nfse_ds_codigo_verificacao,
    nfse.ds_valor_servicos       AS js_nfse_ds_valor_servicos,
    nfse.dt_emissao              AS js_nfse_dt_emissao,
    nfse_for.ds_nome             AS js_nfse_fis_fornecedor_ds_nome,
    nfse_for.ds_documento        AS js_nfse_fis_fornecedor_ds_documento,
    nfse_for.ds_endereco         AS js_nfse_fis_fornecedor_ds_endereco,
    nfse_for.ds_telefone         AS js_nfse_fis_fornecedor_ds_telefone,
    nfse_for.ds_email            AS js_nfse_fis_fornecedor_ds_email,
    nfse_for.ds_inscricao_municipal AS js_nfse_fis_fornecedor_ds_inscricao_municipal,

    -- NFe + fornecedor
    nfe.ds_numero                AS js_nfe_ds_numero,
    nfe.ds_chave                 AS js_nfe_ds_chave,
    nfe.cd_tipo_operacao         AS js_nfe_cd_tipo_operacao,
    nfe.cd_crt_emitente          AS js_nfe_cd_crt_emitente,
    nfe.vl_nf                    AS js_nfe_vl_nf,
    nfe.ds_serie                 AS js_nfe_ds_serie,
    nfe.dt_emissao               AS js_nfe_dt_emissao,
    nfe.ds_uf_emitente           AS js_nfe_ds_uf_emitente,
    nfe.ds_municipio_emitente    AS js_nfe_ds_municipio_emitente,
    nfe.dt_saida_entrega         AS js_nfe_dt_saida_entrega,
    nfe_for.ds_nome              AS js_nfe_fis_fornecedor_ds_nome,
    nfe_for.ds_documento         AS js_nfe_fis_fornecedor_ds_documento,
    nfe_for.ds_endereco          AS js_nfe_fis_fornecedor_ds_endereco,
    nfe_for.ds_telefone          AS js_nfe_fis_fornecedor_ds_telefone,
    nfe_for.ds_email             AS js_nfe_fis_fornecedor_ds_email,
    -- itens da NFe (agregados em JSON)
    (
      SELECT json_agg(json_build_object('id', i.id))
      FROM fis_nfe_itens i
      WHERE i.id_fis_nfe = nfe.id
    ) AS js_nfe_fis_nfe_itens,

    -- CTe
    cte.ds_numero                     AS js_cte_ds_numero,
    cte.ds_chave                      AS js_cte_ds_chave,
    cte.vl_total                      AS js_cte_vl_total,
    cte.dt_emissao                    AS js_cte_dt_emissao,
    cte.ds_razao_social_emitente      AS js_cte_ds_razao_social_emitente,
    cte.ds_documento_emitente         AS js_cte_ds_documento_emitente,
    cte.ds_razao_social_remetente     AS js_cte_ds_razao_social_remetente,
    cte.ds_razao_social_destinatario  AS js_cte_ds_razao_social_destinatario,

    -- coluna auxiliar p/ ordenação numérica
    COALESCE(
      CAST(nfse.ds_valor_servicos AS NUMERIC),
      CAST(nfe.vl_nf              AS NUMERIC),
      CAST(cte.vl_total           AS NUMERIC)
    ) AS valor_num
      ,(
        SELECT json_agg(
          json_build_object(
            'id', h.id,
            'ds_status_anterior', h.ds_status_anterior,
            'ds_status_novo', h.ds_status_novo,
            'ds_motivo', h.ds_motivo,
            'dt_created', h.dt_created,
            'js_profile', (
              SELECT json_build_object('ds_name', p.ds_name)
              FROM sis_profiles p
              WHERE p.id = h.id_usuario
            )
          )
        )
        FROM fis_documento_historico h
        WHERE h.id_fis_documento = d.id
      ) AS js_documento_historico
      ,(
        SELECT json_agg(json_build_object('id', a.id, 'js_inconsistencias', a.js_inconsistencias, 'dt_created', a.dt_created))
        FROM fis_auditoria_doc a
        WHERE a.id_fis_documento = d.id
      ) AS js_fis_auditoria_doc

  FROM fis_documento AS d
  LEFT JOIN fis_nfse  AS nfse ON nfse.id  = d.id_nfse
  LEFT JOIN fis_fornecedores AS nfse_for ON nfse_for.id = nfse.id_fis_fornecedor
  LEFT JOIN fis_nfe   AS nfe  ON nfe.id   = d.id_nfe
  LEFT JOIN fis_fornecedores AS nfe_for  ON nfe_for.id  = nfe.id_fis_fornecedor
  LEFT JOIN fis_cte   AS cte  ON cte.id   = d.id_cte
  LEFT JOIN fis_fornecedores AS cte_for ON cte_for.id = cte.id_fis_fornecedor

  WHERE
    d.id_fis_empresas = ${fis_empresa.id}
    AND d.ds_tipo_ef = 'ENTRADA'
    ${statusFilterSql}
    ${tiposFilterSql}
    ${dateFilterSql}
    ${searchFilterSql}

  ORDER BY valor_num ${Prisma.raw(direction)} NULLS LAST
  LIMIT  ${pageSize} OFFSET ${offset};
`);
    }

    // 2) mapeia de volta para o shape aninhado
    notas = raw.map((r: any) => ({
      id: r.id,
      ds_tipo: r.ds_tipo,
      id_fis_empresas: r.id_fis_empresas,
      ds_status: r.ds_status,
      ds_origem: r.ds_origem,
      ds_tipo_ef: r.ds_tipo_ef,
      dt_created: r.dt_created,
      dt_updated: r.dt_updated,
      id_nfse: r.id_nfse,
      id_nfe: r.id_nfe,
      id_cte: r.id_cte,
      js_nfse: r.id_nfse
        ? {
            ds_numero: r.js_nfse_ds_numero,
            ds_codigo_verificacao: r.js_nfse_ds_codigo_verificacao,
            ds_valor_servicos: r.js_nfse_ds_valor_servicos,
            dt_emissao: r.js_nfse_dt_emissao,
            fis_fornecedor: {
              ds_nome: r.js_nfse_fis_fornecedor_ds_nome,
              ds_documento: r.js_nfse_fis_fornecedor_ds_documento,
              ds_endereco: r.js_nfse_fis_fornecedor_ds_endereco,
              ds_telefone: r.js_nfse_fis_fornecedor_ds_telefone,
              ds_email: r.js_nfse_fis_fornecedor_ds_email,
              ds_inscricao_municipal:
                r.js_nfse_fis_fornecedor_ds_inscricao_municipal,
            },
          }
        : null,

      js_nfe: r.id_nfe
        ? {
            ds_numero: r.js_nfe_ds_numero,
            ds_chave: r.js_nfe_ds_chave,
            vl_nf: r.js_nfe_vl_nf,
            cd_tipo_operacao: r.js_nfe_cd_tipo_operacao,
            dt_emissao: r.js_nfe_dt_emissao,
            dt_saida_entrega: r.js_nfe_dt_saida_entrega,
            ds_uf_emitente: r.js_nfe_ds_uf_emitente,
            ds_municipio_emitente: r.js_nfe_ds_municipio_emitente,
            cd_crt_emitente: r.js_nfe_cd_crt_emitente,
            ds_serie: r.js_nfe_ds_serie,
            fis_fornecedor: {
              ds_nome: r.js_nfe_fis_fornecedor_ds_nome,
              ds_documento: r.js_nfe_fis_fornecedor_ds_documento,
              ds_endereco: r.js_nfe_fis_fornecedor_ds_endereco,
              ds_telefone: r.js_nfe_fis_fornecedor_ds_telefone,
              ds_email: r.js_nfe_fis_fornecedor_ds_email,
            },
            fis_nfe_itens: (() => {
              const v = r.js_nfe_fis_nfe_itens;
              if (!v) return [];
              if (typeof v === 'string') {
                try {
                  return JSON.parse(v);
                } catch (e) {
                  // se não for JSON válido, retornar vazio e logar
                  console.warn('Falha ao parsear js_nfe_fis_nfe_itens:', e);
                  return [];
                }
              }
              // já objeto/array retornado pelo driver
              return Array.isArray(v) ? v : [v];
            })(),
          }
        : null,

      js_cte: r.id_cte
        ? {
            ds_numero: r.js_cte_ds_numero,
            ds_chave: r.js_cte_ds_chave,
            vl_total: r.js_cte_vl_total,
            dt_emissao: r.js_cte_dt_emissao,
            ds_razao_social_emitente: r.js_cte_ds_razao_social_emitente,
            ds_documento_emitente: r.js_cte_ds_documento_emitente,
            ds_razao_social_remetente: r.js_cte_ds_razao_social_remetente,
            ds_razao_social_destinatario: r.js_cte_ds_razao_social_destinatario,
          }
        : null,
      js_documento_historico: (() => {
        const v = r.js_documento_historico;
        if (!v) return [];
        if (typeof v === 'string') {
          try {
            return JSON.parse(v);
          } catch (e) {
            console.warn('Falha ao parsear js_documento_historico:', e);
            return [];
          }
        }
        return Array.isArray(v) ? v : [v];
      })(),
      fis_auditoria_doc: (() => {
        const v = r.js_fis_auditoria_doc;
        if (!v) return [];
        if (typeof v === 'string') {
          try {
            return JSON.parse(v);
          } catch (e) {
            console.warn('Falha ao parsear js_fis_auditoria_doc:', e);
            return [];
          }
        }
        return Array.isArray(v) ? v : [v];
      })(),
    }));
  } else {
    // 7) prisma.findMany normal
    notas = await prisma.fis_documento.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: orderByClause,
      include: {
        js_nfse: {
          select: {
            ds_numero: true,
            ds_codigo_verificacao: true,
            ds_valor_servicos: true,
            dt_emissao: true,
            fis_fornecedor: {
              select: {
                ds_nome: true,
                ds_documento: true,
                ds_endereco: true,
                ds_telefone: true,
                ds_email: true,
                ds_inscricao_municipal: true,
              },
            },
          },
        },
        js_nfe: {
          select: {
            ds_numero: true,
            ds_chave: true,
            vl_nf: true,
            cd_tipo_operacao: true,
            dt_emissao: true,
            dt_saida_entrega: true,
            ds_serie: true,
            cd_crt_emitente: true,
            ds_uf_emitente: true,
            ds_municipio_emitente: true,
            fis_fornecedor: {
              select: {
                ds_nome: true,
                ds_documento: true,
                ds_endereco: true,
                ds_telefone: true,
                ds_email: true,
              },
            },
            fis_nfe_itens: { select: { id: true } },
          },
        },
        js_cte: {
          select: {
            ds_numero: true,
            ds_chave: true,
            vl_total: true,
            dt_emissao: true,
            ds_razao_social_emitente: true,
            ds_documento_emitente: true,
            ds_razao_social_remetente: true,
            ds_razao_social_destinatario: true,
          },
        },
        fis_evento: {
          select: {
            cd_codigo_evento: true,
            ds_descricao_evento: true,
            ds_justificativa_evento: true,
            ds_protocolo: true,
            ds_status_retorno: true,
            ds_evento_id: true,
            dt_evento: true,
            dt_created: true,
          },
        },
        fis_auditoria_doc: {
          select: {
            id: true,
            js_inconsistencias: true,
            dt_created: true,
          },
        },
        fis_documento_historico: {
          select: {
            id: true,
            ds_status_anterior: true,
            ds_status_novo: true,
            ds_motivo: true,
            dt_created: true,
            js_profile: {
              select: { ds_name: true },
            },
          },
        },
      },
    });
  }
  const allIds = await prisma.fis_documento.findMany({
    where: whereClause,
    select: { id: true, id_nfe: true, id_nfse: true, id_cte: true },
  });
  return {
    total,
    totalPages,
    page,
    pageSize,
    notas,
    allIds,
  };
};

type DocumentoSaidaCompleto = Prisma.fis_documentoGetPayload<{
  include: {
    js_nfse: {
      select: {
        ds_numero: true;
        ds_codigo_verificacao: true;
        ds_valor_servicos: true;
        dt_emissao: true;
        ds_documento_tomador: true;
        ds_razao_social_tomador: true;
      };
    };
    js_nfe: {
      select: {
        ds_numero: true;
        ds_chave: true;
        vl_nf: true;
        dt_emissao: true;
        ds_razao_social_destinatario: true;
        ds_documento_destinatario: true;
      };
    };
    js_cte: {
      select: {
        ds_numero: true;
        ds_chave: true;
        vl_total: true;
        dt_emissao: true;
        ds_razao_social_destinatario: true;
        ds_documento_destinatario: true;
      };
    };
  };
}>;
export const getDocumentosSaidaPaginacao = async (
  empresaId: string,
  page: number,
  pageSize: number,
  orderBy: 'asc' | 'desc',
  orderColumn: string,
  search: string,
  date?: string,
  status?: string[],
  tipos?: string[]
) => {
  // 1) monta orderBy / raw flag
  let orderByClause: any = {};
  let necessitaRaw = false;
  switch (orderColumn) {
    case 'dt_emissao':
      orderByClause = [
        { js_nfse: { dt_emissao: orderBy } },
        { js_nfe: { dt_emissao: orderBy } },
        { js_cte: { dt_emissao: orderBy } },
      ];
      break;
    case 'ds_valor':
      necessitaRaw = true;
      break;
    case 'ds_chave':
      orderByClause = [
        { js_nfse: { ds_codigo_verificacao: orderBy } },
        { js_nfe: { ds_chave: orderBy } },
        { js_cte: { ds_chave: orderBy } },
      ];
      break;
    case 'ds_tipo':
      orderByClause = [{ ds_tipo: orderBy }];
      break;
    case 'ds_status':
      orderByClause = [{ ds_status: orderBy }];
      break;
    case 'destinatario':
      orderByClause = [
        { js_nfse: { ds_razao_social_tomador: orderBy } },
        { js_nfe: { ds_razao_social_destinatario: orderBy } },
        { js_cte: { ds_razao_social_destinatario: orderBy } },
      ];
      break;
  }

  // 2) filtros básicos
  const fis_empresa = await getFiscalEmpresa(empresaId);
  const whereClause: any = {
    id_fis_empresas: fis_empresa.id,
    ds_tipo_ef: 'SAIDA',
  };
  if (status?.length) whereClause.ds_status = { in: status };
  if (tipos?.length) whereClause.ds_tipo = { in: tipos };

  // 3) filtro de data
  if (date) {
    const d = new Date(date);
    const startDate = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
    );
    const endDate = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)
    );
    whereClause.AND = [
      {
        OR: [
          { js_nfse: { dt_emissao: { gte: startDate, lte: endDate } } },
          {
            js_nfe: {
              OR: [
                { dt_saida_entrega: { gte: startDate, lte: endDate } },
                {
                  dt_emissao: { gte: startDate, lte: endDate },
                  dt_saida_entrega: null,
                },
              ],
            },
          },
          { js_cte: { dt_emissao: { gte: startDate, lte: endDate } } },
        ],
      },
    ];
  }

  // 4) filtro de texto/valor
  if (search) {
    const numericSearch = search.replace(/[^0-9.,]/g, '');
    const nfseFilters = [
      { ds_discriminacao: { contains: search, mode: 'insensitive' } },
      { ds_numero: { contains: search, mode: 'insensitive' } },
      { ds_codigo_verificacao: { contains: search, mode: 'insensitive' } },
      { ds_valor_servicos: { contains: numericSearch, mode: 'insensitive' } },
      {
        ds_documento_tomador: { contains: numericSearch, mode: 'insensitive' },
      },
    ];
    const nfeFilters = [
      { ds_numero: { contains: search, mode: 'insensitive' } },
      { ds_chave: { contains: search, mode: 'insensitive' } },
      { vl_nf: { contains: numericSearch, mode: 'insensitive' } },
      {
        ds_documento_destinatario: {
          contains: numericSearch,
          mode: 'insensitive',
        },
      },
    ];
    const cteFilters = [
      { ds_numero: { contains: search, mode: 'insensitive' } },
      { ds_chave: { contains: search, mode: 'insensitive' } },
      { vl_total: { contains: numericSearch, mode: 'insensitive' } },
      {
        ds_documento_destinatario: {
          contains: numericSearch,
          mode: 'insensitive',
        },
      },
    ];
    whereClause.AND = whereClause.AND || [];
    whereClause.AND.push({
      OR: [
        { js_nfse: { OR: nfseFilters } },
        { js_nfe: { OR: nfeFilters } },
        { js_cte: { OR: cteFilters } },
      ],
    });
  }

  // 5) total e páginas
  const total = await prisma.fis_documento.count({ where: whereClause });
  const totalPages = Math.ceil(total / pageSize);

  let notas: DocumentoSaidaCompleto[] = [];

  if (necessitaRaw) {
    // 6) RAW: ordena numericamente sem alterar strings
    const offset = (page - 1) * pageSize;
    const direction = orderBy.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const d = new Date(date!);
    const startDate = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
    );
    const endDate = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)
    );
    const numericPattern = `%${search.replace(/[^0-9.,]/g, '')}%`;
    const tiposFilterSql = tipos?.length
      ? Prisma.sql`AND d.ds_tipo IN (${Prisma.join(tipos.map((t) => Prisma.sql`${t}::"TipoDocumento"`))})`
      : Prisma.empty;
    // 6.1) raw query
    const raw = await prisma.$queryRaw<any>(
      Prisma.sql`
      SELECT
        d.*,
        nfse.ds_numero                   AS js_nfse_ds_numero,
        nfse.ds_codigo_verificacao       AS js_nfse_ds_codigo_verificacao,
        nfse.ds_valor_servicos           AS js_nfse_ds_valor_servicos,
        nfse.dt_emissao                  AS js_nfse_dt_emissao,
        nfse.ds_documento_tomador        AS js_nfse_ds_documento_tomador,
        nfse.ds_razao_social_tomador     AS js_nfse_ds_razao_social_tomador,

        nfe.ds_numero                    AS js_nfe_ds_numero,
        nfe.ds_chave                     AS js_nfe_ds_chave,
          nfe.vl_nf                        AS js_nfe_vl_nf,
          nfe.cd_crt_emitente              AS js_nfe_cd_crt_emitente,
        nfe.dt_emissao                   AS js_nfe_dt_emissao,
        nfe.dt_saida_entrega             AS js_nfe_dt_saida_entrega,
  nfe.ds_documento_destinatario    AS js_nfe_ds_documento_destinatario,
  nfe.ds_razao_social_destinatario AS js_nfe_ds_razao_social_destinatario,

        cte.ds_numero                    AS js_cte_ds_numero,
        cte.ds_chave                     AS js_cte_ds_chave,
        cte.vl_total                     AS js_cte_vl_total,
        cte.dt_emissao                   AS js_cte_dt_emissao,
        cte.ds_documento_destinatario    AS js_cte_ds_documento_destinatario,
        cte.ds_razao_social_destinatario AS js_cte_ds_razao_social_destinatario,

        COALESCE(
          CAST(nfse.ds_valor_servicos AS NUMERIC),
          CAST(nfe.vl_nf              AS NUMERIC),
          CAST(cte.vl_total           AS NUMERIC)
        ) AS valor_num
        ,(
          SELECT json_agg(
            json_build_object(
              'id', h.id,
              'ds_status_anterior', h.ds_status_anterior,
              'ds_status_novo', h.ds_status_novo,
              'ds_motivo', h.ds_motivo,
              'dt_created', h.dt_created,
              'js_profile', (
                SELECT json_build_object('ds_name', p.ds_name)
                FROM sis_profiles p
                WHERE p.id = h.id_usuario
              )
            )
          )
          FROM fis_documento_historico h
          WHERE h.id_fis_documento = d.id
        ) AS js_documento_historico
        ,(
          SELECT json_agg(json_build_object('id', a.id, 'js_inconsistencias', a.js_inconsistencias, 'dt_created', a.dt_created))
          FROM fis_auditoria_doc a
          WHERE a.id_fis_documento = d.id
        ) AS js_fis_auditoria_doc
      FROM fis_documento AS d
      LEFT JOIN fis_nfse AS nfse ON nfse.id = d.id_nfse
      LEFT JOIN fis_nfe  AS nfe  ON nfe.id  = d.id_nfe
      LEFT JOIN fis_cte  AS cte  ON cte.id  = d.id_cte
      WHERE
        d.id_fis_empresas = ${fis_empresa.id}
        AND d.ds_tipo_ef = 'SAIDA'
        ${tiposFilterSql}
        AND (
          nfse.dt_emissao BETWEEN ${startDate} AND ${endDate}
          OR COALESCE(nfe.dt_saida_entrega, nfe.dt_emissao) BETWEEN ${startDate} AND ${endDate}
          OR cte.dt_emissao  BETWEEN ${startDate} AND ${endDate}
        )
        AND (
          nfse.ds_valor_servicos ILIKE ${numericPattern}
          OR nfe.vl_nf            ILIKE ${numericPattern}
          OR cte.vl_total         ILIKE ${numericPattern}
        )
      ORDER BY valor_num ${Prisma.raw(direction)}
      LIMIT  ${pageSize} OFFSET ${offset};
    `
    );

    // 6.2) reconstrói o shape de saída
    notas = raw.map((r: any) => ({
      id: r.id,
      ds_tipo: r.ds_tipo,
      id_fis_empresas: r.id_fis_empresas,
      ds_status: r.ds_status,
      ds_origem: r.ds_origem,
      ds_tipo_ef: r.ds_tipo_ef,
      dt_created: r.dt_created,
      dt_updated: r.dt_updated,
      id_nfse: r.id_nfse,
      id_nfe: r.id_nfe,
      id_cte: r.id_cte,
      js_nfse: r.id_nfse
        ? {
            ds_numero: r.js_nfse_ds_numero,
            ds_codigo_verificacao: r.js_nfse_ds_codigo_verificacao,
            cd_crt_emitente: r.js_nfe_cd_crt_emitente,
            ds_valor_servicos: r.js_nfse_ds_valor_servicos,
            dt_emissao: r.js_nfse_dt_emissao,
            ds_documento_tomador: r.js_nfse_ds_documento_tomador,
            ds_razao_social_tomador: r.js_nfse_ds_razao_social_tomador,
          }
        : null,

      js_nfe: r.id_nfe
        ? {
            ds_numero: r.js_nfe_ds_numero,
            ds_chave: r.js_nfe_ds_chave,
            vl_nf: r.js_nfe_vl_nf,
            cd_crt_emitente: r.js_nfe_cd_crt_emitente,
            dt_emissao: r.js_nfe_dt_emissao,
            dt_saida_entrega: r.js_nfe_dt_saida_entrega,
            ds_documento_destinatario: r.js_nfe_ds_documento_destinatario,
            ds_razao_social_destinatario: r.js_nfe_ds_razao_social_destinatario,
          }
        : null,

      js_cte: r.id_cte
        ? {
            ds_numero: r.js_cte_ds_numero,
            ds_chave: r.js_cte_ds_chave,
            vl_total: r.js_cte_vl_total,
            dt_emissao: r.js_cte_dt_emissao,
            ds_documento_destinatario: r.js_cte_ds_documento_destinatario,
            ds_razao_social_destinatario: r.js_cte_ds_razao_social_destinatario,
          }
        : null,
      js_documento_historico: (() => {
        const v = r.js_documento_historico;
        if (!v) return [];
        if (typeof v === 'string') {
          try {
            return JSON.parse(v);
          } catch (e) {
            console.warn('Falha ao parsear js_documento_historico:', e);
            return [];
          }
        }
        return Array.isArray(v) ? v : [v];
      })(),
    }));
  } else {
    // 7) prisma.findMany normal
    notas = await prisma.fis_documento.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: orderByClause,
      include: {
        js_nfse: {
          select: {
            ds_numero: true,
            ds_codigo_verificacao: true,
            ds_valor_servicos: true,
            dt_emissao: true,
            ds_documento_tomador: true,
            ds_razao_social_tomador: true,
          },
        },
        js_nfe: {
          select: {
            ds_numero: true,
            ds_chave: true,
            vl_nf: true,
            dt_emissao: true,
            dt_saida_entrega: true,
            ds_documento_destinatario: true,
            ds_razao_social_destinatario: true,
          },
        },
        js_cte: {
          select: {
            ds_numero: true,
            ds_chave: true,
            vl_total: true,
            dt_emissao: true,
            ds_documento_destinatario: true,
            ds_razao_social_destinatario: true,
          },
        },
      },
    });
  }
  return {
    total,
    totalPages,
    page,
    pageSize,
    notas,
  };
};

export const getItensNfe = async (id_nfe: string) => {
  const itens = await prisma.fis_nfe_itens.findMany({
    where: {
      id_fis_nfe: id_nfe,
    },
    select: {
      id: true,
      ds_ordem: true,
      id_fis_nfe: true,
      ds_produto: true,
      ds_codigo: true,
      ds_unidade: true,
      vl_quantidade: true,
      vl_unitario: true,
      vl_total: true,
      ds_cst: true,
      ds_origem: true,
      cd_ncm: true,
      cd_cfop: true,
      fis_nfe_itens_alter_entrada: {
        select: {
          id_produto_alterado: true,
          cd_produto_alterado: true,
          ds_codigo_cfop_alterado: true,
          ds_codigo_cst_gerado: true,
          fl_conversao: true,
          ds_conversao: true,
          ds_quantidade_alterada: true,
          id_regra_nfe_entrada: true,
          fis_produtos: {
            select: {
              id: true,
              id_externo: true,
              ds_nome: true,
              ds_unidade: true,
              cd_ncm: true,
              ds_tipo_item: true,
            },
          },
        },
      },
      fis_nfe: {
        select: { fis_fornecedor: { select: { ds_nome: true, id: true } } },
      },
    },
  });
  // anexar ds_descricao de sis_tipos_produto para cada produto (se aplicável)
  try {
    const tipoCodes = new Set<string>();
    for (const it of itens) {
      const alters = it.fis_nfe_itens_alter_entrada || [];
      for (const a of alters) {
        const p = (a as any).fis_produtos;
        if (p && p.ds_tipo_item !== undefined && p.ds_tipo_item !== null) {
          // padStart conforme usado em outras partes do código
          const code = String(p.ds_tipo_item).padStart(2, '0');
          tipoCodes.add(code);
        }
      }
    }

    if (tipoCodes.size > 0) {
      const tipos = await prisma.sis_tipos_produto.findMany({
        where: { ds_codigo: { in: Array.from(tipoCodes) } },
        select: { ds_codigo: true, ds_descricao: true },
      });
      const mapDescricao: Record<string, string> = {};
      tipos.forEach(
        (t) => (mapDescricao[String(t.ds_codigo)] = t.ds_descricao)
      );

      // anexar campo `descricao_tipo_item` dentro de fis_produtos
      for (const it of itens) {
        const alters = it.fis_nfe_itens_alter_entrada || [];
        for (const a of alters) {
          const p = (a as any).fis_produtos;
          if (p && p.ds_tipo_item !== undefined && p.ds_tipo_item !== null) {
            const code = String(p.ds_tipo_item).padStart(2, '0');
            (p as any).descricao_tipo_item = mapDescricao[code] || null;
          } else {
            if (p) (p as any).descricao_tipo_item = null;
          }
        }
      }
    }
  } catch (err) {
    console.warn(
      'Erro ao anexar sis_tipos_produto em getItensNfe:',
      (err as any)?.message || err
    );
  }

  return itens;
};

export const getAlteracoesNfe = async (id_nfe: string) => {
  // Busca os ids dos itens da NFe e depois busca as alterações para esses itens
  const itens = await prisma.fis_nfe_itens.findMany({
    where: { id_fis_nfe: id_nfe },
    select: { id: true, ds_produto: true, ds_codigo: true },
  });

  const itemIds = itens.map((i) => i.id);
  if (!itemIds.length) return [];

  const alteracoes = await prisma.fis_nfe_itens_alter_entrada.findMany({
    where: { id_nfe_item: { in: itemIds } },
    orderBy: { dt_created: 'desc' },
  });

  const itensMap: Record<string, any> = {};
  itens.forEach((it) => (itensMap[it.id] = it));

  return alteracoes.map((a) => ({
    ...a,
    item: itensMap[a.id_nfe_item] || null,
  }));
};

export const getAlteracoesPorItem = async (id_item: string) => {
  const alteracoes = await prisma.fis_nfe_itens_alter_entrada.findMany({
    where: { id_nfe_item: id_item },
    orderBy: { dt_created: 'desc' },
  });
  return alteracoes;
};

export const insertItensAlterNfe = async (data: {
  id_nfe: string;
  id_item: string;
  id_produto?: string | null;
  cd_produto?: string | null;
  ds_ordem?: string | null;
  ds_nome_produto?: string | null;
  cd_cfop?: string | null;
  ds_origem?: string | null;
  cd_cst?: string | null;
  ds_unidade?: string | null;
  ds_tipo_item?: string | null;
  fl_conversao?: boolean;
  ds_fator_conversao?: string | null;
  ds_unidade_convertida?: string | null;
  id_empresa?: string | null;
}) => {
  const {
    id_nfe,
    id_item,
    id_produto,
    cd_produto,
    cd_cfop,
    cd_cst,
    ds_unidade,
    ds_tipo_item,
    fl_conversao,
    ds_fator_conversao,
    ds_unidade_convertida,
    ds_ordem,
  } = data;
  if (!id_item || !id_nfe) {
    throw new Error('id_nfe e id_item são obrigatórios');
  }

  const dadosAlter: any = {};
  if (id_produto) dadosAlter.id_produto_alterado = id_produto;
  if (cd_produto) dadosAlter.cd_produto_alterado = cd_produto;
  if (cd_cfop) dadosAlter.ds_codigo_cfop_alterado = cd_cfop;
  if (cd_cst) dadosAlter.ds_codigo_cst_gerado = cd_cst;

  const existente = await prisma.fis_nfe_itens_alter_entrada.findFirst({
    where: { id_nfe_item: id_item },
    orderBy: { dt_created: 'desc' },
  });
  let itemAlter;
  if (existente) {
    // atualiza apenas os campos enviados
    const updateData: any = { ...dadosAlter };
    if (typeof fl_conversao !== 'undefined') {
      updateData.fl_conversao = fl_conversao;
    }
    if (typeof ds_fator_conversao !== 'undefined') {
      updateData.ds_conversao = ds_fator_conversao;
    }
    if (typeof ds_unidade_convertida !== 'undefined') {
      updateData.ds_quantidade_alterada = ds_unidade_convertida;
    }

    itemAlter = await prisma.fis_nfe_itens_alter_entrada.update({
      where: { id: existente.id },
      data: updateData,
    });
  } else {
    itemAlter = await prisma.fis_nfe_itens_alter_entrada.create({
      data: {
        id_nfe_item: id_item,
        id_produto_alterado: id_produto || null,
        cd_produto_alterado: cd_produto || null,
        ds_codigo_cfop_alterado: cd_cfop || null,
        ds_codigo_cst_gerado: cd_cst || null,
        fl_conversao: fl_conversao || false,
        ds_quantidade_alterada: ds_unidade_convertida || null,
        ds_conversao: ds_fator_conversao || null,
      },
    });
  }
  try {
    const fornecedorIdByNfe = await prisma.fis_nfe.findUnique({
      where: { id: id_nfe },
      select: { id_fis_fornecedor: true },
    });
    const idEmpresa = await getFiscalEmpresa(data.id_empresa);
    const produtoId = itemAlter.id_produto_alterado || id_produto;
    const cdProdutoOriginal = await prisma.fis_nfe_itens.findUnique({
      where: { id: id_item },
      select: { ds_codigo: true },
    });
    if (idEmpresa && fornecedorIdByNfe && produtoId) {
      const exists = await prisma.fis_nfe_produto_fornecedor.findUnique({
        where: {
          uniq_produto_fornecedor: {
            id_fis_empresas: idEmpresa.id,
            id_fis_produto: produtoId as string,
            id_fis_fornecedor: fornecedorIdByNfe.id_fis_fornecedor,
            ds_codigo_produto: cdProdutoOriginal?.ds_codigo,
          },
        },
      });
      if (!exists) {
        const item = await prisma.fis_nfe_itens.findUnique({
          where: { id: id_item },
          select: { ds_codigo: true },
        });
        await prisma.fis_nfe_produto_fornecedor.create({
          data: {
            id_fis_empresas: idEmpresa.id,
            id_fis_produto: produtoId as string,
            id_fis_fornecedor: fornecedorIdByNfe.id_fis_fornecedor,
            id_nfe: id_nfe,
            fl_conversao: fl_conversao || false,
            ds_conversao: ds_fator_conversao ?? null,
            ds_codigo_produto: item.ds_codigo,
            ds_ordem_origem: ds_ordem || null,
          } as any,
        });
      }
    }
  } catch (err) {
    console.warn(
      'Erro ao vincular produto/fornecedor:',
      (err as any)?.message || err
    );
  }

  return itemAlter;
};

export const integrarNfeEntrada = async (
  id_empresa: string,
  id_nfe: string[],
  dt_competencia?: string,
  usuarioId?: string
) => {
  let competenciaToSend: string | undefined = undefined;
  try {
    if (dt_competencia) {
      // aceita YYYY-MM ou YYYY-MM-DD e converte para MM-YYYY
      const parts = dt_competencia.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        const month = parts[1];
        if (/^\d{4}$/.test(year) && /^\d{1,2}$/.test(month)) {
          const mm = month.padStart(2, '0');
          competenciaToSend = `${mm}-${year}`;
        } else {
          console.warn(
            `Formato inválido de dt_competencia recebido: ${dt_competencia}`
          );
        }
      } else {
        console.warn(
          `Formato inválido de dt_competencia recebido: ${dt_competencia}`
        );
      }
    }
  } catch (err) {
    console.warn(
      'Erro ao processar dt_competencia:',
      (err as any)?.message || err
    );
  }
  const nfeApto = await prisma.fis_nfe.findMany({
    where: {
      id: { in: id_nfe },
      fis_documento: {
        some: {
          AND: [
            { id_fis_empresas: (await getFiscalEmpresa(id_empresa)).id },
            { ds_tipo_ef: 'ENTRADA' },
            {
              OR: [
                { ds_status: 'AGUARDANDO_INTEGRACAO' },
                { ds_status: 'IMPORTADO' },
                { ds_status: 'AGUARDANDO_VALIDACAO' },
              ],
            },
            {
              fis_evento: {
                none: {
                  OR: [
                    { ds_descricao_evento: 'Cancelamento' },
                    { ds_descricao_evento: 'Desconhecimento da Operacao' },
                    { ds_descricao_evento: 'Operacao nao Realizada' },
                  ],
                },
              },
            },
          ],
        },
      },
    },
    select: { id: true },
  });
  const idNfeAptoList = nfeApto.map((n) => n.id);
  if (!idNfeAptoList.length) {
    return 400;
  }
  const envio = await integrarNfeEntradaDominio(
    id_empresa,
    idNfeAptoList,
    competenciaToSend
  );
  const enviados: string[] = Array.isArray((envio as any)?.enviados)
    ? (envio as any).enviados
    : idNfeAptoList;
  const documentosAntes = await prisma.fis_documento.findMany({
    where: {
      id_nfe: { in: idNfeAptoList },
      id_fis_empresas: (await getFiscalEmpresa(id_empresa)).id,
    },
    select: { id: true, ds_status: true },
  });
  if (enviados.length) {
    await prisma.fis_documento.updateMany({
      where: {
        id_nfe: { in: enviados },
        id_fis_empresas: (await getFiscalEmpresa(id_empresa)).id,
      },
      data: { ds_status: 'INTEGRACAO_ESCRITA' },
    });
  }
  const documentos = await prisma.fis_documento.findMany({
    where: {
      id_nfe: { in: enviados },
      id_fis_empresas: (await getFiscalEmpresa(id_empresa)).id,
    },
    select: { id: true, ds_status: true },
  });
  for (let cont = 0; cont < documentos.length; cont++)
    createDocumentoHistorico({
      justificativa: 'Integração NFe de Entrada com Domínio',
      id_documento: documentos[cont].id,
      status_novo: documentos[cont].ds_status ?? undefined,
      status_antigo:
        documentosAntes.find((d) => d.id === documentos[cont].id)?.ds_status ??
        undefined,
      id_usuario: usuarioId,
    });

  return envio;
};

export const reverterNfeEntrada = async (
  id_empresa: string,
  ids: string[],
  dt_competencia?: string,
  usuarioId?: string
) => {
  let competenciaToSend: string | undefined = undefined;
  try {
    if (dt_competencia) {
      // aceita YYYY-MM ou YYYY-MM-DD e converte para MM-YYYY
      const parts = dt_competencia.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        const month = parts[1];
        if (/^\d{4}$/.test(year) && /^\d{1,2}$/.test(month)) {
          const mm = month.padStart(2, '0');
          competenciaToSend = `${mm}-${year}`;
        } else {
          console.warn(
            `Formato inválido de dt_competencia recebido: ${dt_competencia}`
          );
        }
      } else {
        console.warn(
          `Formato inválido de dt_competencia recebido: ${dt_competencia}`
        );
      }
    }
  } catch (err) {
    console.warn(
      'Erro ao processar dt_competencia:',
      (err as any)?.message || err
    );
  }
  const chaves = await prisma.fis_nfe.findMany({
    where: { id: { in: ids } },
    select: { ds_chave: true },
  });
  const chavesList = chaves.map((c) => c.ds_chave);
  // sanitize chaves array: trim and remove empty
  const chavesSanitized = (chavesList || [])
    .map((c) => (c ? String(c).trim() : ''))
    .filter((c) => c.length > 0);

  if (!chavesSanitized.length) {
    throw new Error('Envie ao menos uma chave para reverter a integração');
  }
  const resultado = await reverterNfeEntradaDominio(
    id_empresa,
    chavesSanitized,
    competenciaToSend!
  );

  // Atualiza status dos documentos correspondentes para RECEBIDO_EMPRESA (ou outro status desejado)
  try {
    const fisEmpresa = await getFiscalEmpresa(id_empresa);

    // encontra as NFes locais que possuem essas chaves
    const nfes = await prisma.fis_nfe.findMany({
      where: { ds_chave: { in: chavesSanitized } },
      select: { id: true },
    });
    const nfeIds = nfes.map((n) => n.id);

    if (nfeIds.length) {
      const documentosAntes = await prisma.fis_documento.findMany({
        where: {
          id_nfe: { in: nfeIds },
          id_fis_empresas: (await getFiscalEmpresa(id_empresa)).id,
        },
        select: { id: true, ds_status: true },
      });
      await prisma.fis_documento.updateMany({
        where: { id_nfe: { in: nfeIds }, id_fis_empresas: fisEmpresa.id },
        data: { ds_status: 'AGUARDANDO_INTEGRACAO' },
      });
      const documentos = await prisma.fis_documento.findMany({
        where: {
          id_nfe: { in: nfeIds },
          id_fis_empresas: (await getFiscalEmpresa(id_empresa)).id,
        },
        select: { id: true, ds_status: true },
      });
      for (let cont = 0; cont < documentos.length; cont++)
        createDocumentoHistorico({
          justificativa: 'Reverter integração NFe de Entrada com Domínio',
          id_documento: documentos[cont].id,
          status_novo: documentos[cont].ds_status,
          status_antigo: documentosAntes.find(
            (d) => d.id === documentos[cont].id
          )?.ds_status,
          id_usuario: usuarioId,
        });
    }
  } catch (err) {
    console.warn(
      'Erro ao atualizar status de documentos após reverter integração:',
      (err as any)?.message || err
    );
  }

  return resultado;
};

export const conferirStatusNfe = async (id_nfe: string, usuarioId?: string) => {
  const itens = await prisma.fis_nfe_itens.findMany({
    where: { id_fis_nfe: id_nfe },
    include: { fis_nfe_itens_alter_entrada: true },
  });
  const fisEmp = await prisma.fis_nfe.findUnique({
    where: { id: id_nfe },
    select: { id_fis_empresa_destinatario: true },
  });
  const id_empresa = { id: fisEmp?.id_fis_empresa_destinatario || '' };
  if (!itens || itens.length === 0) {
    console.warn(`Nenhum item encontrado para a NFe ${id_nfe}`);
    return {
      allOk: false,
      missingItems: [],
      message: 'Nenhum item encontrado para a NFe',
    } as const;
  }

  const missingItems: Array<{
    id_item: string;
    ds_produto?: string | null;
    hasAlteracao: boolean;
    hasProdutoVinculado?: boolean;
    hasRegraVinculada?: boolean;
    alteracao?: any;
  }> = [];

  for (const it of itens) {
    // Consideramos o item OK somente se houver alteração com produto vinculado
    // E se essa alteração possuir uma regra vinculada (`id_regra_nfe_entrada`).
    const alter = it.fis_nfe_itens_alter_entrada?.[0];
    const hasAlter = !!alter;
    const hasProdutoVinculado = !!(alter && (alter as any).id_produto_alterado);
    const hasRegraVinculada = !!(alter && (alter as any).id_regra_nfe_entrada);

    if (!hasAlter || !hasProdutoVinculado || !hasRegraVinculada) {
      missingItems.push({
        id_item: it.id,
        ds_produto: (it as any).ds_produto || null,
        hasAlteracao: hasAlter,
        hasProdutoVinculado,
        hasRegraVinculada,
        alteracao: alter || null,
      });
    }
  }

  const allOk = missingItems.length === 0;

  if (allOk) {
    try {
      const documentosAntes = await prisma.fis_documento.findMany({
        where: {
          id_nfe: id_nfe,
          id_fis_empresas: id_empresa.id,
        },
        select: { id: true, ds_status: true },
      });
      const result = await prisma.fis_documento.updateMany({
        where: {
          id_nfe: id_nfe,
          id_fis_empresas: id_empresa.id,
        },
        data: { ds_status: 'AGUARDANDO_INTEGRACAO' },
      });
      const documentos = await prisma.fis_documento.findMany({
        where: {
          id_nfe: id_nfe,
          id_fis_empresas: id_empresa.id,
        },
        select: { id: true, ds_status: true },
      });
      for (let cont = 0; cont < documentos.length; cont++)
        createDocumentoHistorico({
          justificativa: 'Conferência de status NFe - todos os itens OK',
          id_documento: documentos[cont].id,
          status_novo: documentos[cont].ds_status,
          status_antigo: documentosAntes.find(
            (d) => d.id === documentos[cont].id
          )?.ds_status,
          id_usuario: usuarioId,
        });
    } catch (err: any) {
      console.error(
        `Erro ao atualizar ds_status do fis_documento para NFe ${id_nfe}:`,
        err
      );
      return {
        allOk: true,
        missingItems: [],
        message: 'Todos os itens OK, mas erro ao atualizar o documento',
        error: (err as any)?.message || err,
      } as const;
    }
  } else {
  }

  return {
    allOk,
    missingItems,
  } as const;
};

export const testarXmlNfe = async (id_nfe: string) => {
  const teste = await xmlNFe(id_nfe);
  return teste;
};

/**
 * Atualiza o campo dt_saida_entrega da NFe com o valor recebido da API.
 * Aceita string no formato `YYYY-MM-DD HH:mm:ss` ou qualquer formato aceitável
 * por `new Date()`. Quando a string estiver no formato `YYYY-MM-DD HH:mm:ss`
 * a função interpreta os componentes como UTC (para evitar ambiguidades de
 * timezones) — ajuste se preferir interpretação em timezone local.
 *
 * Retorna o registro atualizado (objeto fis_nfe) ou lança erro se inválido.
 */
export const updateDtSaidaEntrega = async (
  id_nfe: string,
  dtSaida: string | Date
) => {
  if (!id_nfe) throw new Error('id_nfe é obrigatório');

  let parsedDate: Date | null = null;

  if (dtSaida instanceof Date) {
    parsedDate = dtSaida;
  } else if (typeof dtSaida === 'string') {
    const trimmed = dtSaida.trim();
    // match YYYY-MM-DD HH:mm:ss or YYYY-MM-DDTHH:mm:ss
    const m = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
    );
    if (m) {
      const [_, Y, M, D, hh, mm, ss] = m;
      // Interpret as UTC to avoid timezone surprises
      parsedDate = new Date(Date.UTC(+Y, +M - 1, +D, +hh, +mm, +ss));
    } else {
      const dt = new Date(trimmed);
      if (!isNaN(dt.getTime())) parsedDate = dt;
      else throw new Error('Formato de data inválido: ' + dtSaida);
    }
  } else {
    throw new Error('dtSaida deve ser string ou Date');
  }

  // Atualiza a NFe; se não existir lança erro do prisma
  const updated = await prisma.fis_nfe.update({
    where: { id: id_nfe },
    data: { dt_saida_entrega: parsedDate },
  });

  return updated;
};

export const setDocumentoOperacaoNaoRealizada = async (
  items: { id_documento: string; justificativa: string }[],
  usuarioId?: string
) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Envie ao menos um documento com justificativa');
  }

  const ids = items.map((i) => i.id_documento).filter(Boolean);
  if (!ids.length) {
    throw new Error('Lista de ids inválida');
  }

  // busca status atuais para registrar histórico
  const documentosAntes = await prisma.fis_documento.findMany({
    where: { id: { in: ids } },
    select: { id: true, ds_status: true },
  });

  const updatedDocs: Array<{ id: string; ds_status: string }> = [];

  // atualiza e cria histórico para cada documento individualmente
  for (const item of items) {
    const id = item.id_documento;
    if (!id) continue;

    try {
      const updated = await prisma.fis_documento.update({
        where: { id },
        data: { ds_status: 'OPERACAO_NAO_REALIZADA' },
        select: { id: true, ds_status: true },
      });

      const antigo = documentosAntes.find((d) => d.id === id)?.ds_status;

      await createDocumentoHistorico({
        justificativa: item.justificativa || 'Operação não realizada',
        id_documento: id,
        status_antigo: antigo as any,
        status_novo: updated.ds_status as any,
        id_usuario: usuarioId,
      });

      updatedDocs.push({ id: updated.id, ds_status: updated.ds_status });
    } catch (err) {
      // loga e segue com próximos (não falha todo o lote)
      console.warn(
        `Erro ao atualizar documento ${id}:`,
        (err as any)?.message || err
      );
    }
  }

  return {
    updatedCount: updatedDocs.length,
    updated: updatedDocs,
  };
};

export const setCtesContra = async ({
  empresaId,
  competencia,
}: {
  empresaId: string;
  competencia: string;
}) => {
  console.log('[FISCAL] setCtesContra - Início do processamento');
  const limit = pLimit(25); // limita a 10 operações concorrentes
  const empresa = await getFiscalEmpresa(empresaId);
  if (!empresa) {
    throw new Error('Empresa fiscal não encontrada');
  }
  const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const mesMinusTwo = mes - 2 <= 0 ? 12 + (mes - 2) : mes - 2;
  const anoMinusTwo = mes - 2 <= 0 ? ano - 1 : ano;
  const mesPlusTwo = mes + 2 > 12 ? mes + 2 - 12 : mes + 2;
  const anoPlusTwo = mes + 2 > 12 ? ano + 1 : ano;

  // Período de -2 meses até +2 meses
  const inicio = `${anoMinusTwo}-${String(mesMinusTwo).padStart(2, '0')}-01`;
  const ultimoDia = new Date(anoPlusTwo, mesPlusTwo, 0).getDate();
  const fim = `${anoPlusTwo}-${String(mesPlusTwo).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  // 1) Começa pelos DFEs PENDENTE, e só tenta achar "CTe contra"
  //    que referenciem essas chaves.
  const pendentes = await prisma.fis_documento_dfe.findMany({
    where: {
      ds_tipo: 'CTE',
      OR: [{ ds_status: 'PENDENTE' }, { ds_status: 'VINCULADO' }],
      js_cte: {
        is: {
          id_fis_empresa_subcontratada: empresa.id,
          dt_emissao: {
            gte: new Date(inicio),
            lte: new Date(fim),
          },
        },
      },
    },
    select: {
      id: true,
      id_cte: true,
      js_cte: { select: { ds_chave: true } },
    },
  });

  const pendentesPorChave = new Map<
    string,
    { idDocumentoDfe: string; idCte: string }
  >();
  for (const p of pendentes) {
    const chave = p.js_cte?.ds_chave;
    if (!chave || !p.id_cte) continue;
    pendentesPorChave.set(chave, { idDocumentoDfe: p.id, idCte: p.id_cte });
  }

  if (!pendentesPorChave.size) {
    console.log(
      `[FISCAL] setCtesContra - Sem documentos pendentes no período (${inicio}..${fim}).`
    );
    return;
  }

  // 2) Como js_documentos_anteriores é um JSON array, dá para puxar do banco
  //    somente os "CTes contra" que referenciam alguma chave pendente.
  const chavesPendentes = [...pendentesPorChave.keys()];
  const CHUNK_SIZE = 50;
  const ctesContraById = new Map<
    string,
    {
      id: string;
      ds_chave: string;
      js_chaves_nfe: any;
      js_documentos_anteriores: any;
      fis_documento_dfe: Array<{ id: string }>;
    }
  >();
  for (let i = 0; i < chavesPendentes.length; i += CHUNK_SIZE) {
    const chunk = chavesPendentes.slice(i, i + CHUNK_SIZE);
    const found = await prisma.fis_cte.findMany({
      where: {
        id_fis_empresa_emitente: empresa.id,
        dt_emissao: {
          gte: new Date(inicio),
          lte: new Date(fim),
        },
        OR: chunk.map((ch) => ({
          js_documentos_anteriores: { array_contains: ch },
        })),
      },
      select: {
        id: true,
        ds_chave: true,
        js_documentos_anteriores: true,
        js_chaves_nfe: true,
        fis_documento_dfe: { select: { id: true } },
      },
    });
    for (const cte of found) ctesContraById.set(cte.id, cte);
  }
  const ctesContra = [...ctesContraById.values()];

  const isChaveArray = (val: any) =>
    Array.isArray(val) &&
    val.some((v) => typeof v === 'string' && /^\d{44}$/.test(String(v)));

  const toPrismaJsonValue = (v: any) =>
    v === null ? Prisma.JsonNull : (v as Prisma.InputJsonValue);

  // Indexa chaves referenciadas -> CTes contra que as referenciam
  // (para percorrer pelos pendentes e não pelos "contra").
  const ctesContraPorChaveReferenciada = new Map<
    string,
    Array<{
      id: string;
      ds_chave: string;
      js_chaves_nfe: any;
      js_documentos_anteriores: any;
      idDocumentoDfeContra?: string;
    }>
  >();
  for (const cte of ctesContra) {
    const rawDocs = Array.isArray(cte.js_documentos_anteriores)
      ? cte.js_documentos_anteriores
      : [];
    const chavesReferenciadas = rawDocs.filter(
      (v) => typeof v === 'string' && /^\d{44}$/.test(v)
    );
    if (!chavesReferenciadas.length) continue;

    const cteInfo = {
      id: cte.id,
      ds_chave: cte.ds_chave,
      js_chaves_nfe: cte.js_chaves_nfe,
      js_documentos_anteriores: cte.js_documentos_anteriores,
      idDocumentoDfeContra: cte.fis_documento_dfe?.[0]?.id,
    };

    for (const chaveRef of chavesReferenciadas) {
      if (!pendentesPorChave.has(chaveRef)) continue;
      const list = ctesContraPorChaveReferenciada.get(chaveRef);
      if (list) list.push(cteInfo);
      else ctesContraPorChaveReferenciada.set(chaveRef, [cteInfo]);
    }
  }

  const idsDocumentoDfeParaProcessar = new Set<string>();
  const cteSubCache = new Map<
    string,
    { js_chaves_nfe: any; js_documentos_anteriores: any }
  >();

  await Promise.all(
    pendentes.map((p) =>
      limit(async () => {
        const chavePendente = p.js_cte?.ds_chave;
        if (!chavePendente || !p.id_cte) return;

        const ctesQueReferenciam =
          ctesContraPorChaveReferenciada.get(chavePendente) ?? [];
        if (!ctesQueReferenciam.length) return;

        idsDocumentoDfeParaProcessar.add(p.id);
        console.log(
          `[FISCAL] setCtesContra - Pendente ${chavePendente}. CTes contra encontrados: ${ctesQueReferenciam.length}`
        );

        for (const cteContra of ctesQueReferenciam) {
          if (cteContra.idDocumentoDfeContra) {
            const exists = await prisma.fis_documentos_relacionados.findFirst({
              where: {
                id_documento_origem: cteContra.idDocumentoDfeContra,
                id_documento_referenciado: p.id,
              },
            });
            if (!exists) {
              await prisma.fis_documentos_relacionados.create({
                data: {
                  id_documento_origem: cteContra.idDocumentoDfeContra,
                  id_documento_referenciado: p.id,
                  ds_origem: 'XML',
                },
              });
            }
          }

          try {
            let cteSub = cteSubCache.get(p.id_cte);
            if (!cteSub) {
              cteSub = await prisma.fis_cte.findUnique({
                where: { id: p.id_cte },
                select: { js_chaves_nfe: true, js_documentos_anteriores: true },
              });
              if (cteSub) cteSubCache.set(p.id_cte, cteSub);
            }
            if (!cteSub) continue;

            if (
              isChaveArray(cteContra.js_chaves_nfe) &&
              cteSub.js_chaves_nfe !== cteContra.js_chaves_nfe
            ) {
              await prisma.fis_cte.update({
                where: { id: p.id_cte },
                data: {
                  js_chaves_nfe: toPrismaJsonValue(cteContra.js_chaves_nfe),
                },
              });
              cteSubCache.set(p.id_cte, {
                ...cteSub,
                js_chaves_nfe: cteContra.js_chaves_nfe,
              });
            }

            if (
              isChaveArray(cteContra.js_documentos_anteriores) &&
              cteSub.js_documentos_anteriores !==
                cteContra.js_documentos_anteriores
            ) {
              await prisma.fis_cte.update({
                where: { id: p.id_cte },
                data: {
                  js_documentos_anteriores: toPrismaJsonValue(
                    cteContra.js_documentos_anteriores
                  ),
                },
              });
              cteSubCache.set(p.id_cte, {
                ...cteSub,
                js_documentos_anteriores: cteContra.js_documentos_anteriores,
              });
            }
          } catch (err) {
            console.warn(
              `Erro ao atualizar dados do CTe referenciado ${p.id_cte} (contra ${cteContra.id}):`,
              (err as any)?.message || err
            );
          }
        }
      })
    )
  );

  const idsParaProcessar = [...idsDocumentoDfeParaProcessar];
  if (idsParaProcessar.length) {
    await prisma.fis_documento_dfe.updateMany({
      where: {
        id: { in: idsParaProcessar },
        ds_status: { not: 'CANCELADO' },
      },
      data: { ds_status: 'PROCESSADO' },
    });
  }

  console.log(
    `[FISCAL] setCtesContra - Fim do processamento. Total de documentos processados: ${idsDocumentoDfeParaProcessar.size}`
  );
};

export const setNfesProcessados = async ({
  empresaId,
  competencia,
}: {
  empresaId: string;
  competencia: string;
}) => {
  console.log('[FISCAL] setNfesProcessados - Início do processamento');
  const limit = pLimit(25); // limita a 10 operações concorrentes
  const empresaFiscal = await getFiscalEmpresa(empresaId);
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaFiscal?.id_sis_empresas },
    select: { ds_documento: true },
  });
  const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const mesMinusTwo = mes - 2 <= 0 ? 12 + (mes - 2) : mes - 2;
  const anoMinusTwo = mes - 2 <= 0 ? ano - 1 : ano;
  const mesPlusTwo = mes + 2 > 12 ? mes + 2 - 12 : mes + 2;
  const anoPlusTwo = mes + 2 > 12 ? ano + 1 : ano;
  const inicio = `${anoMinusTwo}-${String(mesMinusTwo).padStart(2, '0')}-01`;
  const ultimoDia = new Date(anoPlusTwo, mesPlusTwo, 0).getDate();
  const fim = `${anoPlusTwo}-${String(mesPlusTwo).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  const notas = await prisma.fis_nfe.findMany({
    where: {
      dt_emissao: {
        gte: new Date(inicio),
        lte: new Date(fim),
      },
      id_fis_empresa_transportadora: empresaFiscal?.id,
      fis_documento_dfe: {
        some: {
          OR: [{ ds_status: 'PENDENTE' }, { ds_status: 'VINCULADO' }],
        },
      },
    },
    select: { ds_chave: true, id: true },
  });
  await Promise.all(
    notas.map((n) =>
      limit(async () => {
        let ctes = await prisma.fis_cte.findMany({
          where: {
            js_chaves_nfe: {
              array_contains: n.ds_chave,
            },
            OR: [
              { ds_documento_subcontratada: empresa?.ds_documento },
              { ds_documento_tomador: empresa?.ds_documento },
            ],
          },
        });
        console.log(
          `[FISCAL] setNfesProcessados - Processando NFe ${n.ds_chave}. CTEs encontrados com filtro de documento: ${ctes.length}`
        );
        if (!ctes.length) {
          ctes = await prisma.fis_cte.findMany({
            where: {
              js_chaves_nfe: {
                array_contains: n.ds_chave,
              },
            },
          });
        }
        if (ctes.length) {
          await prisma.fis_documento_dfe.updateMany({
            where: {
              id_nfe: n.id,
              ds_status: { not: 'CANCELADO' },
            },
            data: { ds_status: 'PROCESSADO' },
          });
          // Popula fis_cte_nfe se não existir relação
          for (const cte of ctes) {
            const docDfeCte = await prisma.fis_documento_dfe.findFirst({
              where: {
                id_cte: cte.id,
              },
            });
            const docDfeNfe = await prisma.fis_documento_dfe.findFirst({
              where: {
                id_nfe: n.id,
              },
            });
            if (!docDfeCte || !docDfeNfe) continue;
            const exists = await prisma.fis_documentos_relacionados.findFirst({
              where: {
                id_documento_origem: docDfeCte.id,
                id_documento_referenciado: docDfeNfe.id,
              },
            });
            if (!exists) {
              await prisma.fis_documentos_relacionados.create({
                data: {
                  id_documento_origem: docDfeCte.id,
                  id_documento_referenciado: docDfeNfe.id,
                  ds_origem: 'XML',
                },
              });
            }
          }
        }
      })
    )
  );
  console.log(`[FISCAL] setNfesProcessados - Fim do processamento.`);
};

export const setNfesRelacionadasProcessados = async ({
  empresaId,
  competencia,
}: {
  empresaId: string;
  competencia: string;
}) => {
  console.log(
    '[FISCAL] setNfesRelacionadasProcessados - Início do processamento'
  );
  const limit = pLimit(25); // limita a 10 operações concorrentes
  const empresaFiscal = await getFiscalEmpresa(empresaId);
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaFiscal?.id_sis_empresas },
    select: { ds_documento: true },
  });
  const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const mesMinusTwo = mes - 2 <= 0 ? 12 + (mes - 2) : mes - 2;
  const anoMinusTwo = mes - 2 <= 0 ? ano - 1 : ano;
  const mesPlusTwo = mes + 2 > 12 ? mes + 2 - 12 : mes + 2;
  const anoPlusTwo = mes + 2 > 12 ? ano + 1 : ano;
  const inicio = `${anoMinusTwo}-${String(mesMinusTwo).padStart(2, '0')}-01`;
  const ultimoDia = new Date(anoPlusTwo, mesPlusTwo, 0).getDate();
  const fim = `${anoPlusTwo}-${String(mesPlusTwo).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  const notas = await prisma.fis_nfe.findMany({
    where: {
      dt_emissao: {
        gte: new Date(inicio),
        lte: new Date(fim),
      },
      id_fis_empresa_transportadora: empresaFiscal?.id,
      fis_documento_dfe: {
        some: {
          OR: [{ ds_status: 'PENDENTE' }, { ds_status: 'VINCULADO' }],
        },
      },
    },
    select: { ds_chave: true, id: true },
  });
  await Promise.all(
    notas.map((n) =>
      limit(async () => {
        let nfes = await prisma.fis_nfe.findMany({
          where: {
            js_nfes_referenciadas: {
              array_contains: n.ds_chave,
            },
            ds_documento_transportador: empresa?.ds_documento,
          },
        });
        console.log(
          `[FISCAL] setNfesRelacionadasProcessados - Processando NFe ${n.ds_chave}. Total de NFes relacionadas: ${nfes.length}`
        );
        if (!nfes.length) {
          nfes = await prisma.fis_nfe.findMany({
            where: {
              js_nfes_referenciadas: {
                array_contains: n.ds_chave,
              },
            },
          });
        }
        if (nfes.length) {
          await prisma.fis_documento_dfe.updateMany({
            where: {
              id_nfe: n.id,
              ds_status: { not: 'CANCELADO' },
            },
            data: { ds_status: 'PROCESSADO' },
          });

          // Popula fis_cte_nfe se não existir relação
          for (const nfe of nfes) {
            await prisma.fis_documento_dfe.updateMany({
              where: {
                id_nfe: nfe.id,
                ds_status: { not: 'CANCELADO' },
              },
              data: { ds_status: 'PROCESSADO' },
            });
            const docDfeOrigem = await prisma.fis_documento_dfe.findFirst({
              where: {
                id_nfe: nfe.id,
              },
            });
            const docDfeRelacionado = await prisma.fis_documento_dfe.findFirst({
              where: {
                id_nfe: n.id,
              },
            });
            if (!docDfeOrigem || !docDfeRelacionado) continue;
            const exists = await prisma.fis_documentos_relacionados.findFirst({
              where: {
                id_documento_origem: docDfeOrigem.id,
                id_documento_referenciado: docDfeRelacionado.id,
              },
            });
            if (!exists) {
              await prisma.fis_documentos_relacionados.create({
                data: {
                  id_documento_origem: docDfeOrigem.id,
                  id_documento_referenciado: docDfeRelacionado.id,
                  ds_origem: 'XML',
                },
              });
            }
          }
        }
      })
    )
  );
  console.log(
    '[FISCAL] setNfesRelacionadasProcessados - Fim do processamento.'
  );
};

export const updateDocumentoSubContratadoOwner = async ({
  empresaId,
  documentoId,
  ds_motivo,
  usuarioId,
}: {
  empresaId: string;
  documentoId: string;
  ds_motivo: string;
  usuarioId: string;
}) => {
  try {
    const fisEmp = await getFiscalEmpresa(empresaId);
    const empresa = await prisma.sis_empresas.findUnique({
      where: { id: empresaId },
      select: { ds_razao_social: true, ds_documento: true },
    });
    console.log(empresa);
    if (!fisEmp) {
      throw new Error('Empresa fiscal não encontrada');
    }
    let documento: {
      id: string;
      id_cte: string | null;
      js_cte: {
        ds_razao_social_subcontratada: string | null;
        ds_documento_subcontratada: string | null;
        id_fis_empresa_subcontratada: string | null;
      } | null;
    } | null = null;

    try {
      documento = await prisma.fis_documento_dfe.findUnique({
        where: { id: documentoId },
        select: {
          id: true,
          id_cte: true,
          js_cte: {
            select: {
              ds_razao_social_subcontratada: true,
              ds_documento_subcontratada: true,
              id_fis_empresa_subcontratada: true,
            },
          },
        },
      });
    } catch (err) {
      throw new Error('Documento CTe não encontrado');
    }

    if (!documento) {
      throw new Error('Documento CTe não encontrado');
    }
    const empresaOriginal = await prisma.sis_empresas.findUnique({
      where: {
        ds_documento:
          documento?.js_cte?.ds_documento_subcontratada || undefined,
      },
      select: { ds_razao_social: true, ds_documento: true, id: true },
    });
    const fisEmpOriginal = await getFiscalEmpresa(empresaOriginal?.id || '');
    await Promise.all([
      prisma.fis_documento_dfe.update({
        where: { id: documento.id },
        data: {
          ds_documento_subcontratada: empresa?.ds_documento || '',
        },
      }),
      prisma.fis_cte.update({
        where: { id: documento.id_cte || '' },
        data: {
          ds_razao_social_subcontratada: empresa?.ds_razao_social || '',
          ds_documento_subcontratada: empresa?.ds_documento || '',
          id_fis_empresa_subcontratada: fisEmp.id,
        },
      }),
    ]);
    await prisma.fis_cte_subcontratacao_alter.create({
      data: {
        id_fis_cte: documento.id_cte || '',
        id_fis_empresa_subcontratada_original: fisEmpOriginal?.id || '',
        ds_documento_subcontratada_original:
          empresaOriginal?.ds_documento || '',
        ds_razao_social_subcontratada_original:
          empresaOriginal?.ds_razao_social || '',
        id_fis_empresa_subcontratada_alterada: fisEmp.id,
        ds_razao_social_subcontratada_alterada: empresa?.ds_razao_social || '',
        ds_documento_subcontratada_alterada: empresa?.ds_documento || '',
        ds_motivo: ds_motivo,
        id_usuario_solicitante: usuarioId || null,
      },
    });
  } catch (err) {
    console.warn(
      'Erro ao registrar alteração de subcontratação:',
      (err as any)?.message || err
    );
  }
};

export const patchSituacaoAlteracaoCte = async ({
  id_alteracao,
  situacao,
  ds_observacao,
  id_usuario_aprovador,
}: {
  id_alteracao: string;
  situacao: StatusAlteracaoSubcontratacao;
  ds_observacao?: string;
  id_usuario_aprovador?: string;
}) => {
  if (
    situacao === StatusAlteracaoSubcontratacao.REVERTIDO ||
    situacao === StatusAlteracaoSubcontratacao.REJEITADO
  ) {
    await revertAlteracaoSubcontratacaoCte({
      id_alteracao,
      situacao,
      ds_observacao,
      id_usuario_aprovador,
    });
    return;
  } else {
    try {
      await prisma.fis_cte_subcontratacao_alter.update({
        where: { id: id_alteracao },
        data: {
          ds_status_alteracao: situacao,
          ds_observacao_aprovador: ds_observacao,
          id_usuario_aprovador: id_usuario_aprovador || null,
        },
      });
    } catch (err) {
      throw new Error(
        `Erro ao atualizar situação da alteração: ${(err as any)?.message || err}`
      );
    }
  }
};

export const revertAlteracaoSubcontratacaoCte = async ({
  id_alteracao,
  situacao,
  ds_observacao,
  id_usuario_aprovador,
}: {
  id_alteracao: string;
  situacao: StatusAlteracaoSubcontratacao;
  ds_observacao?: string;
  id_usuario_aprovador?: string;
}) => {
  try {
    const alteracao = await prisma.fis_cte_subcontratacao_alter.update({
      where: { id: id_alteracao },
      data: {
        ds_status_alteracao: situacao,
        ds_observacao_aprovador: ds_observacao,
        id_usuario_aprovador: id_usuario_aprovador || null,
      },
    });
    await Promise.all([
      prisma.fis_documento_dfe.update({
        where: { id_cte: alteracao.id_fis_cte },
        data: {
          ds_documento_subcontratada:
            alteracao.ds_documento_subcontratada_original,
        },
      }),
      prisma.fis_cte.update({
        where: { id: alteracao.id_fis_cte },
        data: {
          ds_razao_social_subcontratada:
            alteracao.ds_razao_social_subcontratada_original,
          ds_documento_subcontratada:
            alteracao.ds_documento_subcontratada_original,
          id_fis_empresa_subcontratada:
            alteracao.id_fis_empresa_subcontratada_original,
        },
      }),
    ]);
  } catch (err) {
    throw new Error(
      `Erro ao reverter alteração de subcontratação: ${
        (err as any)?.message || err
      }`
    );
  }
};

export const testAllChavesAnteriores = async () => {
  try {
    const empresaId = 'e728e7b4-016d-442f-8f0c-986f87725abd';
    const dtInicio = '2026-01-01';
    const dtFim = '2026-01-31';
    console.log('iniciou');
    const chavesAnteriores = await prisma.fis_cte.findMany({
      where: {
        id_fis_empresa_emitente: empresaId,
        AND: [
          { dt_emissao: { gte: new Date(dtInicio) } },
          { dt_emissao: { lte: new Date(dtFim) } },
        ],
        js_documentos_anteriores: { not: null },
      },
      select: { id: true, ds_chave: true, js_documentos_anteriores: true },
    });
    let chavesSemReferencia = {
      total: 0,
      chaves: [] as string[],
    };
    let chavesComReferencia = {
      total: 0,
      chaves: [] as string[],
      idsAndStatus: [] as { id: string; status: string }[],
    };
    const pLimit = require('p-limit');
    const limit = pLimit(100);
    await Promise.all(
      chavesAnteriores.map((cte: any) =>
        limit(async () => {
          console.log(`Processando CTe ${cte.id}...`);
          const documentoAnterior = Array.isArray(cte.js_documentos_anteriores)
            ? cte.js_documentos_anteriores
            : String(cte.js_documentos_anteriores).split(',');
          const documentosAnteriores: string[] = documentoAnterior
            .map((v) => `${v}`.trim())
            .filter(Boolean);
          if (!documentosAnteriores.length) return;

          try {
            const docsAnteriores = await prisma.fis_cte.findMany({
              where: {
                ds_chave: { in: documentosAnteriores },
              },
              select: {
                id: true,
                fis_documento_dfe: {
                  select: {
                    ds_status: true,
                  },
                },
              },
            });
            if (docsAnteriores.length) {
              chavesComReferencia.total += 1;
              chavesComReferencia.chaves.push(cte.ds_chave);
              chavesComReferencia.idsAndStatus.push({
                id: cte.id,
                status:
                  docsAnteriores[0]?.fis_documento_dfe?.[0]?.ds_status || '',
              });
            } else {
              chavesSemReferencia.total += 1;
              chavesSemReferencia.chaves.push(cte.js_documentos_anteriores[0]);
            }
          } catch (err) {
            console.warn(
              `Erro ao processar js_documentos_anteriores do CTe ${cte.id}:`,
              (err as any)?.message || err
            );
          }
        })
      )
    );
    const fs = require('fs');
    const path = require('path');
    const output = {
      comReferencia: chavesComReferencia,
      semReferencia: chavesSemReferencia,
    };
    const outPath = path.join(
      process.cwd(),
      'resultado_chaves_anteriores.json'
    );
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log('Resultado salvo em', outPath);
    console.log('Chaves com referência:', chavesComReferencia);
    console.log('Chaves sem referência:', chavesSemReferencia);
  } catch (err) {
    console.error('Erro no processamento:', (err as any)?.message || err);
  }
};

export const getRelacionadosDocumento = async ({
  empresaId,
  documentoId,
}: {
  empresaId: string;
  documentoId: string;
}) => {
  const dfe = await prisma.fis_documento_dfe.findFirst({
    where: { OR: [{ id_cte: documentoId }, { id_nfe: documentoId }] },
    select: { id: true },
  });
  const fisEmp = await getFiscalEmpresa(empresaId);
  if (!fisEmp) {
    throw new Error('Empresa fiscal não encontrada');
  }
  let retorno: {
    ctes: Array<{
      id: string;
      ds_chave: string;
      ds_numero: string;
      dt_emissao: Date | null;
    }>;
    nfes: Array<{
      id: string;
      ds_chave: string;
      ds_numero: string;
      dt_emissao: Date | null;
    }>;
  };

  const nfeRelation = await prisma.fis_documentos_relacionados.findMany({
    where: {
      id_documento_origem: dfe.id,
      fis_documento_referenciado: {
        ds_tipo: 'NFE',
      },
    },
    select: {
      fis_documento_referenciado: {
        select: {
          js_nfe: {
            select: {
              id: true,
              ds_chave: true,
              ds_numero: true,
              dt_emissao: true,
            },
          },
        },
      },
    },
  });
  const cteRelation = await prisma.fis_documentos_relacionados.findMany({
    where: {
      id_documento_origem: dfe.id,
      fis_documento_referenciado: {
        ds_tipo: 'CTE',
      },
    },
    select: {
      fis_documento_referenciado: {
        select: {
          js_cte: {
            select: {
              id: true,
              ds_chave: true,
              ds_numero: true,
              dt_emissao: true,
            },
          },
        },
      },
    },
  });

  retorno = {
    ctes: cteRelation.map((r) => r.fis_documento_referenciado.js_cte),
    nfes: nfeRelation.map((r) => r.fis_documento_referenciado.js_nfe),
  };
  console.log(retorno);
  return retorno;
};

/* Função para marcar um documento como "ARQUIVADO", será utilizado para quando documentos que não deveriam ser
 *considerados para faturamento, liberando do status de PENDENTE e melhorando o entendimento para o usuário nas telas de
 *faturamento. Caso o documento já esteja marcado como "ARQUIVADO", a função irá desmarcar, voltando para "PENDENTE". O campo de status do documento é utilizado para controle interno e não afeta o status do XML ou integração.
 * @param documentoId - ID do documento a ser marcado como arquivado
 * @returns Objeto indicando sucesso ou falha da operação, e mensagem de erro em caso de falha
 */
export const setOrUnsetArquivado = async ({
  documentoId,
}: {
  documentoId: string;
}) => {
  try {
    const doc = await prisma.fis_documento_dfe.findUnique({
      where: { id: documentoId },
      select: { ds_status: true },
    });
    if (doc)
      await prisma.fis_documento_dfe.update({
        where: { id: documentoId },
        data: {
          ds_status: doc.ds_status === 'ARQUIVADO' ? 'PENDENTE' : 'ARQUIVADO',
        },
      });
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as any)?.message || err };
  }
};
