import { SincronizarPlanoContasController } from '@/controllers/contabil/sincronizar/plano-contas.controller';

const express = require('express');
let router = express.Router();

/* Sincronização dos dados de planos de contas com id da empresa */
router.get(
  '/planocontas/:empresaId',
  SincronizarPlanoContasController.sincronizarPlanoContasByEmpresaId
);

export default router;
