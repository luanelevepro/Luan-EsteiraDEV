const express = require('express');
let router = express.Router();
import * as escritorioController from '../../controllers/sistema/escritorio.controller';

router.patch(
  '/:id/escritorio',
  escritorioController.EscritorioController.setAsEscritorio
);
router.patch(
  '/:id/empresa',
  escritorioController.EscritorioController.setAsEmpresa
);
router.patch(
  '/:id/sistema',
  escritorioController.EscritorioController.setAsSistema
);

router.get('/', escritorioController.EscritorioController.getEscritorios);
router.get(
  '/:id/empresas',
  escritorioController.EscritorioController.getEmpresasByEscritorio
);
router.post(
  '/:id/url',
  escritorioController.EscritorioController.createOrUpdateUrl
);
router.post(
  '/:id/integration/key',
  escritorioController.EscritorioController.createOrUpdateKey
);
router.post(
  '/:escritorioId/empresa/:empresaId',
  escritorioController.EscritorioController.addEmpresaToEscritorio
);
router.delete(
  '/:escritorioId/empresa/:empresaId',
  escritorioController.EscritorioController.removeEmpresaEscritorio
);

export default router;
