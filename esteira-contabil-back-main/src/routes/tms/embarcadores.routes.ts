import { Router } from 'express';
import { EmbarcadoresController } from '../../controllers/tms/embarcadores.controller';

const router = Router();

/**
 * @route GET /api/tms/embarcadores
 * @desc Busca todos os embarcadores da empresa TMS (para select/cadastro)
 */
router.get('/', EmbarcadoresController.getAll);

export default router;
