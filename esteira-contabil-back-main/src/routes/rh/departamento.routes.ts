import * as departamentoController from '../../controllers/rh/departamento.controller';
const express = require('express');
let router = express.Router();

// CRUD básico de departamentos
router.get(
  '/',
  departamentoController.DepartamentoController.listDepartamentos
);
router.post(
  '/',
  departamentoController.DepartamentoController.createOrUpdateDepartamento
);
router.get(
  '/:id',
  departamentoController.DepartamentoController.getDepartamento
);
router.get(
  '/:id/funiconarios',
  departamentoController.DepartamentoController.listFuncionariosInDepartamento
);
router.put(
  '/:id',
  departamentoController.DepartamentoController.updateDepartamento
);
router.delete(
  '/:id',
  departamentoController.DepartamentoController.deleteDepartamento
);

export default router;
