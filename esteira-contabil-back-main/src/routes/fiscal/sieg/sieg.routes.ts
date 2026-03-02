import * as siegController from '../../../controllers/fiscal/sieg/sieg.controller';
const express = require('express');
let router = express.Router();

// ----------- Sinc ----------- //
router.post('/sync-sieg', siegController.SiegController.sincSiegEntradasDocs);
router.post(
  '/sync-sieg-saida',
  siegController.SiegController.sincSiegSaidasDocs
);

// ----------- Coleta NFSE ----------- //
// ----------- Entradas ----------- //
router.post('/sync-nfse-sieg', siegController.SiegController.coletarNfseSieg);
// ----------- Saídas ----------- //
router.post(
  '/sync-nfse-saida-sieg',
  siegController.SiegController.coletarNfseSaidaSieg
);

// ----------- Coleta NFE ----------- //
// ----------- Entradas ----------- //
router.post('/sync-nfe-sieg', siegController.SiegController.coletarNfeSieg);
// ----------- Saídas ----------- //
router.post(
  '/sync-nfe-saida-sieg',
  siegController.SiegController.coletarNfeSaidaSieg
);

// ----------- Coleta CTE ----------- //
// ----------- Entradas ----------- //
router.post('/sync-cte-sieg', siegController.SiegController.coletarCteSieg);
// ----------- Saídas ----------- //
router.post(
  '/sync-cte-saida-sieg',
  siegController.SiegController.coletarCteSaidaSieg
);

// ----------- Coleta NFCE ----------- //
// ----------- Entradas ----------- //
router.post('/sync-nfce-sieg', siegController.SiegController.coletarNfceSieg);
// ----------- Saídas ----------- //
router.post(
  '/sync-nfce-saida-sieg',
  siegController.SiegController.coletarNfceSaidaSieg
);

// router.post('/prestadores-sieg', siegController.SiegController.prestadoresSieg);

// rota para consultar anualmente os dados
router.post('/sync-ano', siegController.SiegController.createConsultaAno);

// dispara para todas as empresas
router.post('/sync-all', siegController.SiegController.syncAll);

export default router;
