import * as AdmEmpresaController from '../../controllers/administrativo/administrativo-empresa.controller';
const express = require('express');
let router = express.Router();

router.post(
  '/',
  AdmEmpresaController.AdmEmpresaController.getSisEmpByAdmEmpList
);

export default router;
