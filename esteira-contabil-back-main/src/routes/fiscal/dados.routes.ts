import { DadosController } from '@/controllers/fiscal/dados.controller';
const express = require('express');

let router = express.Router();

// Notas Fiscais
router.get('/fornecedores', DadosController.getFornecedores);

export default router;
