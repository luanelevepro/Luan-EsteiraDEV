import { getGlobalNiveis } from '../nivel.service';
import { getGlobalSenioridades } from '../senioridade.service';
import { prisma } from '../../prisma';

export const sincronizarCargosNivelSenioridade = async (
  empresaId: string
): Promise<any> => {
  try {
    const empresa = await prisma.rh_empresas.findUnique({
      where: { id_sis_empresas: empresaId },
    });
    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    const cargos = await prisma.rh_cargos.findMany({
      where: {
        OR: [
          { rh_empresas: { id_sis_empresas: empresaId } },
          { id_rh_empresas: null },
        ],
      },
    });

    const niveis = await getGlobalNiveis();

    const senioridades = await getGlobalSenioridades();

    const desiredRelationships: {
      id_cargo: string;
      id_nivel: string;
      id_senioridade: string;
      id_rh_empresas: string;
    }[] = [];

    for (const cargo of cargos) {
      for (const nivel of niveis) {
        for (const senioridade of senioridades) {
          desiredRelationships.push({
            id_cargo: cargo.id,
            id_nivel: nivel.id,
            id_senioridade: senioridade.id,
            id_rh_empresas: empresa.id,
          });
        }
      }
    }

    const gerarChave = (rel: {
      id_cargo: string;
      id_nivel: string;
      id_senioridade: string;
    }) => `${rel.id_cargo}-${rel.id_nivel}-${rel.id_senioridade}`;
    const existingRelationships =
      await prisma.rh_cargo_nivel_senioridade.findMany({
        where: {
          id_cargo: { in: cargos.map((c) => c.id) },
          id_nivel: { in: niveis.map((n) => n.id) },
          id_senioridade: { in: senioridades.map((s) => s.id) },
          id_rh_empresas: empresa.id,
        },
        select: {
          id_cargo: true,
          id_nivel: true,
          id_senioridade: true,
        },
      });

    const existentesSet = new Set(
      existingRelationships.map((rel) => gerarChave(rel))
    );

    const toCreate = desiredRelationships.filter(
      (rel) => !existentesSet.has(gerarChave(rel))
    );

    let createResult = null;
    if (toCreate.length > 0) {
      createResult = await prisma.rh_cargo_nivel_senioridade.createMany({
        data: toCreate,
      });
    }

    return {
      totalDesejado: desiredRelationships.length,
      totalExistente: existingRelationships.length,
      totalCriado: toCreate.length,
      createResult,
    };
  } catch (error: any) {
    console.error(
      'Erro ao sincronizar cargos com níveis e senioridades:',
      error
    );
    throw new Error('Erro ao sincronizar cargos com níveis e senioridades');
  }
};
