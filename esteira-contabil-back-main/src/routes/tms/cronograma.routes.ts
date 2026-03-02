import { Router } from 'express';
import * as cronogramaController from '../../controllers/tms/cronograma.controller';

const router = Router();

router.get('/', cronogramaController.getCronograma);

export default router;
