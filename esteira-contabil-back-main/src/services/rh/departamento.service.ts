import {
  PrismaClient,
  rh_departamento as Departamentos,
  Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getRhEmpresa } from './rh-empresa.service';
import { prisma } from '../prisma';
// Criar um departamento
export const createDepartamento = async (
  ds_nome: string,
  empresaId: string
): Promise<Departamentos> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_departamento.create({
    data: {
      ds_nome,
      id_rh_empresas: empresa.id,
    },
  });
};

// Listar departamento
export const listDepartamentos = async (): Promise<Departamentos[]> => {
  return prisma.rh_departamento.findMany({
    orderBy: {
      ds_nome: 'asc',
    },
  });
};

// Obter um departamento pelo ID
export const getDepartamento = async (
  id: string
): Promise<Departamentos | null> => {
  return prisma.rh_departamento.findUnique({
    where: { id },
  });
};

// Atualizar um departamento
export const updateDepartamento = async (
  id: string,
  ds_nome: string,
  empresaId: string
): Promise<Departamentos | null> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_departamento.update({
    where: { id },
    data: {
      ds_nome,
      id_rh_empresas: empresa.id,
    },
  });
};

// Deletar um departamento
export const deleteDepartamento = async (
  id: string
): Promise<Departamentos | null> => {
  return prisma.rh_departamento.delete({
    where: { id },
  });
};

// Listar funcionarios de um departamento
export const listFuncionariosInDepartamento = async (
  id: string
): Promise<Departamentos[]> => {
  return prisma.rh_departamento.findMany({
    where: { id },
    include: {
      rh_funcionarios: true,
    },
    orderBy: {
      ds_nome: 'asc',
    },
  });
};

export const createOrUpdateDepartamento = async (
  departamentoData: Prisma.rh_departamentoCreateInput[],
  empresaId: string
): Promise<any> => {
  try {
    let resultadoCreate = null;
    let resultadoUpdate: any[] = [];
    const result = prisma.$transaction(async (prisma) => {
      const empresa = await getRhEmpresa(empresaId);
      const gerarChave = (d: Prisma.rh_departamentoCreateInput) =>
        `${d.ds_nome}-${d.id_externo}`;
      const condicoesOr = departamentoData.map((d) => ({
        ds_nome: d.ds_nome,
        id_externo: d.id_externo,
      }));

      const departamentosExistentes = await prisma.rh_departamento.findMany({
        where: {
          id_rh_empresas: empresa.id,
          OR: condicoesOr,
        },
      });
      const existentesMap = new Map<
        string,
        (typeof departamentosExistentes)[number]
      >();
      departamentosExistentes.forEach((dep) => {
        const key = `${dep.ds_nome}-${dep.id_externo}`;
        existentesMap.set(key, dep);
      });
      const novosDepartamentos = departamentoData.filter(
        (d) => !existentesMap.has(gerarChave(d))
      );
      const departamentosParaAtualizar = departamentoData.filter((d) =>
        existentesMap.has(gerarChave(d))
      );

      if (novosDepartamentos.length > 0) {
        resultadoCreate = await prisma.rh_departamento.createMany({
          data: novosDepartamentos,
          skipDuplicates: true,
        });
      }

      if (departamentosParaAtualizar.length > 0) {
        for (const d of departamentosParaAtualizar) {
          const registroExistente = existentesMap.get(gerarChave(d));
          if (!registroExistente) {
            continue;
          }
          const mudouNome = registroExistente.ds_nome !== d.ds_nome;
          const mudouEndereco = registroExistente.ds_endereco !== d.ds_endereco;
          const mudouNumero = registroExistente.ds_numero !== d.ds_numero;
          const mudouBairro = registroExistente.ds_bairro !== d.ds_bairro;
          const mudouCidade = registroExistente.ds_cidade !== d.ds_cidade;
          const mudouEstado = registroExistente.ds_estado !== d.ds_estado;
          const mudouCep = registroExistente.cd_cep !== d.cd_cep;
          const mudouNomeEmpresa =
            registroExistente.ds_nome_empresa !== d.ds_nome_empresa;

          const houveMudanca =
            mudouNome ||
            mudouEndereco ||
            mudouNumero ||
            mudouBairro ||
            mudouCidade ||
            mudouEstado ||
            mudouCep ||
            mudouNomeEmpresa;

          if (!houveMudanca) {
            continue;
          }

          await prisma.rh_departamento.update({
            where: { id: registroExistente.id },
            data: d,
          });
          resultadoUpdate.push(result);
        }
      }
    });

    return { create: resultadoCreate, update: resultadoUpdate };
  } catch (error: any) {
    console.error('Erro ao criar ou atualizar departamento:', error);
    throw new Error(
      'Erro ao criar ou atualizar departamento. Detalhes: ' + error.message
    );
  }
};
