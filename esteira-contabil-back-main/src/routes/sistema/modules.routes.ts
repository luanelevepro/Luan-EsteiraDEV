import { ModulesController } from '@/controllers/sistema/modules.controller';
import { Router } from 'express';

const router = Router();
const modulesController = new ModulesController();

router.post('/', modulesController.createModule);

router.post('/enterprises', modulesController.linkModulesAndEnterprises);

router.post('/profiles', modulesController.linkModulesAndProfiles);

router.get('/find-all', modulesController.findAll);

router.get('/find-one', modulesController.findOne);

router.get('/only-modules', modulesController.findOnlyModules);

export default router;
