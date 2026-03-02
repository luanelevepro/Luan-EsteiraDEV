import { prisma } from '../prisma';

/**
 * Busca ou cria empresa TMS
 */
export const getTmsEmpresa = async (empresaId: string): Promise<any> => {
  // Verifica se a empresa existe em sis_empresas
  const sisEmpresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
  });
  if (!sisEmpresa) {
    throw new Error('Empresa não encontrada no sistema');
  }

  let tmsEmpresa = await prisma.tms_empresas.findUnique({
    where: { id_sis_empresas: empresaId },
  });

  if (!tmsEmpresa) {
    tmsEmpresa = await prisma.tms_empresas.create({
      data: { id_sis_empresas: empresaId },
    });
  }

  return tmsEmpresa;
};
