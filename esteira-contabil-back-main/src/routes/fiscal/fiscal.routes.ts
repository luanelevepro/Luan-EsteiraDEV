import express from 'express';
import cadastroRoutes from './cadastro.routes';
import produtosRoutes from './produtos.routes';
import notasFiscaisRoutes from './notas-fiscal.routes';
import documentoRoutes from './documento.routes';
import dadosRoutes from './dados.routes';
import fornecedorRoutes from './fornecedor.routes';
import siegRoutes from './sieg/sieg.routes';
import tecnoSpeedRoutes from './tecnospeed/tecnospeed.routes';
import regrasNfeRoutes from './regras-nfe.routes';
import satRoutes from './sat/sat.routes';
import auditoriaRoutes from './auditoria.routes';

let router = express.Router();

router.use('/cadastros', cadastroRoutes);
router.use('/produtos', produtosRoutes);
router.use('/notas-fiscais', notasFiscaisRoutes);
router.use('/documentos', documentoRoutes);
router.use('/dados', dadosRoutes);
router.use('/fornecedores', fornecedorRoutes);
router.use('/sieg', siegRoutes);
router.use('/tecnospeed', tecnoSpeedRoutes);
router.use('/regras-nfe', regrasNfeRoutes);
router.use('/sat', satRoutes);
router.use('/auditoria', auditoriaRoutes);

export default router;
