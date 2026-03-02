import * as RegrasNfeService from '../../services/fiscal/regras-nfe.service';
import { Request, Response } from 'express';

export class RegrasNfeController {
  // Regras de NFe
  static async getRegrasNfe(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const regras = await RegrasNfeService.getRegrasNfe(empresaId);
      return res.status(200).json(regras);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter regras. ' + error.message });
    }
  }
  static async createRegrasNfe(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const data = req.body;
      const regra = await RegrasNfeService.createRegraNfe(empresaId, data);
      return res.status(201).json(regra);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao criar regra. ' + error.message });
    }
  }

  static async getRegraNfeById(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      const regra = await RegrasNfeService.getRegraNfeById(id, empresaId);
      return res.status(200).json(regra);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter regra. ' + error.message });
    }
  }

  static async updateRegrasNfe(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      const data = req.body;
      const regra = await RegrasNfeService.updateRegraNfe(id, empresaId, data);
      return res.status(200).json(regra);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao atualizar regra. ' + error.message });
    }
  }

  static async deleteRegraNfe(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      const result = await RegrasNfeService.deleteRegraNfe(id, empresaId);
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao deletar regra. ' + error.message });
    }
  }

  static async duplicateRegraNfe(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      const result = await RegrasNfeService.duplicateRegraNfe(
        id,
        empresaId
      );
      return res.status(201).json(result);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao duplicar regra. ' + error.message });
    }
  }

  static async executarConciliacao(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const usuarioId = req['usuarioId'];
      // aceita nfeIds via body (preferencial) ou query param 'nfeIds' como separado por vírgulas
      const nfeIdsBody = req.body?.nfeIds;
      const nfeIdsQuery = req.query?.nfeIds as string | undefined;
      let nfeIds: string[] = [];

      if (Array.isArray(nfeIdsBody)) {
        nfeIds = nfeIdsBody;
      } else if (typeof nfeIdsQuery === 'string' && nfeIdsQuery.trim()) {
        nfeIds = nfeIdsQuery
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (typeof nfeIdsBody === 'string' && nfeIdsBody.trim()) {
        nfeIds = nfeIdsBody
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      const result = await RegrasNfeService.executarConciliacaoRegrasNfe(
        empresaId,
        nfeIds,
        usuarioId
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao executar conciliação. ' + error.message });
    }
  }
}
