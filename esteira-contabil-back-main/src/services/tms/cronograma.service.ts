/**
 * Serviço de cronograma: retorna eventos por veículo (cavalo+carretas) em um período
 * para alimentar o Gantt da aba Cronograma na Torre de Controle.
 */
import { prisma } from '../prisma';
import { getTmsEmpresa } from './tms-empresa.service';

const CRONOGRAMA_VIAGEM_INCLUDE = {
  js_viagens_cargas: {
    include: {
      tms_cargas: {
        select: {
          id: true,
          cd_carga: true,
          fl_deslocamento_vazio: true,
        },
      },
    },
    orderBy: { nr_sequencia: 'asc' as const },
  },
} as const;

function isDeslocamentoVazio(carga: { fl_deslocamento_vazio?: boolean | null; cd_carga?: string | null } | null): boolean {
  if (!carga) return false;
  if (carga.fl_deslocamento_vazio === true) return true;
  return carga.cd_carga === 'DESLOCAMENTO_VAZIO'; // fallback para dados antigos
}

function normalizaPlaca(s: string | null | undefined): string {
  if (!s) return '';
  return String(s).trim().toUpperCase();
}

export interface CronogramaEventoDTO {
  id_viagem: string;
  id_item: string;
  tipo: 'DESLOCAMENTO_VAZIO' | 'CARGA';
  dt_inicio: string;
  dt_fim: string;
  ds_status: string;
  cd_viagem: string;
  label?: string;
  /** ID da carga (apenas quando tipo === 'CARGA') para abrir detalhes no frontend */
  id_carga?: string;
}

export interface CronogramaLinhaDTO {
  chave: string;
  ds_placa_cavalo: string;
  ds_placa_carretas?: string;
  ds_motorista?: string;
  eventos: CronogramaEventoDTO[];
}

export interface CronogramaResponseDTO {
  linhas: CronogramaLinhaDTO[];
}

function mapStatusViagemToLegenda(ds_status: string): string {
  const map: Record<string, string> = {
    PLANEJADA: 'PENDENTE',
    EM_COLETA: 'EM_COLETA',
    EM_VIAGEM: 'EM_TRANSITO',
    CONCLUIDA: 'ENTREGUE',
    ATRASADA: 'PENDENTE',
    CANCELADA: 'CANCELADA',
  };
  return map[ds_status] ?? ds_status;
}

/**
 * GET /api/tms/cronograma
 * Retorna linhas (veículos) com eventos no período para exibição no Gantt.
 * @param dataInicio ISO string início do período
 * @param dataFim ISO string fim do período
 * @param placa Opcional: filtrar por placa do cavalo
 */
export async function getCronograma(
  empresaId: string,
  dataInicio: string,
  dataFim: string,
  placa?: string
): Promise<CronogramaResponseDTO> {
  const tmsEmpresa = await getTmsEmpresa(empresaId);
  const start = new Date(dataInicio);
  const end = new Date(dataFim);

  const viagens = await prisma.tms_viagens.findMany({
    where: {
      id_tms_empresa: tmsEmpresa.id,
      ...(placa
        ? {
            ds_placa_cavalo: {
              contains: normalizaPlaca(placa),
              mode: 'insensitive' as const,
            },
          }
        : {}),
    },
    include: CRONOGRAMA_VIAGEM_INCLUDE,
    orderBy: { dt_agendada: 'asc' },
  });

  const linhasMap = new Map<string, CronogramaLinhaDTO>();

  for (const v of viagens) {
    const placaCavalo = normalizaPlaca(v.ds_placa_cavalo);
    const carretas = [v.ds_placa_carreta_1, v.ds_placa_carreta_2, v.ds_placa_carreta_3]
      .filter(Boolean)
      .map(String);
    const chave = [placaCavalo, ...carretas].join('|');
    const ds_placa_carretas =
      carretas.length > 0 ? carretas.join(', ') : undefined;

    for (const vc of v.js_viagens_cargas) {
      const carga = vc.tms_cargas;
      const tipo = isDeslocamentoVazio(carga ?? null)
        ? 'DESLOCAMENTO_VAZIO'
        : 'CARGA';

      let dtInicio: Date;
      let dtFim: Date;

      if (vc.dt_iniciado_em) {
        dtInicio = vc.dt_iniciado_em;
      } else if (v.dt_agendada) {
        dtInicio = v.dt_agendada;
      } else {
        continue;
      }

      if (vc.dt_finalizado_em) {
        dtFim = vc.dt_finalizado_em;
      } else if (v.dt_previsao_retorno) {
        dtFim = v.dt_previsao_retorno;
      } else if (v.dt_agendada) {
        const fallback = new Date(v.dt_agendada);
        fallback.setDate(fallback.getDate() + 3);
        dtFim = fallback;
      } else {
        const fallback = new Date(dtInicio);
        fallback.setDate(fallback.getDate() + 1);
        dtFim = fallback;
      }

      if (dtFim < start || dtInicio > end) continue;

      const ds_status = mapStatusViagemToLegenda(v.ds_status);
      const evento: CronogramaEventoDTO = {
        id_viagem: v.id,
        id_item: vc.id,
        tipo,
        dt_inicio: dtInicio.toISOString(),
        dt_fim: dtFim.toISOString(),
        ds_status,
        cd_viagem: v.cd_viagem,
        label: tipo === 'DESLOCAMENTO_VAZIO' ? 'Deslocamento vazio' : carga?.cd_carga ?? undefined,
        ...(tipo === 'CARGA' && carga?.id ? { id_carga: carga.id } : {}),
      };

      if (!linhasMap.has(chave)) {
        linhasMap.set(chave, {
          chave,
          ds_placa_cavalo: v.ds_placa_cavalo,
          ds_placa_carretas,
          ds_motorista: v.ds_motorista,
          eventos: [],
        });
      }
      linhasMap.get(chave)!.eventos.push(evento);
    }
  }

  const linhas = Array.from(linhasMap.values());
  for (const linha of linhas) {
    linha.eventos.sort(
      (a, b) =>
        new Date(a.dt_inicio).getTime() - new Date(b.dt_inicio).getTime()
    );
  }
  linhas.sort((a, b) =>
    a.ds_placa_cavalo.localeCompare(b.ds_placa_cavalo, undefined, {
      sensitivity: 'base',
    })
  );

  return { linhas };
}
