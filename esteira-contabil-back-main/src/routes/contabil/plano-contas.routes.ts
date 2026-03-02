import { PlanoContasController } from '../../controllers/contabil/plano-contas.controller';
import express, { Router, RequestHandler } from 'express';

const router: Router = express.Router();

// GET routes
router.get(
  '/paginacao',
  PlanoContasController.getAllPaginado as unknown as RequestHandler
);
router.get(
  '/ordenado/:empresaId',
  PlanoContasController.getAllOrdenado as unknown as RequestHandler
);
router.get(
  '/ordenado/analisticas/:empresaId',
  PlanoContasController.getAnalisticasOrdenado as unknown as RequestHandler
);
router.get(
  '/despesa/:empresaId',
  PlanoContasController.getContasDespesaTmsByEmpresaId as unknown as RequestHandler
);
router.get(
  '/paginacao/analiticas',
  PlanoContasController.getAnalisticasPaginado as unknown as RequestHandler
);
router.get(
  '/:empresaId',
  PlanoContasController.getAll as unknown as RequestHandler
);

router.patch(
  '/tipo-despesa',
  PlanoContasController.setContaTipoDespesa as unknown as RequestHandler
);

// POST routes
router.post(
  '/link/grupoconta',
  PlanoContasController.linkGrupo as unknown as RequestHandler
);

export default router;
