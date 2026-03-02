import { prisma } from '../prisma';

export type TipoImportLayout = 'CARGAS' | 'VIAGENS';

const MAPEAMENTO_KEYS_CARGAS = [
  'operacaoContainer',
  'mapColunas',
  'mapFormatoData',
  'mapPersonalizadas',
  'mapContainer',
] as const;

const MAPEAMENTO_KEYS_VIAGENS = ['mapColunas', 'mapFormatoData', 'mapPersonalizadas'] as const;

function isMapeamentoValido(
  js_mapeamento: unknown,
  cd_tipo: TipoImportLayout
): js_mapeamento is Record<string, unknown> {
  if (js_mapeamento == null || typeof js_mapeamento !== 'object' || Array.isArray(js_mapeamento)) {
    return false;
  }
  const obj = js_mapeamento as Record<string, unknown>;
  const keys =
    cd_tipo === 'VIAGENS' ? MAPEAMENTO_KEYS_VIAGENS : MAPEAMENTO_KEYS_CARGAS;
  return keys.every((key) => key in obj);
}

export interface ImportLayoutCreate {
  ds_nome: string;
  ds_descricao?: string | null;
  js_mapeamento: Record<string, unknown>;
  cd_tipo?: TipoImportLayout;
}

export interface ImportLayoutUpdate {
  ds_nome?: string;
  ds_descricao?: string | null;
  js_mapeamento?: Record<string, unknown>;
}

/**
 * Lista layouts de importação da empresa, opcionalmente filtrados por tipo (CARGAS | VIAGENS)
 */
export async function listImportLayouts(
  empresaId: string,
  cd_tipo?: TipoImportLayout
) {
  const where: { id_sis_empresa: string; cd_tipo?: string } = {
    id_sis_empresa: empresaId,
  };
  if (cd_tipo) {
    where.cd_tipo = cd_tipo;
  }

  const layouts = await prisma.tms_import_layout.findMany({
    where,
    select: {
      id: true,
      cd_tipo: true,
      ds_nome: true,
      ds_descricao: true,
      js_mapeamento: true,
      dt_created: true,
      dt_updated: true,
    },
    orderBy: { ds_nome: 'asc' },
  });
  return layouts;
}

/**
 * Cria um layout de importação (empresa do token deve bater com id_sis_empresa)
 */
export async function createImportLayout(
  empresaId: string,
  data: ImportLayoutCreate,
  cd_tipo: TipoImportLayout = 'CARGAS'
) {
  if (!data.ds_nome?.trim()) {
    throw new Error('Nome do layout é obrigatório.');
  }
  const tipo = data.cd_tipo ?? cd_tipo;
  if (!isMapeamentoValido(data.js_mapeamento, tipo)) {
    const keys =
      tipo === 'VIAGENS'
        ? 'mapColunas, mapFormatoData, mapPersonalizadas'
        : 'operacaoContainer, mapColunas, mapFormatoData, mapPersonalizadas, mapContainer';
    throw new Error(`js_mapeamento deve ser um objeto com as chaves: ${keys}.`);
  }

  const layout = await prisma.tms_import_layout.create({
    data: {
      id_sis_empresa: empresaId,
      cd_tipo: tipo,
      ds_nome: data.ds_nome.trim(),
      ds_descricao: data.ds_descricao?.trim() || null,
      js_mapeamento: data.js_mapeamento as object,
    },
    select: {
      id: true,
      cd_tipo: true,
      ds_nome: true,
      ds_descricao: true,
      js_mapeamento: true,
      dt_created: true,
      dt_updated: true,
    },
  });
  return layout;
}

/**
 * Atualiza um layout (somente se pertencer à empresa do token)
 */
export async function updateImportLayout(
  empresaId: string,
  id: string,
  data: ImportLayoutUpdate
) {
  const existing = await prisma.tms_import_layout.findFirst({
    where: { id, id_sis_empresa: empresaId },
    select: { id: true, cd_tipo: true },
  });
  if (!existing) {
    throw new Error('Layout não encontrado.');
  }

  const tipo = (existing.cd_tipo as TipoImportLayout) || 'CARGAS';
  if (data.js_mapeamento !== undefined && !isMapeamentoValido(data.js_mapeamento, tipo)) {
    const keys =
      tipo === 'VIAGENS'
        ? 'mapColunas, mapFormatoData, mapPersonalizadas'
        : 'operacaoContainer, mapColunas, mapFormatoData, mapPersonalizadas, mapContainer';
    throw new Error(`js_mapeamento deve ser um objeto com as chaves: ${keys}.`);
  }

  const layout = await prisma.tms_import_layout.update({
    where: { id },
    data: {
      ...(data.ds_nome !== undefined && { ds_nome: data.ds_nome.trim() }),
      ...(data.ds_descricao !== undefined && {
        ds_descricao: data.ds_descricao?.trim() || null,
      }),
      ...(data.js_mapeamento !== undefined && { js_mapeamento: data.js_mapeamento as object }),
    },
    select: {
      id: true,
      cd_tipo: true,
      ds_nome: true,
      ds_descricao: true,
      js_mapeamento: true,
      dt_created: true,
      dt_updated: true,
    },
  });
  return layout;
}

/**
 * Remove um layout (somente se pertencer à empresa do token)
 */
export async function deleteImportLayout(empresaId: string, id: string) {
  const existing = await prisma.tms_import_layout.findFirst({
    where: { id, id_sis_empresa: empresaId },
  });
  if (!existing) {
    throw new Error('Layout não encontrado.');
  }

  await prisma.tms_import_layout.delete({ where: { id } });
}
