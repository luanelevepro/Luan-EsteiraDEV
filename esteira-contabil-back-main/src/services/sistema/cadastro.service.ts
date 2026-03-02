import { CrtType } from '@prisma/client';
import { prisma } from '../prisma';
// Regimes Tributários
export const getRegimesTributarios = async () => {
  return prisma.sis_regimes_tributarios.findMany({
    orderBy: {
      ds_crt: 'asc',
    },
  });
};

export const getRegimesTributariosById = async (id: string) => {
  return prisma.sis_regimes_tributarios.findUnique({
    where: { id },
  });
};

export const getCrts = async () => {
  return Object.values(CrtType) as CrtType[];
};

export const createRegimeTributario = async (data: any) => {
  return prisma.sis_regimes_tributarios.create({
    data,
  });
};

export const updateRegimeTributario = async (id: string, data: any) => {
  return prisma.sis_regimes_tributarios.update({
    where: { id },
    data,
  });
};

export const deleteRegimeTributario = async (
  id: string,
  paginacao: ESTEIRA.PAYLOAD.Paginacao
) => {
  return prisma.sis_regimes_tributarios.delete({
    where: { id },
  });
};

// Simples Nacional
export const getSimplesNacional = async () => {
  return prisma.sis_simples_nacional.findMany({ orderBy: { ds_nome: 'asc' } });
};

export const createSimplesNacional = async (data: any) => {
  return prisma.sis_simples_nacional.create({
    data: {
      cd_simples: Number(data.cd_simples),
      ds_nome: data.ds_nome,
    },
  });
};

export const deleteSimplesNacional = async (id: string) => {
  return prisma.sis_simples_nacional.delete({
    where: { id },
  });
};

export const updateSimplesNacional = async (
  id: string,
  data: ESTEIRA.PAYLOAD.UpdateSimplesNacional
) => {
  return prisma.sis_simples_nacional.update({
    where: { id },
    data: {
      cd_simples: Number(data.cd_simples),
      ds_nome: data.ds_nome,
    },
  });
};

// Tipos Produto
export const getTiposProduto = async () => {
  return prisma.sis_tipos_produto.findMany({ orderBy: { ds_codigo: 'asc' } });
};

export const createTipoProduto = async (data: any) => {
  return prisma.sis_tipos_produto.create({
    data,
  });
};

export const updateTipoProduto = async (id: string, data: any) => {
  return prisma.sis_tipos_produto.update({
    where: { id },
    data,
  });
};

export const deleteTipoProduto = async (id: string) => {
  return prisma.sis_tipos_produto.delete({
    where: { id },
  });
};

// Tipos Servicos
export const getTiposServico = async () => {
  return prisma.sis_tipos_servicos.findMany({ orderBy: { ds_codigo: 'asc' } });
};

export const createTipoServico = async (data: any) => {
  return prisma.sis_tipos_servicos.createMany({
    data,
  });
};

export const updateTipoServico = async (id: string, data: any) => {
  return prisma.sis_tipos_servicos.update({
    where: { id },
    data,
  });
};

export const deleteTipoServico = async (id: string) => {
  return prisma.sis_tipos_servicos.delete({
    where: { id },
  });
};

// Origem CST
export const getOrigemCST = async () => {
  return prisma.sis_origem_cst.findMany({ orderBy: { ds_codigo: 'asc' } });
};

export const createOrigemCST = async (data: any) => {
  return prisma.sis_origem_cst.create({
    data,
  });
};

export const updateOrigemCST = async (id: string, data: any) => {
  return prisma.sis_origem_cst.update({
    where: { id },
    data,
  });
};

export const deleteOrigemCST = async (id: string) => {
  return prisma.sis_origem_cst.delete({
    where: { id },
  });
};

// CST
export const getCST = async () => {
  return prisma.sis_cst.findMany({ orderBy: { ds_codigo: 'asc' } });
};

export const createCST = async (data: any) => {
  return prisma.sis_cst.create({
    data,
  });
};

export const updateCST = async (id: string, data: any) => {
  return prisma.sis_cst.update({
    where: { id },
    data,
  });
};

export const deleteCST = async (id: string) => {
  return prisma.sis_cst.delete({
    where: { id },
  });
};

// CFOP
export const getCFOP = async (filters?: {
  fl_fit_entrada?: boolean;
  fl_fit_saida?: boolean;
  fl_fit_cte?: boolean;
  fl_fit_nfe?: boolean;
}) => {
  const where: any = {};

  if (filters) {
    if (
      filters.fl_fit_entrada !== undefined &&
      filters.fl_fit_entrada !== null
    ) {
      where.fl_fit_entrada = filters.fl_fit_entrada;
    }
    if (filters.fl_fit_saida !== undefined && filters.fl_fit_saida !== null) {
      where.fl_fit_saida = filters.fl_fit_saida;
    }
    if (filters.fl_fit_cte !== undefined && filters.fl_fit_cte !== null) {
      where.fl_fit_cte = filters.fl_fit_cte;
    }
    if (filters.fl_fit_nfe !== undefined && filters.fl_fit_nfe !== null) {
      where.fl_fit_nfe = filters.fl_fit_nfe;
    }
  }

  return prisma.sis_cfop.findMany({
    where,
    orderBy: { ds_codigo: 'asc' },
  });
};

export const getCFOPPaginacao = async (
  page: number = 1,
  pageSize: number = 50,
  search: string = '',
  filters?: {
    fl_fit_entrada?: boolean;
    fl_fit_saida?: boolean;
    fl_fit_cte?: boolean;
    fl_fit_nfe?: boolean;
  }
) => {
  const where: any = {};

  // Filtro de busca por código ou descrição
  if (search) {
    where.OR = [
      { ds_codigo: { contains: search, mode: 'insensitive' } },
      { ds_descricao: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filtros de fit
  if (filters) {
    if (
      filters.fl_fit_entrada !== undefined &&
      filters.fl_fit_entrada !== null
    ) {
      where.fl_fit_entrada = filters.fl_fit_entrada;
    }
    if (filters.fl_fit_saida !== undefined && filters.fl_fit_saida !== null) {
      where.fl_fit_saida = filters.fl_fit_saida;
    }
    if (filters.fl_fit_cte !== undefined && filters.fl_fit_cte !== null) {
      where.fl_fit_cte = filters.fl_fit_cte;
    }
    if (filters.fl_fit_nfe !== undefined && filters.fl_fit_nfe !== null) {
      where.fl_fit_nfe = filters.fl_fit_nfe;
    }
  }

  const total = await prisma.sis_cfop.count({ where });
  const totalPages = Math.ceil(total / pageSize);

  const cfops = await prisma.sis_cfop.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { ds_codigo: 'asc' },
  });

  return {
    total,
    totalPages,
    page,
    pageSize,
    cfops,
  };
};

export const createCFOP = async (data: any) => {
  return prisma.sis_cfop.create({
    data: {
      ds_descricao: data.ds_descricao,
      ds_codigo: data.ds_codigo,
      fl_fit_entrada: data.fl_fit_entrada ?? false,
      fl_fit_saida: data.fl_fit_saida ?? false,
      fl_fit_cte: data.fl_fit_cte ?? false,
      fl_fit_nfe: data.fl_fit_nfe ?? false,
    },
  });
};

export const updateCFOP = async (id: string, data: any) => {
  return prisma.sis_cfop.update({
    where: { id },
    data: {
      ds_descricao: data.ds_descricao,
      ds_codigo: data.ds_codigo,
      fl_fit_entrada: data.fl_fit_entrada,
      fl_fit_saida: data.fl_fit_saida,
      fl_fit_cte: data.fl_fit_cte,
      fl_fit_nfe: data.fl_fit_nfe,
    },
  });
};

export const deleteCFOP = async (id: string) => {
  return prisma.sis_cfop.delete({
    where: { id },
  });
};
