import { prisma } from '@/services/prisma';

export interface TipoInconsistenciaCreate {
  cd_codigo: string;
  ds_descricao: string;
  criticidade_padrao?: 'INFO' | 'AVISO' | 'CRITICA';
  ds_grupo?: string;
  fl_ativo?: boolean;
  ds_ordem_exibicao?: number;
  versao_regra?: string;
  dt_inicio_vigencia?: Date | string;
  dt_fim_vigencia?: Date | string | null;
}

export const listTipos = async (opts?: { activeOnly?: boolean }) => {
  const where: any = {};
  if (opts?.activeOnly) where.fl_ativo = true;
  return prisma.fis_tipo_inconsistencia.findMany({
    where,
    orderBy: { ds_ordem_exibicao: 'asc' },
  });
};

export const getTipoById = async (id: string) => {
  return prisma.fis_tipo_inconsistencia.findUnique({ where: { id } });
};

export const createTipo = async (data: TipoInconsistenciaCreate) => {
  // normalizações mínimas
  const payload: any = {
    cd_codigo: data.cd_codigo,
    ds_descricao: data.ds_descricao,
    criticidade_padrao: data.criticidade_padrao || 'AVISO',
    ds_grupo: data.ds_grupo || null,
    fl_ativo: data.fl_ativo ?? true,
    ds_ordem_exibicao: data.ds_ordem_exibicao ?? 999,
    versao_regra: data.versao_regra || null,
    dt_inicio_vigencia: data.dt_inicio_vigencia
      ? new Date(data.dt_inicio_vigencia)
      : undefined,
    dt_fim_vigencia: data.dt_fim_vigencia
      ? new Date(data.dt_fim_vigencia as any)
      : null,
  };

  return prisma.fis_tipo_inconsistencia.create({ data: payload });
};

export const updateTipo = async (
  id: string,
  data: Partial<TipoInconsistenciaCreate>
) => {
  const payload: any = { ...data };
  if (data.dt_inicio_vigencia)
    payload.dt_inicio_vigencia = new Date(data.dt_inicio_vigencia as any);
  if (data.dt_fim_vigencia)
    payload.dt_fim_vigencia = new Date(data.dt_fim_vigencia as any);
  return prisma.fis_tipo_inconsistencia.update({
    where: { id },
    data: payload,
  });
};

export const deleteTipo = async (id: string) => {
  return prisma.fis_tipo_inconsistencia.delete({ where: { id } });
};

export default {
  listTipos,
  getTipoById,
  createTipo,
  updateTipo,
  deleteTipo,
};
