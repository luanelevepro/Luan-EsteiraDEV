import { Router } from 'express';
import * as controller from '@/controllers/fiscal/auditoria.controller';

const router = Router();

// === DOCUMENTOS DE AUDITORIA (MOCK) ===
// GET /fiscal/auditoria/documentos - lista documentos auditados
router.get('/documentos', controller.listDocumentos);

// GET /fiscal/auditoria/documentos/:id - obtém documento por id
router.get('/documentos/:id', controller.getDocumento);

// GET /fiscal/auditoria/documentos/:id/inconsistencias - obtém inconsistências do documento
router.get('/documentos/:id/inconsistencias', controller.getInconsistencias);

// === TIPOS DE INCONSISTÊNCIA (MOCK) ===
// GET /fiscal/auditoria/tipos-inconsistencia - lista tipos
router.get('/tipos-inconsistencia', controller.listTiposInconsistencia);

// === ESTATÍSTICAS (MOCK) ===
// GET /fiscal/auditoria/estatisticas - estatísticas gerais
router.get('/estatisticas', controller.getEstatisticasGerais);

// GET /fiscal/auditoria/empresas - lista empresas com estatísticas (para escritórios)
router.get('/empresas', controller.getEmpresasComEstatisticas);

// GET /fiscal/auditoria/estatisticas/:cnpj - estatísticas por empresa
router.get('/estatisticas/:cnpj', controller.getEstatisticasEmpresa);

// === EXECUÇÕES (MOCK) ===
// GET /fiscal/auditoria/execucoes - lista execuções
router.get('/execucoes', controller.listExecucoes);

// === TIPOS (ORIGINAL) ===
// GET /fiscal/auditoria/tipos - lista todas as regras
router.get('/tipos/', controller.list);

// GET /fiscal/auditoria/tipos/:id - obtém por id
router.get('/tipos/:id', controller.getById);

// POST /fiscal/auditoria/tipos - cria
router.post('/tipos/', controller.create);

// PUT /fiscal/auditoria/tipos/:id - atualiza
router.put('/tipos/:id', controller.update);

// DELETE /fiscal/auditoria/tipos/:id - remove
router.delete('/tipos/:id', controller.remove);

export default router;
