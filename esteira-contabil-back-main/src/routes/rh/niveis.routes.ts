import * as nivelController from '../../controllers/rh/niveis.controller';
const express = require('express');
let router = express.Router();

// CRUD básico de niveis
router.get('/', nivelController.NiveisController.listNiveis);
router.get('/:id', nivelController.NiveisController.getNivel);
router.get('/:id/cargos', nivelController.NiveisController.listCargosInNivel);
router.get(
  '/:id/competencias',
  nivelController.NiveisController.listCompetenciasInNivel
);
router.post('/', nivelController.NiveisController.createNivel);
router.post('/global', nivelController.NiveisController.createNivelGlobal);
router.put('/:id', nivelController.NiveisController.updateNivel);
router.delete('/:id', nivelController.NiveisController.deleteNivel);

// router.get('/ativos', nivelController.listNiveisAtivos);
// router.get('/desativos', nivelController.listNiveisDesativos);
router.get('/:id/niveis', nivelController.NiveisController.listNiveisInEmpresa);

export default router;
