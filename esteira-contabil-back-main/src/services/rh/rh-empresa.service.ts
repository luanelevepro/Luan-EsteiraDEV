import {
  PrismaClient,
  Prisma,
  rh_empresas,
  sis_profiles,
  ModuleType,
} from '@prisma/client';
import { getAccessModules } from '../sistema/core/access-control';
import { getCachedData } from '../../core/cache';
import { prisma } from '../prisma';

export const createRhEmpresa = async (
  empresaId: string
): Promise<rh_empresas> => {
  return prisma.rh_empresas.create({
    data: {
      id_sis_empresas: empresaId,
    },
  });
};

// Listar empresas
export const listRhEmpresas = async (): Promise<rh_empresas[]> => {
  return prisma.rh_empresas.findMany();
};

// obter rh empresa pelo codigo
export const getRhEmpresaById = async (id: string): Promise<rh_empresas[]> => {
  return prisma.rh_empresas.findMany({
    where: {
      id,
    },
  });
};

export const getRhEmpresa = async (empresaId: string): Promise<rh_empresas> => {
  return getCachedData(`get_rh_empresa_${empresaId}`, async () => {
    let rh_empresa = await prisma.rh_empresas.findUnique({
      where: { id_sis_empresas: empresaId },
    });
    if (!rh_empresa) {
      rh_empresa = await prisma.rh_empresas.create({
        data: {
          id_sis_empresas: empresaId,
        },
      });
    }
    return rh_empresa;
  });
};

// obter sis empresa ligada ao rh empresa
export const getSisEmpresa = async (
  empresaId: string
): Promise<rh_empresas[]> => {
  return prisma.rh_empresas.findMany({
    where: {
      id_sis_empresas: empresaId,
    },
  });
};

// Deletar uma empresa
export const deleteRhEmpresa = async (
  id: string
): Promise<rh_empresas | null> => {
  return prisma.rh_empresas.delete({
    where: { id },
  });
};
