import { RequestHandler, Request, Response } from 'express';
import * as IntegracaoService from '@/services/sistema/integracao/tipo-integracao.service';

export class TipoIntegracaoController {
  static createTipoIntegracao: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const { ds_nome } = req.body;
      const integracao = await IntegracaoService.createTipoIntegracao(ds_nome);
      res.status(200).json(integracao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter integração.' });
    }
  };

  static getTipoIntegracao: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const integracao = await IntegracaoService.getTipoIntegracao();
      res.status(201).json(integracao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar tipo de integração.' });
    }
  };
}
