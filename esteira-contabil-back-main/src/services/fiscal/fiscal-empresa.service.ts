import { PrismaClient, fis_empresas } from '@prisma/client';
import { getCachedData } from '../../core/cache';
import { prisma } from '../prisma';

export const getFiscalEmpresa = async (
  empresaId: string
): Promise<fis_empresas> => {
  return getCachedData(`fiscal_empresa_${empresaId}`, async () => {
    let empresaFiscal = await prisma.fis_empresas.findUnique({
      where: { id_sis_empresas: empresaId },
    });

    if (!empresaFiscal) {
      empresaFiscal = await prisma.fis_empresas.create({
        data: { id_sis_empresas: empresaId },
      });
    }

    return empresaFiscal;
  });
};

export const getFiscalEmpresaPorDocumento = async (
  ds_documento: string
): Promise<fis_empresas | null> => {
  return getCachedData(`fiscal_empresa_documento_${ds_documento}`, async () => {
    const empresaFiscal = await prisma.fis_empresas.findFirst({
      where: {
        sis_empresas: {
          ds_documento,
        },
      },
    });
    return empresaFiscal;
  });
};
