/**
 * Classificação de documento DFe por papel da empresa fiscal (CT-e próprio vs DFe relacionados).
 * Regra: CT-e próprio = emitente (id_fis_empresa_emitente = nossa empresa); DFe relacionado =
 * CT-e subcontratada (id_fis_empresa_subcontratada = nossa empresa) ou NF-e transportadora.
 * Se um CT-e que a empresa não emitiu aparecer como "CT-e emitidos", conferir em fis_cte:
 * id_fis_empresa_emitente deve ser o emitente real; id_fis_empresa_subcontratada deve ser nossa
 * empresa quando formos a subcontratada.
 */

export type ClassificacaoDocumentoDfe =
  | 'LEFT_CTE_PROPRIO'
  | 'RIGHT_CTE_SUBCONTRATADO'
  | 'RIGHT_NFE_TRANSPORTADORA'
  | 'IGNORAR';

export interface DocumentoParaClassificacao {
  ds_tipo: string;
  js_cte?: {
    id_fis_empresa_emitente?: string | null;
    id_fis_empresa_subcontratada?: string | null;
  } | null;
  js_nfe?: {
    id_fis_empresa_transportadora?: string | null;
  } | null;
}

/**
 * Classifica um documento DFe pelo papel da empresa fiscal.
 * @param doc Documento com ds_tipo e opcionalmente js_cte / js_nfe (com ids de empresa)
 * @param fisEmpId ID da empresa fiscal (fis_empresas.id)
 * @returns Classificação para layout left (CT-e próprio) ou right (DFe relacionados), ou IGNORAR
 */
export function classificarDocumentoDfe(
  doc: DocumentoParaClassificacao,
  fisEmpId: string
): ClassificacaoDocumentoDfe {
  if (doc.ds_tipo === 'CTE' && doc.js_cte?.id_fis_empresa_emitente === fisEmpId) {
    return 'LEFT_CTE_PROPRIO';
  }
  if (doc.ds_tipo === 'CTE' && doc.js_cte?.id_fis_empresa_subcontratada === fisEmpId) {
    return 'RIGHT_CTE_SUBCONTRATADO';
  }
  if (doc.ds_tipo === 'NFE' && doc.js_nfe?.id_fis_empresa_transportadora === fisEmpId) {
    return 'RIGHT_NFE_TRANSPORTADORA';
  }
  return 'IGNORAR';
}
