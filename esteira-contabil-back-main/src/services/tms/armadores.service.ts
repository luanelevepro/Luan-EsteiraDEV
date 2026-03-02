import { prisma } from '../prisma';

/**
 * Lista todos os armadores (cadastro global)
 */
export const getArmadores = async (): Promise<any[]> => {
  const armadores = await prisma.sis_armadores.findMany({
    orderBy: { ds_nome: 'asc' },
  });
  return armadores;
};

/**
 * Cria um armador (cadastro global)
 */
export const createArmador = async (data: { ds_nome: string }): Promise<any> => {
  const nome = (data.ds_nome || '').trim();
  if (!nome) throw new Error('Nome é obrigatório.');
  const armador = await prisma.sis_armadores.create({
    data: { ds_nome: nome },
  });
  return armador;
};

/**
 * Atualiza um armador
 */
export const updateArmador = async (id: string, data: { ds_nome: string }): Promise<any> => {
  const nome = (data.ds_nome || '').trim();
  if (!nome) throw new Error('Nome é obrigatório.');
  const armador = await prisma.sis_armadores.update({
    where: { id },
    data: { ds_nome: nome },
  });
  return armador;
};

/**
 * Remove um armador (cadastro global). Falha se estiver em uso em tms_cargas_container.
 */
export const deleteArmador = async (id: string): Promise<void> => {
  const emUso = await prisma.tms_cargas_container.count({ where: { id_armador: id } });
  if (emUso > 0) {
    throw new Error('Armador não pode ser excluído pois está vinculado a carga(s) de container.');
  }
  await prisma.sis_armadores.delete({ where: { id } });
};
