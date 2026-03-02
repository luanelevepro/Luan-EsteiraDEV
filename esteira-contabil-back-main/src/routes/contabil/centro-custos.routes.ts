import { CentroCustosController } from '../../controllers/contabil/centro-custos.controller';
import express, { Router, RequestHandler } from 'express';

const router: Router = express.Router();

// GET routes
router.get('/paginacao', CentroCustosController.getPaginacao);
router.get('/:empresaId', CentroCustosController.getAllByEmpresa);

// POST routes
router.post('/sincronizar/:empresaId', CentroCustosController.sincronizar);
router.post('/ativar', CentroCustosController.ativarTodos);
router.post('/inativar', CentroCustosController.inativarTodos);
router.post('/', CentroCustosController.create);

// PUT routes
router.put('/:id', CentroCustosController.updateOne);
router.put('/', CentroCustosController.update);

export default router;
