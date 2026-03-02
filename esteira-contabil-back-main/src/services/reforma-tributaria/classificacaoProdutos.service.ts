import * as path from 'path';
import type * as Sqlite3 from 'sqlite3';
import pLimit from 'p-limit';
import { prisma } from '../prisma';
import { getFiscalEmpresa } from '../fiscal/fiscal-empresa.service';
import { Decimal } from '@prisma/client/runtime/library';

const CALCULADORA_DB_PATH =
  process.env.CALCULADORA_DB_PATH ||
  path.join(
    process.cwd(),
    '..',
    'calculadora',
    'calculadora',
    'calculadora',
    'db',
    'calculadora.db'
  );

/** Carrega sqlite3 sob demanda para evitar falha na inicialização se os bindings nativos não estiverem compilados (ex.: Windows sem Build Tools). */
function getSqlite3(): typeof Sqlite3 {
  return require('sqlite3');
}

// Valores padrão para NCMs não encontrados no calculadora.db
const DEFAULT_CST = '000';
const DEFAULT_CLASS_TRIB = '000001';

interface NcmClassificacao {
  NCMA_ID: number;
  NCMA_NCM_CD: string;
  CLTR_ID: number;
  /** Código de Classificação Tributária (cClassTrib). Os 3 primeiros dígitos correspondem ao CST (Regra SEFAZ/RS). */
  CLTR_CD: string;
  CLTR_DESCRICAO: string | null;
  CLTR_TIPO_ALIQUOTA: string | null;
  ANXO_NUMERO: string | null;
  ANXO_DESCRICAO: string | null;
  ANXO_NUMERO_ITEM: string | null;
  ANXO_TEXTO_ITEM: string | null; // Texto/descrição real do item no anexo
  reducao_cbs?: number | null;
  reducao_ibs_uf?: number | null;
  reducao_ibs_mun?: number | null;
  tipo_reducao?: string | null;
}

/**
 * Normaliza NCM removendo pontos (24.02.10.00 -> 24021000)
 */
const normalizeNcm = (ncm: string | null): string | null =>
  ncm ? ncm.replace(/\./g, '').trim() || null : null;

/**
 * Normaliza percentuais de redução e determina status
 * @returns Objeto com status, percentuais normalizados e label formatado
 */
function normalizarPercentuaisReducao(
  reducao_cbs: number | null | undefined,
  reducao_ibs_uf: number | null | undefined,
  reducao_ibs_mun: number | null | undefined
): {
  status: 'SEM_REDUCAO' | 'REDUCAO' | 'ALIQUOTA_ZERO' | 'MISTA' | 'INCOMPLETA';
  cbs: number;
  ibsUf: number;
  ibsMun: number;
  label: string;
} {
  // Normalizar null → 0
  const cbs = reducao_cbs ?? 0;
  const ibsUf = reducao_ibs_uf ?? 0;
  const ibsMun = reducao_ibs_mun ?? 0;

  // Verificar se algum veio null quando outros têm valor (INCOMPLETA)
  const hasNull =
    reducao_cbs === null || reducao_ibs_uf === null || reducao_ibs_mun === null;
  const hasValue =
    reducao_cbs !== null || reducao_ibs_uf !== null || reducao_ibs_mun !== null;
  const isIncompleta = hasNull && hasValue;

  // Determinar status
  let status:
    | 'SEM_REDUCAO'
    | 'REDUCAO'
    | 'ALIQUOTA_ZERO'
    | 'MISTA'
    | 'INCOMPLETA';

  if (cbs === 0 && ibsUf === 0 && ibsMun === 0) {
    status = 'SEM_REDUCAO';
  } else if (cbs === 100 && ibsUf === 100 && ibsMun === 100) {
    status = 'ALIQUOTA_ZERO';
  } else if (cbs === ibsUf && ibsUf === ibsMun && cbs > 0 && cbs < 100) {
    status = 'REDUCAO';
  } else if (isIncompleta) {
    status = 'INCOMPLETA';
  } else {
    status = 'MISTA';
  }

  // Gerar label padronizado
  const label = `CBS: ${cbs}% | IBS UF: ${ibsUf}% | IBS Mun: ${ibsMun}%`;

  return {
    status,
    cbs,
    ibsUf,
    ibsMun,
    label,
  };
}

/**
 * Calcula tipo de redução (mantido para compatibilidade)
 * @deprecated Use normalizarPercentuaisReducao para obter informações completas
 */
function calcularTipoReducao(
  reducao_cbs: number | null | undefined,
  reducao_ibs_uf: number | null | undefined,
  reducao_ibs_mun: number | null | undefined
): string {
  const normalized = normalizarPercentuaisReducao(
    reducao_cbs,
    reducao_ibs_uf,
    reducao_ibs_mun
  );
  return normalized.status;
}

/**
 * Abre conexão com o banco calculadora.db (SQLite)
 */
const openCalculadoraDb = (): Promise<Sqlite3.Database> =>
  new Promise((resolve, reject) => {
    const sqlite3 = getSqlite3();
    const db = new sqlite3.Database(
      CALCULADORA_DB_PATH,
      sqlite3.OPEN_READONLY,
      (err) => {
        if (err) return reject(err);
        resolve(db);
      }
    );
  });

/**
 * Fecha conexão com o banco SQLite
 */
const closeDb = (db: Sqlite3.Database): Promise<void> =>
  new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });

const queryPercentuaisReducaoBatch = (
  db: Sqlite3.Database,
  cltrIds: number[]
): Promise<
  Map<
    number,
    {
      reducao_cbs: number | null;
      reducao_ibs_uf: number | null;
      reducao_ibs_mun: number | null;
    }
  >
> =>
  new Promise((resolve, reject) => {
    if (cltrIds.length === 0) return resolve(new Map());

    const placeholders = cltrIds.map(() => '?').join(', ');
    const sql = `
      SELECT
        cltr.CLTR_ID,
        MAX(CASE WHEN tb.TBTO_SIGLA='CBS' THEN pere.PERE_VALOR END) AS reducao_cbs,
        MAX(CASE WHEN tb.TBTO_SIGLA='IBSUF' THEN pere.PERE_VALOR END) AS reducao_ibs_uf,
        MAX(CASE WHEN tb.TBTO_SIGLA='IBSMun' THEN pere.PERE_VALOR END) AS reducao_ibs_mun
      FROM CLASSIFICACAO_TRIBUTARIA cltr
      INNER JOIN SITUACAO_TRIBUTARIA sitr ON sitr.SITR_ID = cltr.CLTR_SITR_ID
      LEFT JOIN PERCENTUAL_REDUCAO pere
        ON pere.PERE_CLTR_ID = cltr.CLTR_ID
        AND pere.PERE_FIM_VIGENCIA IS NULL
      LEFT JOIN TRIBUTO tb
        ON tb.TBTO_ID = pere.PERE_TBTO_ID
      WHERE sitr.SITR_IND_GIBSCBS = 1
        AND cltr.CLTR_ID IN (${placeholders})
      GROUP BY cltr.CLTR_ID
    `;

    db.all(sql, cltrIds, (err, rows) => {
      if (err) return reject(err);
      const map = new Map<
        number,
        {
          reducao_cbs: number | null;
          reducao_ibs_uf: number | null;
          reducao_ibs_mun: number | null;
        }
      >();
      for (const row of (rows || []) as Array<{
        CLTR_ID: number;
        reducao_cbs: number | null;
        reducao_ibs_uf: number | null;
        reducao_ibs_mun: number | null;
      }>) {
        map.set(row.CLTR_ID, {
          reducao_cbs: row.reducao_cbs ?? null,
          reducao_ibs_uf: row.reducao_ibs_uf ?? null,
          reducao_ibs_mun: row.reducao_ibs_mun ?? null,
        });
      }
      resolve(map);
    });
  });

/**
 * Consulta batch de NCMs no calculadora.db
 */
const queryNcmClassificacaoBatch = (
  db: Sqlite3.Database,
  ncmCds: string[]
): Promise<Map<string, NcmClassificacao>> =>
  new Promise((resolve, reject) => {
    if (ncmCds.length === 0) {
      return resolve(new Map());
    }

    const placeholders = ncmCds.map(() => '?').join(', ');
    const sql = `
      SELECT
        ncma.NCMA_ID,
        ncma.NCMA_NCM_CD,
        cltr.CLTR_ID,
        cltr.CLTR_CD,
        cltr.CLTR_DESCRICAO,
        cltr.CLTR_TIPO_ALIQUOTA,
        anxo.ANXO_NUMERO,
        anxo.ANXO_DESCRICAO,
        anxo.ANXO_NUMERO_ITEM,
        anxo.ANXO_TEXTO_ITEM
      FROM NCM_APLICAVEL ncma
      INNER JOIN CLASSIFICACAO_TRIBUTARIA cltr ON ncma.NCMA_CLTR_ID = cltr.CLTR_ID
      INNER JOIN ANEXO anxo ON ncma.NCMA_ANXO_ID = anxo.ANXO_ID
      INNER JOIN SITUACAO_TRIBUTARIA sitr ON sitr.SITR_ID = cltr.CLTR_SITR_ID
      WHERE REPLACE(ncma.NCMA_NCM_CD, '.', '') IN (${placeholders})
        AND (ncma.NCMA_FIM_VIGENCIA IS NULL OR ncma.NCMA_FIM_VIGENCIA >= date('now'))
        AND ncma.NCMA_INICIO_VIGENCIA <= date('now')
        AND sitr.SITR_IND_GIBSCBS = 1
    `;
    db.all(sql, ncmCds, (err, rows) => {
      if (err) return reject(err);
      const map = new Map<string, NcmClassificacao>();
      for (const row of (rows || []) as NcmClassificacao[]) {
        const key = row.NCMA_NCM_CD
          ? row.NCMA_NCM_CD.replace(/\./g, '').trim()
          : null;
        if (key && !map.has(key)) {
          map.set(key, row);
        }
      }
      resolve(map);
    });
  });

/**
 * Lista todas as classificações tributárias disponíveis para um NCM específico
 * @param ncm - NCM do produto (pode ter pontos ou não)
 * @returns Array com todas as classificações válidas para o NCM
 */
export const listarClassificacoesPorNcm = async (
  ncm: string
): Promise<NcmClassificacao[]> => {
  const ncmNormalizado = normalizeNcm(ncm);
  if (!ncmNormalizado) return [];

  let db: Sqlite3.Database | null = null;
  try {
    db = await openCalculadoraDb();
    const sql = `
      SELECT
        ncma.NCMA_ID,
        ncma.NCMA_NCM_CD,
        cltr.CLTR_ID,
        cltr.CLTR_CD,
        cltr.CLTR_DESCRICAO,
        cltr.CLTR_TIPO_ALIQUOTA,
        anxo.ANXO_NUMERO,
        anxo.ANXO_DESCRICAO,
        anxo.ANXO_NUMERO_ITEM,
        anxo.ANXO_TEXTO_ITEM
      FROM NCM_APLICAVEL ncma
      INNER JOIN CLASSIFICACAO_TRIBUTARIA cltr ON ncma.NCMA_CLTR_ID = cltr.CLTR_ID
      INNER JOIN ANEXO anxo ON ncma.NCMA_ANXO_ID = anxo.ANXO_ID
      INNER JOIN SITUACAO_TRIBUTARIA sitr ON sitr.SITR_ID = cltr.CLTR_SITR_ID
      WHERE REPLACE(ncma.NCMA_NCM_CD, '.', '') = ?
        AND (ncma.NCMA_FIM_VIGENCIA IS NULL OR ncma.NCMA_FIM_VIGENCIA >= date('now'))
        AND ncma.NCMA_INICIO_VIGENCIA <= date('now')
        AND sitr.SITR_IND_GIBSCBS = 1
      ORDER BY cltr.CLTR_CD
    `;

    return new Promise((resolve, reject) => {
      db!.all(sql, [ncmNormalizado], (err, rows) => {
        if (err) return reject(err);
        resolve((rows || []) as NcmClassificacao[]);
      });
    });
  } catch (error) {
    console.error('Erro ao buscar classificações por NCM:', error);
    return [];
  } finally {
    if (db) await closeDb(db);
  }
};

export const buscarPercentuaisReducaoPorCClassTrib = async (
  cClassTrib: string
) => {
  let db: Sqlite3.Database | null = null;
  try {
    db = await openCalculadoraDb();
    const sql = `
      SELECT
        cltr.CLTR_ID,
        MAX(CASE WHEN tb.TBTO_SIGLA='CBS' THEN pere.PERE_VALOR END) AS reducao_cbs,
        MAX(CASE WHEN tb.TBTO_SIGLA='IBSUF' THEN pere.PERE_VALOR END) AS reducao_ibs_uf,
        MAX(CASE WHEN tb.TBTO_SIGLA='IBSMun' THEN pere.PERE_VALOR END) AS reducao_ibs_mun
      FROM CLASSIFICACAO_TRIBUTARIA cltr
      INNER JOIN SITUACAO_TRIBUTARIA sitr ON sitr.SITR_ID = cltr.CLTR_SITR_ID
      LEFT JOIN PERCENTUAL_REDUCAO pere
        ON pere.PERE_CLTR_ID = cltr.CLTR_ID
        AND pere.PERE_FIM_VIGENCIA IS NULL
      LEFT JOIN TRIBUTO tb
        ON tb.TBTO_ID = pere.PERE_TBTO_ID
      WHERE sitr.SITR_IND_GIBSCBS = 1
        AND cltr.CLTR_CD = ?
      GROUP BY cltr.CLTR_ID
      LIMIT 1
    `;

    const row = await new Promise<any>((resolve, reject) => {
      db!.get(sql, [cClassTrib], (err, r) => {
        if (err) return reject(err);
        resolve(r ?? null);
      });
    });

    const reducao_cbs = row?.reducao_cbs ?? null;
    const reducao_ibs_uf = row?.reducao_ibs_uf ?? null;
    const reducao_ibs_mun = row?.reducao_ibs_mun ?? null;
    return {
      reducao_cbs,
      reducao_ibs_uf,
      reducao_ibs_mun,
      tipo_reducao: calcularTipoReducao(
        reducao_cbs,
        reducao_ibs_uf,
        reducao_ibs_mun
      ),
    };
  } catch (error) {
    console.error(
      'Erro ao buscar percentuais de redução por CClassTrib:',
      error
    );
    return {
      reducao_cbs: null,
      reducao_ibs_uf: null,
      reducao_ibs_mun: null,
      tipo_reducao: null,
    };
  } finally {
    if (db) await closeDb(db);
  }
};

/**
 * Sincroniza classificação tributária dos produtos da empresa
 * - Busca produtos em fis_produtos
 * - Consulta calculadora.db para obter classificação
 * - NCMs não encontrados: CST = "000", CClassTrib = "000001"
 * - Upsert em rtc_produtos_classificacao
 */
export const sincronizarClassificacaoProdutos = async (empresaId: string) => {
  // Buscar empresa fiscal (cria se não existir, igual ao módulo de produtos)
  const fisEmpresa = await getFiscalEmpresa(empresaId);

  // Buscar todos os produtos da empresa
  const produtos = await prisma.fis_produtos.findMany({
    where: { id_fis_empresas: fisEmpresa.id },
    select: {
      id: true,
      ds_nome: true,
      cd_ncm: true,
    },
  });

  if (produtos.length === 0) {
    return { sincronizados: 0, total: 0 };
  }

  // Extrair NCMs únicos para consulta batch
  const uniqueNcms = [
    ...new Set(
      produtos
        .map((p) => normalizeNcm(p.cd_ncm))
        .filter((n): n is string => !!n && n.length >= 2)
    ),
  ];

  // Consultar calculadora.db
  let ncmClassificacaoMap = new Map<string, NcmClassificacao>();

  try {
    const db = await openCalculadoraDb();
    try {
      ncmClassificacaoMap = await queryNcmClassificacaoBatch(db, uniqueNcms);

      const cltrIds = Array.from(
        new Set(Array.from(ncmClassificacaoMap.values()).map((v) => v.CLTR_ID))
      );
      const percentuaisMap = await queryPercentuaisReducaoBatch(db, cltrIds);

      for (const classificacao of ncmClassificacaoMap.values()) {
        const p = percentuaisMap.get(classificacao.CLTR_ID);
        classificacao.reducao_cbs = p?.reducao_cbs ?? null;
        classificacao.reducao_ibs_uf = p?.reducao_ibs_uf ?? null;
        classificacao.reducao_ibs_mun = p?.reducao_ibs_mun ?? null;
        classificacao.tipo_reducao = calcularTipoReducao(
          classificacao.reducao_cbs,
          classificacao.reducao_ibs_uf,
          classificacao.reducao_ibs_mun
        );
      }
    } finally {
      await closeDb(db);
    }
  } catch (dbError) {
    console.error('Erro ao conectar ao calculadora.db:', dbError);
    // Continua com mapa vazio - todos os produtos terão valores padrão
  }

  // Buscar todas as classificações existentes de uma vez (otimização)
  const produtoIds = produtos.map((p) => p.id);
  const classificacoesExistentes =
    await prisma.rtc_produtos_classificacao.findMany({
      where: { id_fis_produtos: { in: produtoIds } },
      select: {
        id_fis_produtos: true,
        fl_confirmado_usuario: true,
      },
    });

  // Criar mapa para acesso rápido
  const classificacoesExistentesMap = new Map<
    string,
    { fl_confirmado_usuario: boolean }
  >();
  classificacoesExistentes.forEach((cl) => {
    classificacoesExistentesMap.set(cl.id_fis_produtos, cl);
  });

  // Preparar dados para criar e atualizar
  const produtosParaCriar: Array<{
    id_fis_produtos: string;
    cd_ncm_normalizado: string | null;
    cd_cst: string;
    cd_class_trib: string;
    ds_class_trib_descr: string | null;
    ds_tipo_aliquota: string | null;
    ds_anexo_numero: string | null;
    ds_anexo_descricao: string | null;
    ds_anexo_numero_item: string | null;
    ds_anexo_texto_item: string | null;
    fl_ncm_encontrado: boolean;
    fl_confirmado_usuario: boolean;
    vl_reducao_cbs: Decimal | null;
    vl_reducao_ibs_uf: Decimal | null;
    vl_reducao_ibs_mun: Decimal | null;
    ds_tipo_reducao: string | null;
    dt_updated: Date;
  }> = [];

  const produtosParaAtualizar: Array<{
    id_fis_produtos: string;
    data: {
      cd_ncm_normalizado: string | null;
      cd_cst: string;
      cd_class_trib: string;
      ds_class_trib_descr: string | null;
      ds_tipo_aliquota: string | null;
      ds_anexo_numero: string | null;
      ds_anexo_descricao: string | null;
      ds_anexo_numero_item: string | null;
      ds_anexo_texto_item: string | null;
      fl_ncm_encontrado: boolean;
      vl_reducao_cbs: Decimal | null;
      vl_reducao_ibs_uf: Decimal | null;
      vl_reducao_ibs_mun: Decimal | null;
      ds_tipo_reducao: string | null;
      dt_updated: Date;
    };
  }> = [];

  // Processar cada produto e preparar dados
  for (const produto of produtos) {
    const classificacaoExistente = classificacoesExistentesMap.get(produto.id);

    // Se o usuário já confirmou manualmente, não atualizar
    if (classificacaoExistente?.fl_confirmado_usuario) {
      continue; // Pula produtos já confirmados manualmente
    }

    const ncmNormalizado = normalizeNcm(produto.cd_ncm);
    const classificacao = ncmNormalizado
      ? ncmClassificacaoMap.get(ncmNormalizado)
      : null;
    const encontrado = classificacao !== null && classificacao !== undefined;

    // Regra dos 3 dígitos (Reforma Tributária / SEFAZ): CST = primeiros 3 dígitos do cClassTrib (CLTR_CD).
    // Ex.: cClassTrib 200030 → CST 200 (Alíquota Reduzida); 620001 → CST 620 (Tributação Monofásica).
    const cltrCd =
      encontrado && classificacao?.CLTR_CD
        ? String(classificacao.CLTR_CD).trim()
        : '';
    const cdCst = cltrCd.length >= 3 ? cltrCd.slice(0, 3) : DEFAULT_CST;
    const cdClassTrib =
      encontrado &&
      classificacao?.CLTR_CD != null &&
      String(classificacao.CLTR_CD).trim() !== ''
        ? String(classificacao.CLTR_CD).trim()
        : DEFAULT_CLASS_TRIB;

    const data = {
      cd_ncm_normalizado: ncmNormalizado,
      cd_cst: cdCst,
      cd_class_trib: cdClassTrib,
      ds_class_trib_descr: classificacao?.CLTR_DESCRICAO || null,
      ds_tipo_aliquota: classificacao?.CLTR_TIPO_ALIQUOTA || null,
      ds_anexo_numero: classificacao?.ANXO_NUMERO || null,
      ds_anexo_descricao: classificacao?.ANXO_DESCRICAO || null,
      ds_anexo_numero_item: classificacao?.ANXO_NUMERO_ITEM || null,
      ds_anexo_texto_item: classificacao?.ANXO_TEXTO_ITEM || null,
      fl_ncm_encontrado: encontrado,
      vl_reducao_cbs:
        classificacao?.reducao_cbs != null
          ? new Decimal(classificacao.reducao_cbs)
          : null,
      vl_reducao_ibs_uf:
        classificacao?.reducao_ibs_uf != null
          ? new Decimal(classificacao.reducao_ibs_uf)
          : null,
      vl_reducao_ibs_mun:
        classificacao?.reducao_ibs_mun != null
          ? new Decimal(classificacao.reducao_ibs_mun)
          : null,
      ds_tipo_reducao: classificacao?.tipo_reducao ?? null,
      dt_updated: new Date(),
    };

    if (classificacaoExistente) {
      // Produto já tem classificação, vai atualizar
      produtosParaAtualizar.push({
        id_fis_produtos: produto.id,
        data,
      });
    } else {
      // Produto não tem classificação, vai criar
      produtosParaCriar.push({
        id_fis_produtos: produto.id,
        ...data,
        fl_confirmado_usuario: false,
      });
    }
  }

  let sincronizados = 0;

  // Criar novos registros em batch usando createMany
  if (produtosParaCriar.length > 0) {
    const CHUNK_SIZE = 1000; // Tamanho do chunk para createMany
    for (let i = 0; i < produtosParaCriar.length; i += CHUNK_SIZE) {
      const chunk = produtosParaCriar.slice(i, i + CHUNK_SIZE);
      await prisma.rtc_produtos_classificacao.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      sincronizados += chunk.length;
    }
  }

  // Atualizar registros existentes em paralelo com controle de concorrência
  // Cada update do Prisma já é atômico, então não precisamos de transação
  if (produtosParaAtualizar.length > 0) {
    const limit = pLimit(50); // Máximo de 50 updates simultâneos
    const updatePromises = produtosParaAtualizar.map((item) =>
      limit(() =>
        prisma.rtc_produtos_classificacao.update({
          where: { id_fis_produtos: item.id_fis_produtos },
          data: item.data,
        })
      )
    );
    await Promise.all(updatePromises);
    sincronizados += produtosParaAtualizar.length;
  }

  // Calcular estatísticas de NCMs encontrados
  const produtosProcessados =
    produtosParaCriar.length + produtosParaAtualizar.length;
  const ncmEncontradosCount =
    produtosParaCriar.filter((p) => p.fl_ncm_encontrado).length +
    produtosParaAtualizar.filter((p) => p.data.fl_ncm_encontrado).length;

  return {
    sincronizados,
    total: produtos.length,
    encontrados: ncmEncontradosCount,
    naoEncontrados: produtosProcessados - ncmEncontradosCount,
  };
};

/** Colunas de fis_produtos permitidas para ordenação */
const ORDER_COLUMNS_WHITELIST = [
  'ds_nome',
  'cd_ncm',
  'id_externo',
  'ds_status',
  'ds_tipo_item',
] as const;

/**
 * Lista produtos com classificação tributária (paginado)
 * @param status - filtra por ds_status (ex: ['ATIVO'], ['INATIVO'], [])
 * @param ds_tipo_item - filtra por tipo de item (ex: [1], [9] para serviços)
 * @param cd_cst - filtra por CST específicos (ex: ['000'], ['000001'])
 * @param cd_class_trib - filtra por CClassTrib específicos
 * @param fl_ncm_encontrado - filtra por fl_ncm_encontrado (ex: [true], [false])
 * @param fl_confirmado_usuario - filtra por fl_confirmado_usuario (ex: [true], [false])
 * @param orderColumn - coluna para ordenação (ex: ds_nome, cd_ncm)
 * @param orderBy - direção asc | desc
 */
export const listarProdutosClassificados = async (
  empresaId: string,
  page: number = 1,
  limit: number = 20,
  search?: string,
  status?: string[],
  ds_tipo_item?: number[],
  cd_cst?: string[],
  cd_class_trib?: string[],
  fl_ncm_encontrado?: boolean[],
  fl_confirmado_usuario?: boolean[],
  orderColumn?: string,
  orderBy?: 'asc' | 'desc'
) => {
  // Buscar empresa fiscal (cria se não existir, igual ao módulo de produtos)
  const fisEmpresa = await getFiscalEmpresa(empresaId);

  const skip = (page - 1) * limit;

  const orderColumnSafe =
    orderColumn &&
    ORDER_COLUMNS_WHITELIST.includes(
      orderColumn as (typeof ORDER_COLUMNS_WHITELIST)[number]
    )
      ? orderColumn
      : 'ds_nome';
  const orderBySafe = orderBy === 'desc' ? 'desc' : 'asc';
  const orderByClause = { [orderColumnSafe]: orderBySafe } as {
    ds_nome?: 'asc' | 'desc';
    cd_ncm?: 'asc' | 'desc';
    id_externo?: 'asc' | 'desc';
    ds_status?: 'asc' | 'desc';
    ds_tipo_item?: 'asc' | 'desc';
  };

  // Condição de busca base
  const whereCondition: any = {
    id_fis_empresas: fisEmpresa.id,
  };

  if (search) {
    whereCondition.OR = [
      { ds_nome: { contains: search, mode: 'insensitive' } },
      { cd_ncm: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filtro por status (fis_produtos.ds_status)
  if (status?.length) {
    whereCondition.ds_status = { in: ['ATIVO', 'NOVO'] };
  }

  // Filtro por tipo de item (fis_produtos.ds_tipo_item)
  if (ds_tipo_item?.length) {
    whereCondition.ds_tipo_item = { in: ds_tipo_item };
  }

  // Filtro por CST, CClassTrib, fl_ncm_encontrado e fl_confirmado_usuario (via relação rtc_produtos_classificacao)
  const hasClassificacaoFilters =
    cd_cst?.length ||
    cd_class_trib?.length ||
    (fl_ncm_encontrado?.length !== undefined && fl_ncm_encontrado.length > 0) ||
    (fl_confirmado_usuario?.length !== undefined &&
      fl_confirmado_usuario.length > 0);

  if (hasClassificacaoFilters) {
    const classificacaoAnd: any[] = [];
    if (cd_cst?.length) classificacaoAnd.push({ cd_cst: { in: cd_cst } });
    if (cd_class_trib?.length)
      classificacaoAnd.push({ cd_class_trib: { in: cd_class_trib } });
    if (
      fl_ncm_encontrado?.length !== undefined &&
      fl_ncm_encontrado.length > 0
    ) {
      // Se tem apenas um valor, usa igualdade; se tem múltiplos, usa IN
      if (fl_ncm_encontrado.length === 1) {
        classificacaoAnd.push({ fl_ncm_encontrado: fl_ncm_encontrado[0] });
      } else {
        classificacaoAnd.push({ fl_ncm_encontrado: { in: fl_ncm_encontrado } });
      }
    }
    if (
      fl_confirmado_usuario?.length !== undefined &&
      fl_confirmado_usuario.length > 0
    ) {
      // Se tem apenas um valor, usa igualdade; se tem múltiplos, usa IN
      if (fl_confirmado_usuario.length === 1) {
        classificacaoAnd.push({
          fl_confirmado_usuario: fl_confirmado_usuario[0],
        });
      } else {
        classificacaoAnd.push({
          fl_confirmado_usuario: { in: fl_confirmado_usuario },
        });
      }
    }

    // Se filtramos por fl_ncm_encontrado: false (sem outros filtros de classificação),
    // também incluir produtos sem classificação (null), pois são equivalentes a "não encontrado"
    const includesFalseNcm = fl_ncm_encontrado?.includes(false);
    const hasOtherClassFilters = cd_cst?.length || cd_class_trib?.length;
    const onlyNcmFilter =
      classificacaoAnd.length === 1 &&
      classificacaoAnd[0]?.fl_ncm_encontrado !== undefined;

    if (includesFalseNcm && !hasOtherClassFilters && onlyNcmFilter) {
      // Apenas filtro fl_ncm_encontrado: false, incluir null também
      whereCondition.OR = [
        { rtc_produtos_classificacao: { fl_ncm_encontrado: false } },
        { rtc_produtos_classificacao: null },
      ];
    } else if (
      includesFalseNcm &&
      !hasOtherClassFilters &&
      fl_ncm_encontrado?.length === 2
    ) {
      // Filtro por ambos true e false, incluir null também (equivale a false)
      whereCondition.OR = [
        {
          rtc_produtos_classificacao: {
            fl_ncm_encontrado: { in: fl_ncm_encontrado },
          },
        },
        { rtc_produtos_classificacao: null },
      ];
    } else {
      // Aplicar filtros normalmente
      whereCondition.rtc_produtos_classificacao =
        classificacaoAnd.length === 1
          ? classificacaoAnd[0]
          : { AND: classificacaoAnd };
    }
  }

  // Buscar opções de filtro (distintos CST, CClassTrib e ds_tipo_item da empresa)
  const [cstDistintos, classTribDistintos, tipoItemDistintos] =
    await Promise.all([
      prisma.rtc_produtos_classificacao.findMany({
        where: { fis_produtos: { id_fis_empresas: fisEmpresa.id } },
        select: { cd_cst: true },
        distinct: ['cd_cst'],
        orderBy: { cd_cst: 'asc' },
      }),
      prisma.rtc_produtos_classificacao.findMany({
        where: { fis_produtos: { id_fis_empresas: fisEmpresa.id } },
        select: { cd_class_trib: true },
        distinct: ['cd_class_trib'],
        orderBy: { cd_class_trib: 'asc' },
      }),
      prisma.fis_produtos.findMany({
        where: { id_fis_empresas: fisEmpresa.id, ds_tipo_item: { not: null } },
        select: { ds_tipo_item: true },
        distinct: ['ds_tipo_item'],
        orderBy: { ds_tipo_item: 'asc' },
      }),
    ]);

  const opcoesFiltro = {
    cst: cstDistintos.map((r) => r.cd_cst).filter(Boolean),
    classTrib: classTribDistintos.map((r) => r.cd_class_trib).filter(Boolean),
    tipoItem: tipoItemDistintos
      .map((r) => r.ds_tipo_item)
      .filter((v): v is number => v != null),
  };

  // Lookup sis_cst para descrições de CST (ds_codigo = cd_cst)
  const cstCodigos = opcoesFiltro.cst;
  const cstDescricoesMap = new Map<string, string>();
  if (cstCodigos.length > 0) {
    const sisCstList = await prisma.sis_cst.findMany({
      where: { ds_codigo: { in: cstCodigos } },
      select: { ds_codigo: true, ds_descricao: true },
    });
    sisCstList.forEach((c) => {
      if (c.ds_codigo) cstDescricoesMap.set(c.ds_codigo, c.ds_descricao);
    });
  }

  // Contar total
  const total = await prisma.fis_produtos.count({
    where: whereCondition,
  });

  // Buscar produtos com classificação
  const produtos = await prisma.fis_produtos.findMany({
    where: whereCondition,
    select: {
      id: true,
      id_externo: true,
      cd_identificador: true,
      ds_nome: true,
      cd_ncm: true,
      ds_unidade: true,
      ds_status: true,
      ds_tipo_item: true,
      rtc_produtos_classificacao: true,
    },
    skip,
    take: limit,
    orderBy: orderByClause,
  });

  const data = produtos.map((produto) => {
    const cl = produto.rtc_produtos_classificacao;
    const dsAnxoNum = cl?.ds_anexo_numero;
    const dsAnxoItem = cl?.ds_anexo_numero_item;
    // Textos genéricos/placeholders do calculadora.db (ex: "descrição") são ignorados para não poluir o tooltip
    const isTextoValido = (s: string | null | undefined) =>
      s != null && s.trim().length > 2 && !/^descri[cç][aã]o$/i.test(s.trim());
    const textoItem = (cl as { ds_anexo_texto_item?: string })
      ?.ds_anexo_texto_item;
    const descricaoAnexo = cl?.ds_anexo_descricao;
    const dsAnxoTexto = isTextoValido(textoItem)
      ? textoItem
      : isTextoValido(descricaoAnexo)
        ? descricaoAnexo
        : null;
    const ds_anexo_descricao_full =
      dsAnxoTexto ??
      (dsAnxoNum && dsAnxoItem ? `${dsAnxoNum} - ${dsAnxoItem}` : null);

    // Normalizar percentuais de redução para a nova coluna única
    const aliquotaReducao = cl
      ? normalizarPercentuaisReducao(
          cl.vl_reducao_cbs ? Number(cl.vl_reducao_cbs) : null,
          cl.vl_reducao_ibs_uf ? Number(cl.vl_reducao_ibs_uf) : null,
          cl.vl_reducao_ibs_mun ? Number(cl.vl_reducao_ibs_mun) : null
        )
      : null;

    return {
      id: produto.id,
      id_externo: produto.id_externo ?? produto.cd_identificador ?? null,
      ds_nome: produto.ds_nome,
      cd_ncm: produto.cd_ncm,
      ds_unidade: produto.ds_unidade,
      ds_status: produto.ds_status,
      ds_tipo_item: produto.ds_tipo_item,
      classificacao: cl
        ? {
            cd_cst: cl.cd_cst,
            cd_class_trib: cl.cd_class_trib,
            ds_cst_desc: cl.cd_cst
              ? (cstDescricoesMap.get(cl.cd_cst) ?? null)
              : null,
            ds_class_trib_descr: cl.ds_class_trib_descr,
            ds_anexo_descricao_full,
            ds_tipo_aliquota: cl.ds_tipo_aliquota, // Mantido para compatibilidade
            ds_anexo_numero: cl.ds_anexo_numero,
            ds_anexo_descricao: cl.ds_anexo_descricao,
            ds_anexo_numero_item: cl.ds_anexo_numero_item,
            fl_ncm_encontrado: cl.fl_ncm_encontrado,
            fl_confirmado_usuario: cl.fl_confirmado_usuario,
            vl_reducao_cbs: cl.vl_reducao_cbs
              ? Number(cl.vl_reducao_cbs)
              : null, // Mantido para compatibilidade
            vl_reducao_ibs_uf: cl.vl_reducao_ibs_uf
              ? Number(cl.vl_reducao_ibs_uf)
              : null, // Mantido para compatibilidade
            vl_reducao_ibs_mun: cl.vl_reducao_ibs_mun
              ? Number(cl.vl_reducao_ibs_mun)
              : null, // Mantido para compatibilidade
            ds_tipo_reducao: cl.ds_tipo_reducao ?? null, // Mantido para compatibilidade
            aliquota_reducao: aliquotaReducao, // Nova coluna única
          }
        : null,
    };
  });

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    opcoesFiltro,
  };
};

/**
 * Atualiza classificação tributária de um produto manualmente
 * @param produtoId - ID do produto (fis_produtos.id)
 * @param dados - Dados da classificação a atualizar
 * @param empresaId - ID da empresa (para validação de permissão)
 * @returns Classificação atualizada
 */
export const atualizarClassificacaoManual = async (
  produtoId: string,
  dados: {
    cd_class_trib: string;
    cd_cst?: string;
    ds_class_trib_descr?: string | null;
    ds_tipo_aliquota?: string | null;
    ds_anexo_numero?: string | null;
    ds_anexo_descricao?: string | null;
    ds_anexo_numero_item?: string | null;
    ds_anexo_texto_item?: string | null;
  },
  empresaId: string
) => {
  const fisEmpresa = await getFiscalEmpresa(empresaId);
  const produto = await prisma.fis_produtos.findFirst({
    where: { id: produtoId, id_fis_empresas: fisEmpresa.id },
  });

  if (!produto) {
    throw new Error('Produto não encontrado ou não pertence à empresa');
  }

  const cdCst =
    dados.cd_cst ||
    (dados.cd_class_trib.length >= 3 ? dados.cd_class_trib.slice(0, 3) : '000');
  const percentuais = await buscarPercentuaisReducaoPorCClassTrib(
    dados.cd_class_trib
  );
  const vl_reducao_cbs =
    percentuais.reducao_cbs != null
      ? new Decimal(percentuais.reducao_cbs)
      : null;
  const vl_reducao_ibs_uf =
    percentuais.reducao_ibs_uf != null
      ? new Decimal(percentuais.reducao_ibs_uf)
      : null;
  const vl_reducao_ibs_mun =
    percentuais.reducao_ibs_mun != null
      ? new Decimal(percentuais.reducao_ibs_mun)
      : null;

  return await prisma.rtc_produtos_classificacao.upsert({
    where: { id_fis_produtos: produtoId },
    update: {
      cd_class_trib: dados.cd_class_trib,
      cd_cst: cdCst,
      ds_class_trib_descr: dados.ds_class_trib_descr ?? null,
      ds_tipo_aliquota: dados.ds_tipo_aliquota ?? null,
      ds_anexo_numero: dados.ds_anexo_numero ?? null,
      ds_anexo_descricao: dados.ds_anexo_descricao ?? null,
      ds_anexo_numero_item: dados.ds_anexo_numero_item ?? null,
      ds_anexo_texto_item: dados.ds_anexo_texto_item ?? null,
      vl_reducao_cbs,
      vl_reducao_ibs_uf,
      vl_reducao_ibs_mun,
      ds_tipo_reducao: percentuais.tipo_reducao,
      fl_confirmado_usuario: true, // Sempre marca como confirmado ao editar manualmente
      dt_updated: new Date(),
    },
    create: {
      id_fis_produtos: produtoId,
      cd_ncm_normalizado: normalizeNcm(produto.cd_ncm),
      cd_class_trib: dados.cd_class_trib,
      cd_cst: cdCst,
      ds_class_trib_descr: dados.ds_class_trib_descr ?? null,
      ds_tipo_aliquota: dados.ds_tipo_aliquota ?? null,
      ds_anexo_numero: dados.ds_anexo_numero ?? null,
      ds_anexo_descricao: dados.ds_anexo_descricao ?? null,
      ds_anexo_numero_item: dados.ds_anexo_numero_item ?? null,
      ds_anexo_texto_item: dados.ds_anexo_texto_item ?? null,
      vl_reducao_cbs,
      vl_reducao_ibs_uf,
      vl_reducao_ibs_mun,
      ds_tipo_reducao: percentuais.tipo_reducao,
      fl_ncm_encontrado: false,
      fl_confirmado_usuario: true,
    },
  });
};
