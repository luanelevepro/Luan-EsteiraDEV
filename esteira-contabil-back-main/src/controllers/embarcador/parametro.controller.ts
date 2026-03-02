import type { Request, Response, RequestHandler } from 'express';
import * as EmbarcadorParametroService from '../../services/embarcador/parametro/parametro.service';
import { validatePagination } from '../../core/utils';

export default class EmbarcadorParametroController {
  // Classificação de Veiculos
  static getClassificacaoVeiculos: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const empresaId = req['empresaId'];
      const classificacoes =
        await EmbarcadorParametroService.getClassificacaoVeiculos(
          empresaId,
          validatePagination(req)
        );
      res.status(200).json(classificacoes);
      return;
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Erro ao obter classificações de veículos.' });
      return;
    }
  };

  static createClassificacaoVeiculos: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const empresaId = req['empresaId'];
      const {
        ds_classificacao,
        fl_carroceria_um_independente,
        fl_carroceria_dois_independente,
      } = req.body;

      if (!ds_classificacao) {
        res
          .status(400)
          .json({ error: 'Descrição da classificação é obrigatória.' });
        return;
      }

      const classificacao =
        await EmbarcadorParametroService.createClassificacaoVeiculos(
          empresaId,
          {
            ds_classificacao,
            fl_carroceria_um_independente:
              fl_carroceria_um_independente || false,
            fl_carroceria_dois_independente:
              fl_carroceria_dois_independente || false,
          }
        );

      res.status(201).json(classificacao);
      return;
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Erro ao criar classificação de veículos.' });
      return;
    }
  };

  static updateClassificacaoVeiculos: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = req.params.id;
      const {
        ds_classificacao,
        fl_carroceria_um_independente,
        fl_carroceria_dois_independente,
      } = req.body;

      if (!id) {
        res.status(400).json({ error: 'ID da classificação é obrigatório.' });
        return;
      }

      if (!ds_classificacao) {
        res
          .status(400)
          .json({ error: 'Descrição da classificação é obrigatória.' });
        return;
      }

      const classificacao =
        await EmbarcadorParametroService.updateClassificacaoVeiculos(id, {
          ds_classificacao,
          fl_carroceria_um_independente,
          fl_carroceria_dois_independente,
        });

      res.status(200).json(classificacao);
      return;
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Erro ao atualizar classificação de veículos.' });
      return;
    }
  };

  static deleteClassificacaoVeiculos: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const id = req.params.id;

      await EmbarcadorParametroService.deleteClassificacaoVeiculos(id);
      res.status(200).json({ message: 'Classificação excluída com sucesso.' });
      return;
    } catch (error) {
      console.error(error);
      res.status(500);
      return;
    }
  };

  // Classificação de Carrocerias
  static getClassificacaoCarrocerias: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const empresaId = req['empresaId'];
      const carrocerias =
        await EmbarcadorParametroService.getClassificacaoCarrocerias(
          empresaId,
          validatePagination(req)
        );
      res.status(200).json(carrocerias);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Erro ao obter classificações de carrocerias.' });
    }
  };

  static createClassificacaoCarrocerias: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const empresaId = req['empresaId'];
      const { ds_classificacao } = req.body;

      if (!ds_classificacao) {
        res
          .status(400)
          .json({ error: 'Descrição da classificação é obrigatória.' });
        return;
      }

      const carroceria =
        await EmbarcadorParametroService.createClassificacaoCarrocerias(
          empresaId,
          {
            ds_classificacao,
          }
        );

      res.status(201).json(carroceria);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Erro ao criar classificação de carrocerias.' });
    }
  };

  static updateClassificacaoCarrocerias: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const empresaId = req['empresaId'];
      const id = req.params.id;
      const { ds_classificacao } = req.body;

      if (!ds_classificacao) {
        res
          .status(400)
          .json({ error: 'Descrição da classificação é obrigatória.' });
        return;
      }

      const carroceria =
        await EmbarcadorParametroService.updateClassificacaoCarrocerias(
          empresaId,
          id,
          {
            ds_classificacao,
          }
        );

      res.status(200).json(carroceria);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Erro ao atualizar classificação de carrocerias.' });
    }
  };

  static deleteClassificacaoCarrocerias: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const empresaId = req['empresaId'];
      const id = req.params.id;

      await EmbarcadorParametroService.deleteClassificacaoCarrocerias(
        empresaId,
        id
      );
      res.status(200).json({ message: 'Classificação excluída com sucesso.' });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Erro ao excluir classificação de carrocerias.' });
    }
  };

  // Classificação de Implementos
  static getClassificacaoImplementos: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const empresaId = req['empresaId'];
      const implementos =
        await EmbarcadorParametroService.getClassificacaoImplementos(
          empresaId,
          validatePagination(req)
        );
      res.status(200).json(implementos);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Erro ao obter classificações de implementos.' });
    }
  };

  static createClassificacaoImplementos: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const empresaId = req['empresaId'];
      const { ds_classificacao, fl_acrescimo_eixo } = req.body;

      if (!ds_classificacao) {
        res
          .status(400)
          .json({ error: 'Descrição da classificação é obrigatória.' });
        return;
      }

      const implemento =
        await EmbarcadorParametroService.createClassificacaoImplementos(
          empresaId,
          {
            ds_classificacao,
            fl_acrescimo_eixo: fl_acrescimo_eixo || false,
          }
        );

      res.status(201).json(implemento);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Erro ao criar classificação de implementos.' });
    }
  };

  static updateClassificacaoImplementos: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const empresaId = req['empresaId'];
      const id = req.params.id;
      const { ds_classificacao, fl_acrescimo_eixo } = req.body;

      if (!ds_classificacao) {
        res
          .status(400)
          .json({ error: 'Descrição da classificação é obrigatória.' });
        return;
      }

      const implemento =
        await EmbarcadorParametroService.updateClassificacaoImplementos(
          empresaId,
          id,
          {
            ds_classificacao,
            fl_acrescimo_eixo,
          }
        );

      res.status(200).json(implemento);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Erro ao atualizar classificação de implementos.' });
    }
  };

  static deleteClassificacaoImplementos: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const empresaId = req['empresaId'];
      const id = req.params.id;

      await EmbarcadorParametroService.deleteClassificacaoImplementos(
        empresaId,
        id
      );
      res.status(200).json({ message: 'Classificação excluída com sucesso.' });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Erro ao excluir classificação de implementos.' });
    }
  };
}
