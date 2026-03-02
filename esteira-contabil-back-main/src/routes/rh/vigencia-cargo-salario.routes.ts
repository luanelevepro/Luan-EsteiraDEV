import * as vigenciaCargoSalarioController from '../../controllers/rh/vigencia-cargo-salario.controller';

const express = require('express');
let router = express.Router();

router.get(
  '/salario/:cargoId',
  vigenciaCargoSalarioController.VigenciaCargoSalarioController
    .getVigenciaByCargo
);

export default router;
