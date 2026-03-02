import {
  PrismaClient,
  rh_funcionarios as Funcionarios,
  Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getRhEmpresa } from './rh-empresa.service';
import { getCachedData } from '../../core/cache';
import { prisma } from '../prisma';
// Criar um funcionário
export const createFuncionario = async (
  ds_nome: string,
  ds_salario: Decimal,
  ds_sexo: string,
  empresaId: string
): Promise<Funcionarios> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_funcionarios.create({
    data: {
      ds_nome,
      ds_salario,
      ds_sexo,
      id_rh_empresas: empresa.id,
    },
  });
};

// Listar funcionário
export const listFuncionarios = async (): Promise<Funcionarios[]> => {
  return prisma.rh_funcionarios.findMany({
    orderBy: {
      ds_nome: 'asc',
    },
  });
};

// Obter um funcionário pelo ID
export const getFuncionarios = async (
  id: string
): Promise<Funcionarios | null> => {
  return prisma.rh_funcionarios.findUnique({
    where: { id },
  });
};

// Atualizar um funcionário
export const updateFuncionarios = async (
  id: string,
  ds_nome: string,
  ds_salario: Decimal,
  ds_sexo: string,
  empresaId: string,
  cargoNivelId: string
): Promise<Funcionarios | null> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_funcionarios.update({
    where: { id },
    data: {
      ds_nome,
      ds_salario,
      ds_sexo,
      id_rh_empresas: empresa.id,
      id_cargo_nivel_senioridade: cargoNivelId,
    },
  });
};

// Adicionar um cargo nível a um funcionário
export const addCargoNivelToFuncionario = async (
  cargoNivelId: string,
  funcionarioId: string
): Promise<Funcionarios> => {
  return prisma.rh_funcionarios.update({
    where: { id: funcionarioId },
    data: {
      id_cargo_nivel_senioridade: cargoNivelId,
    },
  });
};

// Deletar um funcionário
export const deleteFuncionarios = async (
  id: string
): Promise<Funcionarios | null> => {
  return prisma.rh_funcionarios.delete({
    where: { id },
  });
};

// Adicionar um funcionário a uma empresa
export const addFuncionarioToEmpresa = async (
  funcionarioId: string,
  empresaId: string
): Promise<Funcionarios> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_funcionarios.update({
    where: { id: funcionarioId },
    data: {
      id_rh_empresas: empresa.id,
    },
  });
};

// Listar funcionarios de uma empresa
export const listFuncionariosInEmpresa = async (
  empresaId: string
): Promise<Funcionarios[]> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_funcionarios.findMany({
    where: {
      rh_empresas: {
        id: empresa.id,
      },
    },
    include: {
      rh_cargo_nivel_senioridade: {
        include: {
          rh_cargo: true,
          rh_nivel: true,
          rh_senioridade: true,
        },
      },
      rh_departamento: {
        select: {
          ds_nome: true,
        },
      },
      rh_centro_custos: {
        select: {
          ds_nome: true,
        },
      },
      rh_cargos: {
        select: {
          ds_nome: true,
        },
      },
    },
    orderBy: {
      ds_nome: 'asc',
    },
  });
};

// Listar funcionarios de um cargo nível
export const listCargoNivelInFuncionario = async (
  id: string
): Promise<Funcionarios[]> => {
  return prisma.rh_funcionarios.findMany({
    where: { id: id },
    include: {
      rh_cargo_nivel_senioridade: {
        include: {
          rh_cargo: true,
          rh_nivel: true,
        },
      },
    },
    orderBy: { ds_nome: 'asc' },
  });
};

// adicionar centros de custos a um funcionário
export const addCentroCustosToFuncionario = async (
  centroCustosId: string,
  funcionarioId: string
): Promise<Funcionarios> => {
  return prisma.rh_funcionarios.update({
    where: { id: funcionarioId },
    data: {
      id_centro_custos: centroCustosId,
    },
  });
};

export const listAvaliacaoInFuncionario = async (id: string) => {
  return prisma.rh_avaliacao_funcionario.findMany({
    where: { id_funcionario: id },
    include: {
      rh_avaliacao_competencia: {
        include: {
          rh_cargo_nivel_competencia: {
            include: {
              rh_competencia: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });
};

export const createOrUpdateFuncionario = async (
  funcionarioData: Prisma.rh_funcionariosCreateInput[],
  empresaId: string
): Promise<any> => {
  try {
    const empresa = await getRhEmpresa(empresaId);
    let resultadoCreate = null;
    let resultadoUpdate = [];
    const result = prisma.$transaction(async (prisma) => {
      const documentos = funcionarioData.map((f) => f.ds_documento);
      const funcionariosExistentes = await prisma.rh_funcionarios.findMany({
        where: {
          ds_documento: { in: documentos },
          id_rh_empresas: empresa.id,
        },
        select: { ds_documento: true, id: true },
      });
      const existentesMap = new Map(
        funcionariosExistentes.map((f) => [f.ds_documento, f.id])
      );

      const novosFuncionarios = funcionarioData.filter(
        (f) => !existentesMap.has(f.ds_documento)
      );
      const funcionariosParaAtualizar = funcionarioData.filter((f) =>
        existentesMap.has(f.ds_documento)
      );

      if (novosFuncionarios.length > 0) {
        resultadoCreate = await prisma.rh_funcionarios.createMany({
          data: novosFuncionarios,
          skipDuplicates: true,
        });
      }

      if (funcionariosParaAtualizar.length > 0) {
        const updatePromises = funcionariosParaAtualizar.map((f) => {
          const id = existentesMap.get(f.ds_documento);
          return prisma.rh_funcionarios.update({
            where: { id },
            data: f,
          });
        });
        resultadoUpdate = await Promise.all(updatePromises);
      }
    });

    return { create: resultadoCreate, update: resultadoUpdate };
  } catch (error: any) {
    console.error('Erro ao criar ou atualizar funcionário:', error);
    throw new Error(
      'Erro ao criar ou atualizar funcionário. Detalhes: ' + error.message
    );
  }
};

export const updateFuncionarioCargo = async (
  cargoId: string
): Promise<(Funcionarios | null)[]> => {
  await new Promise((f) => setTimeout(f, 1000)); // necessário para evitar erro do database, mas talvez em produção não seja necessário
  return prisma.$transaction(async (prisma) => {
    const funcionarios = await prisma.rh_funcionarios.findMany({
      where: { id_cargo: cargoId },
    });

    const cargosNiveis = await prisma.rh_cargo_nivel_senioridade.findMany({
      where: { id_cargo: cargoId },
    });
    const updateFuncionario = funcionarios.map(async (funcionario) => {
      if (funcionario.ds_salario === null) return null;

      const salarioFuncionario =
        typeof funcionario.ds_salario === 'number'
          ? funcionario.ds_salario
          : Number(funcionario.ds_salario);

      const matchingCargoNivel = cargosNiveis.find((registro) => {
        if (
          registro.ds_salario_min === null ||
          registro.ds_salario_max === null
        )
          return false;
        const min = Number(registro.ds_salario_min);
        const max = Number(registro.ds_salario_max);
        return salarioFuncionario >= min && salarioFuncionario <= max;
      });

      if (matchingCargoNivel) {
        return prisma.rh_funcionarios.update({
          where: { id: funcionario.id },
          data: { id_cargo_nivel_senioridade: matchingCargoNivel.id },
        });
      }

      return null;
    });

    const results = await Promise.all(updateFuncionario);
    return results;
  });
};
