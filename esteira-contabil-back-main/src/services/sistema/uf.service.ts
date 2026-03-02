import { sis_ibge_uf } from '@prisma/client';
import { prisma } from '@/services/prisma';

// // UFS

export const getUFs: (
  paginacao: ESTEIRA.PAYLOAD.Paginacao,
  mostrarUltimaVigencia?: boolean
) => Promise<ESTEIRA.RESPONSE.Paginada<'ufs', sis_ibge_uf>> = async (
  { pageSize, page, orderBy, orderColumn, search },
  mostrarUltimaVigencia
) => {
  const orderByClause =
    orderColumn && orderColumn.trim() !== ''
      ? orderColumn
          .split('.')
          .reduceRight(
            (accumulator: any, key: string) => ({ [key]: accumulator }),
            orderBy
          )
      : { id: orderBy };

  const [ufs, count] = await prisma.$transaction([
    prisma.sis_ibge_uf.findMany({
      take: pageSize,
      skip: (page - 1) * pageSize,
      where: {
        ds_uf: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
      orderBy: orderByClause,
    }),
    prisma.sis_ibge_uf.count({
      where: {
        ds_uf: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
    }),
  ]);

  return {
    total: count,
    totalPages: Math.ceil(count / pageSize),
    page: page,
    ufs,
  };
};

export const getUFsGeral = async () => {
  const ufs = await prisma.sis_ibge_uf.findMany({ orderBy: { ds_uf: 'asc' } });
  return {
    ufs,
  };
};

export const getUF = async (id_uf: number) => {
  const uf = await prisma.sis_ibge_uf.findUnique({
    where: {
      id: id_uf,
    },
  });

  return {
    uf,
  };
};

export const getUFCidades = async (id_uf: number) => {
  const cidades = await prisma.sis_igbe_city.findMany({
    where: {
      id_ibge_uf: Number(id_uf),
    },
    orderBy: { ds_city_clean: 'asc' },
  });

  return {
    cidades,
  };
};
