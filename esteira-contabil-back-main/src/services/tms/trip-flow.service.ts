/**
 * Motor de transição da esteira sequencial de viagem.
 * Toda mudança de status (item da viagem, coleta, entrega) passa por este serviço.
 * Valida precedência, estado atual e usa lock por viagem.
 * Sincroniza tms_viagens.ds_status e tms_cargas.ds_status em iniciarItem, finalizarColeta
 * e iniciarEntrega para manter consistência com a Torre de Controle e tabelas (Viagens e Cargas).
 */
import { prisma } from '../prisma';
import { getTmsEmpresa } from './tms-empresa.service';
import { TripFlowRuleError } from './trip-flow.errors';
import { cargaInclude } from '../../utils/tms/queries';
import type { Prisma } from '@prisma/client';

const FLUXO_VIAGEM_INCLUDE = {
  js_viagens_cargas: {
    include: {
      tms_cargas: {
        include: {
          js_entregas: {
            orderBy: { nr_sequencia: 'asc' as const },
          },
        },
      },
    },
    orderBy: { nr_sequencia: 'asc' as const },
  },
} as const;

type ViagemComFluxo = Prisma.tms_viagensGetPayload<{
  include: typeof FLUXO_VIAGEM_INCLUDE;
}>;

function isDeslocamentoVazio(
  carga: {
    fl_deslocamento_vazio?: boolean | null;
    cd_carga?: string | null;
  } | null
): boolean {
  if (!carga) return false;
  if (carga.fl_deslocamento_vazio === true) return true;
  return carga.cd_carga === 'DESLOCAMENTO_VAZIO'; // fallback para dados antigos
}

function statusColetaEffective(carga: {
  ds_status_coleta?: string | null;
}): string {
  const s = carga.ds_status_coleta;
  return s === 'EM_COLETA' || s === 'CONCLUIDO' ? s : 'PENDENTE';
}

/** Lock da viagem na transação (PostgreSQL FOR UPDATE) */
async function lockViagem(
  tx: Prisma.TransactionClient,
  viagemId: string
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM tms_viagens WHERE id = ${viagemId} FOR UPDATE`;
}

/** Carrega viagem com itens e entregas, para uso no fluxo */
async function loadViagemComFluxo(
  tx: Prisma.TransactionClient,
  viagemId: string,
  empresaId: string
): Promise<ViagemComFluxo | null> {
  const tmsEmpresa = await getTmsEmpresa(empresaId);
  const viagem = await tx.tms_viagens.findFirst({
    where: { id: viagemId, id_tms_empresa: tmsEmpresa.id },
    include: FLUXO_VIAGEM_INCLUDE,
  });
  return viagem as ViagemComFluxo | null;
}

// --- Tipos do contrato GET /viagens/:id/fluxo ---
export interface FluxoEntregaDTO {
  id: string;
  nr_sequencia: number;
  ds_status: string;
  canStart: boolean;
  canFinish: boolean;
  blockedReason: string | null;
}

export interface FluxoCargaDTO {
  id_carga: string;
  cd_carga: string | null;
  tipo: 'DESLOCAMENTO_VAZIO' | 'CARGA';
  status_item: string;
  ds_status_coleta: string | null;
  entregas: FluxoEntregaDTO[];
  canStartItem: boolean;
  canFinishItem: boolean;
  blockedReasonItem: string | null;
  canStartColeta: boolean;
  canFinishColeta: boolean;
  blockedReasonColeta: string | null;
}

export interface FluxoItemDTO {
  id: string; // tms_viagens_cargas.id
  nr_sequencia: number;
  id_carga: string;
  tipo: 'DESLOCAMENTO_VAZIO' | 'CARGA';
  status_item: string;
  dt_iniciado_em: Date | null;
  dt_finalizado_em: Date | null;
  canStart: boolean;
  canFinish: boolean;
  blockedReason: string | null;
  carga?: FluxoCargaDTO;
}

export interface ViagemFluxoDTO {
  id_viagem: string;
  cd_viagem: string;
  ds_status: string;
  itens: FluxoItemDTO[];
}

/** Calcula canStart/canFinish/blockedReason para um item da viagem e suas entregas/coleta */
function buildFluxoFromViagem(viagem: ViagemComFluxo): ViagemFluxoDTO {
  const itens: FluxoItemDTO[] = [];
  const vcs = viagem.js_viagens_cargas;

  for (let i = 0; i < vcs.length; i++) {
    const vc = vcs[i];
    const carga = vc.tms_cargas;
    const tipo = isDeslocamentoVazio(carga) ? 'DESLOCAMENTO_VAZIO' : 'CARGA';
    const statusItem = vc.ds_status ?? 'BLOQUEADO';
    const anteriorConcluido = i === 0 || vcs[i - 1]?.ds_status === 'CONCLUIDO';
    const isDisponivel = statusItem === 'DISPONIVEL';
    const isEmDeslocamento = statusItem === 'EM_DESLOCAMENTO';

    let canStart = false;
    let canFinish = false;
    let blockedReason: string | null = null;

    if (tipo === 'DESLOCAMENTO_VAZIO') {
      canStart = anteriorConcluido && isDisponivel;
      canFinish = isEmDeslocamento;
      if (!anteriorConcluido)
        blockedReason = 'Finalize o item anterior antes de iniciar este.';
      else if (!isDisponivel && !isEmDeslocamento)
        blockedReason =
          statusItem === 'CONCLUIDO'
            ? 'Item já concluído.'
            : 'Aguarde a sequência.';
    } else {
      // CARGA: iniciar item = libera coleta; finalizar item = só quando última entrega for finalizada (tratado em finalizarEntrega)
      canStart = anteriorConcluido && isDisponivel;
      canFinish = false; // carga não tem "finalizar item" direto; conclui ao finalizar última entrega
      if (!anteriorConcluido)
        blockedReason = 'Finalize o item anterior antes de iniciar este.';
      else if (!isDisponivel && !isEmDeslocamento)
        blockedReason =
          statusItem === 'CONCLUIDO'
            ? 'Carga já concluída.'
            : 'Aguarde a sequência.';
    }

    const entregas: FluxoEntregaDTO[] = (carga.js_entregas ?? []).map(
      (e, j) => {
        const statusColeta = statusColetaEffective(carga);
        const prevEntregue =
          j === 0
            ? statusColeta === 'CONCLUIDO'
            : carga.js_entregas?.[j - 1]?.ds_status === 'ENTREGUE';
        const canStartE =
          isEmDeslocamento &&
          prevEntregue &&
          (e.ds_status === 'PENDENTE' || e.ds_status === 'EM_TRANSITO');
        const canFinishE = e.ds_status === 'EM_TRANSITO';
        let blockedE: string | null = null;
        if (j === 0 && statusColeta !== 'CONCLUIDO')
          blockedE = 'Finalize a coleta antes de iniciar a primeira entrega.';
        else if (j > 0 && carga.js_entregas?.[j - 1]?.ds_status !== 'ENTREGUE')
          blockedE = 'Finalize a entrega anterior.';
        else if (e.ds_status === 'ENTREGUE')
          blockedE = 'Entrega já finalizada.';

        return {
          id: e.id,
          nr_sequencia: e.nr_sequencia,
          ds_status: e.ds_status,
          canStart: canStartE && e.ds_status === 'PENDENTE',
          canFinish: canFinishE,
          blockedReason: blockedE,
        };
      }
    );

    const statusColeta = tipo === 'CARGA' ? statusColetaEffective(carga) : null;
    const canStartColeta =
      tipo === 'CARGA' && isEmDeslocamento && statusColeta === 'PENDENTE';
    const canFinishColeta = tipo === 'CARGA' && statusColeta === 'EM_COLETA';
    let blockedReasonColeta: string | null = null;
    if (tipo === 'CARGA' && !isEmDeslocamento && statusColeta === 'PENDENTE')
      blockedReasonColeta = 'Inicie o item da carga antes de iniciar a coleta.';
    else if (tipo === 'CARGA' && statusColeta === 'CONCLUIDO')
      blockedReasonColeta = 'Coleta já finalizada.';

    itens.push({
      id: vc.id,
      nr_sequencia: vc.nr_sequencia,
      id_carga: vc.id_carga,
      tipo,
      status_item: statusItem,
      dt_iniciado_em: vc.dt_iniciado_em,
      dt_finalizado_em: vc.dt_finalizado_em,
      canStart,
      canFinish,
      blockedReason,
      carga:
        tipo === 'CARGA'
          ? {
              id_carga: carga.id,
              cd_carga: carga.cd_carga,
              tipo: 'CARGA',
              status_item: statusItem,
              ds_status_coleta: statusColeta,
              entregas,
              canStartItem: canStart,
              canFinishItem: false,
              blockedReasonItem: blockedReason,
              canStartColeta,
              canFinishColeta,
              blockedReasonColeta,
            }
          : undefined,
    });
  }

  return {
    id_viagem: viagem.id,
    cd_viagem: viagem.cd_viagem,
    ds_status: viagem.ds_status,
    itens,
  };
}

/**
 * GET /viagens/:id/fluxo — retorna estrutura pronta para a UI.
 */
export async function getFluxo(
  empresaId: string,
  viagemId: string
): Promise<ViagemFluxoDTO> {
  const viagem = await prisma.tms_viagens.findFirst({
    where: {
      id: viagemId,
      id_tms_empresa: (await getTmsEmpresa(empresaId)).id,
    },
    include: FLUXO_VIAGEM_INCLUDE,
  });

  if (!viagem) {
    throw new TripFlowRuleError('Viagem não encontrada.');
  }

  return buildFluxoFromViagem(viagem as ViagemComFluxo);
}

/**
 * POST /viagens/:id/itens/:itemId/iniciar
 * Deslocamento vazio: trajeto em andamento. Carga: item em andamento (libera coleta).
 * @param options.dt_inicio Opcional: data/hora ISO; se não informado, usa now.
 */
export async function iniciarItem(
  empresaId: string,
  viagemId: string,
  itemId: string,
  options?: { dt_inicio?: string }
): Promise<ViagemFluxoDTO> {
  const tmsEmpresa = await getTmsEmpresa(empresaId);

  return await prisma.$transaction(
    async (tx) => {
      await lockViagem(tx, viagemId);
      const viagem = await loadViagemComFluxo(tx, viagemId, empresaId);
      if (!viagem) throw new TripFlowRuleError('Viagem não encontrada.');

      const vc = viagem.js_viagens_cargas.find((c) => c.id === itemId);
      if (!vc) throw new TripFlowRuleError('Item não encontrado nesta viagem.');

      if (vc.ds_status === 'EM_DESLOCAMENTO') {
        // Idempotente
        return buildFluxoFromViagem(viagem);
      }
      if (vc.ds_status !== 'DISPONIVEL') {
        throw new TripFlowRuleError(
          vc.ds_status === 'CONCLUIDO'
            ? 'Este item já foi concluído.'
            : 'Finalize o item anterior antes de iniciar este.'
        );
      }

      const idx = viagem.js_viagens_cargas.findIndex((c) => c.id === itemId);
      const anterior = idx > 0 ? viagem.js_viagens_cargas[idx - 1] : null;
      if (anterior && anterior.ds_status !== 'CONCLUIDO') {
        throw new TripFlowRuleError(
          'Finalize o item anterior antes de iniciar este.'
        );
      }

      const dtInicio =
        options?.dt_inicio != null ? new Date(options.dt_inicio) : new Date();
      await tx.tms_viagens_cargas.update({
        where: { id: itemId },
        data: {
          ds_status: 'EM_DESLOCAMENTO',
          dt_iniciado_em: dtInicio,
        },
      });

      // Sincronizar status da viagem e da carga ativa (Torre de Controle e tabelas)
      if (viagem.ds_status === 'PLANEJADA') {
        await tx.tms_viagens.update({
          where: { id: viagemId },
          data: { ds_status: 'EM_COLETA' },
        });
        // Carga ativa (item iniciado): EM_COLETA na viagem → EM_COLETA na carga
        if (!isDeslocamentoVazio(vc.tms_cargas)) {
          await tx.tms_cargas.update({
            where: { id: vc.id_carga },
            data: { ds_status: 'EM_COLETA' },
          });
        }
      }

      const updated = await loadViagemComFluxo(tx, viagemId, empresaId);
      return buildFluxoFromViagem(updated!);
    },
    { maxWait: 10000, timeout: 15000 }
  );
}

/**
 * POST /viagens/:id/itens/:itemId/finalizar
 * Apenas para deslocamento vazio. Para carga, o item é concluído ao finalizar a última entrega.
 * @param options.dt_fim Opcional: data/hora ISO; se não informado, usa now.
 */
export async function finalizarItem(
  empresaId: string,
  viagemId: string,
  itemId: string,
  options?: { dt_fim?: string }
): Promise<ViagemFluxoDTO> {
  return await prisma.$transaction(
    async (tx) => {
      await lockViagem(tx, viagemId);
      const viagem = await loadViagemComFluxo(tx, viagemId, empresaId);
      if (!viagem) throw new TripFlowRuleError('Viagem não encontrada.');

      const vc = viagem.js_viagens_cargas.find((c) => c.id === itemId);
      if (!vc) throw new TripFlowRuleError('Item não encontrado nesta viagem.');

      if (vc.ds_status === 'CONCLUIDO') {
        return buildFluxoFromViagem(viagem);
      }
      if (vc.ds_status !== 'EM_DESLOCAMENTO') {
        throw new TripFlowRuleError(
          'Só é possível finalizar um item em andamento.'
        );
      }

      const isVazio = isDeslocamentoVazio(vc.tms_cargas);
      if (!isVazio) {
        throw new TripFlowRuleError(
          'Para carga, finalize todas as entregas para concluir o item.'
        );
      }

      const dtFim =
        options?.dt_fim != null ? new Date(options.dt_fim) : new Date();
      await tx.tms_viagens_cargas.update({
        where: { id: itemId },
        data: {
          ds_status: 'CONCLUIDO',
          dt_finalizado_em: dtFim,
        },
      });

      // Próximo item vira DISPONIVEL
      const idx = viagem.js_viagens_cargas.findIndex((c) => c.id === itemId);
      const next = viagem.js_viagens_cargas[idx + 1];
      if (next && next.ds_status === 'BLOQUEADO') {
        await tx.tms_viagens_cargas.update({
          where: { id: next.id },
          data: { ds_status: 'DISPONIVEL' },
        });
      }

      const updated = await loadViagemComFluxo(tx, viagemId, empresaId);
      return buildFluxoFromViagem(updated!);
    },
    { maxWait: 10000, timeout: 15000 }
  );
}

/**
 * POST /cargas/:cargaId/coleta/iniciar
 * @param options.dt_coleta_inicio Opcional: data/hora ISO; se não informado, usa now.
 */
export async function iniciarColeta(
  empresaId: string,
  cargaId: string,
  options?: { dt_coleta_inicio?: string }
): Promise<ViagemFluxoDTO> {
  const tmsEmpresa = await getTmsEmpresa(empresaId);
  const carga = await prisma.tms_cargas.findFirst({
    where: { id: cargaId, id_tms_empresa: tmsEmpresa.id },
    include: { tms_viagens_cargas: { where: {}, take: 1 } },
  });
  if (!carga) throw new TripFlowRuleError('Carga não encontrada.');
  const vc = carga.tms_viagens_cargas?.[0];
  if (!vc)
    throw new TripFlowRuleError('Carga não está vinculada a uma viagem.');
  const viagemId = vc.id_viagem;

  const dtColetaInicio =
    options?.dt_coleta_inicio != null
      ? new Date(options.dt_coleta_inicio)
      : new Date();

  return await prisma.$transaction(
    async (tx) => {
      await lockViagem(tx, viagemId);
      const viagem = await loadViagemComFluxo(tx, viagemId, empresaId);
      if (!viagem) throw new TripFlowRuleError('Viagem não encontrada.');

      const item = viagem.js_viagens_cargas.find((c) => c.id_carga === cargaId);
      if (!item)
        throw new TripFlowRuleError('Carga não encontrada nesta viagem.');
      if (item.ds_status !== 'EM_DESLOCAMENTO') {
        throw new TripFlowRuleError(
          'Inicie o item da carga na viagem antes de iniciar a coleta.'
        );
      }

      const statusColeta = statusColetaEffective(item.tms_cargas);
      if (statusColeta === 'EM_COLETA') {
        const updated = await loadViagemComFluxo(tx, viagemId, empresaId);
        return buildFluxoFromViagem(updated!);
      }
      if (statusColeta === 'CONCLUIDO') {
        throw new TripFlowRuleError('Coleta já foi finalizada.');
      }

      await tx.tms_cargas.update({
        where: { id: cargaId },
        data: {
          ds_status_coleta: 'EM_COLETA',
          dt_coleta_inicio: dtColetaInicio,
        },
      });

      const updated = await loadViagemComFluxo(tx, viagemId, empresaId);
      return buildFluxoFromViagem(updated!);
    },
    { maxWait: 10000, timeout: 15000 }
  );
}

/**
 * POST /cargas/:cargaId/coleta/finalizar
 * @param options.dt_coleta_fim Opcional: data/hora ISO; se não informado, usa now.
 */
export async function finalizarColeta(
  empresaId: string,
  cargaId: string,
  options?: { dt_coleta_fim?: string }
): Promise<ViagemFluxoDTO> {
  const tmsEmpresa = await getTmsEmpresa(empresaId);
  const carga = await prisma.tms_cargas.findFirst({
    where: { id: cargaId, id_tms_empresa: tmsEmpresa.id },
    include: { tms_viagens_cargas: { where: {}, take: 1 } },
  });
  if (!carga) throw new TripFlowRuleError('Carga não encontrada.');
  const vc = carga.tms_viagens_cargas?.[0];
  if (!vc)
    throw new TripFlowRuleError('Carga não está vinculada a uma viagem.');
  const viagemId = vc.id_viagem;

  const dtColetaFim =
    options?.dt_coleta_fim != null
      ? new Date(options.dt_coleta_fim)
      : new Date();

  return await prisma.$transaction(
    async (tx) => {
      await lockViagem(tx, viagemId);
      const viagem = await loadViagemComFluxo(tx, viagemId, empresaId);
      if (!viagem) throw new TripFlowRuleError('Viagem não encontrada.');

      const item = viagem.js_viagens_cargas.find((c) => c.id_carga === cargaId);
      if (!item)
        throw new TripFlowRuleError('Carga não encontrada nesta viagem.');
      const statusColeta = statusColetaEffective(item.tms_cargas);
      if (statusColeta === 'CONCLUIDO') {
        const updated = await loadViagemComFluxo(tx, viagemId, empresaId);
        return buildFluxoFromViagem(updated!);
      }
      if (statusColeta !== 'EM_COLETA') {
        throw new TripFlowRuleError(
          'Só é possível finalizar a coleta se ela estiver em andamento.'
        );
      }

      await tx.tms_cargas.update({
        where: { id: cargaId },
        data: {
          ds_status_coleta: 'CONCLUIDO',
          dt_coleta_fim: dtColetaFim,
          dt_coleta: dtColetaFim,
        },
      });

      // Sincronizar status da viagem e da carga (coleta concluída → em rota; Torre de Controle e tabelas)
      if (viagem.ds_status !== 'EM_VIAGEM') {
        await tx.tms_viagens.update({
          where: { id: viagemId },
          data: { ds_status: 'EM_VIAGEM' },
        });
      }
      if (item.tms_cargas && item.tms_cargas.ds_status !== 'EM_TRANSITO') {
        await tx.tms_cargas.update({
          where: { id: cargaId },
          data: { ds_status: 'EM_TRANSITO' },
        });
      }

      // Ao finalizar coleta, a primeira entrega não entregue passa a estar "em rota" (EM_TRANSITO),
      // para que o usuário possa clicar em "Finalizar Entrega" sem precisar de "Iniciar rota" antes.
      const entregasCarga = item.tms_cargas?.js_entregas ?? [];
      const primeiraNaoEntregue = [...entregasCarga]
        .sort((a, b) => (a.nr_sequencia ?? 0) - (b.nr_sequencia ?? 0))
        .find((e) => e.ds_status !== 'ENTREGUE');
      if (primeiraNaoEntregue && primeiraNaoEntregue.ds_status !== 'EM_TRANSITO') {
        await tx.tms_entregas.update({
          where: { id: primeiraNaoEntregue.id },
          data: {
            ds_status: 'EM_TRANSITO',
            dt_inicio_rota: dtColetaFim,
          },
        });
      }

      const updated = await loadViagemComFluxo(tx, viagemId, empresaId);
      return buildFluxoFromViagem(updated!);
    },
    { maxWait: 10000, timeout: 15000 }
  );
}

/**
 * POST /entregas/:entregaId/iniciar — coloca entrega em EM_TRANSITO
 * @param options.dt_inicio_rota Opcional: data/hora ISO em que saiu para a entrega; se não informado, usa now.
 */
export async function iniciarEntrega(
  empresaId: string,
  entregaId: string,
  options?: { dt_inicio_rota?: string }
): Promise<ViagemFluxoDTO> {
  const entrega = await prisma.tms_entregas.findUnique({
    where: { id: entregaId },
    include: {
      tms_cargas: {
        include: { tms_viagens_cargas: { where: {}, take: 1 } },
      },
    },
  });
  if (!entrega) throw new TripFlowRuleError('Entrega não encontrada.');
  const vc = entrega.tms_cargas?.tms_viagens_cargas?.[0];
  if (!vc)
    throw new TripFlowRuleError('Carga da entrega não está em uma viagem.');
  const viagemId = vc.id_viagem;

  const dtInicioRota =
    options?.dt_inicio_rota != null
      ? new Date(options.dt_inicio_rota)
      : new Date();

  return await prisma.$transaction(
    async (tx) => {
      await lockViagem(tx, viagemId);
      const viagem = await loadViagemComFluxo(tx, viagemId, empresaId);
      if (!viagem) throw new TripFlowRuleError('Viagem não encontrada.');

      const item = viagem.js_viagens_cargas.find(
        (c) => c.id_carga === entrega.id_carga
      );
      if (!item)
        throw new TripFlowRuleError('Carga não encontrada nesta viagem.');
      if (item.ds_status !== 'EM_DESLOCAMENTO') {
        throw new TripFlowRuleError(
          'O item da carga deve estar em andamento para iniciar entregas.'
        );
      }
      const statusColeta = statusColetaEffective(item.tms_cargas);
      const entregas = item.tms_cargas?.js_entregas ?? [];
      const idx = entregas.findIndex((e) => e.id === entregaId);
      if (idx === -1)
        throw new TripFlowRuleError('Entrega não pertence a esta carga.');
      if (idx > 0 && entregas[idx - 1].ds_status !== 'ENTREGUE') {
        throw new TripFlowRuleError(
          'Finalize a entrega anterior antes de iniciar esta.'
        );
      }
      if (idx === 0 && statusColeta !== 'CONCLUIDO') {
        throw new TripFlowRuleError(
          'Finalize a coleta antes de iniciar a primeira entrega.'
        );
      }
      if (entrega.ds_status === 'EM_TRANSITO') {
        const updated = await loadViagemComFluxo(tx, viagemId, empresaId);
        return buildFluxoFromViagem(updated!);
      }
      if (entrega.ds_status === 'ENTREGUE') {
        throw new TripFlowRuleError('Entrega já foi finalizada.');
      }

      await tx.tms_entregas.update({
        where: { id: entregaId },
        data: {
          ds_status: 'EM_TRANSITO',
          dt_inicio_rota: dtInicioRota,
        },
      });

      // Sincronizar status da viagem e da carga (Torre de Controle e tabelas)
      if (viagem.ds_status !== 'EM_VIAGEM') {
        await tx.tms_viagens.update({
          where: { id: viagemId },
          data: { ds_status: 'EM_VIAGEM' },
        });
      }
      if (item.tms_cargas && item.tms_cargas.ds_status !== 'EM_TRANSITO') {
        await tx.tms_cargas.update({
          where: { id: entrega.id_carga },
          data: { ds_status: 'EM_TRANSITO' },
        });
      }

      const updated = await loadViagemComFluxo(tx, viagemId, empresaId);
      return buildFluxoFromViagem(updated!);
    },
    { maxWait: 10000, timeout: 15000 }
  );
}

/**
 * POST /entregas/:entregaId/finalizar — marca ENTREGUE; se última da carga, conclui item e libera próximo.
 * @param comprovante.dt_finalizado_em Opcional: quando for última entrega, data para dt_finalizado_em do item; senão usa now.
 */
export async function finalizarEntrega(
  empresaId: string,
  entregaId: string,
  comprovante?: {
    dt_entrega?: string;
    dt_finalizado_em?: string;
    ds_comprovante_entrega?: string;
    ds_comprovante_key?: string;
  }
): Promise<ViagemFluxoDTO> {
  const entrega = await prisma.tms_entregas.findUnique({
    where: { id: entregaId },
    include: {
      tms_cargas: {
        include: {
          js_entregas: { orderBy: { nr_sequencia: 'asc' } },
          tms_viagens_cargas: { where: {}, take: 1 },
        },
      },
    },
  });
  if (!entrega) throw new TripFlowRuleError('Entrega não encontrada.');
  const vc = entrega.tms_cargas?.tms_viagens_cargas?.[0];
  if (!vc)
    throw new TripFlowRuleError('Carga da entrega não está em uma viagem.');
  const viagemId = vc.id_viagem;
  const cargaId = entrega.id_carga;

  return await prisma.$transaction(
    async (tx) => {
      await lockViagem(tx, viagemId);
      const viagem = await loadViagemComFluxo(tx, viagemId, empresaId);
      if (!viagem) throw new TripFlowRuleError('Viagem não encontrada.');

      const item = viagem.js_viagens_cargas.find((c) => c.id_carga === cargaId);
      if (!item)
        throw new TripFlowRuleError('Carga não encontrada nesta viagem.');
      if (entrega.ds_status === 'ENTREGUE') {
        const updated = await loadViagemComFluxo(tx, viagemId, empresaId);
        return buildFluxoFromViagem(updated!);
      }
      if (entrega.ds_status !== 'EM_TRANSITO') {
        throw new TripFlowRuleError(
          'Só é possível finalizar uma entrega que está em trânsito.'
        );
      }

      const dtEntrega =
        comprovante?.dt_entrega != null
          ? new Date(comprovante.dt_entrega)
          : new Date();

      await tx.tms_entregas.update({
        where: { id: entregaId },
        data: {
          ds_status: 'ENTREGUE',
          dt_entrega: dtEntrega,
          ...(comprovante?.ds_comprovante_entrega != null && {
            ds_comprovante_entrega: comprovante.ds_comprovante_entrega,
            ds_comprovante_key: comprovante.ds_comprovante_key ?? undefined,
          }),
        },
      });

      const entregas = item.tms_cargas?.js_entregas ?? [];
      const countEntreguesAgora = entregas.filter(
        (e) => e.id === entregaId || e.ds_status === 'ENTREGUE'
      ).length;
      const isLast =
        entregas.length > 0 && countEntreguesAgora === entregas.length;

      // Próxima entrega da mesma carga: colocar em EM_TRANSITO para o usuário poder finalizá-la em seguida
      const entregasOrdenadas = [...(item.tms_cargas?.js_entregas ?? [])].sort(
        (a, b) => (a.nr_sequencia ?? 0) - (b.nr_sequencia ?? 0)
      );
      const idxAtual = entregasOrdenadas.findIndex((e) => e.id === entregaId);
      const proximaEntrega = entregasOrdenadas[idxAtual + 1];
      if (
        proximaEntrega &&
        proximaEntrega.ds_status !== 'ENTREGUE' &&
        proximaEntrega.ds_status !== 'EM_TRANSITO'
      ) {
        await tx.tms_entregas.update({
          where: { id: proximaEntrega.id },
          data: {
            ds_status: 'EM_TRANSITO',
            dt_inicio_rota: dtEntrega,
          },
        });
      }

      if (isLast) {
        await tx.tms_cargas.update({
          where: { id: cargaId },
          data: { ds_status: 'ENTREGUE', dt_entregue_em: dtEntrega },
        });
        const dtFinalizadoItem =
          comprovante?.dt_finalizado_em != null
            ? new Date(comprovante.dt_finalizado_em)
            : comprovante?.dt_entrega != null
              ? new Date(comprovante.dt_entrega)
              : new Date();
        await tx.tms_viagens_cargas.update({
          where: { id: item.id },
          data: {
            ds_status: 'CONCLUIDO',
            dt_finalizado_em: dtFinalizadoItem,
          },
        });
        const nextIdx =
          viagem.js_viagens_cargas.findIndex((c) => c.id === item.id) + 1;
        const next = viagem.js_viagens_cargas[nextIdx];
        // Liberar próximo item: se estiver BLOQUEADO (ou null/legado), passar a DISPONIVEL
        if (
          next &&
          next.ds_status !== 'CONCLUIDO' &&
          next.ds_status !== 'EM_DESLOCAMENTO' &&
          next.ds_status !== 'DISPONIVEL'
        ) {
          await tx.tms_viagens_cargas.update({
            where: { id: next.id },
            data: { ds_status: 'DISPONIVEL' },
          });
        }
      }

      const updated = await loadViagemComFluxo(tx, viagemId, empresaId);
      return buildFluxoFromViagem(updated!);
    },
    { maxWait: 10000, timeout: 15000 }
  );
}
