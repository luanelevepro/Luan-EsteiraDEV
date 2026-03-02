import EmbarcadorParametroController from '@/controllers/embarcador/parametro.controller';
import EmbarcadorCadastroTransportadorasController from '@/controllers/embarcador/transportadoras.controller';
import EmbarcadorCadastroEstabelecimentosController from '@/controllers/embarcador/estabelecimento.controller';
import { Router } from 'express';

const router = Router();

// Classificação de Veículos
router.get(
  '/parametro/classificacao-veiculos',
  EmbarcadorParametroController.getClassificacaoVeiculos
);
router.post(
  '/parametro/classificacao-veiculos',
  EmbarcadorParametroController.createClassificacaoVeiculos
);
router.put(
  '/parametro/classificacao-veiculos/:id',
  EmbarcadorParametroController.updateClassificacaoVeiculos
);
router.delete(
  '/parametro/classificacao-veiculos/:id',
  EmbarcadorParametroController.deleteClassificacaoVeiculos
);

// Classificação de Carrocerias
router.get(
  '/parametro/classificacao-carrocerias',
  EmbarcadorParametroController.getClassificacaoCarrocerias
);
router.post(
  '/parametro/classificacao-carrocerias',
  EmbarcadorParametroController.createClassificacaoCarrocerias
);
router.put(
  '/parametro/classificacao-carrocerias/:id',
  EmbarcadorParametroController.updateClassificacaoCarrocerias
);
router.delete(
  '/parametro/classificacao-carrocerias/:id',
  EmbarcadorParametroController.deleteClassificacaoCarrocerias
);

// Classificação de Implementos
router.get(
  '/parametro/classificacao-implementos',
  EmbarcadorParametroController.getClassificacaoImplementos
);
router.post(
  '/parametro/classificacao-implementos',
  EmbarcadorParametroController.createClassificacaoImplementos
);
router.put(
  '/parametro/classificacao-implementos/:id',
  EmbarcadorParametroController.updateClassificacaoImplementos
);
router.delete(
  '/parametro/classificacao-implementos/:id',
  EmbarcadorParametroController.deleteClassificacaoImplementos
);

// Transportadoras
router.get(
  '/cadastro/transportadoras',
  EmbarcadorCadastroTransportadorasController.getTransportadoras
);
router.post(
  '/cadastro/transportadoras',
  EmbarcadorCadastroTransportadorasController.createTransportadora
);
router.put(
  '/cadastro/transportadoras/:id',
  EmbarcadorCadastroTransportadorasController.updateTransportadora
);
router.delete(
  '/cadastro/transportadoras/:id',
  EmbarcadorCadastroTransportadorasController.deleteTransportadora
);

// Estabelecimentos
router.get(
  '/cadastro/estabelecimentos',
  EmbarcadorCadastroEstabelecimentosController.getEstabelecimentos
);
router.post(
  '/cadastro/estabelecimentos',
  EmbarcadorCadastroEstabelecimentosController.createEstabelecimento
);
router.post(
  '/cadastro/estabelecimentos',
  EmbarcadorCadastroEstabelecimentosController.createEstabelecimento
);
router.put(
  '/cadastro/estabelecimentos/:id',
  EmbarcadorCadastroEstabelecimentosController.updateEstabelecimento
);
router.delete(
  '/cadastro/estabelecimentos/:id',
  EmbarcadorCadastroEstabelecimentosController.deleteEstabelecimento
);

export default router;
