export interface TmsMotoristasDTO {
  id: string;
  id_ger_pessoa?: string | null;
  id_rh_funcionarios?: string | null;
  ds_cnh_numero?: string | null;
  ds_cnh_categoria?: string | null;
  dt_vencimento_cnh?: Date | null;
  dt_primeira_cnh?: Date | null;
  id_sis_municipios_cnh?: number | null;
  ds_tipo_vinculo?: string | null;
  is_ativo: boolean;
  dt_created: Date;
  dt_updated: Date;
}

export interface CreateTmsMotoristasDTO {
  id_ger_pessoa?: string | null;
  id_rh_funcionarios?: string | null;
  ds_cnh_numero?: string | null;
  ds_cnh_categoria?: string | null;
  dt_vencimento_cnh?: Date | string | null;
  dt_primeira_cnh?: Date | string | null;
  id_sis_municipios_cnh?: number | null;
  ds_tipo_vinculo?: string | null;
  is_ativo: boolean;
}

export interface CreateFuncionarioDTO {
  ds_nome: string;
  ds_documento?: string | null;
  ds_salario?: string | number | null;
  ds_tipo_vinculo?: string | null; // will be set to 'TERCEIRIZADO' by default when creating motorista terceirizado
}

// Extended DTO used by the motorista creation endpoint to create both
// rh_funcionarios + tms_motoristas (+ optional motorista_veiculo)
export interface CreateTmsMotoristaFullDTO extends CreateTmsMotoristasDTO {
  funcionario?: CreateFuncionarioDTO;
  veiculoId?: string | null;
}

export interface UpdateTmsMotoristasDTO extends Partial<CreateTmsMotoristasDTO> {}
