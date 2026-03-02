import { RequestHandler, Request, Response } from 'express';
import * as IntegracaoService from '@/services/sistema/integracao/integracao.service';

export class IntegracaoController {
  static createIntegracao: RequestHandler = async (req, res) => {
    try {
      const {
        ds_nome,
        ds_descricao,
        id_tipo_integracao,
        fl_is_para_escritorio,
        fl_is_para_sistema,
        fields,
      }: {
        ds_nome: string;
        ds_descricao?: string;
        id_tipo_integracao: string;
        fl_is_para_escritorio: boolean;
        fl_is_para_sistema: boolean;
        fields: {
          id: string;
          name: string;
          placeholder: string;
          type: string;
        }[];
      } = req.body;

      const integracao = await IntegracaoService.createIntegracao(
        ds_nome,
        ds_descricao,
        id_tipo_integracao,
        fl_is_para_escritorio,
        fl_is_para_sistema,
        fields
      );

      res.status(201).json(integracao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar integração.' });
    }
  };

  static getIntegracao: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const { empresaId, tipoConsulta } = req.params;
      const integracao = await IntegracaoService.getIntegracao(
        empresaId,
        tipoConsulta
      );
      res.status(201).json(integracao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao consultar integração.' });
    }
  };

  static getIntegracaoCompletaById: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const { integracaoId, empresaId } = req.params;
      const integracao = await IntegracaoService.getIntegracaoCompletaById(
        integracaoId,
        empresaId
      );
      res.status(201).json(integracao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao consultar integração.' });
    }
  };
  static deleteIntegracao: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const { integracaoId } = req.params;
      const integracao = await IntegracaoService.deleteIntegracao(integracaoId);
      res.status(201).json(integracao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao consultar integração.' });
    }
  };
  static upsertConfig: RequestHandler = async (req: Request, res: Response) => {
    try {
      const {
        id_integracao,
        id_sis_empresas,
        ds_valores_config,
      }: {
        id_integracao: string;
        id_sis_empresas: string;
        ds_valores_config: Record<string, string>;
      } = req.body;

      const config = await IntegracaoService.upsertConfig(
        id_integracao,
        id_sis_empresas,
        ds_valores_config
      );

      res.status(200).json(config);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao salvar configuração.' });
    }
  };
  static testarIntegracao: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const { id_integracao, id_sis_empresas } = req.body;

      const integracao = await IntegracaoService.testarConexaoIntegracao(
        id_integracao,
        id_sis_empresas
      );

      res.status(200).json(integracao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao testar integração.' });
    }
  };
}
