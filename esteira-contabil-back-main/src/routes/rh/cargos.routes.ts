import * as cargosController from '../../controllers/rh/cargos.controller';
const express = require('express');
let router = express.Router();

// CRUD básico de cargos
router.get('/', cargosController.CargosController.listCargos);
router.get('/:id', cargosController.CargosController.getCargo);
router.get('/:id/niveis', cargosController.CargosController.listNiveisInCargo);
router.get(
  '/:id/competencias',
  cargosController.CargosController.listCompetenciasInCargo
);
router.post('/', cargosController.CargosController.createOrUpdateCargo);
router.put('/:id', cargosController.CargosController.updateCargo);
router.delete('/:id', cargosController.CargosController.deleteCargo);

// Ativação e desativação de Cargos
// router.get('/ativos', cargosController.listCargosAtivos);
// router.get('/desativos', cargosController.listCargosDesativos);
router.patch(
  '/:id/desativar',
  cargosController.CargosController.deactivateCargo
);
router.patch('/:id/ativar', cargosController.CargosController.activateCargo);
router.get('/:id/cargos', cargosController.CargosController.listCargoInEmpresa);

export default router;
