import { TipoGrupoController } from '../../controllers/contabil/tipo-grupo.controller';
import express, { Router, RequestHandler } from 'express';

const router: Router = express.Router();

// GET routes
router.get('/', TipoGrupoController.getAll as unknown as RequestHandler);

// POST/PUT routes
router.post('/', TipoGrupoController.create as unknown as RequestHandler);

// DELETE routes
router.delete(
  '/:tipoId',
  TipoGrupoController.delete as unknown as RequestHandler
);

// Status routes
router.put(
  '/activate/:tipoId',
  TipoGrupoController.activate as unknown as RequestHandler
);
router.put(
  '/deactivate/:tipoId',
  TipoGrupoController.deactivate as unknown as RequestHandler
);

export default router;
