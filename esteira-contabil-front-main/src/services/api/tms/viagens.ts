import { fetchData } from '../request-handler';
import { Viagem, ViagemCarga, ViagemFluxoDTO } from '@/types/tms';
import { mapViagemFromAPI, mapViagensFromAPI } from '@/utils/viagem-mapper';

// ============= VIAGENS =============

/**
 * GET /viagens
 * Busca todas as viagens da empresa
 */
export async function getViagens() {
	const data = (await fetchData('/api/tms/viagens')) as Viagem[];
	return mapViagensFromAPI(data);
}

/**
 * GET /viagens/paginacao
 * Busca viagens com paginação, filtros e ordenação
 */
export async function getViagensPaginado(pageParameters: {
	page: number;
	pageSize: number;
	orderBy: 'asc' | 'desc';
	orderColumn: 'cd_viagem' | 'ds_motorista' | 'ds_status' | 'dt_created' | 'dt_agendada' | 'dt_conclusao';
	search?: string;
	status?: string[];
	month?: number;
	year?: number;
}) {
	const statusQuery =
		pageParameters.status && pageParameters.status.length > 0 ? `&status=${pageParameters.status.join(',')}` : '';
	const searchQuery = pageParameters.search ? `&search=${encodeURIComponent(pageParameters.search)}` : '';
	const monthQuery =
		pageParameters.month !== undefined && pageParameters.year !== undefined
			? `&month=${pageParameters.month}&year=${pageParameters.year}`
			: '';

	const response = await fetchData(
		`/api/tms/viagens/paginacao?page=${pageParameters.page}&pageSize=${pageParameters.pageSize}&orderBy=${pageParameters.orderBy}&orderColumn=${pageParameters.orderColumn}${searchQuery}${statusQuery}${monthQuery}`,
	);

	const rawViagens = response.viagens ?? response.data;
	if (rawViagens && Array.isArray(rawViagens)) {
		return {
			...response,
			viagens: mapViagensFromAPI(rawViagens),
		};
	}

	return response;
}

/**
 * GET /viagens/:id
 * Busca uma viagem específica por ID
 */
export async function getViagem(id: string) {
	const data = (await fetchData(`/api/tms/viagens/${id}`)) as Viagem;
	return mapViagemFromAPI(data);
}

/**
 * GET /viagens/:id/fluxo
 * Retorna fluxo da esteira sequencial (itens, canStart, canFinish, blockedReason)
 */
export async function getViagemFluxo(viagemId: string): Promise<ViagemFluxoDTO> {
	return (await fetchData(`/api/tms/viagens/${viagemId}/fluxo`)) as ViagemFluxoDTO;
}

/**
 * POST /viagens/:id/itens/:itemId/iniciar
 * Inicia item da esteira (trajeto vazio ou carga)
 * @param options.dt_inicio Opcional: data/hora ISO (informar data e hora)
 */
export async function iniciarItemViagem(
	viagemId: string,
	itemId: string,
	options?: { dt_inicio?: string },
): Promise<ViagemFluxoDTO> {
	return (await fetchData(
		`/api/tms/viagens/${viagemId}/itens/${itemId}/iniciar`,
		options?.dt_inicio != null ? { dt_inicio: options.dt_inicio } : {},
		'POST',
	)) as ViagemFluxoDTO;
}

/**
 * POST /viagens/:id/itens/:itemId/finalizar
 * Finaliza item (apenas deslocamento vazio)
 * @param options.dt_fim Opcional: data/hora ISO (informar data e hora)
 */
export async function finalizarItemViagem(
	viagemId: string,
	itemId: string,
	options?: { dt_fim?: string },
): Promise<ViagemFluxoDTO> {
	return (await fetchData(
		`/api/tms/viagens/${viagemId}/itens/${itemId}/finalizar`,
		options?.dt_fim != null ? { dt_fim: options.dt_fim } : {},
		'POST',
	)) as ViagemFluxoDTO;
}

/**
 * POST /viagens
 * Cria uma nova viagem
 */
export async function createViagem(data: {
	cd_viagem?: string; // opcional; backend gera sequencial por empresa (1, 2, 3...)
	ds_motorista: string;
	ds_placa_cavalo: string;
	ds_placa_carreta_1?: string | null;
	ds_placa_carreta_2?: string | null;
	ds_placa_carreta_3?: string | null;
	dt_agendada?: string;
	dt_previsao_retorno?: string;
	ds_status?: 'PLANEJADA' | 'EM_COLETA' | 'EM_VIAGEM' | 'CONCLUIDA' | 'ATRASADA' | 'CANCELADA';
}) {
	const result = (await fetchData('/api/tms/viagens', data, 'POST')) as Viagem;
	return mapViagemFromAPI(result);
}

/**
 * PUT /viagens/:id
 * Atualiza uma viagem existente
 */
export async function updateViagem(
	id: string,
	data: Partial<{
		cd_viagem: string;
		ds_motorista: string;
		ds_placa_cavalo: string;
		ds_placa_carreta_1: string | null;
		ds_placa_carreta_2: string | null;
		ds_placa_carreta_3: string | null;
		dt_agendada: string;
		dt_previsao_retorno: string;
		ds_status: 'PLANEJADA' | 'EM_COLETA' | 'EM_VIAGEM' | 'CONCLUIDA' | 'ATRASADA' | 'CANCELADA';
		ds_comprovante_entrega: string;
		ds_comprovante_key: string;
		id_motorista_veiculo: string | null;
	}>,
) {
	const result = (await fetchData(`/api/tms/viagens/${id}`, data, 'PUT')) as Viagem;
	return mapViagemFromAPI(result);
}

/**
 * PATCH /viagens/:id/status
 * Atualiza apenas o status de uma viagem
 * Comportamento automático: Se houver múltiplas cargas, atualiza a status da carga com menor sequência
 */
export async function updateViagemStatus(
	id: string,
	status: 'PLANEJADA' | 'EM_COLETA' | 'EM_VIAGEM' | 'CONCLUIDA' | 'ATRASADA' | 'CANCELADA',
) {
	const result = (await fetchData(
		`/api/tms/viagens/${id}/status`,
		{ ds_status: status },
		'PATCH',
	)) as Viagem;
	return mapViagemFromAPI(result);
}

/**
 * DELETE /viagens/:id
 * Deleta uma viagem (cascata remove as relações com cargas)
 */
export async function deleteViagem(id: string) {
	return await fetchData(`/api/tms/viagens/${id}`, {}, 'DELETE');
}

// ============= GERENCIAMENTO DE CARGAS EM VIAGENS =============

/**
 * POST /viagens/:id/cargas
 * Vincula uma carga à viagem com número de sequência
 */
export async function vincularCargaAViagem(
	idViagem: string,
	data: {
		id_carga: string;
		nr_sequencia: number;
		/** Preenche/atualiza motorista+veículo na viagem e nas cargas (necessário para fechamento). */
		id_motorista_veiculo?: string | null;
	},
) {
	return (await fetchData(`/api/tms/viagens/${idViagem}/cargas`, data, 'POST')) as ViagemCarga;
}

/**
 * DELETE /viagens/:id/cargas/:idCarga
 * Remove uma carga de uma viagem
 */
export async function removerCargaDaViagem(idViagem: string, idCarga: string) {
	return await fetchData(`/api/tms/viagens/${idViagem}/cargas/${idCarga}`, {}, 'DELETE');
}

/**
 * PATCH /viagens/:id/cargas/reordenar
 * Reordena as cargas de uma viagem alterando os números de sequência
 */
export async function reordenarCargasViagem(
	idViagem: string,
	cargas: Array<{
		id_carga: string;
		nr_sequencia: number;
	}>,
) {
	const result = (await fetchData(
		`/api/tms/viagens/${idViagem}/cargas/reordenar`,
		{ cargas },
		'PATCH',
	)) as Viagem;
	return mapViagemFromAPI(result);
}

/**
 * PATCH /viagens/:id/cargas/:idCarga/finalizar
 * Finaliza uma carga (marca como ENTREGUE) e atualiza automaticamente a viagem
 *
 * Comportamento automático:
 * - Se houver mais cargas: Marca carga como ENTREGUE, viagem → EM_COLETA, próxima carga → AGENDADA
 * - Se for última carga: Marca carga como ENTREGUE, viagem → CONCLUIDA, preenche dt_conclusao
 * @param options.dt_conclusao Opcional: quando for última carga, data/hora de conclusão (ISO)
 */
export async function finalizarCargaViagem(
	idViagem: string,
	idCarga: string,
	options?: { dt_conclusao?: string },
) {
	const body = options?.dt_conclusao != null ? { dt_conclusao: options.dt_conclusao } : {};
	const result = (await fetchData(
		`/api/tms/viagens/${idViagem}/cargas/${idCarga}/finalizar`,
		body,
		'PATCH',
	)) as Viagem;
	return mapViagemFromAPI(result);
}

// ============= HELPER FUNCTIONS =============

/**
 * Helper para criar viagem com cargas já vinculadas
 * Executa as operações em sequência
 */
export async function createViagemComCargas(
	viagemData: {
		cd_viagem?: string; // opcional; backend gera sequencial por empresa
		ds_motorista: string;
		ds_placa_cavalo: string;
		ds_placa_carreta_1?: string | null;
		ds_placa_carreta_2?: string | null;
		ds_placa_carreta_3?: string | null;
		dt_agendada?: string;
		dt_previsao_retorno?: string;
	},
	cargas: Array<{ id_carga: string; nr_sequencia: number }>,
) {
	try {
		// 1. Criar viagem
		const viagem = await createViagem(viagemData);

		// 2. Vincular cargas
		if (cargas.length > 0) {
			for (const carga of cargas) {
				await vincularCargaAViagem(viagem.id, carga);
			}
		}

		// 3. Buscar viagem completa
		return await getViagem(viagem.id);
	} catch (error) {
		console.error('Erro ao criar viagem com cargas:', error);
		throw error;
	}
}

/**
 * Cria uma ou mais cargas a partir de documentos selecionados
 * POST /viagens/:id/cargas/criar-com-documentos
 */
export async function criarCargasComDocumentos(
	idViagem: string,
	documentos: Array<{ id: string; tipo: 'NFE' | 'CTE'; ordem?: number }>,
) {
	return await fetchData(
		`/api/tms/viagens/${idViagem}/cargas/criar-com-documentos`,
		{ documentos },
		'POST',
	);
}

/**
 * Helper para atualizar status da viagem e retornar dados atualizados
 */
export async function atualizarViagemComStatus(
	id: string,
	status: 'PLANEJADA' | 'EM_COLETA' | 'EM_VIAGEM' | 'CONCLUIDA' | 'ATRASADA' | 'CANCELADA',
) {
	return await updateViagemStatus(id, status);
}

/**
 * Helper para finalizar viagem com comprovante
 */
export async function finalizarViagemComComprovante(
	id: string,
	urlComprovante: string,
	chaveComprovante: string,
) {
	return await updateViagem(id, {
		ds_status: 'CONCLUIDA',
		ds_comprovante_entrega: urlComprovante,
		ds_comprovante_key: chaveComprovante,
	});
}

/**
 * PATCH /cargas/viagens/:id/finalizar
 * Finaliza uma viagem (marca como CONCLUÍDA)
 * @param options.dt_conclusao Opcional: data/hora de conclusão (ISO); se não informado o backend usa now.
 */
export async function finalizarViagem(
	id: string,
	options?: { dt_conclusao?: string },
) {
	const body =
		options?.dt_conclusao != null ? { dt_conclusao: options.dt_conclusao } : {};
	return await fetchData(`/api/tms/cargas/viagens/${id}/finalizar`, body, 'PATCH');
}

/**
 * PATCH /cargas/viagens/:id/reabrir
 * Reabre uma viagem para adicionar mais cargas (volta para PLANEJADA)
 */
export async function reabrirViagemParaNovasCargas(id: string) {
	return await fetchData(`/api/tms/cargas/viagens/${id}/reabrir`, {}, 'PATCH');
}

// ============= IMPORTAÇÃO DE VIAGENS VIA PLANILHA =============

export type FormatoDataImportViagem = 'serial_excel' | 'dd-mm-yyyy' | 'yyyy-mm-dd';

export interface ViagensImportRequest {
	mapColunas: Record<string, string | undefined>;
	mapFormatoData?: Record<string, FormatoDataImportViagem>;
	mapPersonalizadas?: Record<string, string | undefined>;
	rows: Array<Record<string, unknown>>;
}

export interface ViagensImportResult {
	total: number;
	sucesso: number;
	falhas: { linha: number; erro: string; code?: string; meta?: unknown }[];
	primeiraFalha?: { linha: number; erro: string; code?: string; meta?: unknown };
}

export interface ImportLayoutViagemMapeamento {
	mapColunas: Record<string, string | undefined>;
	mapFormatoData?: Record<string, FormatoDataImportViagem>;
	mapPersonalizadas?: Record<string, string | undefined>;
}

export interface ImportLayoutViagem {
	id: string;
	cd_tipo?: string;
	ds_nome: string;
	ds_descricao: string | null;
	js_mapeamento: ImportLayoutViagemMapeamento;
	dt_created?: string;
	dt_updated?: string;
}

export async function importViagens(data: ViagensImportRequest): Promise<ViagensImportResult> {
	return (await fetchData('/api/tms/viagens/import', data, 'POST')) as ViagensImportResult;
}

export async function getImportLayoutsViagens(): Promise<ImportLayoutViagem[]> {
	return (await fetchData('/api/tms/viagens/import/layouts')) as ImportLayoutViagem[];
}

export async function createImportLayoutViagens(body: {
	ds_nome: string;
	ds_descricao?: string | null;
	js_mapeamento: ImportLayoutViagemMapeamento;
}): Promise<ImportLayoutViagem> {
	return (await fetchData('/api/tms/viagens/import/layouts', body, 'POST')) as ImportLayoutViagem;
}

export async function updateImportLayoutViagens(
	id: string,
	body: {
		ds_nome?: string;
		ds_descricao?: string | null;
		js_mapeamento?: ImportLayoutViagemMapeamento;
	},
): Promise<ImportLayoutViagem> {
	return (await fetchData(`/api/tms/viagens/import/layouts/${id}`, body, 'PUT')) as ImportLayoutViagem;
}

export async function deleteImportLayoutViagens(id: string): Promise<void> {
	await fetchData(`/api/tms/viagens/import/layouts/${id}`, null, 'DELETE');
}
