export type FechamentoStatus = 'ABERTO' | 'PENDENTE' | 'FECHADO' | 'REABERTO';

export type FechamentoMotoristaListItem = {
  id: string;
  id_tms_motoristas: string;
  motorista_nome: string;
  motorista_documento?: string | null;

  competencia: string; // YYYY-MM
  status: FechamentoStatus;

  total_viagens: number;
  total_cargas: number;
  total_frete: number;
  total_adiantamentos: number;
  total_despesas: number;
  total_descontos: number;
  total_liquido: number;
};

export type FechamentoMotoristaListResponse = {
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  fechamentos: FechamentoMotoristaListItem[];
  allIds: string[];
};

export type FechamentoResumoResponse = {
  total_motoristas: number;
  total_fechados: number;
  total_pendentes: number;
  total_liquido: number;
};

export type FechamentoMotoristaFilters = {
  competencia?: string; // YYYY-MM
  status?: FechamentoStatus | 'TODOS';
  search?: string;
};

export type FechamentoMotoristaDetalhe = {
  id_tms_motoristas: string;
  competencia: string;

  motorista_nome: string;
  motorista_documento?: string | null;

  total_viagens: number;
  total_frete: number;
  /** Faturamento = soma dos CT-e emitidos pela empresa (id_fis_empresa_emitente) */
  faturamentoCteProprio?: number;
  total_adiantamentos: number;
  total_despesas: number;
  total_descontos: number;
  total_liquido: number;

  viagens: Array<{
    id: string;
    cd_viagem: string;
    dt_agendada?: string | null;
    dt_conclusao?: string | null;
    ds_status: string;
    /** Quantidade de CT-e emitidos pela empresa nesta viagem */
    cteProprioQtd?: number;
    /** Soma do valor (R$) dos CT-e emitidos pela empresa nesta viagem */
    cteProprioValor?: number;
    cargas: Array<{
      id: string;
      cd_carga: string | null;
      ds_status: string;
      nr_sequencia: number;
      dt_conclusao?: string | null;
      /** Quantidade de CT-e emitidos pela empresa nesta carga */
      cteProprioQtd?: number;
      /** Soma do valor (R$) dos CT-e emitidos pela empresa nesta carga */
      cteProprioValor?: number;
      entregas?: Array<{
        id: string;
        ds_status: string;
        dt_entrega?: string | null;
        vl_total_mercadoria?: number | null;
        nr_sequencia: number;
      }>;
      valor_total?: number;
    }>;
  }>;

  adiantamentos: Array<{
    id: string;
    ds_tipo: string;
    dt_despesa?: string | null;
    vl_despesa: number;
    ds_observacao?: string | null;
  }>;
};
