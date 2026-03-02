import {
  rh_centro_custos as CentroCustos,
  Prisma,
  TipoCentroCustos,
} from '@prisma/client';
import { getRhEmpresa } from './rh-empresa.service';
import { prisma } from '../prisma';
// Criar um Centro de Custos
export const createCentroCustos = async (
  ds_nome: string,
  empresaId: string
): Promise<CentroCustos> => {
  const empresa = await getRhEmpresa(empresaId);

  return prisma.rh_centro_custos.create({
    data: {
      ds_nome,
      id_rh_empresas: empresa.id,
    },
  });
};

// Listar Centros de Custos
export const listCentrosCustos = async (): Promise<CentroCustos[]> => {
  return prisma.rh_centro_custos.findMany({
    orderBy: {
      ds_nome: 'asc',
    },
  });
};

// Obter um Centro de Custos pelo ID
export const getCentroCustos = async (
  id: string
): Promise<CentroCustos | null> => {
  return prisma.rh_centro_custos.findUnique({
    where: { id },
  });
};

// Atualizar um Centro de Custos
export const updateCentroCustos = async (
  id: string,
  ds_nome: string,
  ds_tipo: TipoCentroCustos,
  cd_centro_custos_sintetico: number,
  ds_mascara: string,
  empresaId: string
): Promise<CentroCustos | null> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_centro_custos.update({
    where: { id },
    data: {
      ds_nome,
      ds_tipo,
      cd_centro_custos_sintetico,
      ds_mascara,
      id_rh_empresas: empresa.id,
    },
  });
};

// Deletar um Centro de Custos
export const deleteCentroCustos = async (
  id: string
): Promise<CentroCustos | null> => {
  return prisma.rh_centro_custos.delete({
    where: { id },
  });
};

// Listar Funcionarios em um Centro de Custos
export const listFuncionariosInCentroCustos = async (
  id: string
): Promise<CentroCustos | null> => {
  return prisma.rh_centro_custos.findUnique({
    where: { id },
    include: {
      rh_funcionarios: true,
    },
  });
};

export const createOrUpdateCentroCustos = async (
  centroCustosData: Prisma.rh_centro_custosCreateInput[],
  empresaId: string
): Promise<any> => {
  const empresa = await getRhEmpresa(empresaId);
  try {
    let resultadoCreate = null;
    let resultadoUpdate: any[] = [];
    const result = prisma.$transaction(async (prisma) => {
      const chave = (c: Prisma.rh_centro_custosCreateInput) =>
        `${c.ds_nome}-${c.id_externo}`;

      const orConditions = centroCustosData.map((c) => ({
        ds_nome: c.ds_nome,
        id_externo: c.id_externo,
      }));

      const centrosCustosExistentes = await prisma.rh_centro_custos.findMany({
        where: {
          id_rh_empresas: empresa.id,
          OR: orConditions,
        },
      });

      const existentesMap = new Map<
        string,
        (typeof centrosCustosExistentes)[number]
      >();
      centrosCustosExistentes.forEach((reg) => {
        const key = `${reg.ds_nome}-${reg.id_externo}`;
        existentesMap.set(key, reg);
      });

      const novos = centroCustosData.filter(
        (c) => !existentesMap.has(chave(c))
      );
      const atualizar = centroCustosData.filter((c) =>
        existentesMap.has(chave(c))
      );

      if (novos.length > 0) {
        resultadoCreate = await prisma.rh_centro_custos.createMany({
          data: novos,
          skipDuplicates: true,
        });
      }

      if (atualizar.length > 0) {
        for (const c of atualizar) {
          const registroExistente = existentesMap.get(chave(c));
          if (!registroExistente) {
            continue;
          }
          const mudouNome = registroExistente.ds_nome !== c.ds_nome;
          const mudouTipo = registroExistente.ds_tipo !== c.ds_tipo;
          const mudouNomeEmpresa =
            registroExistente.ds_nome_empresa !== c.ds_nome_empresa;

          const houveMudanca = mudouNome || mudouTipo || mudouNomeEmpresa;

          if (!houveMudanca) {
            console.log(`Sem mudança em: ${registroExistente.ds_nome}`);
            continue;
          }
          console.log(`Atualizando centro de custos: ${c.ds_nome}`);
          await prisma.rh_centro_custos.update({
            where: { id: registroExistente.id },
            data: c,
          });
          resultadoUpdate.push(result);
        }
      }
    });

    return { create: resultadoCreate, update: resultadoUpdate };
  } catch (error: any) {
    console.error('Erro ao criar ou atualizar centro custos:', error);
    throw new Error(
      'Erro ao criar ou atualizar centro custos. Detalhes: ' + error.message
    );
  }
};
