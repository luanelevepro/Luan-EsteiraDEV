import { Router } from 'express';
import { CargasController } from '../../controllers/tms/cargas.controller';

const router = Router();

/**
 * @route GET /api/tms/cargas
 * @desc Busca todas as cargas
 */
router.get('/', CargasController.getAll);

/**
 * @route GET /api/tms/cargas/paginacao
 * @desc Busca cargas com paginação e filtros
 * @query page - Número da página
 * @query pageSize - Tamanho da página
 * @query orderBy - Ordenação (asc/desc)
 * @query orderColumn - Coluna para ordenação
 * @query search - Termo de busca
 */
router.get('/paginacao', CargasController.getPaginacao);

/**
 * @route POST /api/tms/cargas/parser-documentos
 * @desc Parseia ds_raw dos documentos selecionados e retorna DTO para pré-preenchimento da carga
 * @body documentoDfeIds - Array de IDs (fis_documento_dfe)
 */
router.post('/parser-documentos', CargasController.parserDocumentos);

/**
 * @route POST /api/tms/cargas/import
 * @desc Importa cargas via planilha .xlsx (mapeamento DE→PARA)
 */
router.post('/import', CargasController.import);

/**
 * @route GET /api/tms/cargas/import/layouts
 * @desc Lista layouts de mapeamento da empresa
 */
router.get('/import/layouts', CargasController.listImportLayouts);

/**
 * @route POST /api/tms/cargas/import/layouts
 * @desc Cria layout de mapeamento (ds_nome, ds_descricao?, js_mapeamento)
 */
router.post('/import/layouts', CargasController.createImportLayout);

/**
 * @route PUT /api/tms/cargas/import/layouts/:id
 * @desc Atualiza layout de mapeamento
 */
router.put('/import/layouts/:id', CargasController.updateImportLayout);

/**
 * @route DELETE /api/tms/cargas/import/layouts/:id
 * @desc Remove layout de mapeamento
 */
router.delete('/import/layouts/:id', CargasController.deleteImportLayout);

/**
 * @route GET /api/tms/cargas/:id
 * @desc Busca uma carga por ID
 */
router.get('/:id', CargasController.getOne);

/**
 * @route GET /api/tms/cargas/:id/status
 * @desc Busca o status da viagem mais recente vinculada à carga
 * @returns { ds_status: string } - Status da viagem (PLANEJADA, EM_COLETA, EM_VIAGEM, CONCLUIDA, ATRASADA, CANCELADA)
 */
router.get('/:id/status', CargasController.getStatus);

/**
 * @route POST /api/tms/cargas/:id/coleta/iniciar
 * @desc Inicia etapa de coleta da carga (esteira sequencial)
 */
router.post('/:id/coleta/iniciar', CargasController.iniciarColeta);

/**
 * @route POST /api/tms/cargas/:id/coleta/finalizar
 * @desc Finaliza etapa de coleta da carga (esteira sequencial)
 */
router.post('/:id/coleta/finalizar', CargasController.finalizarColeta);

/**
 * @route POST /api/tms/cargas
 * @desc Cria uma nova carga
 */
router.post('/', CargasController.create);

/**
 * @route PUT /api/tms/cargas/:id
 * @desc Atualiza uma carga
 */
router.put('/:id', CargasController.update);

/**
 * @route PATCH /api/tms/cargas/:id/status
 * @desc Atualiza o status de uma carga
 * @body ds_status - String do status (PENDENTE, AGENDADA, EM_COLETA, EM_TRANSITO, ENTREGUE)
 */
router.patch('/:id/status', CargasController.updateStatus);

/**
 * @route PATCH /api/tms/cargas/:id/finalizar
 * @desc Finaliza uma carga e gerencia transição automática do status da viagem
 * @body ds_comprovante_entrega - URL do comprovante de entrega (opcional)
 * @body ds_comprovante_key - Chave/ID do comprovante (opcional)
 * @returns { carga, viagem, isUltimaCarga, proximoStatus?, proximaCargaId?, mensagem }
 */
router.patch('/:id/finalizar', CargasController.finalizarCarga);

/**
 * @route PATCH /api/tms/viagens/:viagemId/finalizar
 * @desc Finaliza uma viagem completamente (marca como CONCLUIDA)
 */
router.patch('/viagens/:viagemId/finalizar', CargasController.finalizarViagem);

/**
 * @route PATCH /api/tms/viagens/:viagemId/reabrir
 * @desc Reabre uma viagem para adicionar mais cargas (volta para PLANEJADA)
 */
router.patch('/viagens/:viagemId/reabrir', CargasController.reabrirViagem);

/**
 * @route DELETE /api/tms/cargas/:id
 * @desc Deleta uma carga
 */
router.delete('/:id', CargasController.delete);

export default router;
