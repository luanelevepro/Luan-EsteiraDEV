import { PrismaClient, rh_cargos as Cargos, Prisma } from '@prisma/client';
import { getRhEmpresa } from './rh-empresa.service';
import { getCachedData } from '../../core/cache';
import { prisma } from '../prisma';

// Criar um cargo
export const createCargo = async (
  ds_nome: string,
  is_gerencia_supervisao: boolean,
  empresaId: string
): Promise<Cargos> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_cargos.create({
    data: {
      ds_nome,
      is_gerencia_supervisao,
      is_ativo: true,
      id_rh_empresas: empresa.id,
    },
  });
};

// Listar um cargo
export const listCargos = async (): Promise<Cargos[]> => {
  return prisma.rh_cargos.findMany();
};

// Listar cargos ativos
// export const listCargosAtivos = async (): Promise<Cargos[]> => {
//   return prisma.rh_cargos.findMany({
//     where: {
//       is_ativo: true,
//     },
//   });
// };

// Listar cargos desativos
// export const listCargosDesativos = async (): Promise<Cargos[]> => {
//   return prisma.rh_cargos.findMany({
//     where: {
//       is_ativo: false,
//     },
//   });
// };

// Obter um cargo pelo ID
export const getCargo = async (id: string): Promise<Cargos | null> => {
  return prisma.rh_cargos.findUnique({
    where: { id },
  });
};

// Atualizar um cargo
export const updateCargo = async (
  id: string,
  ds_nome: string,
  is_gerencia_supervisao: boolean
): Promise<Cargos | null> => {
  return prisma.rh_cargos.update({
    where: { id },
    data: {
      ds_nome,
      is_gerencia_supervisao,
    },
  });
};

// Deletar um cargo
export const deleteCargo = async (id: string): Promise<Cargos | null> => {
  return prisma.rh_cargos.delete({
    where: { id },
  });
};

// Ativar um cargo
export const activateCargo = async (id: string): Promise<Cargos | null> => {
  return prisma.rh_cargos.update({
    where: { id },
    data: {
      is_ativo: true,
    },
  });
};

// Desativar um cargo
export const deactivateCargo = async (id: string): Promise<Cargos | null> => {
  return prisma.rh_cargos.update({
    where: { id },
    data: {
      is_ativo: false,
    },
  });
};

// // Listar níveis de um cargo
export const listNiveisInCargo = async (id: string): Promise<Cargos | null> => {
  return prisma.rh_cargos.findUnique({
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

// Listar competências de um cargo
export const listCompetenciasInCargo = async (
  id: string
): Promise<Cargos | null> => {
  return prisma.rh_cargos.findUnique({
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

export const listCargoInEmpresa = async (
  empresaId: string
): Promise<Cargos[]> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_cargos.findMany({
    where: {
      rh_empresas: {
        id: empresa.id,
      },
    },
    include: {
      rh_funcionarios: {
        select: {
          id: true,
          ds_nome: true,
        },
      },
    },
  });
};

export const createOrUpdateCargo = async (
  cargoData: Prisma.rh_cargosCreateInput[],
  empresaId: string
): Promise<any> => {
  try {
    const gerarChave = (c: Prisma.rh_cargosCreateInput) =>
      `${c.ds_nome}-${c.id_externo}`;
    const orConditions = cargoData.map((c) => ({
      ds_nome: c.ds_nome,
      id_externo: c.id_externo,
    }));
    let resultadoCreate = null;
    let resultadoUpdate: any[] = [];
    const result = prisma.$transaction(async (prisma) => {
      const cargosExistentes = await prisma.rh_cargos.findMany({
        where: {
          rh_empresas: { id_sis_empresas: empresaId },
          OR: orConditions,
        },
      });
      const existentesMap = new Map<
        string,
        (typeof cargosExistentes)[number]
      >();
      cargosExistentes.forEach((cargo) => {
        const key = `${cargo.ds_nome}-${cargo.id_externo}`;
        existentesMap.set(key, cargo);
      });
      const novosCargos = cargoData.filter(
        (c) => !existentesMap.has(gerarChave(c))
      );
      const cargosParaAtualizar = cargoData.filter((c) =>
        existentesMap.has(gerarChave(c))
      );

      if (novosCargos.length > 0) {
        resultadoCreate = await prisma.rh_cargos.createMany({
          data: novosCargos,
          skipDuplicates: true,
        });
      }

      if (cargosParaAtualizar.length > 0) {
        for (const c of cargosParaAtualizar) {
          const registroExistente = existentesMap.get(gerarChave(c));
          if (!registroExistente) {
            continue;
          }
          const mudouNome = registroExistente.ds_nome !== c.ds_nome;
          const mudouAtivo = registroExistente.is_ativo !== c.is_ativo;
          const mudouNomeEmpresa =
            registroExistente.ds_nome_empresa !== c.ds_nome_empresa;

          const houveMudanca = mudouNome || mudouAtivo || mudouNomeEmpresa;
          if (!houveMudanca) {
            console.log(`Cargo sem mudança: ${registroExistente.ds_nome}`);
            continue;
          }
          console.log(`Atualizando cargo: ${c.ds_nome}`);
          const update = await prisma.rh_cargos.update({
            where: { id: registroExistente.id },
            data: c,
          });
          resultadoUpdate.push(update);
        }
      }
    });

    return { create: resultadoCreate, update: resultadoUpdate };
  } catch (error: any) {
    console.error('Erro ao criar ou atualizar cargo:', error);
    throw new Error(
      'Erro ao criar ou atualizar cargo. Detalhes: ' + error.message
    );
  }
};
