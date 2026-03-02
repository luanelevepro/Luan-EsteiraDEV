import { prisma } from '../../prisma';

export const createTipoIntegracao = async (ds_nome: string) => {
  return prisma.sis_tipo_integracao.create({
    data: {
      ds_nome,
    },
  });
};

export const getTipoIntegracao = async () => {
  return prisma.sis_tipo_integracao.findMany({ orderBy: { ds_nome: 'asc' } });
};
