import { Router } from 'express';
import FechamentoMotoristasController from '@/controllers/tms/fechamento-motoristas.controller';

const router = Router();

router.get('/', FechamentoMotoristasController.list);
router.get('/resumo', FechamentoMotoristasController.resumo);
router.post('/', FechamentoMotoristasController.criar);
router.post('/sincronizar-competencia', FechamentoMotoristasController.sincronizarCompetencia);
router.get('/:id', FechamentoMotoristasController.detalhe);
router.post('/:id/sincronizar-viagens', FechamentoMotoristasController.sincronizarViagens);
router.post('/:id/fechar', FechamentoMotoristasController.fechar);
router.post('/:id/reabrir', FechamentoMotoristasController.reabrir);

export default router;
