import { Carga, ViagemFluxoDTO } from '@/types/tms';
import { fetchData } from '../request-handler';

export type PrioridadeCarga = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export type TipoCarroceria = 'GRANELEIRO' | 'BAU' | 'SIDER' | 'FRIGORIFICO' | 'TANQUE' | 'PORTA_CONTAINER';

export interface CargaPayload {
	cd_carga?: string;
	ds_nome?: string;
	dt_coleta?: string;
	dt_coleta_inicio?: string;
	dt_coleta_fim?: string;
	dt_limite_entrega?: string;
	ds_observacoes?: string;
	ds_tipo_carroceria?: TipoCarroceria;
	ds_prioridade?: PrioridadeCarga;
	vl_peso_bruto?: number;
	vl_cubagem?: number;
	vl_qtd_volumes?: number;
	vl_limite_empilhamento?: number;
	fl_requer_seguro?: boolean;
	fl_carroceria_desacoplada?: boolean;
	fl_deslocamento_vazio?: boolean;
	id_cidade_origem?: number;
	id_cidade_destino?: number;
	id_motorista_veiculo?: string;
	id_carroceria_planejada?: string | null;
	ds_produto_predominante?: string | null;
	id_fis_cliente?: string;
	id_segmento?: string;
	id_embarcador?: string;
	ds_status?: 'PENDENTE' | 'AGENDADA' | 'EM_COLETA' | 'EM_TRANSITO' | 'ENTREGUE';
	container?: {
		id_armador?: string | null;
		nr_container?: string | null;
		nr_lacre_container?: string | null;
		ds_destino_pais?: string | null;
		ds_setor_container?: string | null;
	};
}

export interface CargaUpdatePayload extends Partial<CargaPayload> {
	cd_carga?: string;
	ds_nome?: string;
	id_cidade_origem?: number;
	id_cidade_destino?: number;
	ds_status?: 'PENDENTE' | 'AGENDADA' | 'EM_COLETA' | 'EM_TRANSITO' | 'ENTREGUE';
}

/** DTO retornado pelo parser de documentos para pré-preenchimento da carga */
export interface CargaPreenchidaDTO {
	cliente: { ds_nome: string; ds_documento?: string; ds_ie?: string; cd_municipio_ibge?: string } | null;
	embarcador: { ds_nome: string; ds_documento?: string; ds_ie?: string; cd_municipio_ibge?: string } | null;
	origem: { id_cidade?: number; cd_municipio_ibge?: string; ds_nome_mun?: string; ds_uf?: string } | null;
	destino: { id_cidade?: number; cd_municipio_ibge?: string; ds_nome_mun?: string; ds_uf?: string } | null;
	caracteristicas: { vl_peso_bruto?: number; vl_cubagem?: number; vl_qtd_volumes?: number; vl_mercadoria?: number; ds_produto_predominante?: string };
	entregas: Array<{
		id_cidade_destino?: number;
		cd_municipio_ibge?: string;
		ds_nome_mun?: string;
		ds_uf?: string;
		ds_endereco?: string;
		ds_complemento?: string;
		ds_nome_recebedor?: string;
		ds_documento_recebedor?: string;
		ds_nome_destinatario?: string;
		ds_documento_destinatario?: string;
		vl_total_mercadoria?: number;
		js_produtos?: string[];
		documentos: Array<{ id: string; tipo: 'CTE' | 'NFE' }>;
	}>;
	documentos: Array<{ id: string; tipo: 'CTE' | 'NFE' }>;
}

export interface ParserWarning {
	codigo?: string;
	mensagem: string;
}

export interface ParseDocumentosResult {
	dados: CargaPreenchidaDTO;
	warnings: ParserWarning[];
}

/** Payload para criar carga com entregas (fluxo a partir de documentos). cd_carga opcional: em criação o backend gera sequência (CARGA-1, CARGA-2, ...). */
export interface CargaComEntregasPayload {
	cd_carga?: string;
	ds_status?: string;
	dt_coleta_inicio?: string;
	dt_coleta_fim?: string;
	dt_coleta?: string;
	ds_observacoes?: string;
	ds_tipo_carroceria?: TipoCarroceria;
	ds_prioridade?: PrioridadeCarga;
	vl_peso_bruto?: number;
	vl_cubagem?: number;
	vl_qtd_volumes?: number;
	fl_requer_seguro?: boolean;
	id_cidade_origem: number;
	id_cidade_destino?: number;
	id_fis_cliente?: string;
	id_embarcador?: string;
	id_segmento?: string;
	id_carroceria_planejada?: string | null;
	cliente?: CargaPreenchidaDTO['cliente'];
	embarcador?: CargaPreenchidaDTO['embarcador'];
	entregas: Array<{
		id_cidade_destino: number;
		ds_endereco?: string;
		ds_complemento?: string;
		ds_nome_recebedor?: string;
		ds_documento_recebedor?: string;
		ds_nome_destinatario?: string;
		ds_documento_destinatario?: string;
		vl_total_mercadoria?: number;
		js_produtos?: string[];
		documentos: Array<{ id: string; tipo: 'CTE' | 'NFE'; ordem?: number }>;
	}>;
	container?: {
		id_armador?: string | null;
		nr_container?: string | null;
		nr_lacre_container?: string | null;
		ds_destino_pais?: string | null;
		ds_setor_container?: string | null;
	};
}

const normalizeIsoDate = (value?: string) => {
	if (!value) return value;
	const trimmed = value.trim();
	if (!trimmed) return value;
	const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
	const hasSeconds = /:\d{2}(?:\.|[zZ]|[+-])/.test(trimmed);
	if (hasTimezone && hasSeconds) return trimmed;
	const parsed = new Date(trimmed);
	return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
};

const normalizeCargaDates = <T extends CargaPayload | CargaUpdatePayload>(data: T): T => {
	return {
		...data,
		dt_coleta: data.dt_coleta ? normalizeIsoDate(data.dt_coleta) : data.dt_coleta,
		dt_coleta_inicio: data.dt_coleta_inicio ? normalizeIsoDate(data.dt_coleta_inicio) : data.dt_coleta_inicio,
		dt_coleta_fim: data.dt_coleta_fim ? normalizeIsoDate(data.dt_coleta_fim) : data.dt_coleta_fim,
		dt_limite_entrega: normalizeIsoDate(data.dt_limite_entrega),
	};
};

export async function getCargas() {
	return await fetchData('/api/tms/cargas');
}

export async function getCargasPaginado(pageParameters: {
	page: number;
	pageSize: number;
	orderBy: string;
	orderColumn: string;
	search: string;
	status?: string[];
	month?: number;
	year?: number;
	includeCargasSemData?: boolean;
}) {
	const statusQuery =
		pageParameters.status && pageParameters.status.length > 0 ? `&status=${pageParameters.status.join(',')}` : '';
	const monthQuery =
		pageParameters.month !== undefined && pageParameters.year !== undefined
			? `&month=${pageParameters.month}&year=${pageParameters.year}`
			: '';
	const includeCargasSemDataQuery =
		pageParameters.includeCargasSemData !== false ? `&includeCargasSemData=true` : `&includeCargasSemData=false`;

	return await fetchData(
		`/api/tms/cargas/paginacao?page=${pageParameters.page}&pageSize=${pageParameters.pageSize}&orderBy=${pageParameters.orderBy}&orderColumn=${pageParameters.orderColumn}&search=${encodeURIComponent(pageParameters.search ?? '')}${statusQuery}${monthQuery}${includeCargasSemDataQuery}`,
	);
}

export async function getCarga(id: string) {
	return await fetchData(`/api/tms/cargas/${id}`);
}

/**
 * POST /cargas/:id/coleta/iniciar — inicia etapa de coleta (esteira sequencial)
 * @param options.dt_coleta_inicio Opcional: data/hora ISO (informar data e hora)
 */
export async function iniciarColeta(
	cargaId: string,
	options?: { dt_coleta_inicio?: string },
): Promise<ViagemFluxoDTO> {
	return (await fetchData(
		`/api/tms/cargas/${cargaId}/coleta/iniciar`,
		options?.dt_coleta_inicio != null ? { dt_coleta_inicio: options.dt_coleta_inicio } : {},
		'POST',
	)) as ViagemFluxoDTO;
}

/**
 * POST /cargas/:id/coleta/finalizar — finaliza etapa de coleta (esteira sequencial)
 * @param options.dt_coleta_fim Opcional: data/hora ISO (informar data e hora)
 */
export async function finalizarColeta(
	cargaId: string,
	options?: { dt_coleta_fim?: string },
): Promise<ViagemFluxoDTO> {
	return (await fetchData(
		`/api/tms/cargas/${cargaId}/coleta/finalizar`,
		options?.dt_coleta_fim != null ? { dt_coleta_fim: options.dt_coleta_fim } : {},
		'POST',
	)) as ViagemFluxoDTO;
}

export async function createCarga(data: CargaPayload) {
	return await fetchData(`/api/tms/cargas`, normalizeCargaDates(data), 'POST');
}

/**
 * Parseia documentos (fis_documento_dfe) e retorna DTO para pré-preenchimento da carga
 */
export async function parseDocumentosParaCarga(documentoDfeIds: string[]): Promise<ParseDocumentosResult> {
	return await fetchData(`/api/tms/cargas/parser-documentos`, { documentoDfeIds }, 'POST');
}

/**
 * Cria carga com entregas e vínculos documento↔entrega (fluxo Nova Carga a partir de documentos)
 */
export async function createCargaComEntregas(data: CargaComEntregasPayload): Promise<Carga> {
	const payload = {
		...data,
		dt_coleta_inicio: data.dt_coleta_inicio ? normalizeIsoDate(data.dt_coleta_inicio) : data.dt_coleta_inicio,
		dt_coleta_fim: data.dt_coleta_fim ? normalizeIsoDate(data.dt_coleta_fim) : data.dt_coleta_fim,
		dt_coleta: data.dt_coleta ? normalizeIsoDate(data.dt_coleta) : data.dt_coleta,
	};
	return await fetchData(`/api/tms/cargas`, payload, 'POST');
}

export async function updateCarga(id: string, data: CargaPayload) {
	return await fetchData(`/api/tms/cargas/${id}`, normalizeCargaDates(data), 'PUT');
}

export async function deleteCarga(id: string) {
	return await fetchData(`/api/tms/cargas/${id}`, null, 'DELETE');
}

export async function getCargaStatus(id: string) {
	return await fetchData(`/api/tms/cargas/${id}/status`);
}

/**
 * Finaliza uma carga e avança para a próxima na viagem (se houver)
 * Retorna informações sobre o próximo status da viagem
 */
export async function finalizarCarga(
	cargaId: string,
	comprovante?: { file?: string; key?: string; dt_conclusao?: string },
) {
	return await fetchData(`/api/tms/cargas/${cargaId}/finalizar`, comprovante || {}, 'PATCH');
}

/**
 * Atualiza o status de uma carga específica
 * IMPORTANTE: Usar finalizarCarga() para respeitar a lógica de sequência
 */
export async function updateCargaStatus(cargaId: string, status: 'PENDENTE' | 'AGENDADA' | 'EM_COLETA' | 'EM_TRANSITO' | 'ENTREGUE') {
	return await fetchData(`/api/tms/cargas/${cargaId}/status`, { ds_status: status }, 'PATCH');
}

export async function scheduleCarga(
	cargaId: string,
	{ id_motorista_veiculo, dt_agendada }: { id_motorista_veiculo: string; dt_agendada: string },
) {
	// Prepare payload: set driver-vehicle relation, schedule dates and status
	const payload = normalizeCargaDates({
		id_motorista_veiculo,
		ds_status: 'AGENDADA',
	});

	// Use existing update endpoint to persist scheduling (payload is partial CargaPayload)
	const updated: Carga = await updateCarga(cargaId, payload as CargaPayload);

	// Keep backward-compatible shape expected by callers
	return { carga: updated, id_motorista_veiculo, dt_agendada, cargaId };
}

export type FormatoDataImport = 'serial_excel' | 'dd-mm-yyyy' | 'yyyy-mm-dd';

export interface CargasImportRequest {
	operacaoContainer?: boolean;
	mapColunas: Record<string, string | undefined>;
	mapFormatoData?: Record<string, FormatoDataImport>;
	mapPersonalizadas?: Record<string, string | undefined>;
	mapContainer?: {
		id_armador?: string;
		nr_container?: string;
		nr_lacre_container?: string;
		ds_destino_pais?: string;
		ds_setor_container?: string;
	};
	rows: Array<Record<string, unknown>>;
}

export interface CargasImportResult {
	total: number;
	sucesso: number;
	falhas: { linha: number; erro: string; code?: string; meta?: unknown }[];
	primeiraFalha?: { linha: number; erro: string; code?: string; meta?: unknown };
}

export async function importCargas(data: CargasImportRequest): Promise<CargasImportResult> {
	return (await fetchData(`/api/tms/cargas/import`, data, 'POST')) as CargasImportResult;
}

// --- Layouts de mapeamento (importação) ---

export interface ImportLayoutMapeamento {
	operacaoContainer?: boolean;
	mapColunas: Record<string, string | undefined>;
	mapFormatoData?: Record<string, FormatoDataImport>;
	mapPersonalizadas?: Record<string, string | undefined>;
	mapContainer?: {
		id_armador?: string;
		nr_container?: string;
		nr_lacre_container?: string;
		ds_destino_pais?: string;
		ds_setor_container?: string;
	};
}

export interface ImportLayout {
	id: string;
	ds_nome: string;
	ds_descricao: string | null;
	js_mapeamento: ImportLayoutMapeamento;
	dt_created?: string;
	dt_updated?: string;
}

export async function getImportLayouts(): Promise<ImportLayout[]> {
	return (await fetchData('/api/tms/cargas/import/layouts')) as ImportLayout[];
}

export async function createImportLayout(body: {
	ds_nome: string;
	ds_descricao?: string | null;
	js_mapeamento: ImportLayoutMapeamento;
}): Promise<ImportLayout> {
	return (await fetchData('/api/tms/cargas/import/layouts', body, 'POST')) as ImportLayout;
}

export async function updateImportLayout(
	id: string,
	body: { ds_nome?: string; ds_descricao?: string | null; js_mapeamento?: ImportLayoutMapeamento },
): Promise<ImportLayout> {
	return (await fetchData(`/api/tms/cargas/import/layouts/${id}`, body, 'PUT')) as ImportLayout;
}

export async function deleteImportLayout(id: string): Promise<void> {
	await fetchData(`/api/tms/cargas/import/layouts/${id}`, null, 'DELETE');
}
