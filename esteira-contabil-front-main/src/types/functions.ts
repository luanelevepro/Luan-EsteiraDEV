export type Status = 'transit' | 'successTwo' | 'late' | 'planned';

export function badgeTripStatus(status: Status) {
	switch (status) {
		case 'transit':
			return 'Em Trânsito';
		case 'successTwo':
			return 'Entregue';
		case 'late':
			return 'Atrasado';
		case 'planned':
			return 'Planejado';
		default:
			return 'Desconhecido';
	}
}
