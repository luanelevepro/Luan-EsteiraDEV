export interface GerPessoaDTO {
  id: string;
  ds_tipo_pessoa: string;
  ds_nome: string;
  ds_documento: string;
  ds_email?: string | null;
  ds_telefone?: string | null;
  ds_logradouro?: string | null;
  ds_numero?: string | null;
  ds_complemento?: string | null;
  ds_bairro?: string | null;
  ds_cep?: string | null;
  id_sis_municipios?: string | null;
  is_ativo: boolean;
  dt_created_at: Date;
  dt_updated_at: Date;
}

export interface CreateGerPessoaDTO {
  ds_tipo_pessoa?: string; // Default is "F"
  ds_nome: string;
  ds_documento: string;
  ds_email?: string;
  ds_telefone?: string;
  ds_logradouro?: string;
  ds_numero?: string;
  ds_complemento?: string;
  ds_bairro?: string;
  ds_cep?: string;
  id_sis_municipios?: string;
  is_ativo?: boolean; // Default is true
}

export interface UpdateGerPessoaDTO extends Partial<CreateGerPessoaDTO> {}
