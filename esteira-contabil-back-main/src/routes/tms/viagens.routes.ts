import { Router } from 'express';
import * as viagensController from '../../controllers/tms/viagens.controller';

const router = Router();

/**
 * @route GET /viagens
 * @desc Busca todas as viagens da empresa
 * @access Private
 * @returns {Array<Object>} Lista de viagens
 */
router.get('/', viagensController.getAll);

/**
 * @route GET /viagens/paginacao
 * @desc Busca viagens com paginação e filtros
 * @access Private
 * @query {number} page - Página (padrão: 1)
 * @query {number} pageSize - Quantidade por página (padrão: 50)
 * @query {string} orderBy - Ordem (asc/desc, padrão: asc)
 * @query {string} orderColumn - Coluna para ordenação (cd_viagem, ds_motorista, ds_status, dt_created, dt_agendada, dt_conclusao, padrão: cd_viagem)
 * @query {string} search - Busca por código, motorista ou placa
 * @query {string} status - Filtro por status (pode ser múltiplo separado por vírgula: PLANEJADA,EM_VIAGEM)
 * @returns {Object} { total, totalPages, page, pageSize, viagens, allIds }
 */
router.get('/paginacao', viagensController.getPaginacao);

/**
 * @route POST /viagens/import
 * @desc Importa viagens via planilha .xlsx (mapeamento DE→PARA)
 */
router.post('/import', viagensController.import_);

/**
 * @route GET /viagens/import/layouts
 * @desc Lista layouts de mapeamento de viagens da empresa
 */
router.get('/import/layouts', viagensController.listImportLayouts);

/**
 * @route POST /viagens/import/layouts
 * @desc Cria layout de mapeamento de viagens
 */
router.post('/import/layouts', viagensController.createImportLayout);

/**
 * @route PUT /viagens/import/layouts/:id
 * @desc Atualiza layout de mapeamento de viagens
 */
router.put('/import/layouts/:id', viagensController.updateImportLayout);

/**
 * @route DELETE /viagens/import/layouts/:id
 * @desc Remove layout de mapeamento de viagens
 */
router.delete('/import/layouts/:id', viagensController.deleteImportLayout);

/**
 * @route GET /viagens/:id/fluxo
 * @desc Retorna fluxo da esteira sequencial (itens, canStart, canFinish, blockedReason)
 * @param {string} id - ID da viagem
 * @returns {Object} ViagemFluxoDTO
 */
router.get('/:id/fluxo', viagensController.getFluxo);

/**
 * @route GET /viagens/:id
 * @desc Busca uma viagem por ID
 * @access Private
 * @param {string} id - ID da viagem
 * @returns {Object} Objeto da viagem com cargas relacionadas
 */
router.get('/:id', viagensController.getById);

/**
 * @route POST /viagens
 * @desc Cria uma nova viagem
 * @access Private
 * @body {string} [cd_viagem] - Código da viagem (opcional; se omitido, é gerado sequencial por empresa: 1, 2, 3...)
 * @body {string} ds_motorista - Nome do motorista (obrigatório)
 * @body {string} ds_placa_cavalo - Placa do cavalo mecânico (obrigatório)
 * @body {string} [ds_placa_carreta_1] - Placa da 1ª carreta
 * @body {string} [ds_placa_carreta_2] - Placa da 2ª carreta
 * @body {string} [ds_placa_carreta_3] - Placa da 3ª carreta
 * @body {date} [dt_agendada] - Data/hora agendada
 * @body {date} [dt_previsao_retorno] - Previsão de retorno
 * @body {string} [ds_status] - Status (PLANEJADA, EM_COLETA, EM_VIAGEM, CONCLUIDA, ATRASADA, CANCELADA. Padrão: PLANEJADA)
 * @returns {Object} Viagem criada
 */
router.post('/', viagensController.create);

/**
 * @route PUT /viagens/:id
 * @desc Atualiza uma viagem
 * @access Private
 * @param {string} id - ID da viagem
 * @body {string} [ds_motorista] - Nome do motorista (código da viagem não é alterável)
 * @body {string} [ds_placa_cavalo] - Placa do cavalo mecânico
 * @body {string} [ds_placa_carreta_1] - Placa da 1ª carreta
 * @body {string} [ds_placa_carreta_2] - Placa da 2ª carreta
 * @body {string} [ds_placa_carreta_3] - Placa da 3ª carreta
 * @body {date} [dt_agendada] - Data/hora agendada
 * @body {date} [dt_previsao_retorno] - Previsão de retorno
 * @body {string} [ds_status] - Status
 * @returns {Object} Viagem atualizada
 */
router.put('/:id', viagensController.update);

/**
 * @route PATCH /viagens/:id/status
 * @desc Atualiza apenas o status de uma viagem
 * @access Private
 * @param {string} id - ID da viagem
 * @body {string} ds_status - Status (PLANEJADA, EM_COLETA, EM_VIAGEM, CONCLUIDA, ATRASADA, CANCELADA. Obrigatório)
 * @returns {Object} Viagem com status atualizado
 */
router.patch('/:id/status', viagensController.updateStatus);

/**
 * @route POST /viagens/:id/itens/:itemId/iniciar
 * @desc Inicia item da esteira (trajeto vazio ou carga)
 */
router.post('/:id/itens/:itemId/iniciar', viagensController.iniciarItem);

/**
 * @route POST /viagens/:id/itens/:itemId/finalizar
 * @desc Finaliza item (apenas deslocamento vazio; carga conclui ao finalizar última entrega)
 */
router.post('/:id/itens/:itemId/finalizar', viagensController.finalizarItem);

/**
 * @route DELETE /viagens/:id
 * @desc Deleta uma viagem (remove relacionamentos com cargas)
 * @access Private
 * @param {string} id - ID da viagem
 * @returns {void}
 */
router.delete('/:id', viagensController.delete_);

/**
 * @route POST /viagens/:id/cargas
 * @desc Vincula uma carga à viagem com sequência
 * @access Private
 * @param {string} id - ID da viagem
 * @body {string} id_carga - ID da carga (obrigatório)
 * @body {number} nr_sequencia - Número de sequência (obrigatório)
 * @returns {Object} Vínculo criado
 */
router.post('/:id/cargas', viagensController.vincularCarga);

/**
 * @route DELETE /viagens/:id/cargas/:idCarga
 * @desc Remove uma carga da viagem
 * @access Private
 * @param {string} id - ID da viagem
 * @param {string} idCarga - ID da carga
 * @returns {void}
 */
router.delete('/:id/cargas/:idCarga', viagensController.removerCarga);

/**
 * @route PATCH /viagens/:id/cargas/reordenar
 * @desc Reordena as cargas de uma viagem
 * @access Private
 * @param {string} id - ID da viagem
 * @body {Array<Object>} cargas - Array com objetos { id_carga, nr_sequencia } (obrigatório)
 * @returns {Object} Viagem com cargas reordenadas
 */
router.patch('/:id/cargas/reordenar', viagensController.reordenarCargas);

/**
 * @route PATCH /viagens/:id/cargas/:idCarga/finalizar
 * @desc Finaliza uma carga (ENTREGUE) e atualiza viagem automaticamente
 * @desc Se houver mais cargas: viagem vai para EM_COLETA, próxima carga para AGENDADA
 * @desc Se for última carga: viagem vai para CONCLUIDA
 * @access Private
 * @param {string} id - ID da viagem
 * @param {string} idCarga - ID da carga a finalizar
 * @returns {Object} Viagem atualizada
 */
router.patch(
  '/:id/cargas/:idCarga/finalizar',
  viagensController.finalizarCarga
);

/**
 * @route GET /viagens/docs/vincular
 * @desc Busca documentos (NFes e CTes) da empresa para vincular com viagem
 * @access Private
 * @query {string} competencia - Competência no formato YYYY-MM (ex: 2026-02, obrigatório)
 * @returns {Array<Object>} Lista de documentos encontrados (NFe ou CTE)
 */
router.get('/docs/vincular', viagensController.getDocsParaVincular);

/**
 * @route POST /viagens/:id/docs/vincular
 * @desc Vincula múltiplos documentos fiscais (NFes e CTes) a uma viagem
 * @access Private
 * @param {string} id - ID da viagem
 * @body {Array<Object>} documentos - Array de objetos { id: string, ordem: number } (obrigatório)
 * @returns {Object} { message, total, documentos_vinculados }
 */
router.post('/:id/docs/vincular', viagensController.linkDocsToViagem);

/**
 * @route POST /viagens/:id/cargas/criar-com-documentos
 * @desc Cria uma ou mais cargas a partir de documentos fiscais selecionados
 * @access Private
 * @param {string} id - ID da viagem
 * @body {Array<Object>} documentos - Array de { id: string, tipo: 'NFE' | 'CTE', ordem: number }
 * @body {number} [id_cidade_destino_sugerido] - Destino sugerido para NFes sem relação
 * @returns {Object} { cargas: [], nfesNaoRelacionadas?: [] }
 */
router.post(
  '/:id/cargas/criar-com-documentos',
  viagensController.criarCargasComDocumentos
);

export default router;
