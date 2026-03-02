import * as funcionarioController from '../../controllers/rh/funcionario.controller';
const express = require('express');
let router = express.Router();

// CRUD básico de funcionarios
router.get('/', funcionarioController.FuncionarioController.listFuncionarios);
router.post(
  '/',
  funcionarioController.FuncionarioController.createOrUpdateFuncionario
);
router.patch(
  '/:id/addtoempresa',
  funcionarioController.FuncionarioController.addFuncionarioToEmpresa
);
router.get('/:id', funcionarioController.FuncionarioController.getFuncionario);
router.get(
  '/:id/cargonivel',
  funcionarioController.FuncionarioController.listCargoNivelInFuncionario
);
router.get(
  '/:id/avaliacao',
  funcionarioController.FuncionarioController.listAvaliacaoInFuncionario
);
router.put(
  '/:id',
  funcionarioController.FuncionarioController.updateFuncionario
);
router.patch(
  '/:id/cargonivel/:cargonivelId',
  funcionarioController.FuncionarioController.addCargoNivelToFuncionario
);
router.delete(
  '/:id',
  funcionarioController.FuncionarioController.deleteFuncionario
);
router.get(
  '/salarios/:cargoId',
  funcionarioController.FuncionarioController.updateFuncionarioCargo
);

router.get(
  '/empresa/:id',
  funcionarioController.FuncionarioController.listFuncionariosInEmpresa
);

export default router;
