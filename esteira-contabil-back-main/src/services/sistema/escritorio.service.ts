import {
  PrismaClient,
  sis_access,
  ModuleType,
  sis_empresas,
} from '@prisma/client';
import { prisma } from '../prisma';

export const getEscritorios = async (): Promise<sis_empresas[]> => {
  return prisma.sis_empresas.findMany({
    where: { is_escritorio: true },
    orderBy: { ds_razao_social: 'asc' },
  });
};

export const getEmpresas = async (): Promise<sis_empresas[]> => {
  return await prisma.sis_empresas.findMany({
    orderBy: { ds_razao_social: 'asc' },
  });
};

export const getEmpresasByEscritorio = async (
  idEscritorio: string
): Promise<sis_empresas[]> => {
  return await prisma.sis_empresas.findMany({
    where: {
      id_escritorio: idEscritorio,
    },
    orderBy: { ds_razao_social: 'asc' },
  });
};

export const createOrUpdateUrl = async (
  idEscritorio: string,
  url: string
): Promise<sis_empresas> => {
  return await prisma.sis_empresas.update({
    where: {
      id: idEscritorio,
      is_escritorio: true,
    },
    data: {
      ds_url: url,
    },
  });
};

export const createOrUpdateKey = async (
  idEmpresa: string,
  key: string
): Promise<sis_empresas> => {
  return await prisma.sis_empresas.update({
    where: {
      id: idEmpresa,
    },
    data: {
      ds_integration_key: key,
    },
  });
};

export const addEmpresaToEscritorio = async (
  escritorioId: string,
  empresaId: string
): Promise<sis_empresas | null> => {
  return await prisma.$transaction(async (tx): Promise<sis_empresas | null> => {
    const escritorio = await tx.sis_empresas.findUnique({
      where: { id: escritorioId, is_escritorio: true },
      include: { js_empresas: true },
    });

    if (!escritorio) {
      throw new Error('Escritório não encontrado');
    }

    const empresa = await tx.sis_empresas.findUnique({
      where: { id: empresaId },
    });

    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    if (empresa.id_escritorio) {
      throw new Error('Empresa já está associada a um escritório');
    }

    if (empresa.is_escritorio) {
      throw new Error(
        'Escritórios não podem ser associados a outros escritórios'
      );
    }

    await tx.sis_empresas.update({
      where: { id: empresaId },
      data: {
        js_escritorio: { connect: { id: escritorioId } },
      },
      include: { js_empresas: true },
    });

    return await tx.sis_empresas.findUnique({
      where: { id: escritorioId },
      include: { js_empresas: true },
    });
  });
};

export const removeEmpresaEscritorio = async (
  escritorioId: string,
  empresaId: string
): Promise<sis_empresas | null> => {
  return await prisma.$transaction(async (tx): Promise<sis_empresas | null> => {
    const escritorio = await tx.sis_empresas.findUnique({
      where: { id: escritorioId, is_escritorio: true },
      include: { js_empresas: true },
    });

    if (!escritorio) {
      throw new Error('Escritório não encontrado');
    }

    const empresa = await tx.sis_empresas.findFirst({
      where: { id: empresaId },
    });

    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    await tx.sis_empresas.update({
      where: { id: empresaId },
      data: {
        js_escritorio: { disconnect: { id: escritorioId } },
      },
      include: { js_empresas: true },
    });

    return await tx.sis_empresas.findUnique({
      where: { id: escritorioId },
      include: { js_empresas: true },
    });
  });
};

const updateModules = async (
  tx: Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
  >,
  id: string,
  newModule: ModuleType
): Promise<sis_access[]> => {
  // Buscar o registro de acesso existente
  const existingAccess = await tx.sis_access.findUnique({
    where: { id_empresas: id },
  });

  if (!existingAccess) {
    // Se não houver registro, criar um novo com o módulo especificado
    await tx.sis_access.create({
      data: {
        id_empresas: id,
        js_modules: [newModule],
      },
    });
  } else {
    // Caso exista, filtrar os módulos antigos e adicionar o novo
    const currentModules = existingAccess.js_modules || [];

    // Remover os módulos antigos (ADM_EMPRESA, ADM_ESCRITORIO, ADM_SISTEMA)
    const updatedModules = [
      ...new Set([
        ...currentModules.filter(
          (module) =>
            ![
              ModuleType.ADM_EMPRESA,
              ModuleType.ADM_ESCRITORIO,
              ModuleType.ADM_SISTEMA,
            ].includes(
              module as 'ADM_SISTEMA' | 'ADM_ESCRITORIO' | 'ADM_EMPRESA'
            )
        ),
        newModule, // Adicionar o novo módulo
      ]),
    ];

    await tx.sis_access.update({
      where: { id_empresas: id },
      data: { js_modules: updatedModules },
    });
  }

  return tx.sis_access.findMany({
    where: { id_empresas: id },
  });
};

export const setAsEscritorio = async (id: string): Promise<sis_access[]> => {
  return await prisma.$transaction(async (tx): Promise<sis_access[]> => {
    const empresa = await tx.sis_empresas.findUnique({
      where: { id: id },
    });

    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    await tx.sis_empresas.update({
      where: { id: id },
      data: { is_escritorio: true },
    });

    // Atualizar os módulos, removendo ADM_EMPRESA, ADM_ESCRITORIO, ADM_SISTEMA e aplicando ADM_ESCRITORIO
    return updateModules(tx, id, ModuleType.ADM_ESCRITORIO);
  });
};

export const setAsEmpresa = async (id: string): Promise<sis_access[]> => {
  return await prisma.$transaction(async (tx): Promise<sis_access[]> => {
    const empresa = await tx.sis_empresas.findUnique({
      where: { id: id },
    });

    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    await tx.sis_empresas.update({
      where: { id: id },
      data: { is_escritorio: false },
    });

    // Atualizar os módulos, removendo ADM_EMPRESA, ADM_ESCRITORIO, ADM_SISTEMA e aplicando ADM_EMPRESA
    return updateModules(tx, id, ModuleType.ADM_EMPRESA);
  });
};

export const setAsSistema = async (id: string): Promise<sis_access[]> => {
  return await prisma.$transaction(async (tx): Promise<sis_access[]> => {
    const empresa = await tx.sis_empresas.findUnique({
      where: { id: id },
    });

    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    return updateModules(tx, id, ModuleType.ADM_SISTEMA);
  });
};
