import { FornecedorController } from '@/controllers/fiscal/fornecedor.controller';

const express = require('express');
let router = express.Router();

router.get('', FornecedorController.getFornecedoresByEmpresaId);
router.get(
  '/sincronizar',
  FornecedorController.sincronizarFornecedoresByEmpresaId
);
router.get('/paginacao', FornecedorController.getFornecedoresPaginacao);
router.post('/', FornecedorController.createFornecedor);
router.put('/:id', FornecedorController.updateFornecedor);
router.delete('/:id', FornecedorController.deleteFornecedor);

export default router;
