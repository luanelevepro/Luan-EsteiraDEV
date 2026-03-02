import { CertificadoController } from '@/controllers/sistema/empresa/certificado.controller';
// import { CidadesController } from "@/controllers/sistema/cidadeController";
import * as SistemaCadastroController from '../../controllers/sistema/cadastro.controller';
import * as CidadeController from '../../controllers/sistema/cidade.controller';
// import { UFController } from "@/controllers/sistema/ufController";
import { NextFunction } from 'express';
import { UFController } from '@/controllers/sistema/uf.controller';
const express = require('express');

let router = express.Router();

// Regimes Tributários
router.get(
  '/cadastros/crts',
  SistemaCadastroController.SistemaCadastroController.getCrts
);
router.get(
  '/cadastros/regimes-tributarios',
  SistemaCadastroController.SistemaCadastroController.getRegimesTributarios
);
router.get(
  '/cadastros/regimes-tributarios/:id',
  SistemaCadastroController.SistemaCadastroController.getRegimesTributariosById
);
router.post(
  '/cadastros/regimes-tributarios',
  SistemaCadastroController.SistemaCadastroController.createRegimeTributario
);
router.put(
  '/cadastros/regimes-tributarios/:id',
  SistemaCadastroController.SistemaCadastroController.updateRegimeTributario
);
router.delete(
  '/cadastros/regimes-tributarios/:id',
  SistemaCadastroController.SistemaCadastroController.deleteRegimeTributario
);

// Regimes Tributários @ Simples Nacional
router.get(
  '/cadastros/simples-nacional',
  SistemaCadastroController.SistemaCadastroController.getSimplesNacional
);
router.post(
  '/cadastros/simples-nacional',
  SistemaCadastroController.SistemaCadastroController.createSimplesNacional
);
router.put(
  '/cadastros/simples-nacional/:id',
  SistemaCadastroController.SistemaCadastroController.updateSimplesNacional
);
router.delete(
  '/cadastros/simples-nacional/:id',
  SistemaCadastroController.SistemaCadastroController.deleteSimplesNacional
);

// Tipos de Produto
router.get(
  '/cadastros/tipos-produto',
  SistemaCadastroController.SistemaCadastroController.getTiposProduto
);
router.post(
  '/cadastros/tipos-produto',
  SistemaCadastroController.SistemaCadastroController.createTipoProduto
);
router.put(
  '/cadastros/tipos-produto/:id',
  SistemaCadastroController.SistemaCadastroController.updateTipoProduto
);
router.delete(
  '/cadastros/tipos-produto/:id',
  SistemaCadastroController.SistemaCadastroController.deleteTipoProduto
);

// Tipos de Serviços
router.get(
  '/cadastros/tipos-servico',
  SistemaCadastroController.SistemaCadastroController.getTiposServico
);
router.post(
  '/cadastros/tipos-servico',
  SistemaCadastroController.SistemaCadastroController.createTipoServico
);
router.post(
  '/cadastros/tipos-servico-multiplo',
  SistemaCadastroController.SistemaCadastroController.createTipoServicoMultiplo
);
router.put(
  '/cadastros/tipos-servico/:id',
  SistemaCadastroController.SistemaCadastroController.updateTipoServico
);
router.delete(
  '/cadastros/tipos-servico/:id',
  SistemaCadastroController.SistemaCadastroController.deleteTipoServico
);

// Origem CST
router.get(
  '/cadastros/origem-cst',
  SistemaCadastroController.SistemaCadastroController.getOrigemCST
);
router.post(
  '/cadastros/origem-cst',
  SistemaCadastroController.SistemaCadastroController.createOrigemCST
);
router.put(
  '/cadastros/origem-cst/:id',
  SistemaCadastroController.SistemaCadastroController.updateOrigemCST
);
router.delete(
  '/cadastros/origem-cst/:id',
  SistemaCadastroController.SistemaCadastroController.deleteOrigemCST
);

// CST
router.get(
  '/cadastros/cst',
  SistemaCadastroController.SistemaCadastroController.getCST
);
router.post(
  '/cadastros/cst',
  SistemaCadastroController.SistemaCadastroController.createCST
);
router.put(
  '/cadastros/cst/:id',
  SistemaCadastroController.SistemaCadastroController.updateCST
);
router.delete(
  '/cadastros/cst/:id',
  SistemaCadastroController.SistemaCadastroController.deleteCST
);

// CFOP
router.get(
  '/cadastros/cfop',
  SistemaCadastroController.SistemaCadastroController.getCFOP
);
router.get(
  '/cadastros/cfop/paginacao',
  SistemaCadastroController.SistemaCadastroController.getCFOPPaginacao
);
router.post(
  '/cadastros/cfop',
  SistemaCadastroController.SistemaCadastroController.createCFOP
);
router.put(
  '/cadastros/cfop/:id',
  SistemaCadastroController.SistemaCadastroController.updateCFOP
);
router.delete(
  '/cadastros/cfop/:id',
  SistemaCadastroController.SistemaCadastroController.deleteCFOP
);

// Certificados
router.post('/certificado', CertificadoController.createCertificate);
router.get('/certificado', CertificadoController.getCertificate);
router.delete('/certificado/:id', CertificadoController.deleteCertificate);
router.get('/certificados', CertificadoController.getAllCertificates);

// UF
// Preloads UF parameter
router.param(
  'id_uf',
  (req: Request, res: Response, next: NextFunction, id_uf: string) => {
    req['id_uf'] = id_uf;
    next();
  }
);

router.get('/cadastros/uf', UFController.getUFs);
router.get('/cadastros/ufs', UFController.getUFsGeral);
router.get('/cadastros/uf/:id_uf', UFController.getUF);
router.get('/cadastros/uf/:id_uf/cidades', UFController.getUFCidades);

// // UF - Vigencias
// router.get("/cadastros/uf/:cd_uf/vigencias", UFController.getUFHistorico);
// router.post("/cadastros/uf/:cd_uf/vigencias", UFController.createUFHistorico);
// router.delete("/cadastros/uf/:cd_uf/vigencias", UFController.deleteUFHistorico);

// Cidades
// Preloads Cidade parameter
router.param(
  'id_cidade',
  (req: Request, res: Response, next: NextFunction, id_cidade: string) => {
    req['id_cidade'] = id_cidade;
    next();
  }
);

// Cidades são populadas única e exclusivamente pelo IBGE. Cidades também populam UF's
// Sem delete.
router.post(
  '/cadastros/cidades',
  CidadeController.CidadesController.updateCities
);
router.get('/cadastros/cidades', CidadeController.CidadesController.getCities);
router.get(
  '/cadastros/cidades/:id_cidade',
  CidadeController.CidadesController.getCityById
);

export default router;
