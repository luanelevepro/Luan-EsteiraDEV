import * as embTransportadorasService from '@/services/embarcador/transportadoras.service';
import { validatePagination } from '@/core/utils';
import { RequestHandler, Request, Response } from 'express';
import { getEmbarcadorEmpresa } from '@/services/embarcador/embarcador-empresa.service';

export default class EmbTransportadorasController {
  static getTransportadoras: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const embarcadorEmpresa = await getEmbarcadorEmpresa(req['empresaId']);

      const transportadoras =
        await embTransportadorasService.getTransportadoras(
          embarcadorEmpresa.id,
          validatePagination(req)
        );
      res.status(200).json(transportadoras);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter transportadoras.' });
    }
  };

  static getTransportadora: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const cd_codigo = req.params.cd_codigo;

      const transportadora =
        await embTransportadorasService.getTransportadora(cd_codigo);
      res.status(200).json(transportadora);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter transportadora.' });
    }
  };

  static createTransportadora: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        cd_transportadora,
        ds_cnpj,
        ds_nome_fantasia,
        ds_razao_social,
        id_emb_ibge_uf,
        id_sis_ibge_cidade,
      } = req.body;

      if (
        !cd_transportadora ||
        !ds_cnpj ||
        !ds_nome_fantasia ||
        !ds_razao_social
      ) {
        res.status(400).json({
          error: 'Código, CNPJ, nome fantasia e razão social são obrigatórios.',
        });
        return;
      }
      const empresaId = req['empresaId'];
      const embarcadorEmpresa = await getEmbarcadorEmpresa(empresaId);

      const transportadora =
        await embTransportadorasService.createTransportadora(
          embarcadorEmpresa.id,
          {
            cd_transportadora,
            ds_cnpj,
            ds_nome_fantasia,
            ds_razao_social,
            id_emb_ibge_uf,
            id_sis_ibge_cidade,
          }
        );
      res.status(201).json(transportadora);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar transportadora.' });
    }
  };

  static updateTransportadora: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const original_cd_transportadora = req.params.id;
      const {
        cd_transportadora,
        ds_cnpj,
        ds_nome_fantasia,
        ds_razao_social,
        id_sis_ibge_cidade,
        id_emb_ibge_cidade,
      } = req.body;

      if (!original_cd_transportadora) {
        res
          .status(400)
          .json({ error: 'Código da transportadora é obrigatório.' });
        return;
      }

      if (!id_sis_ibge_cidade) {
        res.status(400).json({
          error: 'ID da cidade é obrigatório.',
        });
        return;
      }

      await embTransportadorasService.updateTransportadora(
        original_cd_transportadora,
        {
          cd_transportadora,
          ds_cnpj,
          ds_nome_fantasia,
          ds_razao_social,
          id_sis_ibge_cidade: Number(id_sis_ibge_cidade),
          id_emb_ibge_cidade: Number(id_emb_ibge_cidade),
        }
      );

      res.status(200).json({});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar transportadora.' });
    }
  };

  static deleteTransportadora: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const cd_transportadora = req.params.id;

      await embTransportadorasService.deleteTransportadora(cd_transportadora);
      res.status(200).json({});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir transportadora.' });
    }
  };
}
