import { prisma } from '../prisma';

export const getVigenciaByCargo = async (id_cargo: string) => {
  return prisma.rh_cargo_nivel_senioridade_vigencia.findMany({
    where: {
      rh_cargo_nivel_senioridade: {
        id_cargo: id_cargo,
      },
    },
    include: {
      rh_cargo_nivel_senioridade: {
        select: {
          rh_cargo: {
            select: {
              ds_nome: true,
            },
          },
          rh_nivel: {
            select: {
              ds_nome: true,
            },
          },
          rh_senioridade: {
            select: {
              ds_nome: true,
              rh_senioridade_cargo: {
                select: {
                  cd_ordem: true,
                },
              },
            },
          },
        },
      },
    },
  });
};
