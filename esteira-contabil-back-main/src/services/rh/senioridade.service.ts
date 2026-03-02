import {
  PrismaClient,
  rh_senioridade as Senioridade,
  Prisma,
} from '@prisma/client';
import { getRhEmpresa } from './rh-empresa.service';
import { getCachedData } from '../../core/cache';
import { prisma } from '../prisma';

// Criar um nível
export const createSenioridade = async (
  ds_nome: string,
  empresaId: string
): Promise<Senioridade> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_senioridade.create({
    data: {
      ds_nome,
      is_ativo: true,
      id_rh_empresas: empresa.id,
    },
  });
};

export const createSenioridadeGlobal = async (
  senioridadeData: Prisma.rh_senioridadeCreateInput
): Promise<Senioridade> => {
  return prisma.rh_senioridade.create({
    data: {
      ds_nome: senioridadeData.ds_nome,
      is_ativo: true,
    },
  });
};

export const getManySenioridades = async (
  empresaId: string
): Promise<Senioridade[]> => {
  const empresa = await getRhEmpresa(empresaId);
  const senioridadesGlobais: string[] = ['Júnior', 'Pleno', 'Sênior'];
  return await prisma.$transaction(async (prisma) => {
    let senioridades = await prisma.rh_senioridade.findMany({
      where: {
        OR: [{ id_rh_empresas: empresa.id }, { id_rh_empresas: null }],
      },
    });

    const senioridadesExistentes = senioridades.map((s) => s.ds_nome);
    const senioridadesParaCriar = senioridadesGlobais
      .filter((ds_nome) => !senioridadesExistentes.includes(ds_nome))
      .map((ds_nome) => ({ ds_nome, id_rh_empresas: null }));
    if (senioridadesParaCriar.length > 0) {
      await prisma.rh_senioridade.createMany({ data: senioridadesParaCriar });
      senioridades = await prisma.rh_senioridade.findMany({
        where: {
          OR: [{ id_rh_empresas: empresa.id }, { id_rh_empresas: null }],
        },
      });
    }

    return senioridades;
  });
};

export const getGlobalSenioridades = async (): Promise<Senioridade[]> => {
  return getCachedData(`senioridades_globais`, async () => {
    const senioridadesGlobais: string[] = ['Júnior', 'Pleno', 'Sênior'];
    return await prisma.$transaction(async (prisma) => {
      let senioridades = await prisma.rh_senioridade.findMany({
        where: {
          id_rh_empresas: null,
        },
      });

      const senioridadesExistentes = senioridades.map((s) => s.ds_nome);
      const senioridadesParaCriar = senioridadesGlobais
        .filter((ds_nome) => !senioridadesExistentes.includes(ds_nome))
        .map((ds_nome) => ({ ds_nome, id_rh_empresas: null }));
      if (senioridadesParaCriar.length > 0) {
        await prisma.rh_senioridade.createMany({ data: senioridadesParaCriar });
        senioridades = await prisma.rh_senioridade.findMany({
          where: {
            id_rh_empresas: null,
          },
        });
      }

      return senioridades;
    });
  });
};

// Listar nível
export const listSenioridade = async (): Promise<Senioridade[]> => {
  return prisma.rh_senioridade.findMany();
};

// Listar níveis ativos
// export const listNiveisAtivos = async (): Promise<Cargos[]> => {
//   return prisma.rh_cargos.findMany({
//     where: {
//       is_ativo: true,
//     },
//   });
// };

// Listar níveis desativos
// export const listNiveisDesativos = async (): Promise<Cargos[]> => {
//   return prisma.rh_cargos.findMany({
//     where: {
//       is_ativo: false,
//     },
//   });
// };

// Obter um nível pelo ID
export const getSenioridade = async (
  id: string
): Promise<Senioridade | null> => {
  return prisma.rh_senioridade.findUnique({
    where: { id },
  });
};

// Atualizar um nível
export const updateSenioridade = async (
  id: string,
  ds_nome: string
): Promise<Senioridade | null> => {
  return prisma.rh_senioridade.update({
    where: { id },
    data: {
      ds_nome,
    },
  });
};

// Deletar um nível
export const deleteSenioridade = async (
  id: string
): Promise<Senioridade | null> => {
  return prisma.rh_senioridade.delete({
    where: { id },
  });
};

// Listar os cargos de um nível
export const listCargosInSenioridade = async (
  id: string
): Promise<Senioridade | null> => {
  return prisma.rh_senioridade.findUnique({
    where: { id: id },
    include: {
      rh_cargo_nivel_senioridade: {
        include: {
          rh_cargo: true,
        },
      },
    },
  });
};

export const listNiveisInSenioridade = async (
  id: string
): Promise<Senioridade | null> => {
  return prisma.rh_senioridade.findUnique({
    where: { id: id },
    include: {
      rh_cargo_nivel_senioridade: {
        include: {
          rh_nivel: true,
        },
      },
    },
  });
};

// Listar as competências de um nível
export const listCompetenciasInSenioridade = async (
  id: string
): Promise<Senioridade | null> => {
  return prisma.rh_senioridade.findUnique({
    where: { id: id },
    include: {
      rh_cargo_nivel_senioridade: {
        include: {
          rh_cargo_nivel_competencia: {
            include: {
              rh_competencia: true,
            },
          },
        },
      },
    },
  });
};

export const listSenioridadeInEmpresa = async (
  empresaId: string
): Promise<Senioridade[]> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_senioridade.findMany({
    where: {
      id_rh_empresas: empresa.id,
    },
  });
};
