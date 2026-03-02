import type { Prisma } from '@prisma/client';
import { getFiscalEmpresa } from '../fiscal/fiscal-empresa.service';
import { prisma } from '../prisma';
import { getTmsEmpresa } from './tms-empresa.service';
import { getProximoNumeroCarga } from './cargas.service';
import { EntregasService } from './entregas.service';
import { cargaInclude } from '../../utils/tms/queries';
import { TMS } from '@/types/tms';
import { TMS_CONSTANTS } from '@/utils/tms/tms-returns';
import FechamentoMotoristasService from './fechamento-motoristas.service';

const viagemInclude = {
  tms_empresas: {
    select: {
      id: true,
      sis_empresas: {
        select: {
          id: true,
          ds_nome: true,
        },
      },
    },
  },
  js_viagens_cargas: {
    include: {
      tms_cargas: {
        include: cargaInclude,
      },
    },
    orderBy: {
      nr_sequencia: 'asc' as const,
    },
  },
} as const;

export const getCustosViagem = async ({ viagemId }: { viagemId: string }) => {
  const custos = await prisma.tms_viagem_despesas.findMany({
    where: { id_viagem: viagemId },
  });
  let totalCustos = 0;
  custos.forEach((c) => {
    if (c.vl_despesa) {
      totalCustos += Number(c.vl_despesa);
    }
  });
  return totalCustos;
}; /**
 * Busca viagens com paginação e filtros
 */
export const getViagensPaginacao = async (
  empresaId: string,
  page: number = 1,
  pageSize: number = 50,
  orderBy: 'asc' | 'desc' = 'asc',
  orderColumn: string = 'cd_viagem',
  search: string = '',
  status?: string | string[],
  month?: number,
  year?: number
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const whereClause: any = {
      id_tms_empresa: tmsEmpresa.id,
    };

    // Filtro por mês/ano (dt_agendada ou dt_created)
    if (
      year !== undefined &&
      year !== null &&
      month !== undefined &&
      month !== null
    ) {
      const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      whereClause.AND = [
        {
          OR: [
            { dt_agendada: { gte: startOfMonth, lte: endOfMonth } },
            {
              AND: [
                { dt_agendada: null },
                { dt_created: { gte: startOfMonth, lte: endOfMonth } },
              ],
            },
          ],
        },
      ];
    }

    // Filtro de status
    let statusArray: string[] = [];
    if (status) {
      if (Array.isArray(status)) {
        statusArray = status;
      } else if (typeof status === 'string') {
        statusArray = status
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
    }

    if (statusArray.length > 0) {
      whereClause.ds_status = { in: statusArray };
    }

    // Filtro de busca (código, motorista, placas)
    if (search) {
      const searchTerm = search.trim();
      whereClause.OR = [
        { cd_viagem: { contains: searchTerm, mode: 'insensitive' } },
        { ds_motorista: { contains: searchTerm, mode: 'insensitive' } },
        { ds_placa_cavalo: { contains: searchTerm, mode: 'insensitive' } },
        { ds_placa_carreta_1: { contains: searchTerm, mode: 'insensitive' } },
        { ds_placa_carreta_2: { contains: searchTerm, mode: 'insensitive' } },
        { ds_placa_carreta_3: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Construir orderBy clause
    let orderByClause: any = {};
    switch (orderColumn) {
      case 'cd_viagem':
        orderByClause = { cd_viagem: orderBy };
        break;
      case 'ds_motorista':
        orderByClause = { ds_motorista: orderBy };
        break;
      case 'ds_status':
        orderByClause = { ds_status: orderBy };
        break;
      case 'dt_created':
        orderByClause = { dt_created: orderBy };
        break;
      case 'dt_agendada':
        orderByClause = { dt_agendada: orderBy };
        break;
      case 'dt_conclusao':
        orderByClause = { dt_conclusao: orderBy };
        break;
      default:
        orderByClause = { cd_viagem: orderBy };
    }

    const total = await prisma.tms_viagens.count({ where: whereClause });
    const totalPages = Math.ceil(total / pageSize);

    const viagens = await prisma.tms_viagens.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: orderByClause,
      include: viagemInclude,
    });

    const allIds = await prisma.tms_viagens.findMany({
      where: whereClause,
      select: { id: true },
    });

    // Anexar ds_custo_total para cada viagem
    const viagensWithCosts = await Promise.all(
      viagens.map(async (v: any) => {
        try {
          const custo = await getCustosViagem({ viagemId: v.id });
          return { ...v, ds_custo_total: custo };
        } catch (e) {
          return { ...v, ds_custo_total: 0 };
        }
      })
    );

    return {
      total,
      totalPages,
      page,
      pageSize,
      viagens: viagensWithCosts,
      allIds: allIds.map((v) => v.id),
    };
  } catch (error: any) {
    console.error('Erro ao buscar viagens paginadas:', error);
    throw new Error(`Erro ao buscar viagens paginadas: ${error.message}`);
  }
};

/**
 * Busca todas as viagens da empresa
 */
export const getViagens = async (empresaId: string): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const viagens = await prisma.tms_viagens.findMany({
      where: { id_tms_empresa: tmsEmpresa.id },
      orderBy: { cd_viagem: 'asc' },
      include: viagemInclude,
    });

    // Anexar ds_custo_total para cada viagem
    const viagensWithCosts = await Promise.all(
      viagens.map(async (v: any) => {
        try {
          const custo = await getCustosViagem({ viagemId: v.id });
          return { ...v, ds_custo_total: custo };
        } catch (e) {
          return { ...v, ds_custo_total: 0 };
        }
      })
    );

    return viagensWithCosts;
  } catch (error: any) {
    console.error('Erro ao buscar viagens:', error);
    throw new Error(`Erro ao buscar viagens: ${error.message}`);
  }
};

/**
 * Busca uma viagem por ID
 */
export const getViagemById = async (
  empresaId: string,
  id: string
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const viagem = await prisma.tms_viagens.findFirst({
      where: {
        id,
        id_tms_empresa: tmsEmpresa.id,
      },
      include: viagemInclude,
    });

    if (!viagem) {
      throw new Error('Viagem não encontrada');
    }

    try {
      const custo = await getCustosViagem({ viagemId: viagem.id });
      (viagem as any).ds_custo_total = custo;
    } catch (e) {
      (viagem as any).ds_custo_total = 0;
    }

    return viagem;
  } catch (error: any) {
    console.error('Erro ao buscar viagem:', error);
    throw new Error(`Erro ao buscar viagem: ${error.message}`);
  }
};

/**
 * Obtém o próximo número sequencial de cd_viagem para a empresa (por id_tms_empresa).
 * Considera apenas códigos numéricos existentes; códigos legados não numéricos são ignorados.
 */
const getNextCdViagemSequencial = async (
  tx: Prisma.TransactionClient,
  idTmsEmpresa: string
): Promise<number> => {
  const viagens = await tx.tms_viagens.findMany({
    where: { id_tms_empresa: idTmsEmpresa },
    select: { cd_viagem: true },
  });
  let max = 0;
  for (const v of viagens) {
    const n = parseInt(v.cd_viagem, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return max + 1;
};

/**
 * Cria uma nova viagem.
 * O código da viagem (cd_viagem) é gerado automaticamente como sequencial por empresa (1, 2, 3, ...).
 */
export const createViagem = async (
  empresaId: string,
  data: {
    cd_viagem?: string; // opcional; se não enviado, é gerado sequencial por empresa
    ds_motorista: string;
    ds_placa_cavalo: string;
    ds_placa_carreta_1?: string;
    ds_placa_carreta_2?: string;
    ds_placa_carreta_3?: string;
    dt_agendada?: Date | string;
    dt_previsao_retorno?: Date | string;
    ds_status?: string;
    id_motorista_veiculo?: string;
  }
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    if (!data.ds_motorista) {
      throw new Error('Motorista é obrigatório');
    }

    if (!data.ds_placa_cavalo) {
      throw new Error('Placa do cavalo mecânico é obrigatória');
    }

    const viagem = await prisma.$transaction(async (tx) => {
      const cdViagemInformado = data.cd_viagem?.trim();
      let cd_viagem: string;
      if (cdViagemInformado) {
        const existente = await tx.tms_viagens.findFirst({
          where: {
            id_tms_empresa: tmsEmpresa.id,
            cd_viagem: cdViagemInformado,
          },
        });
        if (existente) {
          throw new Error(
            `Já existe uma viagem com o código "${cdViagemInformado}" nesta empresa.`
          );
        }
        cd_viagem = cdViagemInformado;
      } else {
        const nextSeq = await getNextCdViagemSequencial(tx, tmsEmpresa.id);
        cd_viagem = String(nextSeq);
      }

      return tx.tms_viagens.create({
        data: {
          cd_viagem,
          ds_motorista: data.ds_motorista,
          ds_placa_cavalo: data.ds_placa_cavalo,
          ds_placa_carreta_1: data.ds_placa_carreta_1 ?? undefined,
          ds_placa_carreta_2: data.ds_placa_carreta_2 ?? undefined,
          ds_placa_carreta_3: data.ds_placa_carreta_3 ?? undefined,
          dt_agendada: data.dt_agendada
            ? typeof data.dt_agendada === 'string'
              ? new Date(data.dt_agendada)
              : data.dt_agendada
            : undefined,
          dt_previsao_retorno: data.dt_previsao_retorno
            ? typeof data.dt_previsao_retorno === 'string'
              ? new Date(data.dt_previsao_retorno)
              : data.dt_previsao_retorno
            : undefined,
          ds_status: (data.ds_status as any) ?? 'PLANEJADA',
          id_tms_empresa: tmsEmpresa.id,
          id_motorista_veiculo: data.id_motorista_veiculo ?? undefined,
        },
        include: viagemInclude,
      });
    });

    try {
      const custo = await getCustosViagem({ viagemId: viagem.id });
      (viagem as any).ds_custo_total = custo;
    } catch (e) {
      (viagem as any).ds_custo_total = 0;
    }

    return viagem;
  } catch (error: any) {
    console.error('Erro ao criar viagem:', error);
    throw new Error(`Erro ao criar viagem: ${error.message}`);
  }
};

/**
 * Atualiza uma viagem
 */
export const updateViagem = async (
  empresaId: string,
  id: string,
  data: {
    cd_viagem?: string;
    ds_motorista?: string;
    ds_placa_cavalo?: string;
    ds_placa_carreta_1?: string | null;
    ds_placa_carreta_2?: string | null;
    ds_placa_carreta_3?: string | null;
    dt_agendada?: Date | string | null;
    dt_previsao_retorno?: Date | string | null;
    ds_status?: string;
    id_motorista_veiculo?: string | null;
  }
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const viagem = await prisma.tms_viagens.findFirst({
      where: {
        id,
        id_tms_empresa: tmsEmpresa.id,
      },
    });

    if (!viagem) {
      throw new Error('Viagem não encontrada');
    }

    // cd_viagem é sequencial por empresa e não é alterável na edição
    const updateData: any = {
      ds_motorista: data.ds_motorista ?? undefined,
      ds_placa_cavalo: data.ds_placa_cavalo ?? undefined,
      ds_placa_carreta_1:
        data.ds_placa_carreta_1 !== undefined
          ? data.ds_placa_carreta_1
          : undefined,
      ds_placa_carreta_2:
        data.ds_placa_carreta_2 !== undefined
          ? data.ds_placa_carreta_2
          : undefined,
      ds_placa_carreta_3:
        data.ds_placa_carreta_3 !== undefined
          ? data.ds_placa_carreta_3
          : undefined,
      dt_agendada:
        data.dt_agendada === null
          ? null
          : data.dt_agendada
            ? typeof data.dt_agendada === 'string'
              ? new Date(data.dt_agendada)
              : data.dt_agendada
            : undefined,
      dt_previsao_retorno:
        data.dt_previsao_retorno === null
          ? null
          : data.dt_previsao_retorno
            ? typeof data.dt_previsao_retorno === 'string'
              ? new Date(data.dt_previsao_retorno)
              : data.dt_previsao_retorno
            : undefined,
      ds_status: (data.ds_status as any) ?? undefined,
      id_motorista_veiculo:
        data.id_motorista_veiculo !== undefined
          ? data.id_motorista_veiculo
          : undefined,
    };

    // Se status mudar para CONCLUIDA, registra a data/hora
    if (data.ds_status === 'CONCLUIDA' && viagem.ds_status !== 'CONCLUIDA') {
      updateData.dt_conclusao = new Date();
    }

    const viagemAtualizada = await prisma.tms_viagens.update({
      where: { id },
      data: updateData,
      include: viagemInclude,
    });

    // Propagar id_motorista_veiculo para todas as cargas vinculadas à viagem (fechamento depende disso)
    if (data.id_motorista_veiculo !== undefined) {
      const valor = data.id_motorista_veiculo ?? null;
      const links = await prisma.tms_viagens_cargas.findMany({
        where: { id_viagem: id },
        select: { id_carga: true },
      });
      if (links.length > 0) {
        await prisma.tms_cargas.updateMany({
          where: { id: { in: links.map((l) => l.id_carga) } },
          data: { id_motorista_veiculo: valor },
        });
      }
    }

    try {
      const custo = await getCustosViagem({ viagemId: viagemAtualizada.id });
      (viagemAtualizada as any).ds_custo_total = custo;
    } catch (e) {
      (viagemAtualizada as any).ds_custo_total = 0;
    }

    // Se viagem foi concluída, atualizar fechamento automaticamente
    if (
      viagemAtualizada.ds_status === 'CONCLUIDA' &&
      viagem.ds_status !== 'CONCLUIDA'
    ) {
      try {
        const fechamentoService = new FechamentoMotoristasService();
        await fechamentoService.atualizarFechamentoComViagem({
          empresaId,
          viagemId: viagemAtualizada.id,
        });
      } catch (e) {
        // Log erro mas não quebrar o fluxo de conclusão da viagem
        console.error('Erro ao atualizar fechamento:', e);
      }
    }

    return viagemAtualizada;
  } catch (error: any) {
    console.error('Erro ao atualizar viagem:', error);
    throw new Error(`Erro ao atualizar viagem: ${error.message}`);
  }
};

/**
 * Atualiza o status de uma viagem.
 * REGRA: Sincroniza a carga ativa (primeira não ENTREGUE) com o status da viagem apenas para:
 *   PLANEJADA → PENDENTE, EM_COLETA → EM_COLETA, CONCLUIDA → ENTREGUE.
 * Carga/deslocamento só vão para EM_TRANSITO quando o usuário acionar o botão (Finalizar coleta / Iniciar rota);
 * não há atualização automática para EM_TRANSITO aqui.
 */
export const updateViagemStatus = async (
  empresaId: string,
  id: string,
  ds_status: string
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const viagem = await prisma.tms_viagens.findFirst({
      where: {
        id,
        id_tms_empresa: tmsEmpresa.id,
      },
      include: {
        js_viagens_cargas: {
          include: {
            tms_cargas: true,
          },
          orderBy: {
            nr_sequencia: 'asc',
          },
        },
      },
    });

    if (!viagem) {
      throw new Error('Viagem não encontrada');
    }

    const updateData: any = {
      ds_status: ds_status as any,
    };

    // Se status mudar para CONCLUIDA, registra a data/hora
    if (ds_status === 'CONCLUIDA' && viagem.ds_status !== 'CONCLUIDA') {
      updateData.dt_conclusao = new Date();
    }

    // Atualizar status da viagem
    const viagemAtualizada = await prisma.tms_viagens.update({
      where: { id },
      data: updateData,
      include: viagemInclude,
    });

    // Se viagem foi concluída, atualizar fechamento automaticamente
    if (
      viagemAtualizada.ds_status === 'CONCLUIDA' &&
      viagem.ds_status !== 'CONCLUIDA'
    ) {
      try {
        const fechamentoService = new FechamentoMotoristasService();
        await fechamentoService.atualizarFechamentoComViagem({
          empresaId,
          viagemId: viagemAtualizada.id,
        });
      } catch (e) {
        // Log erro mas não quebrar o fluxo de conclusão da viagem
        console.error('Erro ao atualizar fechamento:', e);
      }
    }

    // REGRA: Sempre sincronizar a carga ativa (primeira não ENTREGUE) com o status da viagem (uma ou múltiplas cargas)
    if (viagem.js_viagens_cargas.length >= 1) {
      let foundCargaWithoutEntregue = false;
      let count = 0;
      do {
        if (
          viagem.js_viagens_cargas[count].tms_cargas.ds_status !== 'ENTREGUE'
        ) {
          foundCargaWithoutEntregue = true;
        } else count++;
      } while (
        !foundCargaWithoutEntregue &&
        count < viagem.js_viagens_cargas.length
      );
      const cargaAtual = viagem.js_viagens_cargas[count];

      if (cargaAtual) {
        // Mapear status da viagem para status da carga
        // EM_VIAGEM → EM_TRANSITO só se a coleta da carga já foi concluída; senão não altera (evita mostrar "Em trânsito" com "Iniciar coleta" disponível)
        let statusCarga: string | null = null;
        switch (ds_status) {
          case 'PLANEJADA':
            statusCarga = 'PENDENTE';
            break;
          case 'EM_COLETA':
            statusCarga = 'EM_COLETA';
            break;
          case 'EM_VIAGEM': {
            const coletaConcluida =
              cargaAtual.tms_cargas.ds_status_coleta === 'CONCLUIDO';
            if (coletaConcluida) statusCarga = 'EM_TRANSITO';
            break;
          }
          case 'CONCLUIDA':
            statusCarga = 'ENTREGUE';
            break;
          default:
            statusCarga = null;
        }

        if (statusCarga && cargaAtual.tms_cargas.ds_status !== statusCarga) {
          await prisma.tms_cargas.update({
            where: { id: cargaAtual.id_carga },
            data: { ds_status: statusCarga as any },
          });
        }
      }
    }

    return viagemAtualizada;
  } catch (error: any) {
    console.error('Erro ao atualizar status da viagem:', error);
    throw new Error(`Erro ao atualizar status da viagem: ${error.message}`);
  }
};

/**
 * Deleta uma viagem
 */
export const deleteViagem = async (
  empresaId: string,
  id: string
): Promise<void> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const viagem = await prisma.tms_viagens.findFirst({
      where: {
        id,
        id_tms_empresa: tmsEmpresa.id,
      },
    });

    if (!viagem) {
      throw new Error('Viagem não encontrada');
    }

    // Deleta a viagem (as cargas são deletadas em cascata via relação N:N)
    await prisma.tms_viagens.delete({
      where: { id },
    });
  } catch (error: any) {
    console.error('Erro ao deletar viagem:', error);
    throw new Error(`Erro ao deletar viagem: ${error.message}`);
  }
};

/**
 * Vincula uma carga à viagem com sequência.
 * Opcionalmente recebe id_motorista_veiculo para preencher na viagem (e propagar à carga) quando a viagem ainda não tiver.
 */
export const vincularCargaAViagem = async (
  empresaId: string,
  idViagem: string,
  idCarga: string,
  nrSequencia: number,
  options?: { id_motorista_veiculo?: string | null }
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    // Validar que viagem pertence à empresa
    let viagem = await prisma.tms_viagens.findFirst({
      where: {
        id: idViagem,
        id_tms_empresa: tmsEmpresa.id,
      },
    });

    if (!viagem) {
      throw new Error('Viagem não encontrada');
    }

    // Se foi informado id_motorista_veiculo e a viagem não tem (ou é diferente), atualizar viagem e cargas vinculadas
    if (options?.id_motorista_veiculo !== undefined) {
      const novoId = options.id_motorista_veiculo ?? null;
      await prisma.tms_viagens.update({
        where: { id: idViagem },
        data: { id_motorista_veiculo: novoId },
      });
      const links = await prisma.tms_viagens_cargas.findMany({
        where: { id_viagem: idViagem },
        select: { id_carga: true },
      });
      if (links.length > 0) {
        await prisma.tms_cargas.updateMany({
          where: { id: { in: links.map((l) => l.id_carga) } },
          data: { id_motorista_veiculo: novoId },
        });
      }
      viagem = (await prisma.tms_viagens.findFirst({
        where: { id: idViagem, id_tms_empresa: tmsEmpresa.id },
      })) as typeof viagem;
    }

    // Validar que carga existe
    const carga = await prisma.tms_cargas.findUnique({
      where: { id: idCarga },
    });

    if (!carga) {
      throw new Error('Carga não encontrada');
    }

    // Ajusta sequência para sempre entrar após a maior já existente
    const { _max } = await prisma.tms_viagens_cargas.aggregate({
      where: { id_viagem: idViagem },
      _max: { nr_sequencia: true },
    });
    const sequenciaAjustada =
      _max.nr_sequencia != null && _max.nr_sequencia >= nrSequencia
        ? _max.nr_sequencia + 1
        : nrSequencia;

    // Vincular carga à viagem (esteira: primeiro item DISPONIVEL, demais BLOQUEADO)
    const dsStatusItem = _max.nr_sequencia == null ? 'DISPONIVEL' : 'BLOQUEADO';
    const vinculo = await prisma.tms_viagens_cargas.create({
      data: {
        id_viagem: idViagem,
        id_carga: idCarga,
        nr_sequencia: sequenciaAjustada,
        ds_status: dsStatusItem as any,
      },
      select: {
        id: true,
        id_viagem: true,
        id_carga: true,
        nr_sequencia: true,
        dt_vinculacao: true,
        tms_cargas: {
          select: {
            id: true,
            cd_carga: true,
          },
        },
      },
    });

    // Atualizar carga: motorista/veículo (da viagem ou do options) e, se viagem PLANEJADA e carga PENDENTE (não desloc. vazio), normalizar para AGENDADA
    const isDeslocamentoVazio = carga.fl_deslocamento_vazio === true;
    const updates: { id_motorista_veiculo?: string; ds_status?: string } = {};
    const idMotoristaVeiculo =
      viagem.id_motorista_veiculo ?? options?.id_motorista_veiculo ?? undefined;
    if (idMotoristaVeiculo) {
      updates.id_motorista_veiculo = idMotoristaVeiculo;
    }
    if (
      viagem.ds_status === 'PLANEJADA' &&
      !isDeslocamentoVazio &&
      carga.ds_status === 'PENDENTE'
    ) {
      updates.ds_status = 'AGENDADA';
    }
    if (Object.keys(updates).length > 0) {
      await prisma.tms_cargas.update({
        where: { id: idCarga },
        data: updates as any,
      });
    }

    return vinculo;
  } catch (error: any) {
    console.error('Erro ao vincular carga à viagem:', error);
    throw new Error(`Erro ao vincular carga à viagem: ${error.message}`);
  }
};

/**
 * Remove uma carga da viagem
 */
export const removerCargaDaViagem = async (
  empresaId: string,
  idViagem: string,
  idCarga: string
): Promise<void> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    // Validar que viagem pertence à empresa
    const viagem = await prisma.tms_viagens.findFirst({
      where: {
        id: idViagem,
        id_tms_empresa: tmsEmpresa.id,
      },
    });

    if (!viagem) {
      throw new Error('Viagem não encontrada');
    }

    // Remover vinculo
    await prisma.tms_viagens_cargas.deleteMany({
      where: {
        id_viagem: idViagem,
        id_carga: idCarga,
      },
    });
  } catch (error: any) {
    console.error('Erro ao remover carga da viagem:', error);
    throw new Error(`Erro ao remover carga da viagem: ${error.message}`);
  }
};

/**
 * Reordena as cargas de uma viagem.
 * Após atualizar nr_sequencia, recalcula ds_status: primeiro item DISPONIVEL, demais BLOQUEADO.
 * Itens EM_DESLOCAMENTO ou CONCLUIDO não são alterados.
 */
export const reordenarCargasViagem = async (
  empresaId: string,
  idViagem: string,
  cargas: Array<{ id_carga: string; nr_sequencia: number }>
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    await prisma.$transaction(async (tx) => {
      // Validar que viagem pertence à empresa
      const viagem = await tx.tms_viagens.findFirst({
        where: {
          id: idViagem,
          id_tms_empresa: tmsEmpresa.id,
        },
      });

      if (!viagem) {
        throw new Error('Viagem não encontrada');
      }

      // Atualizar sequências
      const updatePromises = cargas.map((carga) =>
        tx.tms_viagens_cargas.updateMany({
          where: {
            id_viagem: idViagem,
            id_carga: carga.id_carga,
          },
          data: {
            nr_sequencia: carga.nr_sequencia,
          },
        })
      );

      await Promise.all(updatePromises);

      // Recalcular ds_status: primeiro item DISPONIVEL, demais BLOQUEADO
      const itens = await tx.tms_viagens_cargas.findMany({
        where: { id_viagem: idViagem },
        orderBy: { nr_sequencia: 'asc' },
        select: { id: true, ds_status: true },
      });

      let primeiroMutavelEncontrado = false;
      for (const item of itens) {
        const status = item.ds_status ?? 'BLOQUEADO';
        if (status === 'EM_DESLOCAMENTO' || status === 'CONCLUIDO') {
          continue;
        }
        const novoStatus = !primeiroMutavelEncontrado
          ? 'DISPONIVEL'
          : 'BLOQUEADO';
        primeiroMutavelEncontrado = true;
        if (status !== novoStatus) {
          await tx.tms_viagens_cargas.update({
            where: { id: item.id },
            data: { ds_status: novoStatus },
          });
        }
      }
    });

    // Retornar viagem atualizada
    return getViagemById(empresaId, idViagem);
  } catch (error: any) {
    console.error('Erro ao reordenar cargas da viagem:', error);
    throw new Error(`Erro ao reordenar cargas da viagem: ${error.message}`);
  }
};

/**
 * Finaliza uma carga e atualiza automaticamente a viagem
 * REGRA: Se houver mais cargas, coloca viagem em EM_COLETA e próxima carga como AGENDADA
 * @param options.dt_conclusao Opcional: quando for última carga, data/hora de conclusão da viagem (ISO); se não informado, usa now.
 */
export const finalizarCarga = async (
  empresaId: string,
  idViagem: string,
  idCarga: string,
  options?: { dt_conclusao?: string }
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    // Buscar viagem com todas as cargas
    const viagem = await prisma.tms_viagens.findFirst({
      where: {
        id: idViagem,
        id_tms_empresa: tmsEmpresa.id,
      },
      include: {
        js_viagens_cargas: {
          include: {
            tms_cargas: true,
          },
          orderBy: {
            nr_sequencia: 'asc',
          },
        },
      },
    });

    if (!viagem) {
      throw new Error('Viagem não encontrada');
    }

    // Encontrar a carga atual
    const cargaAtualIndex = viagem.js_viagens_cargas.findIndex(
      (vc) => vc.id_carga === idCarga
    );

    if (cargaAtualIndex === -1) {
      throw new Error('Carga não encontrada nesta viagem');
    }

    const cargaAtualLink = viagem.js_viagens_cargas[cargaAtualIndex];
    const dtConclusao =
      options?.dt_conclusao != null
        ? new Date(options.dt_conclusao)
        : new Date();

    // Marcar carga atual como ENTREGUE e setar dt_entregue_em; entregar todas as entregas da carga
    await prisma.tms_cargas.update({
      where: { id: idCarga },
      data: { ds_status: 'ENTREGUE', dt_entregue_em: dtConclusao },
    });

    await prisma.tms_entregas.updateMany({
      where: { id_carga: idCarga, ds_status: { not: 'ENTREGUE' } },
      data: { ds_status: 'ENTREGUE', dt_entrega: dtConclusao },
    });
    await prisma.tms_entregas.updateMany({
      where: { id_carga: idCarga, ds_status: 'ENTREGUE', dt_entrega: null },
      data: { dt_entrega: dtConclusao },
    });

    // Atualizar tms_viagens_cargas (esteira sequencial): item atual CONCLUIDO
    await prisma.tms_viagens_cargas.update({
      where: { id: cargaAtualLink.id },
      data: {
        ds_status: 'CONCLUIDO',
        dt_finalizado_em: dtConclusao,
      },
    });

    // Verificar se há mais cargas
    const temMaisCargas = viagem.js_viagens_cargas.length > cargaAtualIndex + 1;

    if (temMaisCargas) {
      // Há mais cargas: coloca viagem em EM_COLETA e próxima carga como AGENDADA
      const proximaCargaLink = viagem.js_viagens_cargas[cargaAtualIndex + 1];
      const proximaCarga = proximaCargaLink.tms_cargas;

      // Liberar próximo item na esteira (DISPONIVEL)
      if (
        proximaCargaLink.ds_status !== 'CONCLUIDO' &&
        proximaCargaLink.ds_status !== 'EM_DESLOCAMENTO' &&
        proximaCargaLink.ds_status !== 'DISPONIVEL'
      ) {
        await prisma.tms_viagens_cargas.update({
          where: { id: proximaCargaLink.id },
          data: { ds_status: 'DISPONIVEL' },
        });
      }

      await Promise.all([
        // Atualizar status da viagem para EM_COLETA
        prisma.tms_viagens.update({
          where: { id: idViagem },
          data: { ds_status: 'EM_COLETA' },
        }),
        // Atualizar próxima carga para AGENDADA
        prisma.tms_cargas.update({
          where: { id: proximaCarga.id },
          data: { ds_status: 'AGENDADA' },
        }),
      ]);
    } else {
      // Última carga: finaliza a viagem
      await prisma.tms_viagens.update({
        where: { id: idViagem },
        data: {
          ds_status: 'CONCLUIDA',
          dt_conclusao: dtConclusao,
        },
      });

      // Atualizar fechamento automaticamente quando viagem é concluída
      try {
        const fechamentoService = new FechamentoMotoristasService();
        await fechamentoService.atualizarFechamentoComViagem({
          empresaId,
          viagemId: idViagem,
        });
      } catch (e) {
        // Log erro mas não quebrar o fluxo de conclusão da viagem
        console.error('Erro ao atualizar fechamento:', e);
      }
    }

    // Atualizar fechamento com a carga concluída (competência = mês da conclusão da carga)
    try {
      const fechamentoService = new FechamentoMotoristasService();
      await fechamentoService.atualizarFechamentoComCarga({
        empresaId,
        cargaId: idCarga,
        dataConclusao: dtConclusao,
      });
    } catch (e) {
      console.error('Erro ao atualizar fechamento:', e);
    }

    // Retornar viagem atualizada
    return getViagemById(empresaId, idViagem);
  } catch (error: any) {
    console.error('Erro ao finalizar carga:', error);
    throw new Error(`Erro ao finalizar carga: ${error.message}`);
  }
};

export const getDocsParaVincularComViagem = async ({
  empresaId,
  competencia,
}: {
  empresaId: string;
  competencia: string;
}) => {
  try {
    const fisEmp = await getFiscalEmpresa(empresaId);
    const [anoStr, mesStr] = competencia.split('-'); // "2025", "02"
    const ano = Number(anoStr);
    const mes = Number(mesStr);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;

    const docs = await prisma.fis_documento_dfe.findMany({
      where: {
        dt_emissao: {
          gte: new Date(`${competencia}-01`),
          lte: new Date(fim),
        },

        AND: [
          {
            OR: [
              {
                js_cte: {
                  OR: [
                    { id_fis_empresa_emitente: fisEmp.id },
                    { id_fis_empresa_subcontratada: fisEmp.id },
                  ],
                },
              },
              {
                js_nfe: {
                  id_fis_empresa_transportadora: fisEmp.id,
                },
              },
            ],
          },
          { OR: [{ ds_tipo: 'CTE' }, { ds_tipo: 'NFE' }] },
          // Documentos SEM relação com nenhuma carga (NOT EXISTS)
          {
            AND: [
              {
                NOT: {
                  js_cte: {
                    tms_cargas_ctes: {
                      some: {},
                    },
                  },
                },
              },
              {
                NOT: {
                  js_nfe: {
                    tms_cargas_nfe: {
                      some: {},
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        ds_tipo: true,
        dt_emissao: true,
        ds_controle: true,
        js_cte: {
          select: {
            id: true,
            ds_numero: true,
            ds_chave: true,
            ds_serie: true,
            vl_total: true,
            ds_razao_social_emitente: true,
            ds_razao_social_destinatario: true,
            ds_nome_mun_ini: true,
            ds_nome_mun_fim: true,
            js_documentos_anteriores: true,
            js_chaves_nfe: true,
            id_fis_empresa_subcontratada: true,
          },
        },
        js_nfe: {
          select: {
            id: true,
            ds_numero: true,
            ds_chave: true,
            ds_serie: true,
            vl_nf: true,
            ds_razao_social_emitente: true,
            ds_razao_social_destinatario: true,
            js_nfes_referenciadas: true,
          },
        },
        fis_documento_relacionado: {
          where: { fl_ativo: true },
          select: {
            id: true,
            fis_documento_origem: {
              select: {
                id: true,
                ds_tipo: true,
                js_cte: {
                  select: {
                    ds_numero: true,
                    ds_serie: true,
                    ds_chave: true,
                  },
                },
                js_nfe: {
                  select: {
                    ds_numero: true,
                    ds_serie: true,
                    ds_chave: true,
                  },
                },
              },
            },
          },
        },
        fis_documento_origem: {
          where: { fl_ativo: true },
          select: {
            id: true,
            fis_documento_referenciado: {
              select: {
                id: true,
                ds_tipo: true,

                js_cte: {
                  select: {
                    ds_numero: true,
                    ds_serie: true,
                    ds_chave: true,
                  },
                },
                js_nfe: {
                  select: {
                    ds_numero: true,
                    ds_serie: true,
                    ds_chave: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return docs;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error('Erro: ' + errorMessage);
  }
};

/**
 * Vincula múltiplos documentos fiscais (NFes e CTes) a uma viagem
 * Cria registros nas tabelas js_cargas_nfes e js_cargas_ctes com ordem
 */
export const linkDocsToViagem = async ({
  documentos,
  viagemId,
  cargaId,
}: {
  documentos: Array<{ id: string; ordem: number | string }>;
  viagemId: string;
  cargaId: string;
}) => {
  try {
    // Validar que viagem existe
    const viagem = await prisma.tms_viagens.findUnique({
      where: { id: viagemId },
    });

    if (!viagem) {
      throw new Error('Viagem não encontrada');
    }

    if (!cargaId) {
      throw new Error('Carga não encontrada');
    }

    const isCargaVinculada = (await prisma.tms_viagens_cargas.findFirst({
      where: {
        id_viagem: viagemId,
        id_carga: cargaId,
      },
    }))
      ? true
      : false;

    // Extrair IDs dos documentos
    const documentosIds = documentos.map((doc) => doc.id);

    // Buscar documentos para vincular
    const docs = await prisma.fis_documento_dfe.findMany({
      where: { id: { in: documentosIds } },
      include: {
        js_nfe: { select: { id: true } },
        js_cte: { select: { id: true } },
      },
    });

    if (docs.length === 0) {
      throw new Error('Nenhum documento encontrado');
    }

    // Criar mapa de documentos com ordem
    const docMap = new Map(
      documentos.map((doc) => [doc.id, Number(doc.ordem)])
    );

    if (!isCargaVinculada) {
      const higherOrdem = await prisma.tms_viagens_cargas.findFirst({
        where: { id_viagem: viagemId },
        orderBy: { nr_sequencia: 'desc' },
        select: { nr_sequencia: true },
      });
      await prisma.tms_viagens_cargas.create({
        data: {
          id_viagem: viagemId,
          id_carga: cargaId,
          nr_sequencia: (higherOrdem?.nr_sequencia ?? 0) + 1,
          ds_status:
            higherOrdem == null
              ? ('DISPONIVEL' as const)
              : ('BLOQUEADO' as const),
        },
      });

      // Atualizar carga com o id_motorista_veiculo da viagem
      const viagem = await prisma.tms_viagens.findUnique({
        where: { id: viagemId },
        select: { id_motorista_veiculo: true },
      });
      if (viagem?.id_motorista_veiculo) {
        await prisma.tms_cargas.update({
          where: { id: cargaId },
          data: { id_motorista_veiculo: viagem.id_motorista_veiculo },
        });
      }
    }

    // Vincular cada documento à carga com ordem
    const vinculos = await Promise.all(
      docs.map(async (doc) => {
        const ordem = docMap.get(doc.id) || 1;
        if (doc.ds_tipo === 'NFE' && doc.js_nfe) {
          const exists = await prisma.tms_cargas_nfe.findFirst({
            where: {
              id_carga: cargaId,
              id_nfe: doc.js_nfe.id,
            },
          });
          if (exists) {
            // Já existe vínculo, não criar duplicado
            return prisma.tms_cargas_nfe.update({
              where: { id: exists.id },
              data: { ordem },
            });
          } else {
            // Vincular NFe
            return prisma.tms_cargas_nfe.create({
              data: {
                id_carga: cargaId,
                id_nfe: doc.js_nfe.id,
                ordem,
              },
            });
          }
        } else if (doc.ds_tipo === 'CTE' && doc.js_cte) {
          const exists = await prisma.tms_cargas_cte.findFirst({
            where: {
              id_carga: cargaId,
              id_cte: doc.js_cte.id,
            },
          });
          if (exists) {
            // Já existe vínculo, não criar duplicado
            return prisma.tms_cargas_cte.update({
              where: { id: exists.id },
              data: { ordem },
            });
          } else {
            // Vincular CTe
            return prisma.tms_cargas_cte.create({
              data: {
                id_carga: cargaId,
                id_cte: doc.js_cte.id,
                ordem,
              },
            });
          }
        }
      })
    );

    return {
      message: 'Documentos vinculados com sucesso',
      total: vinculos.filter(Boolean).length,
      documentos_vinculados: vinculos.filter(Boolean),
    };
  } catch (error: any) {
    console.error('Erro ao vincular documentos à viagem:', error);
    throw new Error(`Erro ao vincular documentos à viagem: ${error.message}`);
  }
};

/**
 * NOVA IMPLEMENTAÇÃO: Cria cargas com entregas para documentos
 *
 * Fluxo (hierarquia):
 * 1. Agrupa documentos relacionados (CTes + NFes)
 * 2. Para cada grupo: cria 1 carga + 1 entrega por destino
 * 3. Vincula documentos às entregas (não mais à carga)
 * 4. Retorna: Carga → Entregas → Documentos
 *
 * @param empresaId ID da empresa TMS
 * @param idViagem ID da viagem
 * @param documentos Array com {id, tipo} dos documentos a agrupar
 * @returns ApiResponse com cargas e entregas criadas
 */
export const criarCargasComDocumentos = async (
  empresaId: string,
  idViagem: string,
  documentos: Array<{ id: string; tipo: string; ordem?: number }>
): Promise<TMS.ApiResponse<any>> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    // Validar viagem
    const viagem = await prisma.tms_viagens.findFirst({
      where: {
        id: idViagem,
        id_tms_empresa: tmsEmpresa.id,
      },
      include: {
        js_viagens_cargas: {
          orderBy: { nr_sequencia: 'desc' },
          take: 1,
        },
      },
    });

    if (!viagem) {
      throw new Error(
        TMS_CONSTANTS.MENSAGENS.ERROS.VIAGEM_NAO_ENCONTRADA ||
          'Viagem não encontrada'
      );
    }

    // Buscar documentos completos
    const docsCompletos = await prisma.fis_documento_dfe.findMany({
      where: {
        id: { in: documentos.map((d) => d.id) },
      },
      select: {
        id: true,
        ds_tipo: true,
        dt_emissao: true,
        js_cte: {
          select: {
            id: true,
            ds_numero: true,
            ds_chave: true,
            ds_nome_mun_fim: true,
            ds_nome_mun_ini: true,
            js_chaves_nfe: true,
          },
        },
        js_nfe: {
          select: {
            id: true,
            ds_numero: true,
            ds_chave: true,
            ds_razao_social_destinatario: true,
          },
        },
        fis_documento_relacionado: {
          select: {
            id: true,
            fis_documento_origem: {
              select: {
                id: true,
                ds_tipo: true,
              },
            },
          },
        },
      },
    });

    // Separar por tipo
    const ctes = docsCompletos.filter((d) => d.ds_tipo === 'CTE');
    const nfes = docsCompletos.filter((d) => d.ds_tipo === 'NFE');

    // Estrutura: grupos de documentos relacionados
    const gruposDocumentos: Array<{
      documentos: Array<{ id: string; tipo: 'CTE' | 'NFE' }>;
      destino: { nome: string; id?: number };
      origem: { nome: string; id?: number };
    }> = [];

    // Processar CTes com NFes relacionadas
    const nfesJaAgrupadas = new Set<string>();

    for (const cte of ctes) {
      const docsGrupo: Array<{ id: string; tipo: 'CTE' | 'NFE' }> = [
        { id: cte.id, tipo: 'CTE' },
      ];

      // Buscar NFes relacionadas
      const nfesRel = nfes.filter((nfe) => {
        const temRelacao = nfe.fis_documento_relacionado.some(
          (rel) => rel.fis_documento_origem?.id === cte.id
        );
        if (temRelacao) nfesJaAgrupadas.add(nfe.id);
        return temRelacao;
      });

      docsGrupo.push(
        ...nfesRel.map((nfe) => ({ id: nfe.id, tipo: 'NFE' as 'NFE' | 'CTE' }))
      );

      // Extrair destino e origem
      const cteData = cte.js_cte;
      const destino = cteData?.ds_nome_mun_fim || 'SEM DESTINO';
      const origem = cteData?.ds_nome_mun_ini || 'SEM ORIGEM';

      gruposDocumentos.push({
        documentos: docsGrupo,
        destino: { nome: destino },
        origem: { nome: origem },
      });
    }

    // Processar NFes órfãs (sem relacionamento com CTe)
    for (const nfe of nfes) {
      if (!nfesJaAgrupadas.has(nfe.id)) {
        gruposDocumentos.push({
          documentos: [{ id: nfe.id, tipo: 'NFE' as 'NFE' | 'CTE' }],
          destino: {
            nome: nfe.js_nfe?.ds_razao_social_destinatario || 'SEM DESTINO',
          },
          origem: { nome: 'SEM ORIGEM' },
        });
      }
    }

    if (gruposDocumentos.length === 0) {
      return {
        sucesso: false,
        mensagem: 'Nenhum documento válido fornecido',
        cargas: [],
      };
    }

    // Resolver IDs de cidades para cada grupo
    for (const grupo of gruposDocumentos) {
      // Destino
      const cidadeDestino = await prisma.sis_igbe_city.findFirst({
        where: {
          ds_city: {
            contains: grupo.destino.nome,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      grupo.destino.id = cidadeDestino?.id;

      // Origem
      const cidadeOrigem = await prisma.sis_igbe_city.findFirst({
        where: {
          ds_city: {
            contains: grupo.origem.nome,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      grupo.origem.id = cidadeOrigem?.id;
    }

    // Fallback para cidade padrão se não encontrar
    let cidadePadrao: { id: number } | null = null;
    const gruposComErro = gruposDocumentos.filter(
      (g) => !g.destino.id || !g.origem.id
    );

    if (gruposComErro.length > 0) {
      cidadePadrao = await prisma.sis_igbe_city.findFirst({
        select: { id: true },
        orderBy: { id: 'asc' },
      });

      if (!cidadePadrao) {
        throw new Error(
          'Nenhuma cidade cadastrada no sistema. Cadastre ao menos uma cidade.'
        );
      }

      for (const grupo of gruposComErro) {
        if (!grupo.destino.id) grupo.destino.id = cidadePadrao.id;
        if (!grupo.origem.id) grupo.origem.id = cidadePadrao.id;
      }
    }

    // Criar cargas e vinculações à viagem dentro de transação (cd_carga sequencial: CARGA-1, CARGA-2, ...)
    const cargasComGrupos: Array<{
      carga: Awaited<ReturnType<typeof prisma.tms_cargas.create>> & {
        cd_carga: string;
      };
      grupo: (typeof gruposDocumentos)[0];
    }> = [];

    await prisma.$transaction(async (tx) => {
      const { _max } = await tx.tms_viagens_cargas.aggregate({
        where: { id_viagem: idViagem },
        _max: { nr_sequencia: true },
      });
      let sequenciaAtual = (_max.nr_sequencia ?? 0) + 1;

      for (const grupo of gruposDocumentos) {
        const cdCarga = await getProximoNumeroCarga(tmsEmpresa.id, tx);

        const carga = await tx.tms_cargas.create({
          data: {
            cd_carga: cdCarga,
            ds_status: TMS_CONSTANTS.STATUS_CARGA.AGENDADA, // Carga só vai para EM_TRANSITO quando o usuário acionar o botão
            id_cidade_origem: grupo.origem.id!,
            id_tms_empresa: tmsEmpresa.id,
            fl_requer_seguro: true,
          },
          include: cargaInclude,
        });

        const isFirstItem = sequenciaAtual === 1;
        await tx.tms_viagens_cargas.create({
          data: {
            id_viagem: idViagem,
            id_carga: carga.id,
            nr_sequencia: sequenciaAtual,
            ds_status: isFirstItem
              ? ('DISPONIVEL' as const)
              : ('BLOQUEADO' as const),
          },
        });

        const viagem = await tx.tms_viagens.findUnique({
          where: { id: idViagem },
          select: { id_motorista_veiculo: true },
        });
        if (viagem?.id_motorista_veiculo) {
          await tx.tms_cargas.update({
            where: { id: carga.id },
            data: { id_motorista_veiculo: viagem.id_motorista_veiculo },
          });
        }

        cargasComGrupos.push({ carga, grupo });
        sequenciaAtual++;
      }
    });

    // Criar entregas e vincular documentos (fora da tx; EntregasService não recebe tx)
    const cargasCriadas: any[] = [];
    for (const { carga, grupo } of cargasComGrupos) {
      const entrega = await EntregasService.criarEntrega({
        id_carga: carga.id,
        id_cidade_destino: grupo.destino.id!,
        nr_sequencia: 1,
        ds_status: TMS_CONSTANTS.STATUS_ENTREGA.PENDENTE,
      } as any);

      if (grupo.documentos.length > 0) {
        await EntregasService.adicionarDocumentos(entrega.id, grupo.documentos);
      }

      cargasCriadas.push({
        id: carga.id,
        cd_carga: carga.cd_carga,
        ds_status: carga.ds_status,
        entregas: [entrega],
        municipioDestino: grupo.destino.nome,
        municipioOrigem: grupo.origem.nome,
      });
    }

    return {
      sucesso: true,
      mensagem: `${cargasCriadas.length} carga(s) criada(s) com sucesso`,
      cargas: cargasCriadas,
    };
  } catch (error: any) {
    console.error('Erro ao criar cargas com documentos (V2):', error);
    return {
      sucesso: false,
      mensagem: `Erro ao criar cargas: ${error.message}`,
      cargas: [],
    };
  }
};
