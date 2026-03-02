import { Router } from 'express';
import { FisClientesController } from '../../controllers/tms/fis-clientes.controller';

const router = Router();

/**
 * @route GET /api/tms/fis-clientes
 * @desc Lista clientes fiscais (fis_clientes) da empresa para TMS (tomador/cliente com CNPJ)
 */
router.get('/', FisClientesController.getAll);

export default router;
