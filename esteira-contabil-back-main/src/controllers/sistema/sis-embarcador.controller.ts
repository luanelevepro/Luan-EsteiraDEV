import * as sisEmbarcadorService from '@/services/sistema/sis-embarcador.service';
import { validatePagination } from '@/core/utils';
import { RequestHandler, Request, Response } from 'express';

export default class SistemaEmbarcadorController {
  // Marcas Carrocerias
  static getMarcasCarrocerias: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const marcas = await sisEmbarcadorService.getMarcasCarrocerias(
        validatePagination(req)
      );
      res.status(200).json(marcas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter marcas de carrocerias.' });
    }
  };

  static createMarcaCarroceria: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const { cd_marca, ds_nome } = req.body;

      if (!cd_marca || !ds_nome) {
        res
          .status(400)
          .json({ error: 'Código e nome da marca são obrigatórios.' });
        return;
      }

      const marca = await sisEmbarcadorService.createMarcaCarroceria({
        cd_marca,
        ds_nome,
      });

      res.status(201).json(marca);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar marca de carroceria.' });
    }
  };

  static deleteMarcaCarroceria: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = Number(req.params.id);

      await sisEmbarcadorService.deleteMarcaCarroceria(id);
      res.status(200).json({});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir marca de carroceria.' });
    }
  };

  static updateMarcaCarroceria: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = Number(req.params.id);
      const { cd_marca, ds_nome } = req.body;

      if (!cd_marca || !ds_nome) {
        res
          .status(400)
          .json({ error: 'Código e nome da marca são obrigatórios.' });
        return;
      }

      const marca = await sisEmbarcadorService.updateMarcaCarroceria(id, {
        cd_marca,
        ds_nome,
      });

      res.status(200).json(marca);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar marca de carroceria.' });
    }
  };
}
