import { Router } from 'express';
import { ArmadoresController } from '../../controllers/tms/armadores.controller';

const router = Router();

/**
 * @route GET /api/tms/armadores
 * @desc Lista todos os armadores (cadastro global para operação de container)
 */
router.get('/', ArmadoresController.getAll);

/**
 * @route POST /api/tms/armadores
 * @desc Cria um armador
 */
router.post('/', ArmadoresController.create);

/**
 * @route PUT /api/tms/armadores/:id
 * @desc Atualiza um armador
 */
router.put('/:id', ArmadoresController.update);

/**
 * @route DELETE /api/tms/armadores/:id
 * @desc Remove um armador
 */
router.delete('/:id', ArmadoresController.delete);

export default router;
