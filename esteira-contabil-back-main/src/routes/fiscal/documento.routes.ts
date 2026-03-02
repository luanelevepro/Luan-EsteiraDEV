import { DocumentoController } from '@/controllers/fiscal/documento.controller';
const express = require('express');

let router = express.Router();

// Notas Fiscais
router.get('/paginacao', DocumentoController.getDocumentosPaginacao);
router.get(
  '/saidas/paginacao',
  DocumentoController.getDocumentosSaidaPaginacao
);

router.get('/nfe/:id', DocumentoController.getNfeDocumento);
router.get('/cte/:id', DocumentoController.getCteDocumento);
router.get('/nfse/:id', DocumentoController.getNfseDocumento);

// Itens de Notas
router.get('/nfe/itens/:id', DocumentoController.getItensNfe);
// Alterar item de NFe (vincular produto / aplicar regra)
router.post('/nfe/itens/alterar', DocumentoController.insertItensAlterNfe);
// Alterações feitas nos itens (por NFe e por item)
router.get('/nfe/alteracoes/:id', DocumentoController.getAlteracoesNfe);
router.get(
  '/nfe/itens/:id/alteracoes',
  DocumentoController.getAlteracoesPorItem
);

router.post('/nfe/testar-xml/:id_nfe', DocumentoController.testarXmlNfe);

router.post(
  '/nfe/integrar/dominio',
  DocumentoController.integrarNfeEntradaDominio
);

router.post(
  '/nfe/reverter/dominio',
  DocumentoController.reverterNfeEntradaDominio
);

// Atualiza dt_saida_entrega da NFe
router.patch(
  '/nfe/:id_nfe/dt-saida-entrega',
  DocumentoController.updateDtSaidaEntrega
);

// Marca documentos como 'Operação não realizada' com justificativas por documento
router.post(
  '/operacao-nao-realizada',
  DocumentoController.setDocumentoOperacaoNaoRealizada
);

// ======================== SUBCONTRATAÇÃO CTe ========================

// Registra alteração de subcontratação (transfere para outra empresa)
router.post(
  '/cte/subcontratacao/alterar',
  DocumentoController.updateDocumentoSubContratadoOwner
);

// Atualiza situação da alteração (APROVADO, REJEITADO, REVERTIDO)
router.patch(
  '/cte/subcontratacao/alteracao/:id_alteracao/situacao',
  DocumentoController.patchSituacaoAlteracaoCte
);

// Reverte alteração de subcontratação (restaura dados originais)
router.post(
  '/cte/subcontratacao/alteracao/:id_alteracao/reverter',
  DocumentoController.revertAlteracaoSubcontratacaoCte
);

// Documentos Relacionados
router.get('/:id/relacionados', DocumentoController.getRelacionadosDocumento);

// Operações de processamento em lote (CTe/NFe)
router.post('/cte/contra', DocumentoController.setCtesContra);
router.post('/nfe/processados', DocumentoController.setNfesProcessados);
router.post(
  '/nfe/relacionadas/processados',
  DocumentoController.setNfesRelacionadasProcessados
);

// Operação de Arquivar documento
router.patch('/:id/arquivar', DocumentoController.setOrUnsetArquivado);

export default router;
