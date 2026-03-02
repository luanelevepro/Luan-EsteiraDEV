import {
  createSubscription,
  deleteSubscription,
  handleWebhookNotification,
  listSubscriptions,
  renewSubscription,
} from '@/controllers/faturamento/transporte/webhook.controller';
import { Router } from 'express';

const router = Router();

router.post('/subscriptions', createSubscription);
router.get('/subscriptions', listSubscriptions);
router.patch('/subscriptions/:subscriptionId', renewSubscription);
router.delete('/subscriptions/:subscriptionId', deleteSubscription);

router.post('/webhook', handleWebhookNotification);

export default router;
