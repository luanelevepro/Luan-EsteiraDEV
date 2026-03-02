import * as empresaController from '../../controllers/sistema/empresa/empresa.controller';
const express = require('express');
let router = express.Router();

// CRUD básico de empresas
router.get('/:id/uf', empresaController.EmpresaController.getUfEmpresa);
router.get('/', empresaController.EmpresaController.getEmpresas);
router.post('/', empresaController.EmpresaController.createOrUpdateEmpresa);
router.post(
  '/multiplas',
  empresaController.EmpresaController.createOrUpdateEmpresas
);
router.get('/:id', empresaController.EmpresaController.getEmpresa);
router.put('/:id', empresaController.EmpresaController.updateEmpresa);
router.delete('/:id', empresaController.EmpresaController.deleteEmpresa);

// Gerenciamento de perfis em empresas
router.post(
  '/:id/usuario/:usuarioId',
  empresaController.EmpresaController.addUsuarioEmpresa
);
router.delete(
  '/:id/usuario/:usuarioId',
  empresaController.EmpresaController.deleteUsuarioEmpresa
);

router.post(
  '/:id/usuario/email/:email',
  empresaController.EmpresaController.addUsuarioByEmailEmpresa
);
router.get(
  '/:id/usuarios',
  empresaController.EmpresaController.getUsuariosEmpresa
);
router.get(
  '/:id/acessos',
  empresaController.EmpresaController.getAcessosEmpresa
);
router.get(
  '/:id/bloqueados',
  empresaController.EmpresaController.getAcessosBloqueadosEmpresa
);
router.patch(
  '/:id/usuario/:usuarioId/bloquear',
  empresaController.EmpresaController.toggleBlockUsuarioEmpresa
);

router.put(
  '/addregime/:regimeId',
  empresaController.EmpresaController.addRegimeTributarioToEmpresa
);

router.put(
  '/addsegmento/:segmentoId',
  empresaController.EmpresaController.addSegmentoToEmpresa
);

router.get(
  '/:id/segmentos',
  empresaController.EmpresaController.getSegmentosEmpresa
);

// router.get(
// '/:id/regimes',
// empresaController.EmpresaController.getRegimesTributariosEmpresa
// );

export default router;
