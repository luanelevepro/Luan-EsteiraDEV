import { Router } from 'express';
import { VeiculosController } from '../../controllers/tms/veiculos.controller';

const router = Router();

/**
 * @route GET /api/tms/veiculos/paginacao
 * @desc Busca veículos com paginação e filtros
 * @query status - Array de status (ATIVO, INATIVO)
 */
router.get('/paginacao', VeiculosController.getPaginacao);

/**
 * @route POST /api/tms/veiculos
 * @desc Cria um novo veículo
 */
router.post('/', VeiculosController.createOne);

/**
 * @route GET /api/tms/veiculos/:empresaId
 * @desc Busca todos os veículos de uma empresa
 * @query is_ativo - Boolean (true/false) - Opcional, filtra por status ativo/inativo
 */
router.get('/:empresaId', VeiculosController.getAllByEmpresa);

/**
 * @route POST /api/tms/veiculos/sincronizar/:empresaId
 * @desc Sincroniza veículos do patrimônio para empresa
 */
router.post('/sincronizar/:empresaId', VeiculosController.sincronizar);

/**
 * @route POST /api/tms/veiculos/ativar
 * @desc Ativa veículos selecionados
 * @body ids - Array de IDs dos veículos
 */
router.post('/ativar', VeiculosController.ativarTodos);

/**
 * @route POST /api/tms/veiculos/inativar
 * @desc Inativa veículos selecionados
 * @body ids - Array de IDs dos veículos
 */
router.post('/inativar', VeiculosController.inativarTodos);

/**
 * @route POST /api/tms/veiculos/set-tipo-unidade
 * @desc Define o tipo de unidade dos veículos (TRACIONADOR, CARROCERIA, RIGIDO)
 * @body ids - Array de IDs dos veículos
 * @body ds_tipo_unidade - "TRACIONADOR" | "CARROCERIA" | "RIGIDO"
 */
router.post('/set-tipo-unidade', VeiculosController.setTipoUnidade);

/**
 * @route PUT /api/tms/veiculos/:id
 * @desc Atualiza um veículo específico
 */
router.put('/:id', VeiculosController.updateOne);

export default router;
