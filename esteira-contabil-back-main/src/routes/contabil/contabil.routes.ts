import express from 'express';
import sincronizarConRoutes from './sincronizar/sincronizar.routes';
import planoContasRoutes from './plano-contas.routes';
import grupoContasRoutes from './grupo-contas.routes';
import tipoGrupoRoutes from './tipo-grupo.routes';
import departamentoRoutes from './departamento.routes';
import centroCustosRoutes from './centro-custos.routes';

let router = express.Router();

router.use('/sincronizar', sincronizarConRoutes);
router.use('/planocontas', planoContasRoutes);
router.use('/grupocontas', grupoContasRoutes);
router.use('/tipogrupo', tipoGrupoRoutes);
router.use('/departamentos', departamentoRoutes);
router.use('/centrocustos', centroCustosRoutes);

export default router;
