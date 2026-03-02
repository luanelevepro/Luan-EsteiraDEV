import * as usuarioController from '../../controllers/sistema/usuario.controller';
const express = require('express');
let router = express.Router();

router.get('/empresas', usuarioController.UsuarioController.getEmpresasUsuario);
router.get(
  '/:id/empresas',
  usuarioController.UsuarioController.getEmpresasUsuarioById
);

// Gerenciamento básico de perfis
router.get('/', usuarioController.UsuarioController.getUsuarios);
router.get('/:id', usuarioController.UsuarioController.getUsuario);
router.put('/:id', usuarioController.UsuarioController.updateUsuario);
router.patch('/confirmar', usuarioController.UsuarioController.confirmUsuario);

// Listar as empresas que o perfil tem acesso
router.get(
  '/:id/empresas',
  usuarioController.UsuarioController.getEmpresasUsuarioById
);

export default router;
