import { useMemo } from 'react';
import { Carga, Viagem } from '@/types/tms';
import {
	getCargaStatusVisual,
	groupCargasByStatusVisual,
	getProximoStatusViagem,
	getViagemStats,
	CargaStatusResult,
} from '@/lib/tms-status-utils';

/**
 * Hook para obter o status visual de uma carga específica
 */
export function useCargaStatus(carga: Carga, viagens: Viagem[]): CargaStatusResult {
	return useMemo(() => {
		const viagem = viagens.find((v) => v.js_viagens_cargas?.some((vc) => vc.id_carga === carga.id));
		return getCargaStatusVisual(carga, viagem);
	}, [carga, viagens]);
}

/**
 * Hook para agrupar cargas por status visual
 */
export function useGroupedCargas(cargas: Carga[], viagens: Viagem[]) {
	return useMemo(() => {
		return groupCargasByStatusVisual(cargas, viagens);
	}, [cargas, viagens]);
}

/**
 * Hook para obter estatísticas de uma viagem
 */
export function useViagemStats(viagem: Viagem) {
	return useMemo(() => {
		return getViagemStats(viagem);
	}, [viagem]);
}

/**
 * Hook para determinar próximo status ao finalizar uma carga
 */
export function useProximoStatus(viagem: Viagem | null, cargaId: string | null) {
	return useMemo(() => {
		if (!viagem || !cargaId) {
			return {
				proximoStatus: null,
				proximaCargaId: null,
				isUltimaCarga: false,
				mensagem: '',
			};
		}
		return getProximoStatusViagem(viagem, cargaId);
	}, [viagem, cargaId]);
}
