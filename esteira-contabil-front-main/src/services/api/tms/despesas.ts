import { DespesaRecord } from '@/components/general/tms/viagens/viagem-details/types';
import { fetchData } from '@/services/api/request-handler';
import { Despesa } from '@/types/tms';

export async function createDespesas(viagemId: string, despesas: DespesaRecord[]) {
	return await fetchData(`/api/tms/viagens/${viagemId}/despesas`, despesas, 'POST');
}

export async function getDespesasByViagem(viagemId: string) {
	return await fetchData(`/api/tms/viagens/${viagemId}/despesas`, undefined, 'GET');
}

export async function getDespesaById(id: string) {
	return await fetchData(`/api/tms/despesas/${id}`, undefined, 'GET');
}

export async function updateDespesa(id: string, data: Despesa) {
	return await fetchData(`/api/tms/despesas/${id}`, data, 'PUT');
}

export async function deleteDespesa(id: string) {
	return await fetchData(`/api/tms/despesas/${id}`, undefined, 'DELETE');
}
