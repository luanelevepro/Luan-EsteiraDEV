import { Prisma, PrismaClient } from '@prisma/client';
import { getConEmpresa } from './con-empresa.service';
import { prisma } from '../prisma';

export const createTipoGrupo = async (ds_nome_tipo: string): Promise<any> => {
  try {
    return await prisma.con_tipo_grupo.create({
      data: {
        ds_nome_tipo: ds_nome_tipo,
        is_ativo: true,
      },
    });
  } catch (error: any) {
    console.error('Erro ao criar ou atualizar plano de contas:', error);
    throw new Error(
      'Erro ao criar ou atualizar plano de contas. Detalhes: ' + error.message
    );
  }
};

export const getTipoGrupoByEmpresaId = async (): Promise<any> => {
  try {
    const teste = await prisma.con_tipo_grupo.findMany({
      include: {
        js_con_grupo_contas: true,
      },
    });
    return teste;
  } catch (error: any) {
    console.error('Erro ao buscar tipo de grupo de contas:', error);
    throw new Error(
      'Erro ao buscar tipo de grupo de contas. Detalhes: ' + error.message
    );
  }
};

export const deleteTipoGrupo = async (tipoId: string): Promise<any> => {
  try {
    return await prisma.con_tipo_grupo.delete({
      where: {
        id: tipoId,
      },
    });
  } catch (error: any) {
    console.error('Erro ao deletar grupo de contas:', error);
    throw new Error(
      'Erro ao deletar grupo de contas. Detalhes: ' + error.message
    );
  }
};

export const activateTipoGrupo = async (tipoId: string): Promise<any> => {
  try {
    return await prisma.con_tipo_grupo.update({
      where: {
        id: tipoId,
      },
      data: {
        is_ativo: true,
      },
    });
  } catch (error: any) {
    console.error('Erro ao ativar grupo de contas:', error);
    throw new Error(
      'Erro ao ativar grupo de contas. Detalhes: ' + error.message
    );
  }
};

export const deactivateTipoGrupo = async (tipoId: string): Promise<any> => {
  try {
    return await prisma.con_tipo_grupo.update({
      where: {
        id: tipoId,
      },
      data: {
        is_ativo: false,
      },
    });
  } catch (error: any) {
    console.error('Erro ao desativar grupo de contas:', error);
    throw new Error(
      'Erro ao desativar grupo de contas. Detalhes: ' + error.message
    );
  }
};

export const updateTipoGrupo = async (
  tipoId: string,
  ds_nome_tipo: string
): Promise<any> => {
  try {
    return await prisma.con_tipo_grupo.update({
      where: {
        id: tipoId,
      },
      data: {
        ds_nome_tipo: ds_nome_tipo,
      },
    });
  } catch (error: any) {
    console.error('Erro ao criar ou atualizar plano de contas:', error);
    throw new Error(
      'Erro ao criar ou atualizar plano de contas. Detalhes: ' + error.message
    );
  }
};
