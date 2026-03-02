import { getCachedData } from '@/core/cache';
import { prisma } from '@/services/prisma';

export async function getEmbarcadorEmpresa(empresaId: string) {
  return getCachedData(`embarcador_empresa_${empresaId}`, async () => {
    let empresaEmbarcador = await prisma.emb_empresas.findUnique({
      where: { id_sis_empresas: empresaId },
    });

    if (!empresaEmbarcador) {
      empresaEmbarcador = await prisma.emb_empresas.create({
        data: { id_sis_empresas: empresaId },
      });
    }

    return empresaEmbarcador;
  });
}
