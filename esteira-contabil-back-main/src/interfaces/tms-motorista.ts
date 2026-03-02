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

export interface UpdateTmsMotoristasDTO
  extends Partial<CreateTmsMotoristasDTO> {}
