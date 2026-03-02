import {
  PrismaClient,
  rh_cargo_nivel_senioridade as CargoNivelSenioridade,
  rh_cargos as Cargos,
  Prisma,
  rh_funcionarios as Funcionarios,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getRhEmpresa } from './rh-empresa.service';
import { getCachedData } from '../../core/cache';
import { prisma } from '../prisma';
// Criar uma relação cargo - nível
export const createCargoNivelSenioridade = async (
  cargoId: string,
  nivelId: string,
  senioridadeId: string,
  empresaId: string
): Promise<CargoNivelSenioridade> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_cargo_nivel_senioridade.create({
    data: {
      id_cargo: cargoId,
      id_nivel: nivelId,
      id_senioridade: senioridadeId,
      id_rh_empresas: empresa.id,
    },
  });
};

// Listar relação cargo - nível
export const listCargosNiveisSenioridade = async (): Promise<
  CargoNivelSenioridade[]
> => {
  return prisma.rh_cargo_nivel_senioridade.findMany();
};

// Obter uma relação cargo - nível pelo ID
export const getCargoNivelSenioridade = async (
  id: string
): Promise<CargoNivelSenioridade | null> => {
  return prisma.rh_cargo_nivel_senioridade.findUnique({
    where: { id },
  });
};

// Atualizar uma relação cargo - nível
export const updateCargoNivelSenioridade = async (
  id: string,
  cargoId: string,
  nivelId: string
): Promise<CargoNivelSenioridade | null> => {
  return prisma.rh_cargo_nivel_senioridade.update({
    where: { id },
    data: {
      id_cargo: cargoId,
      id_nivel: nivelId,
    },
  });
};

// Listar funcionarios de uma relação cargo - nível
export const listFuncionariosInCargoNivelSenioridade = async (
  cargoNivelId: string
): Promise<Funcionarios[]> => {
  return prisma.rh_funcionarios.findMany({
    where: {
      rh_cargo_nivel_senioridade: {
        id: cargoNivelId,
      },
    },
  });
};

// Deletar uma relação cargo - nível
export const deleteCargoNivelSenioridade = async (
  id: string
): Promise<CargoNivelSenioridade | null> => {
  return prisma.rh_cargo_nivel_senioridade.delete({
    where: { id },
  });
};

export const getCargoNivelSenioridadeInEmpresa = async (
  empresaId: string
): Promise<
  Array<{
    id: string;
    id_empresa: string | null;
    ds_cargo: string;
    ds_nivel: string;
    ds_senioridade: string;
    displayText: string;
  }>
> => {
  const empresa = await getRhEmpresa(empresaId);
  return prisma.rh_cargo_nivel_senioridade
    .findMany({
      where: { id_rh_empresas: empresa.id },
      orderBy: { rh_cargo: { ds_nome: 'asc' } }, // Ordenação alfabética pelo nome do cargo
      select: {
        id: true,
        rh_empresas: {
          select: {
            id_sis_empresas: true,
            id: true,
          },
        },
        rh_cargo: {
          select: {
            ds_nome: true,
            id_rh_empresas: true,
          },
        },
        rh_nivel: {
          select: {
            ds_nome: true,
            id_rh_empresas: true,
          },
        },
        rh_senioridade: {
          select: {
            ds_nome: true,
            id_rh_empresas: true,
          },
        },
      },
    })
    .then((data) =>
      data.map((rel) => ({
        id: rel.id,
        id_empresa: rel.rh_empresas.id_sis_empresas,
        ds_cargo: rel.rh_cargo?.ds_nome || 'Sem Cargo',
        ds_nivel: rel.rh_nivel?.ds_nome || 'Sem Nível',
        ds_senioridade: rel.rh_senioridade?.ds_nome || 'Sem Senioridade',
        displayText: `${rel.rh_cargo?.ds_nome || 'Sem Cargo'} / ${
          rel.rh_nivel?.ds_nome || 'Sem Nível'
        } / ${rel.rh_senioridade?.ds_nome || 'Sem Senioridade'}`,
      }))
    );
};

export const getCargoNivelSenioridadeById = async (
  cargoId: string
): Promise<CargoNivelSenioridade[]> => {
  return prisma.rh_cargo_nivel_senioridade.findMany({
    where: { id_cargo: cargoId },
    include: {
      rh_cargo: {
        select: {
          ds_nome: true,
        },
      },
      rh_nivel: {
        select: {
          ds_nome: true,
          id_rh_empresas: true,
          rh_nivel_cargo: {
            where: { id_cargo: cargoId },
            select: { cd_ordem: true },
          },
        },
      },
      rh_senioridade: {
        select: {
          ds_nome: true,
          id_rh_empresas: true,
          rh_senioridade_cargo: {
            where: { id_cargo: cargoId },
            select: { cd_ordem: true },
          },
        },
      },
      rh_empresas: {
        select: {
          id: true,
        },
      },
    },
  });
};

export const updateCargoSalarios = async (
  id: string,
  ds_salario_min: number,
  ds_salario_max: number,
  id_cargo: string,
  id_nivel: string,
  id_senioridade: string
): Promise<CargoNivelSenioridade> => {
  return prisma.rh_cargo_nivel_senioridade.update({
    where: { id },
    data: {
      ds_salario_min: new Decimal(ds_salario_min),
      ds_salario_max: new Decimal(ds_salario_max),
    },
  });
};

export async function processCargoItems(cargoId: string, items: any[]) {
  const niveisCreated: any[] = [];
  const niveisUpdated: any[] = [];
  const niveisDeleted: any[] = [];

  const senioridadesCreated: any[] = [];
  const senioridadesUpdated: any[] = [];
  const senioridadesDeleted: any[] = [];

  const salariosCreated: any[] = [];
  const salariosUpdated: any[] = [];
  const salariosDeleted: any[] = [];

  try {
    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const { type } = item;
        if (type === 'nivel') {
          const {
            ds_nome,
            cd_ordem,
            id_rh_empresas,
            delete_nivel: isDelete,
          } = item;

          if (isDelete) {
            const nivel = await tx.rh_niveis.findFirst({
              where: { ds_nome, id_rh_empresas },
            });
            if (!nivel) continue;

            const cargoNivel = await tx.rh_nivel_cargo.findFirst({
              where: {
                id_cargo: cargoId,
                id_nivel: nivel.id,
              },
            });
            if (cargoNivel) {
              niveisDeleted.push(
                await tx.rh_nivel_cargo.delete({
                  where: { id: cargoNivel.id },
                })
              );
              await tx.rh_cargo_nivel_senioridade.deleteMany({
                where: {
                  id_cargo: cargoNivel.id_cargo,
                  id_nivel: cargoNivel.id_nivel,
                },
              });
            }
            const aindaUsado = await tx.rh_nivel_cargo.findFirst({
              where: { id_nivel: nivel.id },
            });
            if (!aindaUsado) {
              await tx.rh_niveis.delete({
                where: { id: nivel.id },
              });
            }
            continue;
          }
          let nivel = await tx.rh_niveis.findFirst({
            where: {
              OR: [
                { ds_nome, id_rh_empresas },
                { ds_nome, id_rh_empresas: null },
              ],
            },
          });
          if (!nivel) {
            nivel = await tx.rh_niveis.create({
              data: {
                ds_nome,
                id_rh_empresas,
                is_ativo: true,
              },
            });
          }

          const cargoNivel = await tx.rh_nivel_cargo.findFirst({
            where: {
              id_cargo: cargoId,
              id_nivel: nivel.id,
            },
          });
          if (cargoNivel) {
            niveisUpdated.push(
              await tx.rh_nivel_cargo.update({
                where: { id: cargoNivel.id },
                data: { cd_ordem },
              })
            );
          } else {
            niveisCreated.push(
              await tx.rh_nivel_cargo.create({
                data: {
                  id_cargo: cargoId,
                  id_nivel: nivel.id,
                  cd_ordem,
                },
              })
            );
          }
        } else if (type === 'senioridade') {
          const {
            ds_nome,
            cd_ordem,
            id_rh_empresas,
            delete_senioridade: isDelete,
          } = item;

          if (isDelete) {
            const senioridade = await tx.rh_senioridade.findFirst({
              where: { ds_nome, id_rh_empresas },
            });
            if (!senioridade) continue;

            const cargoSenioridade = await tx.rh_senioridade_cargo.findFirst({
              where: {
                id_cargo: cargoId,
                id_senioridade: senioridade.id,
              },
            });
            if (cargoSenioridade) {
              senioridadesDeleted.push(
                await tx.rh_senioridade_cargo.delete({
                  where: { id: cargoSenioridade.id },
                })
              );
              await tx.rh_cargo_nivel_senioridade.deleteMany({
                where: {
                  id_cargo: cargoSenioridade.id_cargo,
                  id_senioridade: cargoSenioridade.id_senioridade,
                },
              });
            }
            const aindaUsado = await tx.rh_senioridade_cargo.findFirst({
              where: { id_senioridade: senioridade.id },
            });
            if (!aindaUsado) {
              await tx.rh_senioridade.delete({
                where: { id: senioridade.id },
              });
            }
            continue;
          }
          let senioridade = await tx.rh_senioridade.findFirst({
            where: {
              OR: [
                { ds_nome, id_rh_empresas },
                { ds_nome, id_rh_empresas: null },
              ],
            },
          });
          if (!senioridade) {
            senioridade = await tx.rh_senioridade.create({
              data: {
                ds_nome,
                id_rh_empresas,
                is_ativo: true,
              },
            });
          }

          const cargoSenioridade = await tx.rh_senioridade_cargo.findFirst({
            where: {
              id_cargo: cargoId,
              id_senioridade: senioridade.id,
            },
          });
          if (cargoSenioridade) {
            senioridadesUpdated.push(
              await tx.rh_senioridade_cargo.update({
                where: { id: cargoSenioridade.id },
                data: { cd_ordem },
              })
            );
          } else {
            senioridadesCreated.push(
              await tx.rh_senioridade_cargo.create({
                data: {
                  id_cargo: cargoId,
                  id_senioridade: senioridade.id,
                  cd_ordem,
                },
              })
            );
          }
        } else if (type === 'salario') {
          const {
            id_nivel,
            id_senioridade,
            ds_salario_min,
            ds_salario_max,
            cd_ordem_senioridade,
            delete_salario: isDelete,
            dt_fim,
          } = item;

          const dtFimDate = dt_fim instanceof Date ? dt_fim : new Date(dt_fim);
          const ano = dtFimDate.getFullYear();
          const mes = dtFimDate.getMonth() + 1;

          if (isDelete) {
            const cns = await tx.rh_cargo_nivel_senioridade.findFirst({
              where: {
                id_cargo: cargoId,
                id_nivel,
                id_senioridade,
              },
            });
            if (cns) {
              salariosDeleted.push(
                await tx.rh_cargo_nivel_senioridade.delete({
                  where: { id: cns.id },
                })
              );
            }
            continue;
          }
          const nivel = await tx.rh_niveis.findFirst({
            where: {
              OR: [
                { ds_nome: item.ds_nivel, id_rh_empresas: item.id_rh_empresas },
                { ds_nome: item.ds_nivel, id_rh_empresas: null },
              ],
            },
          });
          const senioridade = await tx.rh_senioridade.findFirst({
            where: {
              OR: [
                {
                  ds_nome: item.ds_senioridade,
                  id_rh_empresas: item.id_rh_empresas,
                },
                { ds_nome: item.ds_senioridade, id_rh_empresas: null },
              ],
            },
          });

          let cns = await tx.rh_cargo_nivel_senioridade.findFirst({
            where: {
              id_cargo: cargoId,
              id_nivel: nivel.id,
              id_senioridade: senioridade.id,
            },
          });
          let cnsVigencia =
            await tx.rh_cargo_nivel_senioridade_vigencia.findFirst({
              where: {
                AND: [
                  { id_cargo_nivel_senioridade: cns.id },
                  {
                    dt_fim: {
                      gte: new Date(ano, mes - 1, 1),
                      lt: new Date(ano, mes, 1),
                    },
                  },
                ],
              },
            });
          if (cns) {
            salariosUpdated.push(
              await tx.rh_cargo_nivel_senioridade.update({
                where: { id: cns.id },
                data: {
                  ds_salario_min: new Decimal(ds_salario_min),
                  ds_salario_max:
                    ds_salario_max !== null
                      ? new Decimal(ds_salario_max)
                      : null,
                  cd_ordem_senioridade,
                },
              })
            );
          } else {
            salariosCreated.push(
              await tx.rh_cargo_nivel_senioridade.create({
                data: {
                  id_cargo: cargoId,
                  id_nivel: nivel.id,
                  id_senioridade: senioridade.id,
                  ds_salario_min: new Decimal(ds_salario_min),
                  ds_salario_max:
                    ds_salario_max !== null
                      ? new Decimal(ds_salario_max)
                      : null,
                  cd_ordem_senioridade,
                  id_rh_empresas: senioridade.id_rh_empresas,
                },
              })
            );
          }
          if (cnsVigencia) {
            await tx.rh_cargo_nivel_senioridade_vigencia.updateMany({
              where: {
                AND: [
                  { id_cargo_nivel_senioridade: cns.id },
                  {
                    dt_fim: {
                      gte: new Date(ano, mes - 1, 1),
                      lt: new Date(ano, mes, 1),
                    },
                  },
                ],
              },
              data: {
                ds_salario_min: new Decimal(ds_salario_min),
                ds_salario_max:
                  ds_salario_max !== null ? new Decimal(ds_salario_max) : null,
              },
            });
          } else {
            await tx.rh_cargo_nivel_senioridade_vigencia.create({
              data: {
                id_cargo_nivel_senioridade: cns.id,
                ds_salario_min: new Decimal(ds_salario_min),
                ds_salario_max:
                  ds_salario_max !== null ? new Decimal(ds_salario_max) : null,
                dt_fim: dt_fim,
              },
            });
          }
        }
      }
      return {
        niveisCreated,
        niveisUpdated,
        niveisDeleted,
        senioridadesCreated,
        senioridadesUpdated,
        senioridadesDeleted,
        salariosCreated,
        salariosUpdated,
        salariosDeleted,
      };
    });

    return result;
  } catch (error) {
    console.error('Erro em processCargoItems:', error);
    throw error;
  }
}
