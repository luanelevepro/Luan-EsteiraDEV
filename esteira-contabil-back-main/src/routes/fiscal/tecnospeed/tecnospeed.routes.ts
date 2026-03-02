import { Router } from 'express';
import * as tecnoSpeedController from '../../../controllers/fiscal/tecnospeed/tecnospeed.controller';

const router = Router();

router.use(
  '/sync-certificado',
  tecnoSpeedController.TecnoSpeedController.syncCertificado
);

// Sincronizar cidades homologadas (não precisa de parâmetro no body)
router.post(
  '/sync-cidades-tecnospeed',
  tecnoSpeedController.TecnoSpeedController.syncCities
);

// Enviar protocolos (exige { empresaId } no body)
router.post(
  '/send-protocols-tecnospeed',
  tecnoSpeedController.TecnoSpeedController.sendProtocols
);

// Coletar notas (exige { empresaId } no body)
router.post(
  '/collect-notes-tecnospeed',
  tecnoSpeedController.TecnoSpeedController.collectNotes
);

// dispara para todas as empresas
router.post('/sync-all', tecnoSpeedController.TecnoSpeedController.syncAll);

// corpo: { "empresaId": "..." }
router.post(
  '/sync-empresa',
  tecnoSpeedController.TecnoSpeedController.syncEmpresa
);

export default router;
