import express from 'express';
import funcionarioRoutes from './funcionario.routes';
import cargosRoutes from './cargos.routes';
import niveisRoutes from './niveis.routes';
import cargoNivelRoutes from './cargo-nivel.routes';
import departamentoRoutes from './departamento.routes';
import centroCustosRoutes from './cargo-nivel.routes';
import sincronizarRhRoutes from './sincronizar/rh.routes';
import senioridadeRoutes from './senioridade.routes';
import vigenciaCargoSalarioRoutes from './vigencia-cargo-salario.routes';

let router = express.Router();

// Adicionar todas as rotas
router.use('/funcionarios', funcionarioRoutes);
router.use('/cargos', cargosRoutes);
router.use('/niveis', niveisRoutes);
router.use('/senioridades', senioridadeRoutes);
router.use('/cargonivel', cargoNivelRoutes);
router.use('/departamento', departamentoRoutes);
router.use('/centrocustos', centroCustosRoutes);
router.use('/sincronizar', sincronizarRhRoutes);
router.use('/vigencia', vigenciaCargoSalarioRoutes);

export default router;
