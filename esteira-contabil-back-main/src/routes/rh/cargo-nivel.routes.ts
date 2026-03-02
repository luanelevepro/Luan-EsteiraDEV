import * as cargoNivelSenioridadeController from '../../controllers/rh/cargo-nivel.controller';
const express = require('express');
let router = express.Router();

// CRUD básico de cargo_nivel
router.get(
  '/',
  cargoNivelSenioridadeController.CargoNivelController
    .listCargosNiveisSenioridade
);
router.get(
  '/empresa/:empresaId',
  cargoNivelSenioridadeController.CargoNivelController
    .getCargoNivelSenioridadeInEmpresa
);
router.get(
  '/cargo/:cargoId',
  cargoNivelSenioridadeController.CargoNivelController
    .getCargoNivelSenioridadeById
);
router.post(
  '/',
  cargoNivelSenioridadeController.CargoNivelController
    .createCargoNivelSenioridade
);
router.get(
  '/:id',
  cargoNivelSenioridadeController.CargoNivelController.getCargoNivelSenioridade
);
router.get(
  '/:id/funcionarios',
  cargoNivelSenioridadeController.CargoNivelController
    .listFuncionariosInCargoNivelSenioridade
);
router.patch(
  '/:id',
  cargoNivelSenioridadeController.CargoNivelController
    .updateCargoNivelSenioridade
);
router.delete(
  '/:id',
  cargoNivelSenioridadeController.CargoNivelController
    .deleteCargoNivelSenioridade
);
router.post(
  '/salarios/:cargoId',
  cargoNivelSenioridadeController.CargoNivelController.processCargoItems
);

export default router;
