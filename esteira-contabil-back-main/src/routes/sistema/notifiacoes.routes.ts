import { Router } from 'express';
import { NotificacoesController } from '@/controllers/sistema/notificacoes.controller';

const router = Router();

router.get('/', NotificacoesController.getNotificacoes);
router.get('/:id', NotificacoesController.getNotificacao);
router.post('/', NotificacoesController.createNotificacao);
router.delete('/:id', NotificacoesController.deleteNotificacao);

export default router;
