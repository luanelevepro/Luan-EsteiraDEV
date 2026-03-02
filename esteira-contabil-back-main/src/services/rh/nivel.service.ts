import { PrismaClient, rh_niveis as Niveis, Prisma } from '@prisma/client';
import { getRhEmpresa } from './rh-empresa.service';
import { getCachedData } from '../../core/cache';
import { prisma } from '../prisma';

// Criar um nível
export const createNivel = async (
  ds_nome: string,
  empresaId: string
): Promise<Niveis> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_niveis.create({
    data: {
      ds_nome,
      is_ativo: true,
      id_rh_empresas: empresa.id,
    },
  });
};

export const createNivelGlobal = async (
  niveisData: Prisma.rh_niveisCreateInput
): Promise<Niveis> => {
  return prisma.rh_niveis.create({
    data: {
      ds_nome: niveisData.ds_nome,
      is_ativo: true,
    },
  });
};

export const getManyNiveis = async (empresaId: string): Promise<Niveis[]> => {
  const empresa = await getRhEmpresa(empresaId);
  const niveisGlobais: string[] = ['Nível 1', 'Nível 2', 'Nível 3'];
  return await prisma.$transaction(async (prisma) => {
    let niveis = await prisma.rh_niveis.findMany({
      where: {
        OR: [{ id_rh_empresas: empresa.id }, { id_rh_empresas: null }],
      },
    });

    const niveisExistentes = niveis.map((nivel) => nivel.ds_nome);
    const niveisParaCriar = niveisGlobais
      .filter((ds_nome) => !niveisExistentes.includes(ds_nome))
      .map((ds_nome) => ({
        ds_nome,
        id_rh_empresas: null,
      }));
    if (niveisParaCriar.length > 0) {
      await prisma.rh_niveis.createMany({ data: niveisParaCriar });
      niveis = await prisma.rh_niveis.findMany({
        where: {
          OR: [{ id_rh_empresas: empresa.id }, { id_rh_empresas: null }],
        },
      });
    }
    return niveis;
  });
};

export const getGlobalNiveis = async (): Promise<Niveis[]> => {
  return getCachedData(`niveis_globais`, async () => {
    const niveisGlobais: string[] = ['Nível 1', 'Nível 2', 'Nível 3'];
    return await prisma.$transaction(async (prisma) => {
      let niveis = await prisma.rh_niveis.findMany({
        where: {
          id_rh_empresas: null,
        },
      });

      const niveisExistentes = niveis.map((nivel) => nivel.ds_nome);
      const niveisParaCriar = niveisGlobais
        .filter((ds_nome) => !niveisExistentes.includes(ds_nome))
        .map((ds_nome) => ({
          ds_nome,
          id_rh_empresas: null,
        }));
      if (niveisParaCriar.length > 0) {
        await prisma.rh_niveis.createMany({ data: niveisParaCriar });
        niveis = await prisma.rh_niveis.findMany({
          where: {
            id_rh_empresas: null,
          },
        });
      }
      return niveis;
    });
  });
};

// Listar nível
export const listNiveis = async (): Promise<Niveis[]> => {
  return prisma.rh_niveis.findMany();
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
export const getNivel = async (id: string): Promise<Niveis | null> => {
  return prisma.rh_niveis.findUnique({
    where: { id },
  });
};

// Atualizar um nível
export const updateNivel = async (
  id: string,
  ds_nome: string
): Promise<Niveis | null> => {
  return prisma.rh_niveis.update({
    where: { id },
    data: {
      ds_nome,
    },
  });
};

// Deletar um nível
export const deleteNivel = async (id: string): Promise<Niveis | null> => {
  return prisma.rh_niveis.delete({
    where: { id },
  });
};

// Listar os cargos de um nível
export const listCargosInNivel = async (id: string): Promise<Niveis | null> => {
  return prisma.rh_niveis.findUnique({
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

// Listar as competências de um nível
export const listCompetenciasInNiveis = async (
  id: string
): Promise<Niveis | null> => {
  return prisma.rh_niveis.findUnique({
    where: { id },
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

export const listNiveisInEmpresa = async (
  empresaId: string
): Promise<Niveis[]> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_niveis.findMany({
    where: {
      id_rh_empresas: empresa.id,
    },
    orderBy: {
      created_at: 'asc',
    },
  });
};

export const listNiveisGerais = async (): Promise<Niveis[]> => {
  return prisma.rh_niveis.findMany({
    where: {
      id_rh_empresas: null,
    },
    orderBy: {
      created_at: 'asc',
    },
  });
};
