import { deliveryStatusLabelPt, tripStatusLabelPt } from '@/components/general/tms/viagens/status-viagens';

export type Status = 'transit' | 'successTwo' | 'late' | 'planned';

/** Labels alinhados à fonte única TMS (status-viagens). */
export function badgeTripStatus(status: Status): string {
	switch (status) {
		case 'transit':
			return deliveryStatusLabelPt('EM_TRANSITO');
		case 'successTwo':
			return deliveryStatusLabelPt('ENTREGUE');
		case 'late':
			return 'Atrasado';
		case 'planned':
			return tripStatusLabelPt('PLANEJADA');
		default:
			return 'Desconhecido';
	}
}
