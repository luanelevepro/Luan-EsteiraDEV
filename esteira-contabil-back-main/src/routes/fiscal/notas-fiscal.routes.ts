import { FiscalNotaFiscalController } from '@/controllers/fiscal/nota-fiscal.controller';
import {
  ImportarXmlController,
  handleXmlUpload,
  handleXmlUploads,
} from '../../controllers/fiscal/onvio/importar-xml.controller';

const express = require('express');
const importarXmlController = new ImportarXmlController();

let router = express.Router();

// Notas Fiscais
router.get('', FiscalNotaFiscalController.getNotasFiscais);
router.post(
  '/sincronizar-dominio',
  FiscalNotaFiscalController.sincronizarDominioByEmpresaId
);
router.post(
  '/sincronizar-dominio-nfe',
  FiscalNotaFiscalController.sincronizarDominioNfeByEmpresaId
);
router.post(
  '/sincronizar-dominio-cte',
  FiscalNotaFiscalController.sincronizarDominioCtePorEmpresa
);
router.post(
  '/sincronizar-verf-dominio',
  FiscalNotaFiscalController.sincronizarDominioVerfNotas
);
router.get('/:id', FiscalNotaFiscalController.getNotaFiscalById);
router.post('/', FiscalNotaFiscalController.createNotaFiscal);
router.put('/:id', FiscalNotaFiscalController.updateNotaFiscal);
router.delete('/:id', FiscalNotaFiscalController.deleteNotaFiscal);
router.post('/:id/xml', FiscalNotaFiscalController.xmlNotaFiscalServico);
router.post(
  '/integrar-lista',
  FiscalNotaFiscalController.integrarListaNotaFiscalServico
);
router.post(
  '/:id/integrar',
  FiscalNotaFiscalController.integrarNotaFiscalServico
);
router.post(
  '/importar-xml',
  handleXmlUpload,
  importarXmlController.importarXml.bind(importarXmlController)
);
router.post(
  '/nfe/importar-xmls',
  handleXmlUploads,
  importarXmlController.importarNfeXml.bind(importarXmlController)
);
router.post(
  '/nfce/importar-xmls',
  handleXmlUploads,
  importarXmlController.importarNfceXml.bind(importarXmlController)
);
router.post(
  '/cte/importar-xmls',
  handleXmlUploads,
  importarXmlController.importarCteXml.bind(importarXmlController)
);
router.post(
  '/importar-xmls',
  handleXmlUploads,
  importarXmlController.importarXmls.bind(importarXmlController)
);
router.get('/chaves/escritorio', FiscalNotaFiscalController.getChavesXml);
router.put('/:id', FiscalNotaFiscalController.updateNotaFiscal);
router.delete('/:id', FiscalNotaFiscalController.deleteNotaFiscal);

export default router;
