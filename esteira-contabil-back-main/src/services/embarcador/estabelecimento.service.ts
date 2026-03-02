import { prisma } from '@/services/prisma';
import { getEmbarcadorEmpresa } from './embarcador-empresa.service';
import { ensureEmbarcadorCity } from './core/embarcador-functions';
import { emb_estabelecimentos } from '@prisma/client';

// Estabelecimentos
export const getEstabelecimentos = async (
  empresaId: string,
  { pageSize, page, orderBy, search }: ESTEIRA.PAYLOAD.Paginacao
) => {
  const [estabelecimentos, count] = await prisma.$transaction([
    prisma.emb_estabelecimentos.findMany({
      select: {
        id: true,
        ds_nome: true,
        id_emb_ibge_cidade: true,
        js_emb_ibge_cidade: {
          include: {
            js_sis_city: true,
            js_emb_ibge_uf: {
              include: {
                js_sis_ibge_uf: true,
              },
            },
          },
        },
        emb_empresas: {
          include: {
            sis_empresas: {
              select: {
                ds_fantasia: true,
              },
            },
          },
        },
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
      where: {
        AND: search
          ? [
              { id_emb_empresas: empresaId },
              { ds_nome: { contains: search, mode: 'insensitive' } },
            ]
          : [{ id_emb_empresas: empresaId }],
      },
      orderBy: {
        ds_nome: orderBy,
      },
    }),
    prisma.emb_estabelecimentos.count({
      where: {
        ds_nome: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
    }),
  ]);

  return {
    total: count,
    totalPages: Math.ceil(count / pageSize),
    page: page,
    estabelecimentos,
  };
};

export const getEstabelecimento = async (id: string) => {
  return prisma.emb_estabelecimentos.findFirst({
    where: {
      id,
    },
  });
};

export const createEstabelecimento = async (
  empresaId: string,
  data: { ds_nome: string; id_sis_ibge_cidade: number }
) => {
  const ensuredCity = await ensureEmbarcadorCity({
    id_sis_ibge_cidade: data.id_sis_ibge_cidade,
  });

  return prisma.emb_estabelecimentos.create({
    data: {
      ds_nome: data.ds_nome,
      id_emb_ibge_cidade: ensuredCity.id,
      id_emb_empresas: empresaId,
    },
  });
};

export const deleteEstabelecimento = async (id: string) => {
  return prisma.emb_estabelecimentos.delete({
    where: {
      id,
    },
  });
};

export const updateEstabelecimento = async (
  id: string,
  data: {
    ds_nome: string;
    id_sis_ibge_cidade: number;
  }
) => {
  const ensuredCity = await ensureEmbarcadorCity({
    id_sis_ibge_cidade: data.id_sis_ibge_cidade,
  });

  return prisma.emb_estabelecimentos.update({
    where: {
      id,
    },
    data: {
      ds_nome: data.ds_nome,
      id_emb_ibge_cidade: ensuredCity.id,
    },
  });
};
