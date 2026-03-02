// SisEmabarcador são módulos originalmente do embarcador que foram movidos para o sistema
// rota: sis-embarcador

import SistemaEmbarcadorController from '@/controllers/sistema/sis-embarcador.controller';
import { Router } from 'express';

const router = Router();

// Marcas de Carrocerias
router.get(
  '/marcas-carrocerias',
  SistemaEmbarcadorController.getMarcasCarrocerias
);
router.post(
  '/marcas-carrocerias',
  SistemaEmbarcadorController.createMarcaCarroceria
);
router.put(
  '/marcas-carrocerias/:id',
  SistemaEmbarcadorController.updateMarcaCarroceria
);

router.delete(
  '/marcas-carrocerias/:id',
  SistemaEmbarcadorController.deleteMarcaCarroceria
);

export default router;
// TODO: Importação layout (Importar Spreadsheet de clientes)
