import { Router } from 'express';
import { ColunasPersonalizadasController } from '../../controllers/tms/colunas-personalizadas.controller';

const router = Router();

router.get('/dados', ColunasPersonalizadasController.getDados);
router.put('/dados', ColunasPersonalizadasController.upsertDado);

router.get('/', ColunasPersonalizadasController.list);
router.post('/', ColunasPersonalizadasController.create);
router.patch('/reorder', ColunasPersonalizadasController.reorder);
router.put('/:id', ColunasPersonalizadasController.update);
router.delete('/:id', ColunasPersonalizadasController.delete);

export default router;
