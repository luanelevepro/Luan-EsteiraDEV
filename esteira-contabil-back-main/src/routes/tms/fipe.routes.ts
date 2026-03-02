import { Router } from 'express';
import { FipeController } from '../../controllers/tms/fipe.controller';

const router = Router();

router.get('/references', FipeController.getReferences);
router.get('/:vehicleType/brands', FipeController.getMarcas);
router.get('/:vehicleType/brands/:brandId/models', FipeController.getModelos);
router.get('/:vehicleType/brands/:brandId/models/:modelId/years', FipeController.getAnosPorModelo);
router.get('/:vehicleType/brands/:brandId/models/:modelId/years/:yearId', FipeController.getInfoHierarquico);
router.get('/:vehicleType/:fipeCode/years', FipeController.getAnosPorCodigoFipe);
router.get('/:vehicleType/:fipeCode/years/:yearId', FipeController.getInfoPorCodigo);

export default router;
