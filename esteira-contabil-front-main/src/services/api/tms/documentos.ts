import { fetchData } from '@/services/api/request-handler';
import type { Doc, DisponiveisSeparadosResponse } from '@/types/tms';

export async function getDocumentosDisponiveisSeparados(params?: {
	competencia?: string;
	dataInicio?: string;
	dataFim?: string;
	search?: string;
	incluirRelacionamentos?: boolean;
	backfill?: boolean;
}) {
	const query = new URLSearchParams();
	if (params?.competencia) query.set('competencia', params.competencia);
	if (params?.dataInicio) query.set('dataInicio', params.dataInicio);
	if (params?.dataFim) query.set('dataFim', params.dataFim);
	if (params?.search) query.set('search', params.search);
	if (params?.incluirRelacionamentos === false) query.set('incluirRelacionamentos', 'false');
	if (params?.backfill === false) query.set('backfill', 'false');
	const suffix = query.toString() ? `?${query.toString()}` : '';
	return await fetchData<DisponiveisSeparadosResponse>(
		`/api/tms/documentos/disponiveis-separados${suffix}`,
		undefined,
		'GET'
	);
}

export async function getDocumentosDisponiveis(params?: {
	search?: string;
	tipo?: 'CTE' | 'NFE' | 'AMBOS';
	dataInicio?: string;
	dataFim?: string;
	/** Incluir documentos já anexados a esta carga (exibir no topo na aba DOCUMENTOS) */
	idCargaIncluir?: string;
	/** false = resposta rápida (sem backfill de endereço em CT-es). Default true. */
	backfill?: boolean;
}) {
	const query = new URLSearchParams();
	if (params?.search) query.set('search', params.search);
	if (params?.tipo) query.set('tipo', params.tipo);
	if (params?.dataInicio) query.set('dataInicio', params.dataInicio);
	if (params?.dataFim) query.set('dataFim', params.dataFim);
	if (params?.idCargaIncluir) query.set('idCargaIncluir', params.idCargaIncluir);
	if (params?.backfill === false) query.set('backfill', 'false');

	const suffix = query.toString() ? `?${query.toString()}` : '';
	return await fetchData<Doc[]>(`/api/tms/documentos/disponiveis${suffix}`, undefined, 'GET');
}

export async function getDocumentosDespesasDisponiveis(params?: { search?: string; competencia?: string }) {
	const query = new URLSearchParams();
	if (params?.search) query.set('search', params.search);
	if (params?.competencia) query.set('competencia', params.competencia);
	const suffix = query.toString() ? `?${query.toString()}` : '';
	return await fetchData(`/api/tms/documentos/despesas${suffix}`, undefined, 'GET');
}

export async function agruparDocumentos(documentosIds: string[]) {
	return await fetchData(`/api/tms/documentos/agrupar`, { documentosIds }, 'POST');
}

export async function getDocumentoRelacionamentos(id: string) {
	return await fetchData<{
		relacionadoComo: Array<{ id: string; tipo: 'CTE' | 'NFE' }>;
		temRelacoesCom: Array<{ id: string; tipo: 'CTE' | 'NFE' }>;
	}>(`/api/tms/documentos/${id}/relacionamentos`, undefined, 'GET');
}
