export interface TmsMotoristaVeiculoDTO {
  id: string;
  id_tms_motoristas_fk: string;
  id_tms_veiculos_fk: string;
  dt_inicio: Date;
  dt_fim?: Date | null;
  is_principal?: boolean | null;
  is_ativo?: boolean | null;
  dt_created: Date;
  dt_updated: Date;
}

export interface CreateTmsMotoristaVeiculoDTO {
  id_tms_motoristas_fk: string;
  id_tms_veiculos_fk: string;
  dt_inicio?: Date | string;
  dt_fim?: Date | string;
  is_principal?: boolean;
  is_ativo?: boolean;
}

export interface UpdateTmsMotoristaVeiculoDTO
  extends Partial<CreateTmsMotoristaVeiculoDTO> {}

export interface ViagemNfeDTO {
  id: string;
  id_viagem: string;
  id_nfe: string;
  ordem?: number | null;
  dt_created: Date;
  dt_updated: Date;
}

export interface CreateViagemNfeDTO {
  id_nfe: string;
  ordem?: number;
}

export interface UpdateViagemNfeDTO extends Partial<CreateViagemNfeDTO> {}

export interface ViagemCteDTO {
  id: string;
  id_viagem: string;
  id_cte: string;
  ordem?: number | null;
  dt_created: Date;
  dt_updated: Date;
}

export interface CreateViagemCteDTO {
  id_cte: string;
  ordem?: number;
}

export interface UpdateViagemCteDTO extends Partial<CreateViagemCteDTO> {}

export interface ViagemDocumentoDTO {
  id: string;
  ordem?: number;
}
export interface ViagemDTO {
  id: string;
  id_viagem: string;
  start_point?: string;
  dt_created: Date;
  dt_updated: Date;
  carga?: boolean | null;
  rota?: string[] | null;
  id_motorista: string;
  veiculos?: string[] | null;
}

export interface CreateViagemDTO {
  id_motorista: string;
  id_viagem?: string;
  veiculos?: string[];
  start_point?: string;
  carga?: boolean;
  rota?: string[];
  viagens?: ViagemDocumentoDTO[];
}

export interface UpdateViagemDTO {
  id_motorista?: string;
  veiculos?: string[];
  carga?: boolean;
  rota?: string[];
  viagens?: ViagemDocumentoDTO[];
}

export interface ViagemNfeResponseDTO extends ViagemNfeDTO {
  nfe?: NfeSimplifiedDTO;
}

export interface ViagemCteResponseDTO extends ViagemCteDTO {
  cte?: CteSimplifiedDTO;
}

export interface ViagemResponseDTO extends ViagemDTO {
  motorista?: MotoristaSimplifiedDTO;
  veiculos_detalhes?: VeiculoSimplifiedDTO[];
  viagens_nfe?: ViagemNfeResponseDTO[];
  viagens_cte?: ViagemCteResponseDTO[];
}

export interface TmsMotoristaVeiculoResponseDTO extends TmsMotoristaVeiculoDTO {
  tms_motoristas?: MotoristaSimplifiedDTO;
  tms_veiculos?: VeiculoSimplifiedDTO;
}

export interface NfeSimplifiedDTO {
  id: string;
  ds_chave?: string | null;
  ds_numero?: string | null;
  ds_serie?: string | null;
  dt_emissao?: Date | null;
  ds_razao_social_emitente?: string | null;
  ds_razao_social_destinatario?: string | null;
  vl_nf?: string | null;
}

export interface CteSimplifiedDTO {
  id: string;
  ds_chave?: string | null;
  ds_numero?: string | null;
  ds_serie?: number | null;
  dt_emissao?: Date | null;
  ds_razao_social_emitente?: string | null;
  ds_razao_social_remetente?: string | null;
  ds_razao_social_destinatario?: string | null;
  vl_total?: string | null;
  ds_nome_mun_ini?: string | null;
  ds_nome_mun_fim?: string | null;
}

export interface MotoristaSimplifiedDTO {
  id: string;
  id_ger_pessoa: string;
  ds_cnh_numero?: string;
  ds_cnh_categoria?: string;
  is_ativo?: boolean;
  ger_pessoa?: {
    id: string;
    ds_nome?: string;
    ds_cpf_cnpj?: string;
  };
}

export interface VeiculoSimplifiedDTO {
  id: string;
  ds_placa?: string;
  ds_nome?: string;
  is_ativo?: boolean;
  ds_tipo_unidade?: 'TRACIONADOR' | 'CARROCERIA' | 'RIGIDO' | null;
  ds_tipo_carroceria?: {
    CARRETA_LS;
    CARRETA_VANDERLEIA;
    CARRETA_4_EIXO;
    BITREM;
    RODOTREM;
    ROMEU_E_JULIETA;
    REBOQUE_SIMPLES;
  } | null;
}

export interface ViagemFilterDTO {
  carga?: boolean;
  id_motorista?: string;
  id_viagem?: string;
  id_veiculo?: string;
  dt_created_inicio?: Date | string;
  dt_created_fim?: Date | string;
  include_nfes?: boolean;
  include_ctes?: boolean;
  include_motorista?: boolean;
  include_veiculos?: boolean;
}

export interface ViagemQueryParamsDTO {
  page?: number;
  limit?: number;
  sort_by?: 'dt_created' | 'dt_updated' | 'id_viagem';
  sort_order?: 'asc' | 'desc';
  filter?: ViagemFilterDTO;
}

export interface AddDocumentosViagemDTO {
  nfes?: CreateViagemNfeDTO[];
  ctes?: CreateViagemCteDTO[];
}

export interface RemoveDocumentosViagemDTO {
  nfe_ids?: string[];
  cte_ids?: string[];
}

export interface DocumentoOrdemDTO {
  id: string;
  tipo: 'nfe' | 'cte';
  ordem: number;
}

export interface ReorderDocumentosDTO {
  documentos: DocumentoOrdemDTO[];
}

export interface PaginatedViagemResponseDTO {
  data: ViagemResponseDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface ViagemStatisticsDTO {
  total_viagens: number;
  total_nfes: number;
  total_ctes: number;
  viagens_ativas: number;
  viagens_carga: number;
  viagens_por_motorista: {
    id_motorista: string;
    nome_motorista?: string;
    count: number;
  }[];
  viagens_por_veiculo: {
    id_veiculo: string;
    placa_veiculo?: string;
    count: number;
  }[];
}

export interface CreateBatchViagensDTO {
  viagens: CreateViagemDTO[];
}

export interface UpdateBatchViagensDTO {
  updates: {
    id: string;
    data: UpdateViagemDTO;
  }[];
}

export interface DeleteBatchViagensDTO {
  ids: string[];
}

export interface CreateViagemWithMotoristaVeiculoDTO extends CreateViagemDTO {
  id_motorista: string;
}

export interface AssignMotoristaToVeiculoDTO {
  id_tms_motoristas_fk: string;
  id_tms_veiculos_fk: string;
  dt_inicio?: Date | string;
  is_principal?: boolean;
  is_ativo?: boolean;
}

export interface MotoristaVeiculoAssignmentResponseDTO {
  id: string;
  id_tms_motoristas_fk: string;
  id_tms_veiculos_fk: string;
  dt_inicio: Date;
  dt_fim?: Date | null;
  is_principal: boolean;
  is_ativo: boolean;
  motorista?: {
    id: string;
    ds_cnh_numero: string;
    ger_pessoa?: {
      ds_nome?: string;
      ds_cpf_cnpj?: string;
    };
  };
  veiculo?: {
    id: string;
    ds_placa: string;
    ds_nome: string;
  };
}
