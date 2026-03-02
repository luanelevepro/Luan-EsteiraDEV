declare namespace ESTEIRA {
  namespace PAYLOAD {
    type Paginacao = {
      page: number;
      pageSize: number;
      orderBy: 'asc' | 'desc';
      orderColumn: string;
      search: string;
    };
    type CreateUFHistorico = {
      cd_uf: string;
      dt_vigencia: string;
      vl_percentual_ipva_carros: number;
      vl_percentual_ipva_caminhoes: number;
      vl_icms_proprio: number;
    };
    type UpdateSimplesNacional = {
      cd_simples: number;
      ds_nome: string;
    };
  }
  namespace RESPONSE {
    type Paginada<K extends string, T extends object> = {
      total: number;
      totalPages: number;
      page: number;
    } & {
      [P in K]: T[];
    };
  }
}
