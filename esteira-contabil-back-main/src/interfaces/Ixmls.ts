export interface DecodedXmlData {
  type: 'NFE' | 'CTE' | 'EVENTO';
  rawXml: string;
  fileName: string;
  parsedData: any;
}

export interface NFeData {
  ds_id_nfe: string;
  ds_chave: string;
  ds_uf?: string;
  cd_nf?: string;
  ds_natureza_operacao?: string;
  ds_modelo?: string;
  ds_serie?: string;
  ds_numero?: string;
  dt_emissao?: Date;
  dt_saida_entrega?: Date;
  cd_tipo_operacao?: string;
  cd_municipio?: string;
  ds_fin_nfe?: string;
  vl_base_calculo?: string;
  vl_produto?: string;
  vl_nf?: string;
  vl_frete?: string;
  vl_seg?: string;
  vl_desc?: string;
  vl_ii?: string;
  vl_ipi?: string;
  vl_ipidevol?: string;
  vl_pis?: string;
  vl_cofins?: string;
  vl_outros?: string;
  vl_bc?: string;
  vl_icms?: string;
  vl_icms_desoner?: string;
  ds_base_calculo_mono_total?: string;
  ds_porcentagem_mono_total?: string;
  js_itens?: any;
  ds_documento_emitente?: string;
  ds_razao_social_emitente?: string;
  cd_crt_emitente?: string;
  ds_documento_destinatario?: string;
  ds_razao_social_destinatario?: string;
  ds_documento_transportador?: string;
  ds_razao_social_transportador?: string;
  id_fis_empresa_emitente?: string;
  id_fis_empresa_destinatario?: string;
  id_fis_empresa_transportadora?: string;
}

export interface CTeData {
  ds_id_cte: string;
  ds_chave: string;
  ds_uf?: string;
  cd_ibge?: string;
  cd_cte?: string;
  ds_cfop?: string;
  ds_icms_tag?: string;
  ds_natureza_operacao?: string;
  ds_modelo?: number;
  ds_serie?: number;
  ds_numero?: string;
  dt_emissao?: Date;
  ds_tp_cte?: number;
  ds_modal?: string;
  ds_tp_serv?: number;
  cd_mun_env?: string;
  ds_nome_mun_env?: string;
  ds_uf_env?: string;
  cd_mun_ini?: string;
  ds_nome_mun_ini?: string;
  ds_uf_ini?: string;
  cd_mun_fim?: string;
  ds_nome_mun_fim?: string;
  ds_uf_fim?: string;
  ds_retira?: number;
  ds_ind_ie_toma?: number;
  ds_documento_emitente?: string;
  ds_razao_social_emitente?: string;
  ds_documento_remetente?: string;
  ds_razao_social_remetente?: string;
  ds_documento_destinatario?: string;
  ds_razao_social_destinatario?: string;
  ds_documento_tomador?: string;
  ds_razao_social_tomador?: string;
  vl_total?: string;
  vl_rec?: string;
  vl_total_trib?: string;
  ds_cst_tributacao?: string;
  vl_base_calculo_icms?: string;
  vl_icms?: string;
  cd_icms?: string;
  vl_porcentagem_icms?: string;
  id_fis_empresa_emitente?: string;
  id_fis_empresa_remetente?: string;
  id_fis_empresa_destinatario?: string;
  id_fis_empresa_tomador?: string;
}

export interface UploadResult {
  success: boolean;
  fileName: string;
  type: 'NFE' | 'CTE' | 'EVENTO';
  id?: string;
  error?: string;
}
