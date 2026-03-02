import { Router } from 'express';
import { ClientesController } from '../../controllers/tms/clientes.controller';

const router = Router();

/**
 * @route GET /api/tms/clientes
 * @desc Busca todos os clientes
 */
router.get('/', ClientesController.getAll);

/**
 * @route GET /api/tms/clientes/paginacao
 * @desc Busca clientes com paginação e filtros
 * @query page - Número da página
 * @query pageSize - Tamanho da página
 * @query orderBy - Ordenação (asc/desc)
 * @query orderColumn - Coluna para ordenação
 * @query search - Termo de busca (busca no nome)
 */
router.get('/paginacao', ClientesController.getPaginacao);

/**
 * @route GET /api/tms/clientes/:id
 * @desc Busca um cliente por ID
 */
router.get('/:id', ClientesController.getOne);

/**
 * @route POST /api/tms/clientes
 * @desc Cria um novo cliente
 * @body {
 *   "ds_nome": "string (obrigatório)",
 *   "id_cidade": "number (obrigatório)"
 * }
 */
router.post('/', ClientesController.create);

/**
 * @route PUT /api/tms/clientes/:id
 * @desc Atualiza um cliente
 * @body {
 *   "ds_nome": "string (opcional)",
 *   "id_cidade": "number (opcional)"
 * }
 */
router.put('/:id', ClientesController.update);

/**
 * @route DELETE /api/tms/clientes/:id
 * @desc Deleta um cliente
 */
router.delete('/:id', ClientesController.delete);

export default router;
