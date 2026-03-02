import { Prisma, TipoDespesa } from '@prisma/client';
import { getConEmpresa } from './con-empresa.service';
import { prisma } from '../prisma';

export const createOrUpdatePlanoContas = async (
  planoContasData: Prisma.con_plano_contasCreateInput[],
  empresaId: string
): Promise<any> => {
  const empresa = await getConEmpresa(empresaId);
  try {
    let resultadoCreate = null;
    let resultadoUpdate: any[] = [];
    const chave = (p: Prisma.con_plano_contasCreateInput) =>
      `${p.ds_nome_cta}-${p.id_externo}`;
    const conditions = planoContasData.map((p) => ({
      id_externo: p.id_externo,
    }));

    const planoContasExistentes = await prisma.con_plano_contas.findMany({
      where: {
        id_con_empresas: empresa.id,
        OR: conditions,
      },
    });
    const existentesMap = new Map<
      string,
      (typeof planoContasExistentes)[number]
    >();
    planoContasExistentes.forEach((reg) => {
      const key = `${reg.ds_nome_cta}-${reg.id_externo}`;
      existentesMap.set(key, reg);
    });
    const novos = planoContasData.filter((p) => !existentesMap.has(chave(p)));
    novos.forEach((n) => {
      (n as Prisma.con_plano_contasUncheckedCreateInput).id_con_empresas =
        empresa.id;
    });

    const atualizar = planoContasData.filter((p) =>
      existentesMap.has(chave(p))
    );
    if (novos.length > 0) {
      resultadoCreate = await prisma.con_plano_contas.createMany({
        data: novos,
        skipDuplicates: true,
      });
    }

    /*
     * Uso de uma função com Chunk para reduzir o tempo de execução em uma transaction
     */
    if (atualizar.length > 0) {
      const CHUNK_SIZE = 500;
      let i = 0;
      while (i < atualizar.length) {
        // Pega um bloco de tamanho CHUNK_SIZE
        const chunk = atualizar.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (c) => {
            const registroExistente = existentesMap.get(chave(c));
            if (!registroExistente) {
              return null;
            }
            const updated = await prisma.con_plano_contas.update({
              where: { id: registroExistente.id },
              data: c,
            });
            resultadoUpdate.push(updated);
          })
        );

        i += CHUNK_SIZE;
      }
    }

    return { create: resultadoCreate, update: resultadoUpdate };
  } catch (error: any) {
    console.error('Erro ao criar ou atualizar plano de contas:', error);
    throw new Error(
      'Erro ao criar ou atualizar plano de contas. Detalhes: ' + error.message
    );
  }
};

export const updatePlanoContasPai = async (empresaId: string): Promise<any> => {
  const idEmpresa = await getConEmpresa(empresaId);
  const result = await prisma.$transaction(
    async (prisma) => {
      const planosContas = await prisma.con_plano_contas.findMany({
        where: {
          AND: [
            { id_con_empresas: idEmpresa.id },
            { ds_classificacao_pai: { not: null } },
          ],
        },
        include: {
          js_con_plano_contas: {
            select: { id: true },
          },
        },
      });
      const updates = await Promise.all(
        planosContas.map(async (p) => {
          const planoPai = await prisma.con_plano_contas.findFirst({
            where: {
              ds_classificacao_cta: p.ds_classificacao_pai,
              id_con_empresas: idEmpresa.id,
            },
            select: { id: true },
          });
          const necessitaAtualizacao = p.id_conta_pai !== planoPai?.id;
          if (planoPai && necessitaAtualizacao) {
            return prisma.con_plano_contas.update({
              where: { id: p.id },
              data: {
                id_conta_pai: planoPai.id,
              },
            });
          } else {
            return null;
          }
        })
      );
      return updates;
    },
    { maxWait: 15000, timeout: 200000 }
  );
  return result;
};

export const getPlanoContasOrdenado = async (
  empresaId: string
): Promise<any> => {
  const idEmpresa = await getConEmpresa(empresaId);
  const rows = await prisma.con_plano_contas.findMany({
    where: { id_con_empresas: idEmpresa.id },
  });

  const itemsById = new Map<string, any>();
  for (const row of rows) {
    itemsById.set(row.id, { ...row, children: [] });
  }

  const roots: any[] = [];
  for (const row of rows) {
    const item = itemsById.get(row.id);

    if (row.id_conta_pai) {
      const pai = itemsById.get(row.id_conta_pai);
      if (pai) {
        pai.children.push(item);
      }
    } else {
      roots.push(item);
    }
  }

  return roots;
};

export const getContasAnaliticasOrdenado = async (
  empresaId: string
): Promise<any> => {
  const idEmpresa = await getConEmpresa(empresaId);
  let whereClause: any = { id_con_empresas: idEmpresa.id, ds_tipo_cta: 'A' };
  let planoContas = await prisma.con_plano_contas.findMany({
    where: whereClause,
    orderBy: { ds_classificacao_cta: 'asc' },
    include: { js_con_grupo_contas: true },
  });

  return planoContas;
};

export const getPlanoContas = async (empresaId: string): Promise<any> => {
  const idEmpresa = await getConEmpresa(empresaId);
  return prisma.con_plano_contas.findMany({
    where: { id_con_empresas: idEmpresa.id },
    include: { js_con_grupo_contas: true },
    orderBy: { ds_classificacao_cta: 'asc' },
  });
};

export const linkPlanoGrupo = async (
  planosParaLink: { id: string }[],
  grupoContaId: string
): Promise<any> => {
  const transaction = await prisma.$transaction(
    async (prisma) => {
      const vinculados = await Promise.all(
        planosParaLink.map(async ({ id }) => {
          const filhos = await prisma.con_plano_contas.findMany({
            where: {
              id_conta_pai: id,
            },
            select: { id: true },
          });
          const idsParaAtualizar = [id, ...filhos.map((f) => f.id)];
          return Promise.all(
            idsParaAtualizar.map((registroId) =>
              prisma.con_plano_contas.update({
                where: { id: registroId },
                data: {
                  js_con_grupo_contas: { connect: { id: grupoContaId } },
                },
              })
            )
          );
        })
      );
      return await Promise.all(vinculados);
    },
    { maxWait: 15000, timeout: 200000 }
  );
  return await Promise.all(transaction);
};

export const getPlanoContasPaginacao = async (
  empresaId: string,
  page: number,
  pageSize: number,
  orderBy: 'asc' | 'desc',
  orderColumn: string,
  search: string,
  status: string | null,
  tipos?: string[] | null
) => {
  const idEmpresa = await getConEmpresa(empresaId);
  let whereClause: any = { id_con_empresas: idEmpresa.id };

  if (status === 'Ativos') {
    whereClause.is_ativo = true;
  } else if (status === 'Inativos') {
    whereClause.is_ativo = false;
  }
  if (search) {
    whereClause.ds_nome_cta = { contains: search, mode: 'insensitive' };
  }

  // Filtra por tipos de despesa do TMS se informado
  if (tipos && Array.isArray(tipos) && tipos.length) {
    whereClause.ds_tipo_tms_despesa = { in: tipos };
  }

  const total = await prisma.con_plano_contas.count({ where: whereClause });
  const totalPages = Math.ceil(total / pageSize);

  const parts = orderColumn.split('.');
  const orderByClause = parts.reduceRight(
    (accumulator: any, key: string) => ({ [key]: accumulator }),
    orderBy
  );

  let planoContas = await prisma.con_plano_contas.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { js_con_grupo_contas: true },
  });

  return {
    total,
    totalPages,
    page,
    pageSize,
    planoContas,
  };
};

export const getContasAnaliticasPaginacao = async (
  empresaId: string,
  page: number,
  pageSize: number,
  orderBy: 'asc' | 'desc',
  orderColumn: string,
  search: string,
  status: string | null
) => {
  const idEmpresa = await getConEmpresa(empresaId);
  let whereClause: any = { id_con_empresas: idEmpresa.id, ds_tipo_cta: 'A' };

  if (status === 'Ativos') {
    whereClause.is_ativo = true;
  } else if (status === 'Inativos') {
    whereClause.is_ativo = false;
  }
  if (search) {
    whereClause.ds_nome_cta = { contains: search, mode: 'insensitive' };
  }

  const total = await prisma.con_plano_contas.count({ where: whereClause });
  const totalPages = Math.ceil(total / pageSize);

  const parts = orderColumn.split('.');
  const orderByClause = parts.reduceRight(
    (accumulator: any, key: string) => ({ [key]: accumulator }),
    orderBy
  );

  let planoContas = await prisma.con_plano_contas.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { js_con_grupo_contas: true },
  });

  return {
    total,
    totalPages,
    page,
    pageSize,
    planoContas,
  };
};

export const setContaTipoDespesa = async (
  contaId: string[],
  tipoDespesa: TipoDespesa | null
): Promise<any> => {
  try {
    const updated = await prisma.con_plano_contas.updateMany({
      where: { id: { in: contaId } },
      data: { ds_tipo_tms_despesa: tipoDespesa },
    });
    return updated;
  } catch (error) {
    console.error('Erro ao atualizar tipo de despesa da conta:', error);
    let errorMessage = 'Erro desconhecido';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(
      'Erro ao atualizar tipo de despesa da conta. Detalhes: ' + errorMessage
    );
  }
};

export const getContasDespesaTmsByEmpresaId = async (empresaId: string) => {
  const idEmpresa = await getConEmpresa(empresaId);
  return await prisma.con_plano_contas.findMany({
    where: {
      id_con_empresas: idEmpresa.id,
      ds_tipo_tms_despesa: { not: null },
    },
  });
};
