import { prisma } from '../prisma';
import { getTmsEmpresa } from './tms-empresa.service';

/**
 * Busca todos os embarcadores da empresa TMS (para select/cadastro)
 */
export const getEmbarcadores = async (empresaId: string): Promise<any[]> => {
  const tmsEmpresa = await getTmsEmpresa(empresaId);

  const embarcadores = await prisma.tms_embarcadores.findMany({
    where: { id_tms_empresa: tmsEmpresa.id },
    orderBy: { ds_nome: 'asc' },
    select: {
      id: true,
      ds_nome: true,
      ds_documento: true,
    },
  });

  return embarcadores;
};
