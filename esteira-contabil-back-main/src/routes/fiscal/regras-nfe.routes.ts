import { RegrasNfeController } from '@/controllers/fiscal/regras-nfe.controller';
const express = require('express');

let router = express.Router();

router.get('/', RegrasNfeController.getRegrasNfe);
router.get('/:id', RegrasNfeController.getRegraNfeById);
router.post('/', RegrasNfeController.createRegrasNfe);
router.post('/executar', RegrasNfeController.executarConciliacao);
router.post('/:id/duplicate', RegrasNfeController.duplicateRegraNfe);
router.put('/:id', RegrasNfeController.updateRegrasNfe);
router.delete('/:id', RegrasNfeController.deleteRegraNfe);

export default router;
