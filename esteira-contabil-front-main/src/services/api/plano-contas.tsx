import { fetchData } from './request-handler';

export type TipoDespesa = 'ABASTECIMENTO' | 'ADIANTAMENTO' | 'PEDAGIO' | 'DESPESA';

export async function getPlanoContasOrdenado(empresa_id: string) {
	return await fetchData(`/api/contabilidade/planocontas/ordenado/${empresa_id}`);
}

export async function getContasAnaliticasOrdenado(empresa_id: string) {
	return await fetchData(`/api/contabilidade/planocontas/ordenado/analisticas/${empresa_id}`);
}

export async function getPlanoContas(empresa_id: string) {
	return await fetchData(`/api/contabilidade/planocontas/${empresa_id}`);
}

export async function getPlanoContasPaginado(params: {
	empresaId: string;
	page: number;
	pageSize: number;
	orderBy: 'asc' | 'desc';
	orderColumn: string;
	search: string;
	status: string | null;
	tipos?: string[] | string | null;
}) {
	const { empresaId, page, pageSize, orderBy, orderColumn, search, status, tipos } = params;
	let url = `/api/contabilidade/planocontas/paginacao?empresaId=${empresaId}&page=${page}&pageSize=${pageSize}&orderBy=${orderBy}&orderColumn=${orderColumn}&search=${search}`;
	if (status) {
		url += `&status=${status}`;
	}
	// suporta filtros por tipo (array ou string CSV)
	if (tipos) {
		const tiposParam = Array.isArray(tipos) ? tipos.join(',') : tipos;
		url += `&tipos=${encodeURIComponent(tiposParam)}`;
	}
	return await fetchData(url);
}

export async function getContasAnaliticasPaginado(params: {
	empresaId: string;
	page: number;
	pageSize: number;
	orderBy: 'asc' | 'desc';
	orderColumn: string;
	search: string;
	status: string | null;
}) {
	const { empresaId, page, pageSize, orderBy, orderColumn, search, status } = params;
	let url = `/api/contabilidade/planocontas/paginacao/analiticas?empresaId=${empresaId}&page=${page}&pageSize=${pageSize}&orderBy=${orderBy}&orderColumn=${orderColumn}&search=${search}`;
	if (status) {
		url += `&status=${status}`;
	}
	return await fetchData(url);
}

export async function sincronizarPlanoContasByEmpresaId(empresa_id: string) {
	return await fetchData(`/api/contabilidade/sincronizar/planocontas/${empresa_id}`);
}

export async function linkPlanoGrupo(planosContas: unknown, grupoContaId: string) {
	return await fetchData(`/api/contabilidade/planocontas/link/grupoconta`, { planosContas, grupoContaId }, 'POST');
}

export async function setContaTipoDespesa(contasIds: string[], tipoDespesa: TipoDespesa | null) {
	return await fetchData(`/api/contabilidade/planocontas/tipo-despesa`, { contasIds, tipoDespesa }, 'PATCH');
}

export async function getContasDespesaTmsByEmpresaId(empresa_id: string) {
	return await fetchData(`/api/contabilidade/planocontas/despesa/${empresa_id}`);
}
