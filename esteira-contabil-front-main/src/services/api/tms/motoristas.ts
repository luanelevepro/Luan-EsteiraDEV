import { fetchData } from '../request-handler';

export interface Motorista {
	id: string;
	id_rh_funcionarios?: string;
	ds_cnh_numero?: string;
	ds_cnh_categoria?: string;
	dt_vencimento_cnh?: string;
	is_ativo: boolean;
	dt_created: string;
	dt_updated: string;
	rh_funcionarios?: {
		id: string;
		ds_nome: string;
		ds_documento?: string;
		ds_tipo_vinculo?: string; // Adicionado para exibir o tipo de vínculo
	};
	tms_motoristas_veiculos?: Array<{
		id: string;
		id_tms_veiculos: string;
		is_principal: boolean;
		is_ativo: boolean;
	}>;
}

export async function getMotoristas() {
	return await fetchData('/api/tms/motoristas');
}

export async function getMotorista(id: string) {
	return await fetchData(`/api/tms/motoristas/${id}`);
}

export async function vincularMotoristaVeiculo(data: {
	id_tms_motoristas: string;
	id_tms_veiculos: string;
	is_principal: boolean;
	is_ativo: boolean;
}) {
	return await fetchData('/api/tms/motoristas-veiculos', data, 'POST');
}
