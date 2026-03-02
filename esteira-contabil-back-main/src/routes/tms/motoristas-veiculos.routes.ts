import { Router } from 'express';
import MotoristaController from '@/controllers/tms/motorista.controller';

const router = Router();

/**
 * @route POST /motoristas-veiculos
 * @desc Vincula um motorista a um veículo
 * @access Private
 * @body {Object} { id_tms_motoristas, id_tms_veiculos, is_principal, is_ativo }
 * @returns {Object} Vínculo criado/atualizado
 */
router.post('/', MotoristaController.vincularVeiculo);

export default router;
