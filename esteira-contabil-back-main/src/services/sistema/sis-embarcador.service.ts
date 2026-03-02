import { prisma } from '@/services/prisma';
import { sis_emb_marcas_carrocerias } from '@prisma/client';

// Marcas Carrocerias
export const getMarcasCarrocerias = async ({
  pageSize,
  page,
  orderBy,
  search,
}: ESTEIRA.PAYLOAD.Paginacao): Promise<
  ESTEIRA.RESPONSE.Paginada<
    'marcas',
    Omit<sis_emb_marcas_carrocerias, 'id_emb_empresas'>
  >
> => {
  const [marcas, count] = await prisma.$transaction([
    prisma.sis_emb_marcas_carrocerias.findMany({
      select: {
        id: true,
        cd_marca: true,
        ds_nome: true,
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
      where: {
        ds_nome: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
      orderBy: {
        ds_nome: orderBy,
      },
    }),
    prisma.sis_emb_marcas_carrocerias.count({
      where: {
        ds_nome: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
    }),
  ]);

  return {
    total: count,
    totalPages: Math.ceil(count / pageSize),
    page: page,
    marcas,
  };
};

export const createMarcaCarroceria = async (
  data: Omit<sis_emb_marcas_carrocerias, 'id' | 'id_emb_empresas'>
) => {
  return prisma.sis_emb_marcas_carrocerias.create({
    data: {
      ...data,
    },
  });
};

export const deleteMarcaCarroceria = async (id: number) => {
  return prisma.sis_emb_marcas_carrocerias.delete({
    where: {
      id,
    },
  });
};

export const updateMarcaCarroceria = async (
  id: number,
  data: Omit<sis_emb_marcas_carrocerias, 'id' | 'id_emb_empresas'>
) => {
  return prisma.sis_emb_marcas_carrocerias.update({
    where: {
      id,
    },
    data: {
      ...data,
    },
  });
};
