import { Veiculo } from '@/types/tms';
import { fetchData } from '../request-handler';

// // // // // // // // // // Veículos // // // // // // // // // //

export async function getVeiculos(empresaId: string, is_ativo?: boolean): Promise<Veiculo[]> {
	return await fetchData(`/api/tms/veiculos/${empresaId}?is_ativo=${is_ativo}`);
}

export async function getVeiculosPaginado(pageParameters: {
	page: number;
	pageSize: number;
	orderBy: string;
	orderColumn: string;
	search: string;
	status: string[];
	tipoVeiculo: string[];
}) {
	const statusQuery = pageParameters.status && pageParameters.status.length > 0 ? `&status=${pageParameters.status.join(',')}` : '';
	const tipoVeiculoQuery =
		pageParameters.tipoVeiculo && pageParameters.tipoVeiculo.length > 0 ? `&tipoVeiculo=${pageParameters.tipoVeiculo.join(',')}` : '';
	return await fetchData(
		`/api/tms/veiculos/paginacao?page=${pageParameters.page}&pageSize=${pageParameters.pageSize}&orderBy=${pageParameters.orderBy}&orderColumn=${pageParameters.orderColumn}&search=${pageParameters.search}${statusQuery}${tipoVeiculoQuery}`,
	);
}

export async function sincronizarVeiculos(empresaId: string) {
	return await fetchData(`/api/tms/veiculos/sincronizar/${empresaId}`, null, 'POST');
}

export async function createVeiculo(content: Record<string, unknown>) {
	return await fetchData(`/api/tms/veiculos`, content, 'POST');
}

export async function updateVeiculo(id: string, content: Record<string, unknown>) {
	return await fetchData(`/api/tms/veiculos/${id}`, content, 'PUT');
}

export async function updateVeiculos(veiculos: { id: string; is_ativo: boolean }[]) {
	return await Promise.all(veiculos.map((veiculo) => fetchData(`/api/tms/veiculos/${veiculo.id}`, { is_ativo: veiculo.is_ativo }, 'PUT')));
}

export async function ativarVeiculos(ids: string[]) {
	return await fetchData(`/api/tms/veiculos/ativar`, { ids }, 'POST');
}

export async function inativarVeiculos(ids: string[]) {
	return await fetchData(`/api/tms/veiculos/inativar`, { ids }, 'POST');
}

export async function setTipoUnidade(
	ids: string[],
	ds_tipo_unidade: 'TRACIONADOR' | 'CARROCERIA' | 'RIGIDO',
) {
	return await fetchData(`/api/tms/veiculos/set-tipo-unidade`, { ids, ds_tipo_unidade }, 'POST');
}

// // // // // // // // // // Armadores (cadastro global - operação container) // // // // // // // // // //

export async function getArmadores(): Promise<{ id: string; ds_nome: string }[]> {
	return await fetchData('/api/tms/armadores');
}

export async function createArmador(data: { ds_nome: string }) {
	return await fetchData('/api/tms/armadores', data, 'POST');
}

export async function updateArmador(id: string, data: { ds_nome: string }) {
	return await fetchData(`/api/tms/armadores/${id}`, data, 'PUT');
}

export async function deleteArmador(id: string) {
	return await fetchData(`/api/tms/armadores/${id}`, {}, 'DELETE');
}

// // // // // // // // // // Segmentos // // // // // // // // // //

export async function getSegmentos() {
	return await fetchData('/api/tms/segmentos');
}

export async function getSegmentosPaginado(pageParameters: {
	page: number;
	pageSize: number;
	orderBy: string;
	orderColumn: string;
	search: string;
	status: string[];
}) {
	const statusQuery = pageParameters.status && pageParameters.status.length > 0 ? `&status=${pageParameters.status.join(',')}` : '';
	return await fetchData(
		`/api/tms/segmentos/paginacao?page=${pageParameters.page}&pageSize=${pageParameters.pageSize}&orderBy=${pageParameters.orderBy}&orderColumn=${pageParameters.orderColumn}&search=${pageParameters.search}${statusQuery}`,
	);
}

export async function createSegmento(data: { cd_identificador?: string; ds_nome: string; is_ativo?: boolean }) {
	return await fetchData(`/api/tms/segmentos`, data, 'POST');
}

export async function updateSegmento(id: string, data: { ds_nome: string }) {
	return await fetchData(`/api/tms/segmentos/${id}`, data, 'PUT');
}

export async function deleteSegmento(id: string) {
	return await fetchData(`/api/tms/segmentos/${id}`, null, 'DELETE');
}

export async function ativarSegmentos(ids: string[]) {
	return await fetchData(`/api/tms/segmentos/ativar`, { ids }, 'POST');
}

export async function inativarSegmentos(ids: string[]) {
	return await fetchData(`/api/tms/segmentos/inativar`, { ids }, 'POST');
}

// // // // // // // // // // Clientes // // // // // // // // // //

export async function getClientes() {
	return await fetchData('/api/tms/clientes');
}

/** Clientes fiscais (fis_clientes) — cadastro do tomador/cliente com CNPJ para TMS */
export async function getFisClientes(): Promise<Array<{ id: string; ds_nome: string; ds_documento: string | null }>> {
	return await fetchData('/api/tms/fis-clientes');
}

export async function getClientesPaginado(pageParameters: {
	page: number;
	pageSize: number;
	orderBy: string;
	orderColumn: string;
	search: string;
}) {
	return await fetchData(
		`/api/tms/clientes/paginacao?page=${pageParameters.page}&pageSize=${pageParameters.pageSize}&orderBy=${pageParameters.orderBy}&orderColumn=${pageParameters.orderColumn}&search=${pageParameters.search}`,
	);
}

// // // // // // // // // // Motoristas // // // // // // // // // //

export async function getMotoristasPaginado(pageParameters: {
	page: number;
	pageSize: number;
	orderBy: string;
	orderColumn: string;
	search: string;
	status: string[];
}) {
	const statusQuery = pageParameters.status && pageParameters.status.length > 0 ? `&status=${pageParameters.status.join(',')}` : '';
	return await fetchData(
		`/api/tms/motoristas/paginacao?page=${pageParameters.page}&pageSize=${pageParameters.pageSize}&orderBy=${pageParameters.orderBy}&orderColumn=${pageParameters.orderColumn}&search=${pageParameters.search}${statusQuery}`,
	);
}

/** Sincroniza motoristas com RH/Funcionários (funcionários com cargo motorista). */
export async function sincronizarMotoristas() {
	return await fetchData<{ message: string }>(`/api/tms/motoristas/sincronizar`, {
		message: ''
	}, 'POST');
}

export async function createMotorista(data: {
	is_ativo?: boolean;
	funcionario: { ds_nome: string; ds_documento: string; ds_salario: string | number; ds_tipo_vinculo?: string };
	veiculoId?: string | null;
}) {
	return await fetchData(`/api/tms/motoristas`, data, 'POST');
}

export async function updateMotorista(
	id: string,
	data: { is_ativo?: boolean; funcionario?: Record<string, unknown>; veiculoId?: string | null },
) {
	return await fetchData(`/api/tms/motoristas/${id}`, data, 'PUT');
}

export async function getCliente(id: string) {
	return await fetchData(`/api/tms/clientes/${id}`);
}

export async function createCliente(data: { ds_nome: string; id_cidade: number }) {
	return await fetchData(`/api/tms/clientes`, data, 'POST');
}

export async function updateCliente(id: string, data: { ds_nome?: string; id_cidade?: number }) {
	return await fetchData(`/api/tms/clientes/${id}`, data, 'PUT');
}

export async function deleteCliente(id: string) {
	return await fetchData(`/api/tms/clientes/${id}`, null, 'DELETE');
}

// // // // // // // // // // Embarcadores // // // // // // // // // //

export async function getEmbarcadores() {
	return await fetchData<Array<{ id: string; ds_nome: string; ds_documento: string | null }>>('/api/tms/embarcadores');
}

// // // // // // // // // // Documentos Fiscais - Viagens // // // // // // // // // //

export async function getDocumentosVincular(competencia: string) {
	return await fetchData(`/api/tms/viagens/docs/vincular?competencia=${competencia}`);
}

export async function vincularDocumentosViagem(
	viagemId: string,
	data: {
		documentos: Array<{
			id: string;
			ordem: number | string;
		}>;
		cargaId?: string;
	},
) {
	return await fetchData(`/api/tms/viagens/${viagemId}/docs/vincular`, data, 'POST');
}
