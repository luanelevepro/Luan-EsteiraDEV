import { Router } from 'express';
import * as despesasController from '../../controllers/tms/despesas.controller';

const router = Router();

/**
 * @route POST /viagens/:viagemId/despesas
 * @desc Create multiple despesas for a viagem
 * @access Private
 */
router.post('/viagens/:viagemId/despesas', despesasController.create);

/**
 * @route GET /viagens/:viagemId/despesas
 * @desc List despesas for a viagem
 * @access Private
 */
router.get('/viagens/:viagemId/despesas', despesasController.listByViagem);

/**
 * @route GET /despesas/:id
 * @desc Get a single despesa by id
 * @access Private
 */
router.get('/despesas/:id', despesasController.getById);

/**
 * @route PUT /despesas/:id
 * @desc Update a despesa
 * @access Private
 */
router.put('/despesas/:id', despesasController.update);

/**
 * @route DELETE /viagens/:viagemId/despesas
 * @desc Delete despesas by viagem
 * @access Private
 */
router.delete('/viagens/:viagemId/despesas', despesasController.deleteByViagem);

/**
 * @route DELETE /despesas/:id
 * @desc Delete a single despesa
 * @access Private
 */
router.delete('/despesas/:id', despesasController.deleteById);

export default router;
