import { SincronizarFuncionarioController } from '@/controllers/rh/sincronizar/funcionarios.controller';
import { SincronizarCargosController } from '@/controllers/rh/sincronizar/cargos.controller';
import { SincronizarCentroCustosController } from '@/controllers/rh/sincronizar/centro-custos.controller';
import { SincronizarDepartamentoController } from '@/controllers/rh/sincronizar/departamentos.controller';
import { SincronizarCargoNivelSenioridadeController } from '@/controllers/rh/sincronizar/cargo-nivel-senioridade.controller';

const express = require('express');
let router = express.Router();

router.get(
  '/funcionarios',
  SincronizarFuncionarioController.sincronizarFuncionarios
);
router.get(
  '/funcionarios/:empresaId',
  SincronizarFuncionarioController.sincronizarFuncionariosByEmpresaId
);
router.get('/cargos', SincronizarCargosController.sincronizarCargos);
router.get(
  '/cargos/:empresaId',
  SincronizarCargosController.sincronizarCargosByEmpresaId
);
router.get(
  '/centrocustos',
  SincronizarCentroCustosController.sincronizarCentrosCustos
);
router.get(
  '/centrocustos/:empresaId',
  SincronizarCentroCustosController.sincronizarCentrosCustosByEmpresaId
);
router.get(
  '/departamentos',
  SincronizarDepartamentoController.sincronizarDepartamento
);
router.get(
  '/departamentos/:empresaId',
  SincronizarDepartamentoController.sincronizarDepartamentoByEmpresaId
);
router.get(
  '/cargonivelsenioridade/:empresaId',
  SincronizarCargoNivelSenioridadeController.sincronizarCargoNivelSenioridade
);

export default router;
