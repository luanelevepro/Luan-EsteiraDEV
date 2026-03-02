// Auto-generated from importableTables.ts

import { SessionData } from '@/configs/importable-tables';

export type ImportableTableName = 'emb_transportadoras';

// Defines which fields have display values for each table
export interface ImportableTableDisplayFields {
  emb_transportadoras: {
    cd_transportadora: 'Cód';
    ds_cnpj: 'CNPJ';
    ds_nome_fantasia: 'Nome Fantasia';
    ds_razao_social: 'Razão Social';
    id_emb_ibge_uf: 'UF';
    id_emb_ibge_cidade: 'undefined';
  };
}

export interface Emb_transportadoras_payload {
  cd_transportadora: string;
  /** Field with custom resolver */
  ds_cnpj: string;
  ds_nome_fantasia: string;
  ds_razao_social: string;
  /** Field with custom resolver */
  id_emb_empresas: string;
  /** Field with custom resolver */
  id_emb_ibge_uf: string;
  /** Field with custom resolver */
  id_emb_ibge_cidade: string;
}

export interface ImportableDatabaseSchema {
  emb_transportadoras: Emb_transportadoras_payload;
}

// Custom resolver field mapping
export interface CustomResolverFields {
  emb_transportadoras: {
    ds_cnpj: (sessionData: SessionData, data: any) => string;
    id_emb_empresas: (sessionData: SessionData, data: any) => string;
    id_emb_ibge_uf: (sessionData: SessionData, data: any) => string;
    id_emb_ibge_cidade: (sessionData: SessionData, data: any) => string;
  };
}

/** Informações de UF: sigla + código IBGE numérico (string) */
export type UfIbgeMap = Record<
  | 'RO'
  | 'AC'
  | 'AM'
  | 'RR'
  | 'PA'
  | 'AP'
  | 'TO'
  | 'MA'
  | 'PI'
  | 'CE'
  | 'RN'
  | 'PB'
  | 'PE'
  | 'AL'
  | 'SE'
  | 'BA'
  | 'MG'
  | 'ES'
  | 'RJ'
  | 'SP'
  | 'PR'
  | 'SC'
  | 'RS'
  | 'MS'
  | 'MT'
  | 'GO'
  | 'DF',
  string
>;
