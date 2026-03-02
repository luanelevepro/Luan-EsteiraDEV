import { fetchData } from '../request-handler';
import type {
  FechamentoMotoristaDetalhe,
  FechamentoMotoristaListItem,
  FechamentoMotoristaListResponse,
  FechamentoResumoResponse,
  FechamentoStatus,
} from '@/components/general/tms/fechamento-motoristas/types';

export type ListParams = {
  page?: number;
  pageSize?: number;
  competencia?: string; // YYYY-MM
  status?: FechamentoStatus | 'TODOS';
  search?: string;
  orderBy?: 'asc' | 'desc';
  orderColumn?: string;
};


export async function getFechamentosMotoristas(params: ListParams) {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params.competencia) sp.set('competencia', params.competencia);
  if (params.status) sp.set('status', params.status);
  if (params.search) sp.set('search', params.search);
  if (params.orderBy) sp.set('orderBy', params.orderBy);
  if (params.orderColumn) sp.set('orderColumn', params.orderColumn);

  return (await fetchData(`/api/tms/fechamento-motoristas?${sp.toString()}`)) as FechamentoMotoristaListResponse;
}

export async function getResumoFechamentosMotoristas(competencia?: string) {
  const sp = new URLSearchParams();
  if (competencia) sp.set('competencia', competencia);
  return (await fetchData(`/api/tms/fechamento-motoristas/resumo?${sp.toString()}`)) as FechamentoResumoResponse;
}

export async function createFechamentoMotorista(motoristaId: string, competencia: string) {
  return (await fetchData(`/api/tms/fechamento-motoristas`, { motoristaId, competencia }, 'POST')) as FechamentoMotoristaListItem;
}

export async function getDetalheFechamentoMotorista(fechamentoId: string) {
  return (await fetchData(`/api/tms/fechamento-motoristas/${fechamentoId}`)) as FechamentoMotoristaDetalhe;
}

export async function fecharFechamentoMotorista(fechamentoId: string) {
  return await fetchData(`/api/tms/fechamento-motoristas/${fechamentoId}/fechar`, {}, 'POST');
}

export async function reabrirFechamentoMotorista(fechamentoId: string) {
  return await fetchData(`/api/tms/fechamento-motoristas/${fechamentoId}/reabrir`, {}, 'POST');
}

export type SincronizarViagensResponse = {
  ok: boolean;
  cargasIncluidas: number;
  viagensIncluidas: number;
};

export async function sincronizarViagensFechamentoMotorista(fechamentoId: string) {
  return (await fetchData(
    `/api/tms/fechamento-motoristas/${fechamentoId}/sincronizar-viagens`,
    {},
    'POST'
  )) as SincronizarViagensResponse;
}

export type SincronizarCompetenciaResponse = {
  ok: boolean;
  fechamentosAtualizados: number;
  totalViagensIncluidas: number;
};

export async function sincronizarCompetenciaFechamentos(competencia: string) {
  const sp = new URLSearchParams({ competencia });
  return (await fetchData(
    `/api/tms/fechamento-motoristas/sincronizar-competencia?${sp.toString()}`,
    {},
    'POST'
  )) as SincronizarCompetenciaResponse;
}
