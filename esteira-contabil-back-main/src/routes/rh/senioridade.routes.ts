import * as senioridadeController from '../../controllers/rh/senioridade.controller';
const express = require('express');
let router = express.Router();

// CRUD básico de niveis
router.get('/', senioridadeController.SenioridadeController.listSenioridade);
router.get('/:id', senioridadeController.SenioridadeController.getSenioridade);
router.get(
  '/:id/cargos',
  senioridadeController.SenioridadeController.listCargosInSenioridade
);
router.get(
  '/:id/cargos',
  senioridadeController.SenioridadeController.listNiveisInSenioridade
);
router.get(
  '/:id/competencias',
  senioridadeController.SenioridadeController.listCompetenciasInSenioridade
);
router.post('/', senioridadeController.SenioridadeController.createSenioridade);
router.post(
  '/global',
  senioridadeController.SenioridadeController.createSenioridadeGlobal
);
router.put(
  '/:id',
  senioridadeController.SenioridadeController.updateSenioridade
);
router.delete(
  '/:id',
  senioridadeController.SenioridadeController.deleteSenioridade
);

// router.get('/ativos', nivelController.listNiveisAtivos);
// router.get('/desativos', nivelController.listNiveisDesativos);
router.get(
  '/:id/senioridade',
  senioridadeController.SenioridadeController.listSenioridadeInEmpresa
);

export default router;
