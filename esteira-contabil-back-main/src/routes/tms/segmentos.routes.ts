import { Router } from 'express';
import { SegmentosController } from '../../controllers/tms/segmentos.controller';

const router = Router();

/**
 * @route GET /api/tms/segmentos
 * @desc Busca todos os segmentos
 */
router.get('/', SegmentosController.getAll);

/**
 * @route GET /api/tms/segmentos/paginacao
 * @desc Busca segmentos com paginação e filtros
 * @query page - Número da página
 * @query pageSize - Tamanho da página
 * @query orderBy - Ordenação (asc/desc)
 * @query orderColumn - Coluna para ordenação
 * @query search - Termo de busca
 * @query status - Status (ATIVO/INATIVO)
 */
router.get('/paginacao', SegmentosController.getPaginacao);

/**
 * @route GET /api/tms/segmentos/:id
 * @desc Busca um segmento por ID
 */
router.get('/:id', SegmentosController.getOne);

/**
 * @route POST /api/tms/segmentos
 * @desc Cria um novo segmento
 */
router.post('/', SegmentosController.create);

/**
 * @route PUT /api/tms/segmentos/:id
 * @desc Atualiza um segmento
 */
router.put('/:id', SegmentosController.update);

/**
 * @route DELETE /api/tms/segmentos/:id
 * @desc Deleta um segmento
 */
router.delete('/:id', SegmentosController.delete);

/**
 * @route POST /api/tms/segmentos/ativar
 * @desc Ativa segmentos selecionados
 */
router.post('/ativar', SegmentosController.ativar);

/**
 * @route POST /api/tms/segmentos/inativar
 * @desc Inativa segmentos selecionados
 */
router.post('/inativar', SegmentosController.inativar);

export default router;
