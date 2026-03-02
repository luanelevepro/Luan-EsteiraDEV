import * as IntegracaoController from '../../../controllers/sistema/integracao/integracao.controller';
import * as TipoIntegracaoController from '../../../controllers/sistema/integracao/tipo-integracao.controller';
const express = require('express');

let router = express.Router();

router.get(
  '/tipo',
  TipoIntegracaoController.TipoIntegracaoController.getTipoIntegracao
);

router.post(
  '/tipo',
  TipoIntegracaoController.TipoIntegracaoController.createTipoIntegracao
);
router.get(
  '/:empresaId/:tipoConsulta',
  IntegracaoController.IntegracaoController.getIntegracao
);

router.post('/', IntegracaoController.IntegracaoController.createIntegracao);

router.get(
  '/completo/:integracaoId/:empresaId',
  IntegracaoController.IntegracaoController.getIntegracaoCompletaById
);

router.delete(
  '/:integracaoId',
  IntegracaoController.IntegracaoController.deleteIntegracao
);

router.post('/config', IntegracaoController.IntegracaoController.upsertConfig);

router.post(
  '/test-conexao',
  IntegracaoController.IntegracaoController.testarIntegracao
);

export default router;
