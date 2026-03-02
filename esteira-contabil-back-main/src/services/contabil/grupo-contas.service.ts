import { Prisma, PrismaClient } from '@prisma/client';
import {
  getConEmpresa,
  getEscritorioByConEmpresaId,
} from './con-empresa.service';
import { prisma } from '../prisma';

export const createOrUpdateGrupoContas = async (
  grupoContas: Prisma.con_grupo_contasCreateInput,
  empresaId: string,
  tipoGrupo: string
): Promise<any> => {
  const idEmpresa = await getEscritorioByConEmpresaId(empresaId);
  const { js_con_plano_contas, ...rest } = grupoContas;
  try {
    const exists = await prisma.con_grupo_contas.findFirst({
      where: {
        AND: [
          { ds_classificacao_grupo: grupoContas.ds_classificacao_grupo },
          { id_con_empresas: idEmpresa.id },
        ],
      },
    });
    if (!exists) {
      return await prisma.con_grupo_contas.create({
        data: {
          ...rest,
          con_tipo_grupo: { connect: { id: tipoGrupo } },
          js_con_empresas: { connect: { id: idEmpresa.id } },
          is_ativo: true,
        },
      });
    } else {
      return await prisma.con_grupo_contas.update({
        where: {
          id: exists.id,
        },
        data: {
          ...rest,
          con_tipo_grupo: { connect: { id: tipoGrupo } },
          js_con_empresas: { connect: { id: idEmpresa.id } },
        },
      });
    }
  } catch (error: any) {
    console.error('Erro ao criar ou atualizar plano de contas:', error);
    throw new Error(
      'Erro ao criar ou atualizar plano de contas. Detalhes: ' + error.message
    );
  }
};

export const getGrupoContasByEmpresaId = async (
  empresaId: string
): Promise<any> => {
  const idEmpresa = await getEscritorioByConEmpresaId(empresaId);
  try {
    const grupos = await prisma.con_grupo_contas.findMany({
      where: {
        id_con_empresas: idEmpresa.id,
      },
      select: {
        id: true,
        ds_classificacao_grupo: true,
        ds_nome_grupo: true,
        ds_tipo: true,
        is_ativo: true,
        con_tipo_grupo: {
          select: {
            ds_nome_tipo: true,
          },
        },
        js_con_plano_contas: {
          select: {
            ds_nome_cta: true,
          },
        },
      },
      orderBy: { ds_classificacao_grupo: 'asc' },
    });
    return grupos;
  } catch (error: any) {
    console.error('Erro ao buscar grupo de contas:', error);
    throw new Error(
      'Erro ao buscar grupo de contas. Detalhes: ' + error.message
    );
  }
};

export const deleteGrupoContas = async (grupoId: string): Promise<any> => {
  try {
    return await prisma.con_grupo_contas.delete({
      where: {
        id: grupoId,
      },
    });
  } catch (error: any) {
    console.error('Erro ao deletar grupo de contas:', error);
    throw new Error(
      'Erro ao deletar grupo de contas. Detalhes: ' + error.message
    );
  }
};

export const activateGrupoContas = async (grupoId: string): Promise<any> => {
  try {
    return await prisma.con_grupo_contas.update({
      where: {
        id: grupoId,
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

export const deactivateGrupoContas = async (grupoId: string): Promise<any> => {
  try {
    return await prisma.con_grupo_contas.update({
      where: {
        id: grupoId,
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
