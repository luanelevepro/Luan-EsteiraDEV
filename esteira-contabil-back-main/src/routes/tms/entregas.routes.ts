import { Router } from 'express';
import { EntregasController } from '../../controllers/tms/entregas.controller';

const router = Router();

/**
 * @route GET /api/tms/entregas/carga/:idCarga
 * @desc Lista entregas por carga
 */
router.get('/carga/:idCarga', EntregasController.listByCarga);

/**
 * @route PATCH /api/tms/entregas/carga/:idCarga/reordenar
 * @desc Reordena as entregas de uma carga
 * @body { entregas: Array<{ id: string; nr_sequencia: number }> }
 */
router.patch(
  '/carga/:idCarga/reordenar',
  EntregasController.reordenarEntregas
);

/**
 * @route GET /api/tms/entregas/:id
 * @desc Busca entrega por ID
 */
router.get('/:id', EntregasController.getById);

/**
 * @route POST /api/tms/entregas/:id/iniciar
 * @desc Inicia rota da entrega (EM_TRANSITO) — esteira sequencial
 */
router.post('/:id/iniciar', EntregasController.iniciarEntrega);

/**
 * @route POST /api/tms/entregas/:id/finalizar
 * @desc Finaliza entrega (ENTREGUE) — esteira sequencial
 */
router.post('/:id/finalizar', EntregasController.finalizarEntrega);

/**
 * @route POST /api/tms/entregas
 * @desc Cria nova entrega
 */
router.post('/', EntregasController.create);

/**
 * @route POST /api/tms/entregas/:idCarga/lote
 * @desc Cria múltiplas entregas com documentos em uma transação
 * @body entregas - Array com dados das entregas
 */
router.post('/:idCarga/lote', EntregasController.createMultiplas);

/**
 * @route PUT /api/tms/entregas/:id
 * @desc Atualiza entrega
 */
router.put('/:id', EntregasController.update);

/**
 * @route PATCH /api/tms/entregas/:id/status
 * @desc Atualiza status da entrega
 */
router.patch('/:id/status', EntregasController.updateStatus);

/**
 * @route POST /api/tms/entregas/:id/documentos
 * @desc Adiciona documentos à entrega
 */
router.post('/:id/documentos', EntregasController.addDocumentos);

/**
 * @route DELETE /api/tms/entregas/:id/documentos
 * @desc Remove documento da entrega
 */
router.delete('/:id/documentos', EntregasController.removeDocumento);

/**
 * @route DELETE /api/tms/entregas/:id
 * @desc Deleta entrega
 */
router.delete('/:id', EntregasController.delete);

export default router;
