import express from 'express';
import * as classificacaoController from '../../controllers/reforma-tributaria/classificacaoProdutos.controller';

const router = express.Router();

// Rotas de Classificação de Produtos
router.get('/classificacao-produtos', classificacaoController.listarProdutosClassificados);
router.post('/classificacao-produtos/sincronizar', classificacaoController.sincronizarClassificacao);
router.get('/classificacao-produtos/classificacoes-por-ncm', classificacaoController.listarClassificacoesPorNcm);
router.put('/classificacao-produtos/:produtoId', classificacaoController.atualizarClassificacaoManual);

export default router;
