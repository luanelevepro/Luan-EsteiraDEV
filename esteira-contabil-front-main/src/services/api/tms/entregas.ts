import { fetchData } from '@/services/api/request-handler';
import type { Entrega, ViagemFluxoDTO } from '@/types/tms';

/**
 * API de entregas do TMS
 */

/**
 * Busca uma entrega por ID
 * GET /api/tms/entregas/:id
 */
export async function getEntregaById(id: string) {
	return await fetchData<Entrega>(`/api/tms/entregas/${id}`, undefined, 'GET');
}

/**
 * Lista entregas de uma carga
 * GET /api/tms/entregas/carga/:idCarga
 */
export async function getEntregasByCarga(idCarga: string) {
	return await fetchData<{
		sucesso: boolean;
		mensagem: string;
		entregas: Entrega[];
		totalEntregas: number;
	}>(`/api/tms/entregas/carga/${idCarga}`, undefined, 'GET');
}

type ReordenarResponse = {
	sucesso: boolean;
	mensagem: string;
	entregas: Entrega[];
	totalEntregas: number;
};

/**
 * Reordena as entregas de uma carga
 * PATCH /api/tms/entregas/carga/:idCarga/reordenar
 */
export async function reordenarEntregasCarga(
	idCarga: string,
	entregas: Array<{ id: string; nr_sequencia: number }>,
) {
	const body = { entregas };
	return await fetchData<ReordenarResponse>(
		`/api/tms/entregas/carga/${idCarga}/reordenar`,
		body as unknown as ReordenarResponse,
		'PATCH',
	);
}

/**
 * Cria uma nova entrega
 * POST /api/tms/entregas
 */
export async function createEntrega(data: {
	id_carga?: string;
	id_cidade_destino?: number;
	nr_sequencia?: number;
	ds_endereco?: string;
	ds_complemento?: string;
	dt_limite_entrega?: string;
	ds_observacoes?: string;
	vl_peso_bruto?: number;
	vl_cubagem?: number;
	vl_qtd_volumes?: number;
}) {
	return await fetchData(`/api/tms/entregas`, data, 'POST');
}

/**
 * Atualiza uma entrega
 * PUT /api/tms/entregas/:id
 */
export async function updateEntrega(
	id: string,
	data: {
		id_cidade_destino?: number;
		ds_endereco?: string;
		ds_complemento?: string;
		dt_limite_entrega?: string;
		dt_entrega?: string;
		ds_comprovante_entrega?: string;
		ds_comprovante_key?: string;
		ds_observacoes?: string;
		vl_peso_bruto?: number;
		vl_cubagem?: number;
		vl_qtd_volumes?: number;
		ds_status?: 'PENDENTE' | 'EM_TRANSITO' | 'ENTREGUE' | 'DEVOLVIDA' | 'CANCELADA';
	},
) {
	return await fetchData(`/api/tms/entregas/${id}`, data, 'PUT');
}

/**
 * Atualiza apenas o status de uma entrega
 * PATCH /api/tms/entregas/:id/status
 * @param dt_entrega Opcional: data/hora da entrega (ISO); quando ENTREGUE, se não informado o backend usa now.
 */
export async function updateEntregaStatus(
	id: string,
	ds_status: 'PENDENTE' | 'EM_TRANSITO' | 'ENTREGUE' | 'DEVOLVIDA' | 'CANCELADA',
	dt_entrega?: string,
) {
	const body: { ds_status: typeof ds_status; dt_entrega?: string } = { ds_status };
	if (dt_entrega != null) body.dt_entrega = dt_entrega;
	return await fetchData(`/api/tms/entregas/${id}/status`, body, 'PATCH');
}

/**
 * POST /entregas/:id/iniciar — inicia rota da entrega (esteira sequencial)
 * @param options.dt_inicio_rota Opcional: data/hora ISO (informar data e hora)
 */
export async function iniciarEntrega(
	entregaId: string,
	options?: { dt_inicio_rota?: string },
): Promise<ViagemFluxoDTO> {
	return (await fetchData(
		`/api/tms/entregas/${entregaId}/iniciar`,
		options?.dt_inicio_rota != null ? { dt_inicio_rota: options.dt_inicio_rota } : {},
		'POST',
	)) as ViagemFluxoDTO;
}

/**
 * POST /entregas/:id/finalizar — finaliza entrega (esteira sequencial)
 */
export async function finalizarEntrega(
	entregaId: string,
	comprovante?: {
		dt_entrega?: string;
		dt_finalizado_em?: string;
		ds_comprovante_entrega?: string;
		ds_comprovante_key?: string;
	},
): Promise<ViagemFluxoDTO> {
	return (await fetchData(`/api/tms/entregas/${entregaId}/finalizar`, comprovante ?? {}, 'POST')) as ViagemFluxoDTO;
}

/**
 * Adiciona documentos a uma entrega
 * POST /api/tms/entregas/:id/documentos
 */
export async function addDocumentosToEntrega(
	id: string,
	documentos: Array<{ id: string; tipo: 'CTE' | 'NFE' }>,
) {
	return await fetchData(`/api/tms/entregas/${id}/documentos`, { documentos }, 'POST');
}

/**
 * Remove um documento de uma entrega
 * DELETE /api/tms/entregas/:id/documentos
 */
export async function removeDocumentoFromEntrega(id: string, idDocumento: string, tipo: 'CTE' | 'NFE') {
	return await fetchData(
		`/api/tms/entregas/${id}/documentos`,
		{ idDocumento, tipo },
		'DELETE',
	);
}

/**
 * Deleta uma entrega
 * DELETE /api/tms/entregas/:id
 */
export async function deleteEntrega(id: string) {
	return await fetchData<{ sucesso: boolean }>(`/api/tms/entregas/${id}`, undefined, 'DELETE');
}

/**
 * Cria múltiplas entregas com documentos
 * POST /api/tms/entregas/:idCarga/lote
 */
export async function createEntregasLote(
	idCarga: string,
	entregas: Array<{
		id_cidade_destino: number;
		nr_sequencia: number;
		ds_endereco?: string;
		ds_complemento?: string;
		dt_limite_entrega?: string;
		ds_observacoes?: string;
		vl_total_mercadoria?: number;
		js_produtos?: string[];
		documentosIds: string[];
	}>,
	idViagem?: string,
) {
	return await fetchData(
		`/api/tms/entregas/${idCarga}/lote`,
		{ entregas, id_viagem: idViagem },
		'POST',
	);
}
