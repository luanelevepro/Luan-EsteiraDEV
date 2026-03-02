import consumoIntegracaoRoutes from '../../routes/administrativo/consumo-integracao.routes';
import admEmpresaRoutes from '../../routes/administrativo/administrativo-empresa.routes';
import { Router } from 'express';
let router = Router();

router.use('/consumo-integracao', consumoIntegracaoRoutes);
router.use('/empresas', admEmpresaRoutes);

export default router;
