import { fetchData } from '../request-handler';
import type {
	ColunaPersonalizada,
	ColunaDado,
	ColunaPersonalizadaCreate,
	ColunaPersonalizadaUpdate,
	TabelasPersonalizadas,
} from '@/types/colunas-personalizadas';

const BASE = '/api/tms/colunas-personalizadas';

function normalizeJsValores(val: unknown): Record<string, string> | null {
	if (val == null || typeof val !== 'object' || Array.isArray(val)) return null;
	return val as Record<string, string>;
}

export async function getColunasPersonalizadas(ds_tabela: TabelasPersonalizadas): Promise<ColunaPersonalizada[]> {
	const list = (await fetchData(`${BASE}?ds_tabela=${encodeURIComponent(ds_tabela)}`)) as ColunaPersonalizada[];
	return list.map((c) => ({ ...c, js_valores: normalizeJsValores(c.js_valores) }));
}

export async function createColunaPersonalizada(data: ColunaPersonalizadaCreate): Promise<ColunaPersonalizada> {
	return (await fetchData<ColunaPersonalizadaCreate>(BASE, data, 'POST')) as ColunaPersonalizada;
}

export async function updateColunaPersonalizada(
	id: string,
	data: ColunaPersonalizadaUpdate,
): Promise<ColunaPersonalizada> {
	return (await fetchData<ColunaPersonalizadaUpdate>(`${BASE}/${id}`, data, 'PUT')) as ColunaPersonalizada;
}

export async function deleteColunaPersonalizada(id: string): Promise<void> {
	await fetchData(`${BASE}/${id}`, undefined, 'DELETE');
}

export async function reorderColunasPersonalizadas(
	ds_tabela: TabelasPersonalizadas,
	orderedIds: string[],
): Promise<void> {
	await fetchData(`${BASE}/reorder`, { ds_tabela, orderedIds }, 'PATCH');
}

export async function getColunasPersonalizadasDados(
	ds_tabela: TabelasPersonalizadas,
	ids: string[],
): Promise<ColunaDado[]> {
	if (ids.length === 0) return [];
	const idsParam = ids.join(',');
	return (await fetchData(`${BASE}/dados?ds_tabela=${encodeURIComponent(ds_tabela)}&ids=${encodeURIComponent(idsParam)}`)) as ColunaDado[];
}

export async function upsertColunaDado(body: {
	id_sis_colunas_personalizadas: string;
	id_referencia: string;
	ds_valor: string;
}): Promise<ColunaDado> {
	return (await fetchData(`${BASE}/dados`, body, 'PUT')) as ColunaDado;
}
