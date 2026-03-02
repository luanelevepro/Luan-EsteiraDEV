import { GrupoContasController } from '@/controllers/contabil/grupo-contas.controller';
import express, { Router, RequestHandler } from 'express';

const router: Router = express.Router();

// GET routes
router.get(
  '/:empresaId',
  GrupoContasController.getAllByEmpresa as RequestHandler
);

// POST/PUT routes
router.post('/', GrupoContasController.createOrUpdate as RequestHandler);

// DELETE routes
router.delete('/:grupoId', GrupoContasController.delete as RequestHandler);

// Status routes
router.put(
  '/activate/:grupoId',
  GrupoContasController.activate as RequestHandler
);
router.put(
  '/deactivate/:grupoId',
  GrupoContasController.deactivate as RequestHandler
);

export default router;
