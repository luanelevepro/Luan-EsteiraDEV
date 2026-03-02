import type { Prisma } from '@prisma/client';
import type { TabelasPersonalizadas, TipoColunas } from '@prisma/client';
import { prisma } from '../prisma';

function normalizeHex(hex: string): string {
  const s = (hex ?? '').trim();
  if (!s) return s;
  const cleaned = s.replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) return `#${cleaned}`;
  if (/^[0-9A-Fa-f]{3}$/.test(cleaned)) {
    return `#${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`;
  }
  return s.startsWith('#') ? s : `#${s}`;
}

/** For OPCAO: normalizes js_valores as Record<optionLabel, hexColor>; each color gets #. */
function normalizeJsValoresOpcao(val: unknown): Record<string, string> | null {
  if (val == null || typeof val !== 'object' || Array.isArray(val)) return null;
  const obj = val as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [key, v] of Object.entries(obj)) {
    const label = (key ?? '').trim();
    if (!label) continue;
    const hex = normalizeHex(typeof v === 'string' ? v : String(v ?? ''));
    if (hex) out[label] = hex;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export type ColunaPersonalizadaCreate = {
  ds_nome_coluna: string;
  ds_descricao?: string;
  ds_tipo: TipoColunas;
  js_valores?: unknown;
  ds_tabela: TabelasPersonalizadas;
};

export type ColunaPersonalizadaUpdate = {
  ds_nome_coluna?: string;
  ds_descricao?: string;
  ds_tipo?: TipoColunas;
  js_valores?: unknown;
};

/**
 * Lista colunas personalizadas da empresa para uma tabela
 */
export const listColunas = async (
  empresaId: string,
  ds_tabela: TabelasPersonalizadas
): Promise<unknown[]> => {
  const list = await prisma.sis_colunas_personalizadas.findMany({
    where: { id_sis_empresa: empresaId, ds_tabela },
    orderBy: [{ nr_ordem: 'asc' }, { dt_created: 'asc' }],
  });
  return list;
};

/**
 * Cria uma coluna personalizada. Para tipo OPCAO, js_valores deve ser Record<opção, cor hex>.
 */
export const createColuna = async (
  empresaId: string,
  data: ColunaPersonalizadaCreate
): Promise<unknown> => {
  const ds_nome_coluna = (data.ds_nome_coluna ?? '').trim();
  if (!ds_nome_coluna) throw new Error('Nome da coluna (ds_nome_coluna) é obrigatório.');
  if (!data.ds_tipo) throw new Error('Tipo (ds_tipo) é obrigatório.');
  if (!data.ds_tabela) throw new Error('Tabela (ds_tabela) é obrigatória.');

  let js_valores: Record<string, string> | null = null;
  if (data.ds_tipo === 'OPCAO') {
    js_valores = normalizeJsValoresOpcao(data.js_valores);
    if (!js_valores || Object.keys(js_valores).length === 0) {
      throw new Error('Para tipo OPCAO, js_valores é obrigatório com pelo menos uma opção e cor.');
    }
  }

  const maxOrd = await prisma.sis_colunas_personalizadas.aggregate({
    where: { id_sis_empresa: empresaId, ds_tabela: data.ds_tabela },
    _max: { nr_ordem: true },
  });
  const nr_ordem = (maxOrd._max.nr_ordem ?? -1) + 1;

  const created = await prisma.sis_colunas_personalizadas.create({
    data: {
      id_sis_empresa: empresaId,
      ds_nome_coluna,
      ds_descricao: (data.ds_descricao ?? '').trim() || null,
      ds_tipo: data.ds_tipo,
      js_valores: js_valores ? (js_valores as object) : undefined,
      ds_tabela: data.ds_tabela,
      nr_ordem,
    },
  });
  return created;
};

/**
 * Atualiza uma coluna personalizada
 */
export const updateColuna = async (
  empresaId: string,
  id: string,
  data: ColunaPersonalizadaUpdate
): Promise<unknown> => {
  const existing = await prisma.sis_colunas_personalizadas.findFirst({
    where: { id, id_sis_empresa: empresaId },
  });
  if (!existing) throw new Error('Coluna personalizada não encontrada.');

  const payload: Record<string, unknown> = {};
  if (data.ds_nome_coluna !== undefined) {
    const v = (data.ds_nome_coluna ?? '').trim();
    if (!v) throw new Error('Nome da coluna não pode ser vazio.');
    payload.ds_nome_coluna = v;
  }
  if (data.ds_descricao !== undefined) payload.ds_descricao = (data.ds_descricao ?? '').trim() || null;
  if (data.ds_tipo !== undefined) payload.ds_tipo = data.ds_tipo;
  if (data.js_valores !== undefined) {
    if (data.ds_tipo === 'OPCAO' || existing.ds_tipo === 'OPCAO') {
      const normalized = normalizeJsValoresOpcao(data.js_valores);
      payload.js_valores = normalized ?? (existing.js_valores as Record<string, string> | null);
    } else {
      payload.js_valores = data.js_valores;
    }
  }

  if (Object.keys(payload).length === 0) return existing;

  return prisma.sis_colunas_personalizadas.update({
    where: { id },
    data: payload,
  });
};

/**
 * Reordena colunas personalizadas. orderedIds = array de IDs na nova ordem (0, 1, 2, ...).
 */
export const reorderColunas = async (
  empresaId: string,
  ds_tabela: TabelasPersonalizadas,
  orderedIds: string[]
): Promise<void> => {
  if (!orderedIds.length) return;

  const existing = await prisma.sis_colunas_personalizadas.findMany({
    where: { id: { in: orderedIds }, id_sis_empresa: empresaId, ds_tabela },
    select: { id: true },
  });
  const validIds = new Set(existing.map((c) => c.id));
  if (validIds.size !== orderedIds.length) {
    throw new Error('Um ou mais IDs não pertencem à empresa/tabela ou não existem.');
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.sis_colunas_personalizadas.update({
        where: { id },
        data: { nr_ordem: index },
      })
    )
  );
};

/**
 * Remove uma coluna personalizada (dados em cascata)
 */
export const removeColuna = async (empresaId: string, id: string): Promise<void> => {
  const existing = await prisma.sis_colunas_personalizadas.findFirst({
    where: { id, id_sis_empresa: empresaId },
  });
  if (!existing) throw new Error('Coluna personalizada não encontrada.');
  await prisma.sis_colunas_personalizadas.delete({ where: { id } });
};

/**
 * Busca valores das colunas personalizadas para N registros (id_referencia)
 */
export const getDados = async (
  empresaId: string,
  ds_tabela: TabelasPersonalizadas,
  ids: string[]
): Promise<unknown[]> => {
  if (!ids.length) return [];

  const colunas = await prisma.sis_colunas_personalizadas.findMany({
    where: { id_sis_empresa: empresaId, ds_tabela },
    select: { id: true },
  });
  const colunaIds = colunas.map((c) => c.id);
  if (!colunaIds.length) return [];

  const dados = await prisma.sis_coluna_dado.findMany({
    where: {
      id_sis_colunas_personalizadas: { in: colunaIds },
      id_referencia: { in: ids },
    },
  });
  return dados;
};

function getOpcoesFromJsValores(js_valores: unknown): string[] {
  if (js_valores == null || typeof js_valores !== 'object' || Array.isArray(js_valores)) return [];
  return Object.keys(js_valores as Record<string, unknown>);
}

/**
 * Valida ds_valor conforme o tipo da coluna
 */
function validarValorColuna(coluna: { ds_tipo: string; js_valores: unknown }, ds_valor: string): void {
  if (coluna.ds_tipo === 'DATA') {
    const d = new Date(ds_valor);
    if (Number.isNaN(d.getTime())) throw new Error('Data inválida.');
    return;
  }
  if (coluna.ds_tipo === 'OPCAO') {
    const opcoes = getOpcoesFromJsValores(coluna.js_valores);
    if (opcoes.length > 0 && !opcoes.includes(ds_valor)) {
      throw new Error(`Valor deve ser uma das opções: ${opcoes.join(', ')}`);
    }
  }
}

/**
 * Upsert um valor de coluna personalizada para um registro
 */
export const upsertDado = async (
  empresaId: string,
  body: { id_sis_colunas_personalizadas: string; id_referencia: string; ds_valor: string },
  opts?: { tx?: Prisma.TransactionClient }
): Promise<unknown> => {
  const db = opts?.tx ?? prisma;
  const { id_sis_colunas_personalizadas, id_referencia, ds_valor } = body;
  if (!id_sis_colunas_personalizadas || !id_referencia) {
    throw new Error('id_sis_colunas_personalizadas e id_referencia são obrigatórios.');
  }

  const coluna = await db.sis_colunas_personalizadas.findFirst({
    where: { id: id_sis_colunas_personalizadas, id_sis_empresa: empresaId },
  });
  if (!coluna) throw new Error('Coluna personalizada não encontrada.');

  validarValorColuna(coluna, ds_valor ?? '');

  const result = await db.sis_coluna_dado.upsert({
    where: {
      id_sis_colunas_personalizadas_id_referencia: {
        id_sis_colunas_personalizadas,
        id_referencia,
      },
    },
    create: {
      id_sis_colunas_personalizadas,
      id_referencia,
      ds_valor: ds_valor ?? '',
    },
    update: { ds_valor: ds_valor ?? '' },
  });
  return result;
};
