import { fetchData } from '../request-handler';

export type VehicleTypeFipe = 'cars' | 'motorcycles' | 'trucks';

export interface FipeReference {
	code: string;
	month?: string;
	label?: string;
}

export interface FipeBrand {
	code: string;
	name: string;
	id?: number;
}

export interface FipeModel {
	code: string;
	name: string;
	id?: number;
}

export interface FipeYear {
	code: string;
	name: string;
	id?: string;
	label?: string;
}

export interface FipeTabelaInput {
	ds_marca: string;
	ds_modelo: string;
	cd_fipe: string;
	vl_ano_modelo: string;
	vl_valor: string;
	id_emb_tipos_veiculo?: number | null;
}

export async function getFipeReferences(): Promise<FipeReference[]> {
	return fetchData('/api/tms/fipe/references');
}

export async function getFipeMarcas(
	vehicleType: VehicleTypeFipe,
	reference?: string,
): Promise<FipeBrand[]> {
	const refQuery = reference ? `&reference=${reference}` : '';
	return fetchData(`/api/tms/fipe/${vehicleType}/brands?${refQuery}`);
}

export async function getFipeModelos(
	vehicleType: VehicleTypeFipe,
	brandId: string,
	reference?: string,
): Promise<FipeModel[]> {
	const refQuery = reference ? `&reference=${reference}` : '';
	return fetchData(`/api/tms/fipe/${vehicleType}/brands/${brandId}/models?${refQuery}`);
}

export async function getFipeAnosPorModelo(
	vehicleType: VehicleTypeFipe,
	brandId: string,
	modelId: string,
	reference?: string,
): Promise<FipeYear[]> {
	const refQuery = reference ? `&reference=${reference}` : '';
	return fetchData(
		`/api/tms/fipe/${vehicleType}/brands/${brandId}/models/${modelId}/years?${refQuery}`,
	);
}

export async function getFipeAnosPorCodigo(
	vehicleType: VehicleTypeFipe,
	fipeCode: string,
	reference?: string,
): Promise<FipeYear[]> {
	const refQuery = reference ? `&reference=${reference}` : '';
	return fetchData(`/api/tms/fipe/${vehicleType}/${encodeURIComponent(fipeCode)}/years?${refQuery}`);
}

export async function getFipeInfoHierarquico(
	vehicleType: VehicleTypeFipe,
	brandId: string,
	modelId: string,
	yearId: string,
	reference?: string,
): Promise<FipeTabelaInput> {
	const refQuery = reference ? `&reference=${reference}` : '';
	return fetchData(
		`/api/tms/fipe/${vehicleType}/brands/${brandId}/models/${modelId}/years/${yearId}?${refQuery}`,
	);
}

export async function getFipeInfoPorCodigo(
	vehicleType: VehicleTypeFipe,
	fipeCode: string,
	yearId: string,
	reference?: string,
): Promise<FipeTabelaInput> {
	const refQuery = reference ? `&reference=${reference}` : '';
	return fetchData(
		`/api/tms/fipe/${vehicleType}/${encodeURIComponent(fipeCode)}/years/${yearId}?${refQuery}`,
	);
}
