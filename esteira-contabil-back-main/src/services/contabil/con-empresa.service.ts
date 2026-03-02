import { con_empresas } from '@prisma/client';
import { getCachedData } from '../../core/cache';
import { prisma } from '../prisma';

export const getConEmpresa = async (
  empresaId: string
): Promise<con_empresas> => {
  return getCachedData(`get_con_empresa_${empresaId}`, async () => {
    let con_empresa = await prisma.con_empresas.findUnique({
      where: { id_sis_empresas: empresaId },
    });
    if (!con_empresa) {
      con_empresa = await prisma.con_empresas.create({
        data: {
          id_sis_empresas: empresaId,
        },
      });
    }
    return con_empresa;
  });
};

export const getEscritorioByConEmpresaId = async (
  empresaId: string
): Promise<any> => {
  return getCachedData(`get_con_escritorio_${empresaId}`, async () => {
    try {
      var idEscritorio = await prisma.sis_empresas.findFirst({
        where: {
          AND: [{ id: empresaId }, { is_escritorio: false }],
        },
        select: { id_escritorio: true },
      });
      if (!idEscritorio) {
        idEscritorio = { id_escritorio: empresaId };
      }
      const idEscritorioCon = await getConEmpresa(idEscritorio.id_escritorio);
      return idEscritorioCon;
    } catch (error: any) {
      console.error('Erro ao buscar escritório:', error);
      throw new Error('Erro ao buscar escritório. Detalhes: ' + error.message);
    }
  });
};
