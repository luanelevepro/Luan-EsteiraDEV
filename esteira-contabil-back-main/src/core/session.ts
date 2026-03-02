import { sis_profiles } from '@prisma/client';
import { prisma } from '../services/prisma';
import { getCachedData } from './cache';

export const getUsuarioSessao = async (id: string): Promise<sis_profiles> => {
  return getCachedData(`usuario_${id}`, async () => {
    const usuario = await prisma.sis_profiles.findUnique({ where: { id } });

    if (!usuario) {
      throw new Error('Perfil não encontrado.');
    }

    return usuario;
  });
};

export const getEmpresaSessao = async (id: string): Promise<string> => {
  return getCachedData(`empresa_${id}`, async () => {
    const empresa = await prisma.sis_empresas.findUnique({ where: { id } });

    if (!empresa) {
      throw new Error('Empresa não encontrada.');
    }

    return empresa.id;
  });
};
