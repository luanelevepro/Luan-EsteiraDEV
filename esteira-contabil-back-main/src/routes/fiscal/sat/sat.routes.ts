import {
  EnvioPlanilhaController,
  handleXlsxUpload,
} from '@/controllers/fiscal/sat/envio-planilha.controller';

const express = require('express');
let router = express.Router();

const controller = new EnvioPlanilhaController();

router.post(
  '/enviar-planilha',
  handleXlsxUpload,
  controller.importarXlsx.bind(controller)
);

export default router;
