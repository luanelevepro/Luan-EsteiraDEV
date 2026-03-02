import { Router } from 'express';
import {
  getMessages,
  getMessageById,
  getMailFolders,
  triggerEmailProcessing,
  getEmailStatistics,
  getDfe,
  grantEnterpriseAccess,
  uploadXmlFiles,
  getEmailStatisticsByEmail,
  getEmailsByUser,
  moveEmailsBetweenFolders,
  assignEmailToCompany,
  enviarCTe,
  consultarCTe,
  cancelarCTe,
  enviarMDFe,
  setControlNumber,
  getAllCteForEnterprise,
} from '@/controllers/faturamento/transporte/transporte.controller';
import {
  createSubscription,
  listSubscriptions,
  renewSubscription,
  deleteSubscription,
  handleWebhookNotification,
} from '@/controllers/faturamento/transporte/webhook.controller';
import { xmlUploadMiddleware } from '@/services/faturamento/transporte/config/multer.config';

const router = Router();

router.get('/messages', getMessages);
router.get('/messages/:id', getMessageById);
router.get('/folders', getMailFolders);
router.post('/process-emails', triggerEmailProcessing);
router.get('/statistics', getEmailStatistics);
router.get('/statistics-by-user-id', getEmailStatisticsByEmail);
router.get('/emails-by-user-id', getEmailsByUser);
router.post('/move-emails', moveEmailsBetweenFolders);
router.post('/assign-emails', assignEmailToCompany);
router.get('/dfe', getDfe);
router.patch('/dfe/:id/control-number', setControlNumber);

router.post('/enterprise/:id/grant-access', grantEnterpriseAccess);
router.get('/enterprise/:id/cte', getAllCteForEnterprise);

router.post('/upload-xml', xmlUploadMiddleware, uploadXmlFiles);
router.post('/enviar-cte', enviarCTe);
router.get('/consultar-cte', consultarCTe);
router.post('/cancelar-cte', cancelarCTe);
router.post('/enviar-mdfe', enviarMDFe);

router.post('/webhooks/subscriptions', createSubscription);
router.get('/webhooks/subscriptions', listSubscriptions);
router.patch('/webhooks/subscriptions/:subscriptionId', renewSubscription);
router.delete('/webhooks/subscriptions/:subscriptionId', deleteSubscription);
router.post('/webhooks/webhook', handleWebhookNotification);

export default router;
