import {
  PrismaClient,
  emb_classificacao_carrocerias,
  emb_classificacao_implementos,
  emb_classificacao_veiculos,
} from '@prisma/client';
import { prisma } from '@/services/prisma';
import { getEmbarcadorEmpresa } from '../embarcador-empresa.service';

// Classificacao Veiculos
export const getClassificacaoVeiculos = async (
  empresaId: string,
  { pageSize, page, orderBy, search }: ESTEIRA.PAYLOAD.Paginacao
): Promise<
  ESTEIRA.RESPONSE.Paginada<
    'classificacoes',
    Omit<emb_classificacao_veiculos, 'id_emb_empresas'>
  >
> => {
  const { id: id_emb_empresas } = await getEmbarcadorEmpresa(empresaId);

  const [classificacoes, count] = await prisma.$transaction([
    prisma.emb_classificacao_veiculos.findMany({
      select: {
        id: true,
        ds_classificacao: true,
        fl_carroceria_um_independente: true,
        fl_carroceria_dois_independente: true,
        dt_created: true,
        dt_updated: true,
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
      where: {
        ds_classificacao: search
          ? { contains: search, mode: 'insensitive' }
          : undefined,
        id_emb_empresas,
      },
      orderBy: {
        ds_classificacao: orderBy,
      },
    }),
    prisma.emb_classificacao_veiculos.count({
      where: {
        ds_classificacao: search
          ? { contains: search, mode: 'insensitive' }
          : undefined,
        id_emb_empresas,
      },
    }),
  ]);

  return {
    total: count,
    totalPages: Math.ceil(count / pageSize),
    page: page,
    classificacoes,
  };
};

export const createClassificacaoVeiculos = async (
  empresaId: string,
  data: Omit<
    emb_classificacao_veiculos,
    'id' | 'id_emb_empresas' | 'dt_created' | 'dt_updated'
  >
) => {
  const { id: id_emb_empresas } = await getEmbarcadorEmpresa(empresaId);

  return prisma.emb_classificacao_veiculos.create({
    data: {
      ...data,
      id_emb_empresas,
    },
  });
};

export const updateClassificacaoVeiculos = async (
  id: string,
  data: Omit<
    emb_classificacao_veiculos,
    'id' | 'id_emb_empresas' | 'dt_created' | 'dt_updated'
  >
) => {
  return prisma.emb_classificacao_veiculos.update({
    where: {
      id,
    },
    data,
  });
};

export const deleteClassificacaoVeiculos = async (id: string) => {
  return prisma.emb_classificacao_veiculos.delete({
    where: {
      id,
    },
  });
};

// Classificacao Carrocerias
export const getClassificacaoCarrocerias = async (
  empresaId: string,
  { pageSize, page, orderBy, search }: ESTEIRA.PAYLOAD.Paginacao
): Promise<
  ESTEIRA.RESPONSE.Paginada<
    'carrocerias',
    Omit<emb_classificacao_carrocerias, 'id_emb_empresas'>
  >
> => {
  const { id: id_emb_empresas } = await getEmbarcadorEmpresa(empresaId);

  const [carrocerias, count] = await prisma.$transaction([
    prisma.emb_classificacao_carrocerias.findMany({
      select: {
        id: true,
        ds_classificacao: true,
        dt_created: true,
        dt_updated: true,
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
      where: {
        ds_classificacao: search
          ? { contains: search, mode: 'insensitive' }
          : undefined,
        id_emb_empresas,
      },
      orderBy: {
        ds_classificacao: orderBy,
      },
    }),
    prisma.emb_classificacao_carrocerias.count({
      where: {
        ds_classificacao: search
          ? { contains: search, mode: 'insensitive' }
          : undefined,
        id_emb_empresas,
      },
    }),
  ]);

  return {
    total: count,
    totalPages: Math.ceil(count / pageSize),
    page: page,
    carrocerias,
  };
};

export const createClassificacaoCarrocerias = async (
  empresaId: string,
  data: Omit<
    emb_classificacao_carrocerias,
    'id' | 'id_emb_empresas' | 'dt_created' | 'dt_updated'
  >
) => {
  const { id: id_emb_empresas } = await getEmbarcadorEmpresa(empresaId);

  return prisma.emb_classificacao_carrocerias.create({
    data: {
      ...data,
      id_emb_empresas,
    },
  });
};

export const updateClassificacaoCarrocerias = async (
  empresaId: string,
  id: string,
  data: Omit<
    emb_classificacao_carrocerias,
    'id' | 'id_emb_empresas' | 'dt_created' | 'dt_updated'
  >
) => {
  const { id: id_emb_empresas } = await getEmbarcadorEmpresa(empresaId);

  return prisma.emb_classificacao_carrocerias.update({
    where: {
      id,
    },
    data,
  });
};

export const deleteClassificacaoCarrocerias = async (
  empresaId: string,
  id: string
) => {
  const { id: id_emb_empresas } = await getEmbarcadorEmpresa(empresaId);

  return prisma.emb_classificacao_carrocerias.delete({
    where: {
      id,
    },
  });
};

export const getClassificacaoImplementos = async (
  empresaId: string,
  { pageSize, page, orderBy, search }: ESTEIRA.PAYLOAD.Paginacao
): Promise<
  ESTEIRA.RESPONSE.Paginada<
    'implementos',
    Omit<emb_classificacao_implementos, 'id_emb_empresas'>
  >
> => {
  const { id: id_emb_empresas } = await getEmbarcadorEmpresa(empresaId);

  const [implementos, count] = await prisma.$transaction([
    prisma.emb_classificacao_implementos.findMany({
      select: {
        id: true,
        ds_classificacao: true,
        fl_acrescimo_eixo: true,
        dt_created: true,
        dt_updated: true,
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
      where: {
        ds_classificacao: search
          ? { contains: search, mode: 'insensitive' }
          : undefined,
        id_emb_empresas,
      },
      orderBy: {
        ds_classificacao: orderBy,
      },
    }),
    prisma.emb_classificacao_implementos.count({
      where: {
        ds_classificacao: search
          ? { contains: search, mode: 'insensitive' }
          : undefined,
        id_emb_empresas,
      },
    }),
  ]);

  return {
    total: count,
    totalPages: Math.ceil(count / pageSize),
    page: page,
    implementos,
  };
};

export const createClassificacaoImplementos = async (
  empresaId: string,
  data: Omit<
    emb_classificacao_implementos,
    'id' | 'id_emb_empresas' | 'dt_created' | 'dt_updated'
  >
) => {
  const { id: id_emb_empresas } = await getEmbarcadorEmpresa(empresaId);

  return prisma.emb_classificacao_implementos.create({
    data: {
      ...data,
      id_emb_empresas,
    },
  });
};

export const updateClassificacaoImplementos = async (
  empresaId: string,
  id: string,
  data: Omit<
    emb_classificacao_implementos,
    'id' | 'id_emb_empresas' | 'dt_created' | 'dt_updated'
  >
) => {
  const { id: id_emb_empresas } = await getEmbarcadorEmpresa(empresaId);

  return prisma.emb_classificacao_implementos.update({
    where: {
      id,
    },
    data,
  });
};

export const deleteClassificacaoImplementos = async (
  empresaId: string,
  id: string
) => {
  const { id: id_emb_empresas } = await getEmbarcadorEmpresa(empresaId);

  return prisma.emb_classificacao_implementos.delete({
    where: {
      id,
    },
  });
};
