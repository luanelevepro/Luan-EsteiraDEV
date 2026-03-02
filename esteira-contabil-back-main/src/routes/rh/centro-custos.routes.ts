import * as centroCustosController from '../../controllers/rh/centro-custos.controller';
const express = require('express');
let router = express.Router();

// CRUD básico de Centro de Custos
router.get(
  '/',
  centroCustosController.CentroCustosController.listCentrosCustos
);
router.post(
  '/',
  centroCustosController.CentroCustosController.createOrUpdateCentroCustos
);
router.get(
  '/:id',
  centroCustosController.CentroCustosController.getCentroCustos
);
router.get(
  '/:id/funcionarios',
  centroCustosController.CentroCustosController.listFuncionariosInCentroCustos
);
router.put(
  '/:id',
  centroCustosController.CentroCustosController.updateCentroCustos
);
router.delete(
  '/:id',
  centroCustosController.CentroCustosController.deleteCentroCustos
);

export default router;
