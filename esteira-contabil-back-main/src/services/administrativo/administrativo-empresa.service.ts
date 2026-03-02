import { adm_empresas } from '@prisma/client';
import { getCachedData } from '@/core/cache';
import { prisma } from '../prisma';

export const getAdmEmpresa = async (
  empresaId: string
): Promise<adm_empresas> => {
  return getCachedData(`adm_empresa_${empresaId}`, async () => {
    let empresaAdm = await prisma.adm_empresas.findUnique({
      where: { id_sis_empresas: empresaId },
    });

    if (!empresaAdm) {
      empresaAdm = await prisma.adm_empresas.create({
        data: { id_sis_empresas: empresaId },
      });
    }

    return empresaAdm;
  });
};

export const getSisEmpresasByAdmEmpresaList = async (
  admEmpresasIds: string[]
): Promise<{ id: string; ds_fantasia: string }[]> => {
  if (admEmpresasIds.length === 0) return [];

  // 1) Converte ADM → SIS em lote
  const admRows = await prisma.adm_empresas.findMany({
    where: { id: { in: admEmpresasIds } },
    select: { id_sis_empresas: true },
  });

  const sisIds = admRows.map((r) => r.id_sis_empresas);

  // 2) Busca as informações de fantasia em lote
  return prisma.sis_empresas.findMany({
    where: { id: { in: sisIds } },
    select: { id: true, ds_fantasia: true },
  });
};
