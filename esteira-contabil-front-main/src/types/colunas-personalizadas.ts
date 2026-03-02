export type TipoColunas = 'DATA' | 'TEXTO' | 'OPCAO';
export type TabelasPersonalizadas = 'CARGASLIST' | 'ENTREGASLIST' | 'VIAGENSLIST';

export interface ColunaPersonalizada {
	id: string;
	dt_created: string;
	dt_updated: string;
	ds_nome_coluna: string;
	ds_descricao: string | null;
	ds_tipo: TipoColunas;
	/** Para OPCAO: Record<label da opção, cor hex>. Para outros tipos: null. */
	js_valores: Record<string, string> | null;
	ds_tabela: TabelasPersonalizadas;
	id_sis_empresa: string;
	nr_ordem?: number;
}

export interface ColunaDado {
	id: string;
	id_sis_colunas_personalizadas: string;
	id_referencia: string;
	ds_valor: string;
}

export interface ColunaPersonalizadaCreate {
	ds_nome_coluna: string;
	ds_descricao?: string;
	ds_tipo: TipoColunas;
	/** Para OPCAO: Record<label, cor hex>. Obrigatório para OPCAO. */
	js_valores?: Record<string, string>;
	ds_tabela: TabelasPersonalizadas;
}

export interface ColunaPersonalizadaUpdate {
	ds_nome_coluna?: string;
	ds_descricao?: string;
	ds_tipo?: TipoColunas;
	js_valores?: Record<string, string>;
}
