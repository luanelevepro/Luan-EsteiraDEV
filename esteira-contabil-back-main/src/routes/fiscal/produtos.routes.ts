import { FiscalProdutoController } from '@/controllers/fiscal/produto.controller';
const express = require('express');

let router = express.Router();

// Segmentos Empresas\router.post('/sincronizar', FiscalProdutoController.sincronizarProdutos);
router.post('/sincronizar', FiscalProdutoController.sincronizarProdutos);
router.get('/', FiscalProdutoController.getProdutos);
router.get('/ativos', FiscalProdutoController.getProdutosAtivos);
router.get('/paginacao', FiscalProdutoController.getProdutosPaginacao);
router.post('/criar', FiscalProdutoController.createProduto);
router.post('/:id', FiscalProdutoController.updateProduto);
router.put('/ativar-all', FiscalProdutoController.ativarTodosProdutos);
router.put('/inativar-all', FiscalProdutoController.inativarTodosProdutos);
router.post('/', FiscalProdutoController.updateProdutos);

export default router;
