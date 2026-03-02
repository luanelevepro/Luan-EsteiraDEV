import { DepartamentoController } from '../../controllers/contabil/departamento.controller';
import express, { Router, RequestHandler } from 'express';

const router: Router = express.Router();

// GET routes
router.get('/paginacao', DepartamentoController.getPaginacao);
router.get('/:empresaId', DepartamentoController.getAllByEmpresa);

// POST routes
router.post('/sincronizar/:empresaId', DepartamentoController.sincronizar);
router.post('/ativar', DepartamentoController.ativarTodos);
router.post('/inativar', DepartamentoController.inativarTodos);
router.post('/', DepartamentoController.create);

// PUT routes
router.put('/:id', DepartamentoController.updateOne);
router.put('/', DepartamentoController.update);

export default router;
