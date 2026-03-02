import * as moduleController from '../../controllers/sistema/module.controller';
import * as modulosEmpresaController from '../../controllers/sistema/empresa/modulos-empresa.controller';

const express = require('express');
let router = express.Router();

// Gerenciamento de módulos em perfis
router.get('/', moduleController.ModuleController.getModules);
router.post(
  '/usuario/:usuarioId',
  moduleController.ModuleController.updateModulesInUsuario
);
router.get(
  '/usuario/:usuarioId',
  moduleController.ModuleController.getModulesInUsuario
);
router.get(
  '/permitidos',
  moduleController.ModuleController.getModulesUsuarioPermited
);
router.get('/todos', moduleController.ModuleController.getModulesInUsuario);

// Gerenciamento de módulos em empresas
router.get(
  '/empresa/:empresaId',
  modulosEmpresaController.ModulosEmpresaController.getModulesInEmpresa
);
router.post(
  '/empresa/:empresaId',
  modulosEmpresaController.ModulosEmpresaController.updateModulesInEmpresa
);
router.get(
  '/empresas/update/adm',
  modulosEmpresaController.ModulosEmpresaController.addModuloAdmEmpresa
);
router.get(
  '/empresa/:empresaId/usuario/:usuarioId',
  moduleController.ModuleController.getModulesEmpresaUsuario
);

export default router;
