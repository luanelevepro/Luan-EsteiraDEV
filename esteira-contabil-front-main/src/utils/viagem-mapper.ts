/**
 * Mapeador de campos entre a estrutura antiga (compatibilidade) e nova (Prisma)
 * Facilita transição gradual dos componentes
 */

import { Viagem, Carga } from '@/types/tms';

/**
 * Extrai origem da primeira carga da viagem
 */
function extractOriginCity(viagem: Viagem): string | undefined {
	if (viagem.cargas && viagem.cargas.length > 0) {
		const firstCarga = viagem.cargas[0];
		return firstCarga.sis_cidade_origem?.ds_city || firstCarga.originCity;
	}
	if (viagem.js_viagens_cargas && viagem.js_viagens_cargas.length > 0) {
		const firstCarga = viagem.js_viagens_cargas[0].tms_cargas;
		return firstCarga?.sis_cidade_origem?.ds_city || firstCarga?.originCity;
	}
	return viagem.originCity;
}

/**
 * Extrai destino da última carga da viagem
 */
function extractMainDestination(viagem: Viagem): string | undefined {
	let cargas = viagem.cargas || [];
	if (cargas.length === 0 && viagem.js_viagens_cargas) {
		cargas = viagem.js_viagens_cargas
			.map((vc) => vc.tms_cargas)
			.filter((c): c is Carga => Boolean(c));
	}

	if (cargas.length > 0) {
		const lastCarga = cargas[cargas.length - 1];
		return lastCarga.sis_cidade_destino?.ds_city || lastCarga.destinationCity;
	}
	return viagem.mainDestination;
}

/**
 * Mapeia dados da API Prisma para formato compatível com componentes legados
 */
export function mapViagemFromAPI(apiData: Viagem): Viagem {
	return {
		...apiData,
		// Campos legados mapeados
		driverName: apiData.ds_motorista,
		truckPlate: apiData.ds_placa_cavalo,
		trailer1Plate: apiData.ds_placa_carreta_1 || undefined,
		trailer2Plate: apiData.ds_placa_carreta_2 || undefined,
		trailer3Plate: apiData.ds_placa_carreta_3 || undefined,
		createdAt: apiData.dt_created,
		scheduledDate: apiData.dt_agendada,
		estimatedReturnDate: apiData.dt_previsao_retorno,

		// Mapear status novo para legado
		status: mapStatusToLegacy(apiData.ds_status),

		// Extrair origem/destino das cargas
		originCity: extractOriginCity(apiData),
		mainDestination: extractMainDestination(apiData),
	};
}

/**
 * Mapeia dados do componente para formato da API Prisma
 */
export function mapViagemToAPI(componentData: Partial<Viagem>): Partial<Viagem> {
	return {
		cd_viagem: componentData.cd_viagem,
		ds_motorista: componentData.driverName || componentData.ds_motorista,
		ds_placa_cavalo: componentData.truckPlate || componentData.ds_placa_cavalo,
		ds_placa_carreta_1: componentData.trailer1Plate ?? componentData.ds_placa_carreta_1,
		ds_placa_carreta_2: componentData.trailer2Plate ?? componentData.ds_placa_carreta_2,
		ds_placa_carreta_3: componentData.trailer3Plate ?? componentData.ds_placa_carreta_3,
		ds_status: componentData.status ? mapStatusFromLegacy(componentData.status) : componentData.ds_status,
		dt_agendada: componentData.scheduledDate || componentData.dt_agendada,
		dt_previsao_retorno: componentData.estimatedReturnDate || componentData.dt_previsao_retorno,
		ds_comprovante_entrega: componentData.ds_comprovante_entrega,
		ds_comprovante_key: componentData.ds_comprovante_key,
	};
}

/**
 * Mapeia status da API (PRISMA) para legado
 * PLANEJADA → Planned
 * EM_COLETA → Picking Up
 * EM_VIAGEM → In Transit
 * CONCLUIDA → Completed
 * ATRASADA → Delayed
 * CANCELADA → (não mapeado, usa default)
 */
export function mapStatusToLegacy(
	status: 'PLANEJADA' | 'EM_COLETA' | 'EM_VIAGEM' | 'CONCLUIDA' | 'ATRASADA' | 'CANCELADA',
): 'Planned' | 'Picking Up' | 'In Transit' | 'Completed' | 'Delayed' {
	switch (status) {
		case 'PLANEJADA':
			return 'Planned';
		case 'EM_COLETA':
			return 'Picking Up';
		case 'EM_VIAGEM':
			return 'In Transit';
		case 'CONCLUIDA':
			return 'Completed';
		case 'ATRASADA':
			return 'Delayed';
		case 'CANCELADA':
			return 'Delayed'; // Default para não mapeado
		default:
			return 'Planned';
	}
}

/**
 * Mapeia status legado para API (PRISMA)
 * Planned → PLANEJADA
 * Picking Up → EM_COLETA
 * In Transit → EM_VIAGEM
 * Completed → CONCLUIDA
 * Delayed → ATRASADA
 */
export function mapStatusFromLegacy(
	status: 'Planned' | 'Picking Up' | 'In Transit' | 'Completed' | 'Delayed',
): 'PLANEJADA' | 'EM_COLETA' | 'EM_VIAGEM' | 'CONCLUIDA' | 'ATRASADA' | 'CANCELADA' {
	switch (status) {
		case 'Planned':
			return 'PLANEJADA';
		case 'Picking Up':
			return 'EM_COLETA';
		case 'In Transit':
			return 'EM_VIAGEM';
		case 'Completed':
			return 'CONCLUIDA';
		case 'Delayed':
			return 'ATRASADA';
		default:
			return 'PLANEJADA';
	}
}

/**
 * Array de viagens mapeado
 */
export function mapViagensFromAPI(viagens: Viagem[]): Viagem[] {
	return viagens.map(mapViagemFromAPI);
}

/**
 * Mapeia status da Carga (PRISMA) para legado
 */
export function mapCargaStatusToLegacy(
	status: 'PENDENTE' | 'AGENDADA' | 'EM_COLETA' | 'EM_TRANSITO' | 'ENTREGUE',
): 'Pendente' | 'Agendada' | 'Em Coleta' | 'Em Trânsito' | 'Entregue' {
	const statusMap: Record<string, 'Pendente' | 'Agendada' | 'Em Coleta' | 'Em Trânsito' | 'Entregue'> = {
		PENDENTE: 'Pendente',
		AGENDADA: 'Agendada',
		EM_COLETA: 'Em Coleta',
		EM_TRANSITO: 'Em Trânsito',
		ENTREGUE: 'Entregue',
	};
	return statusMap[status] || 'Pendente';
}

/**
 * Mapeia dados da Carga para incluir aliases legados
 */
// export function mapCargaFromAPI(apiData: any) {
// 	return {
// 		...apiData,
// 		// Aliases legados
// 		clientName: apiData.tms_clientes?.ds_nome || apiData.clientName,
// 		originCity: apiData.sis_cidade_origem?.ds_city || apiData.originCity,
// 		destinationCity: apiData.sis_cidade_destino?.ds_city || apiData.destinationCity,
// 		collectionDate: apiData.dt_coleta_inicio || apiData.collectionDate,
// 		status: mapCargaStatusToLegacy(apiData.ds_status) || apiData.status,
// 		weight: apiData.vl_peso_bruto || apiData.weight,
// 		volume: apiData.vl_cubagem || apiData.volume,
// 		packages: apiData.vl_qtd_volumes || apiData.packages,
// 		maxStacking: apiData.vl_limite_empilhamento || apiData.maxStacking,
// 		insuranceRequired: apiData.fl_requer_seguro ?? apiData.insuranceRequired,
// 	};
// }

// /**
//  * Mapeia array de cargas
//  */
// export function mapCargasFromAPI(cargas: any[]): any[] {
// 	return cargas.map(mapCargaFromAPI);
// }
