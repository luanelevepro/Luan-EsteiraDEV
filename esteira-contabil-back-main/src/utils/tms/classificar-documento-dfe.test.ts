/**
 * Testes da classificação CT-e próprio vs DF-e relacionado.
 * Regra: CT-e com id_fis_empresa_emitente = nossa empresa → CT-e emitidos (esquerda).
 * CT-e com id_fis_empresa_subcontratada = nossa empresa → DF-e relacionados (direita).
 */
import {
  classificarDocumentoDfe,
  type DocumentoParaClassificacao,
} from './classificar-documento-dfe';

const NOSSA_EMPRESA = 'empresa-tomazi-id';
const EMITENTE_SEARA = 'empresa-seara-id';

describe('classificarDocumentoDfe', () => {
  it('deve classificar CT-e emitido pela nossa empresa como LEFT_CTE_PROPRIO', () => {
    const doc: DocumentoParaClassificacao = {
      ds_tipo: 'CTE',
      js_cte: {
        id_fis_empresa_emitente: NOSSA_EMPRESA,
        id_fis_empresa_subcontratada: null,
      },
    };
    expect(classificarDocumentoDfe(doc, NOSSA_EMPRESA)).toBe('LEFT_CTE_PROPRIO');
  });

  it('deve classificar CT-e em que somos subcontratada como RIGHT_CTE_SUBCONTRATADO', () => {
    const doc: DocumentoParaClassificacao = {
      ds_tipo: 'CTE',
      js_cte: {
        id_fis_empresa_emitente: EMITENTE_SEARA,
        id_fis_empresa_subcontratada: NOSSA_EMPRESA,
      },
    };
    expect(classificarDocumentoDfe(doc, NOSSA_EMPRESA)).toBe(
      'RIGHT_CTE_SUBCONTRATADO'
    );
  });

  it('CT-e 18769246: se nossa empresa é subcontratada, deve ir para RIGHT (DF-e relacionados)', () => {
    const doc: DocumentoParaClassificacao = {
      ds_tipo: 'CTE',
      js_cte: {
        id_fis_empresa_emitente: EMITENTE_SEARA,
        id_fis_empresa_subcontratada: NOSSA_EMPRESA,
      },
    };
    expect(classificarDocumentoDfe(doc, NOSSA_EMPRESA)).toBe(
      'RIGHT_CTE_SUBCONTRATADO'
    );
  });

  it('deve classificar NF-e com nossa empresa como transportadora como RIGHT_NFE_TRANSPORTADORA', () => {
    const doc: DocumentoParaClassificacao = {
      ds_tipo: 'NFE',
      js_nfe: {
        id_fis_empresa_transportadora: NOSSA_EMPRESA,
      },
    };
    expect(classificarDocumentoDfe(doc, NOSSA_EMPRESA)).toBe(
      'RIGHT_NFE_TRANSPORTADORA'
    );
  });

  it('deve retornar IGNORAR quando CT-e não tem vínculo com nossa empresa', () => {
    const doc: DocumentoParaClassificacao = {
      ds_tipo: 'CTE',
      js_cte: {
        id_fis_empresa_emitente: EMITENTE_SEARA,
        id_fis_empresa_subcontratada: null,
      },
    };
    expect(classificarDocumentoDfe(doc, NOSSA_EMPRESA)).toBe('IGNORAR');
  });

  it('prioridade: emitente prevalece sobre subcontratada quando ambos são nossa empresa', () => {
    const doc: DocumentoParaClassificacao = {
      ds_tipo: 'CTE',
      js_cte: {
        id_fis_empresa_emitente: NOSSA_EMPRESA,
        id_fis_empresa_subcontratada: NOSSA_EMPRESA,
      },
    };
    expect(classificarDocumentoDfe(doc, NOSSA_EMPRESA)).toBe('LEFT_CTE_PROPRIO');
  });
});
