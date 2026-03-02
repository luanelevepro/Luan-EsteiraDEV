import * as sincronizarController from '../controllers/sistema/sincronizar.controller';
const express = require('express');
let router = express.Router();

router.get(
  '/empresas',
  sincronizarController.SincronizarController.sincronizarEmpresas
);
router.get(
  '/escritorio/:escritorioId',
  sincronizarController.SincronizarController.sincronizarEscritorio
);

export default router;
