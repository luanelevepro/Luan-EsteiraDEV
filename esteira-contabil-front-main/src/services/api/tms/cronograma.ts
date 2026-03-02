import { fetchData } from '../request-handler';

export interface CronogramaEventoDTO {
	id_viagem: string;
	id_item: string;
	tipo: 'DESLOCAMENTO_VAZIO' | 'CARGA';
	dt_inicio: string;
	dt_fim: string;
	ds_status: string;
	cd_viagem: string;
	label?: string;
	/** ID da carga (apenas quando tipo === 'CARGA') para abrir detalhes */
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

/**
 * GET /api/tms/cronograma?dataInicio=ISO&dataFim=ISO&placa=
 */
export async function getCronograma(
	dataInicio: string,
	dataFim: string,
	placa?: string,
): Promise<CronogramaResponseDTO> {
	const params = new URLSearchParams({
		dataInicio,
		dataFim,
	});
	if (placa?.trim()) params.set('placa', placa.trim());
	const data = (await fetchData(
		`/api/tms/cronograma?${params.toString()}`,
	)) as CronogramaResponseDTO;
	return data;
}
