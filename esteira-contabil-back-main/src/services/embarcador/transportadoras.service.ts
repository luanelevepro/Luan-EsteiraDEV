import { prisma } from '@/services/prisma';
import { ensureEmbarcadorCity } from './core/embarcador-functions';
import { Prisma } from '@prisma/client';

// // Transportadoras
export const getTransportadoras = async (
  embarcadorEmpresaId: string,
  { pageSize, page, orderBy, search }: ESTEIRA.PAYLOAD.Paginacao
) => {
  const [transportadoras, count] = await prisma.$transaction([
    prisma.emb_transportadoras.findMany({
      select: {
        cd_transportadora: true,
        ds_cnpj: true,
        ds_nome_fantasia: true,
        ds_razao_social: true,
        id_emb_ibge_cidade: true,
        id_emb_ibge_uf: true,
        js_emb_ibge_uf: {
          include: {
            js_sis_ibge_uf: true,
          },
        },
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
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
      where: {
        id_emb_empresas: embarcadorEmpresaId,
        OR: search
          ? [
              { ds_nome_fantasia: { contains: search, mode: 'insensitive' } },
              { ds_cnpj: { contains: search, mode: 'insensitive' } },
              { ds_razao_social: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: {
        ds_nome_fantasia: orderBy,
      },
    }),
    prisma.emb_transportadoras.count({
      where: {
        ds_nome_fantasia: search
          ? { contains: search, mode: 'insensitive' }
          : undefined,
        id_emb_empresas: embarcadorEmpresaId,
      },
    }),
  ]);

  return {
    total: count,
    totalPages: Math.ceil(count / pageSize),
    page: page,
    transportadoras,
  };
};

export const getTransportadora = async (cd_transportadora: string) => {
  return prisma.emb_transportadoras.findFirst({
    where: {
      cd_transportadora,
    },
  });
};

export const createTransportadora = async (
  empresaId: string,
  data: {
    cd_transportadora: string;
    ds_cnpj: string;
    ds_nome_fantasia: string;
    ds_razao_social: string;
    id_emb_ibge_uf: number;
    id_sis_ibge_cidade: number;
  }
) => {
  const ensuredCity = await ensureEmbarcadorCity({
    id_sis_ibge_cidade: data.id_sis_ibge_cidade,
  });

  try {
    return prisma.emb_transportadoras.create({
      data: {
        cd_transportadora: data.cd_transportadora,
        ds_cnpj: data.ds_cnpj,
        ds_nome_fantasia: data.ds_nome_fantasia,
        ds_razao_social: data.ds_razao_social,
        id_emb_ibge_cidade: ensuredCity.id,
        id_emb_ibge_uf: ensuredCity.id_emb_uf,
        id_emb_empresas: empresaId,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      switch (e.code) {
        case 'P2002':
          throw new Error(
            'Um ou mais campos únicos já existem no banco de dados.'
          );
          break;
        case 'P2003':
          throw new Error(
            'Um ou mais campos de chave estrangeira não existem no banco de dados.'
          );
          break;
      }
    }
  }
};

export const updateTransportadora = async (
  originalcd_transportadora: string,
  data: {
    cd_transportadora?: string;
    ds_cnpj?: string;
    ds_nome_fantasia?: string;
    ds_razao_social?: string;
    id_sis_ibge_cidade: number;
    id_emb_ibge_cidade?: number;
  }
) => {
  const ensuredCity = await ensureEmbarcadorCity({
    id_sis_ibge_cidade: data.id_sis_ibge_cidade,
  });

  return prisma.emb_transportadoras.update({
    where: {
      cd_transportadora: originalcd_transportadora,
    },
    data: {
      cd_transportadora: data.cd_transportadora,
      ds_cnpj: data.ds_cnpj,
      ds_nome_fantasia: data.ds_nome_fantasia,
      ds_razao_social: data.ds_razao_social,
      id_emb_ibge_cidade: ensuredCity.id,
      id_emb_ibge_uf: ensuredCity.id_emb_uf,
    },
  });
};

export const deleteTransportadora = async (cd_transportadora: string) => {
  return prisma.emb_transportadoras.delete({
    where: {
      cd_transportadora,
    },
  });
};
