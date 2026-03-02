import { FiscalCadastroController } from '@/controllers/fiscal/cadastro.controller';
const express = require('express');

let router = express.Router();

// Segmentos Empresas
router.get(
  '/segmentos-empresas',
  FiscalCadastroController.getSegmentosEmpresas
);
router.get('/segmentos/:id', FiscalCadastroController.getSegmentosById);
router.get(
  '/segmentos-empresas/escritorio',
  FiscalCadastroController.getSegmentosEmpresasPorEscritorio
);
router.post(
  '/segmentos-empresas',
  FiscalCadastroController.createSegmentoEmpresa
);
router.put(
  '/segmentos-empresas/:id',
  FiscalCadastroController.updateSegmentoEmpresa
);
router.delete(
  '/segmentos-empresas/:id',
  FiscalCadastroController.deleteSegmentoEmpresa
);

// Produtos por Segmento
router.get('/padroes-segmento', FiscalCadastroController.getPadraoSegmento);
router.get(
  '/padroes-segmento/escritorio',
  FiscalCadastroController.getPadraoSegmentoEscritorio
);
router.get(
  '/padroes-segmento/:id',
  FiscalCadastroController.getPadraoSegmentoById
);
router.post('/padroes-segmento', FiscalCadastroController.createPadraoSegmento);
router.put(
  '/padroes-segmento/:id',
  FiscalCadastroController.updatePadraoSegmento
);
router.delete(
  '/padroes-segmento/:id',
  FiscalCadastroController.deletePadraoSegmento
);

export default router;
