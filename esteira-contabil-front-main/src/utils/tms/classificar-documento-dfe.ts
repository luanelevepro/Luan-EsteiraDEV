/**
 * Classificação de documento DFe por papel da empresa (CT-e próprio vs DF-e relacionado).
 * Mesmas regras do backend; usada quando a lista vem de GET /disponiveis.
 */

import type { DocBucket } from '@/types/tms';

export interface DocParaClassificacao {
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
 * Classifica um documento em bucket para exibição (esquerda = CT-e, direita = DF-e).
 * Sem coluna "Sem vínculo": CT-e aparece à esquerda, NF-e e CT-e subcontratado à direita.
 */
export function classificarDocBucket(doc: DocParaClassificacao, empresaId: string): DocBucket {
	if (doc.ds_tipo === 'CTE' && doc.js_cte?.id_fis_empresa_emitente === empresaId) {
		return 'CTE_PROPRIO';
	}
	if (doc.ds_tipo === 'CTE' && doc.js_cte?.id_fis_empresa_subcontratada === empresaId) {
		return 'DFE_RELACIONADO';
	}
	if (doc.ds_tipo === 'NFE' && doc.js_nfe?.id_fis_empresa_transportadora === empresaId) {
		return 'DFE_RELACIONADO';
	}
	// Sem vínculo com empresa: mesmo assim exibir como CT-e ou DF-e (não criar coluna separada)
	if (doc.ds_tipo === 'CTE') return 'CTE_PROPRIO';
	return 'DFE_RELACIONADO';
}

/** Retorna o label curto da badge para exibição. */
export function docBadgeFromBucket(
	bucket: DocBucket,
	ds_tipo: string
): string {
	if (bucket === 'CTE_PROPRIO') return 'CT-e Próprio';
	if (bucket === 'DFE_RELACIONADO') {
		return ds_tipo === 'CTE' ? 'CT-e Subcontratado' : 'DF-e Base';
	}
	return ds_tipo === 'CTE' ? 'CT-e' : 'DF-e';
}
