import { Router } from 'express';
import MotoristaController from '@/controllers/tms/motorista.controller';

const router = Router();

/**
 * @route POST /motoristas/sincronizar
 * @desc Sincroniza motoristas do RH (funcionários com cargo "motorista")
 * @access Private
 * @returns {Object} { message }
 */
router.post('/sincronizar', MotoristaController.sincronizar);

/**
 * @route GET /motoristas/paginacao
 * @desc Busca motoristas com paginação e filtros
 * @query page, pageSize, orderBy, orderColumn, search, status
 */
router.get('/paginacao', MotoristaController.getPaginacao);

/**
 * @route GET /motoristas
 * @desc Busca todos os motoristas com paginação
 * @access Private
 * @query {number} page - Página (padrão: 1)
 * @query {number} pageSize - Quantidade por página (padrão: 10)
 * @returns {Object} { data, pagination }
 */
router.get('/', MotoristaController.findAll);

/**
 * @route GET /motoristas/:id
 * @desc Busca um motorista por ID
 * @access Private
 * @param {string} id - ID do motorista
 * @returns {Object} Motorista
 */
router.get('/:id', MotoristaController.findOne);

/**
 * @route POST /motoristas
 * @desc Cria um novo motorista
 * @access Private
 * @body {Object} CreateTmsMotoristasDTO
 * @returns {Object} Motorista criado
 */
router.post('/', MotoristaController.create);

/**
 * @route PUT /motoristas/:id
 * @desc Atualiza um motorista
 * @access Private
 * @param {string} id - ID do motorista
 * @body {Object} UpdateTmsMotoristasDTO
 * @returns {Object} Motorista atualizado
 */
router.put('/:id', MotoristaController.update);

export default router;
