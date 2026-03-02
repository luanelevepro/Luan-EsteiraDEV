import * as embEstabelecimentosService from '@/services/embarcador/estabelecimento.service';
import { validatePagination } from '@/core/utils';
import { RequestHandler, Request, Response } from 'express';
import { getEmbarcadorEmpresa } from '@/services/embarcador/embarcador-empresa.service';

export default class EmbEstabelecimentosController {
  static getEstabelecimentos: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    const empresaId = req['empresaId'];

    try {
      const embarcadorEmpresa = await getEmbarcadorEmpresa(empresaId);

      const estabelecimentos =
        await embEstabelecimentosService.getEstabelecimentos(
          embarcadorEmpresa.id,
          validatePagination(req)
        );
      res.status(200).json(estabelecimentos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter estabelecimentos.' });
    }
  };

  static createEstabelecimento: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const { ds_nome, id_sis_ibge_cidade } = req.body;
      const empresaId = req['empresaId'];
      const embarcadorEmpresa = await getEmbarcadorEmpresa(empresaId);

      if (!ds_nome || !id_sis_ibge_cidade) {
        res
          .status(400)
          .json({ error: 'Nome e código da cidade são obrigatórios.' });
        return;
      }

      if (!Number.isInteger(Number(id_sis_ibge_cidade))) {
        res
          .status(400)
          .json({ error: 'Código da cidade deve ser um número inteiro.' });
        return;
      }

      if (!empresaId) {
        res.status(400).json({ error: 'Empresa não encontrada.' });
        return;
      }

      const estabelecimento =
        await embEstabelecimentosService.createEstabelecimento(
          embarcadorEmpresa.id,
          {
            ds_nome,
            id_sis_ibge_cidade: id_sis_ibge_cidade,
          }
        );
      res.status(201).json(estabelecimento);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar estabelecimento.' });
    }
  };

  static updateEstabelecimento: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = req.params.id;
      const { ds_nome, id_sis_ibge_cidade } = req.body;

      if (!ds_nome || !id_sis_ibge_cidade) {
        res
          .status(400)
          .json({ error: 'Nome e código da cidade são obrigatórios.' });
        return;
      }

      if (!Number.isInteger(id_sis_ibge_cidade)) {
        res
          .status(400)
          .json({ error: 'Código da cidade deve ser um número inteiro.' });
        return;
      }

      const estabelecimento =
        await embEstabelecimentosService.updateEstabelecimento(id, {
          ds_nome,
          id_sis_ibge_cidade,
        });
      res.status(200).json(estabelecimento);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar estabelecimento.' });
    }
  };

  static deleteEstabelecimento: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = req.params.id;

      await embEstabelecimentosService.deleteEstabelecimento(id);
      res.status(200).json({});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir estabelecimento.' });
    }
  };
}
