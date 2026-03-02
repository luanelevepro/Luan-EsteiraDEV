import * as consumoIntegracaoController from '../../controllers/administrativo/consumo-integracao.controller';
const express = require('express');
let router = express.Router();

router.post(
  '/',
  consumoIntegracaoController.ConsumoIntegracaoController
    .getConsumoIntegracaoByEmpCompt
);

router.post(
  '/lista-empresas',
  consumoIntegracaoController.ConsumoIntegracaoController
    .getConsumoIntegracaoByEmpComptList
);

export default router;
