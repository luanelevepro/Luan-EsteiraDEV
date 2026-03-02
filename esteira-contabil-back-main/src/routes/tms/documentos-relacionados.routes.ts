import { Router } from 'express';
import { DocumentosRelacionadosController } from '../../controllers/tms/documentos-relacionados.controller';

const router = Router();

const DISPONIVEIS_TIMEOUT_MS = 30000;

/**
 * @route GET /api/tms/documentos/disponiveis
 * @desc Busca documentos disponíveis para uma empresa
 * @query search - Termo de busca (opcional)
 * @query tipo - Filtro de tipo (CTE, NFE, AMBOS) (opcional)
 * @query dataInicio - Data de início (opcional)
 * @query dataFim - Data de fim (opcional)
 * @query backfill - 'false' para resposta rápida sem backfill (opcional)
 */
router.get(
  '/disponiveis',
  (req, _res, next) => {
    req.setTimeout(DISPONIVEIS_TIMEOUT_MS);
    next();
  },
  DocumentosRelacionadosController.getDisponiveis
);
/**
 * @route GET /api/tms/documentos/disponiveis-separados
 * @desc Documentos segmentados: left = CT-e próprio, right = DFe relacionados
 * @query competencia - yyyy-mm (opcional)
 * @query dataInicio, dataFim - intervalo (opcional)
 * @query search - texto (opcional)
 * @query incluirRelacionamentos - true|false (default true)
 */
router.get(
  '/disponiveis-separados',
  (req, _res, next) => {
    req.setTimeout(DISPONIVEIS_TIMEOUT_MS);
    next();
  },
  DocumentosRelacionadosController.getDisponiveisSeparados
);
// Busca apenas documentos de despesas (NFe / NFSe) onde a empresa é destinatário
router.get(
  '/despesas',
  DocumentosRelacionadosController.getDespesasDisponiveis
);

/**
 * @route POST /api/tms/documentos/agrupar
 * @desc Agrupa documentos de forma inteligente para criação de entregas
 * @body documentosIds - Array com IDs dos documentos
 */
router.post('/agrupar', DocumentosRelacionadosController.agruparParaEntregas);

/**
 * @route GET /api/tms/documentos/:id/relacionamentos
 * @desc Busca relacionamentos de um documento específico
 */
router.get(
  '/:id/relacionamentos',
  DocumentosRelacionadosController.getRelacionamentos
);

export default router;
