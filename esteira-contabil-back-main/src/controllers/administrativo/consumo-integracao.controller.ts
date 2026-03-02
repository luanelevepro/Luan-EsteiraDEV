import { Request, RequestHandler, Response } from 'express';
import * as ConsumoIntegracaoService from '../../services/administrativo/consumo-integracao.service';

export class ConsumoIntegracaoController {
  static getConsumoIntegracaoByEmpCompt = async (
    req: Request,
    res: Response
  ) => {
    try {
      const { empresaId, competencia } = req.body as {
        empresaId: string;
        competencia: string;
      };

      if (!empresaId || !competencia) {
        return res.status(400).json({
          error: 'empresaId e competencia são obrigatórios',
        });
      }

      const result =
        await ConsumoIntegracaoService.getConsumoIntegracaoByEmpresaIdAndCompt(
          empresaId,
          competencia
        );
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar consumo:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao coletar consumo',
      });
    }
  };
  static getConsumoIntegracaoByEmpComptList = async (
    req: Request,
    res: Response
  ) => {
    try {
      const { empresasIdList, integracaoId, competencia } = req.body as {
        empresasIdList: string[];
        integracaoId: string;
        competencia: string;
      };

      if (!empresasIdList || !integracaoId || !competencia) {
        return res.status(400).json({
          error: 'empresas e competencia são obrigatórios',
        });
      }
      const result =
        await ConsumoIntegracaoService.getConsumoIntegracaoByEmpresaList(
          empresasIdList,
          integracaoId,
          competencia
        );
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar consumo por lista de empresas:', err);
      return res.status(500).json({
        error:
          err.message ||
          'Erro interno ao coletar consumo por lista de empresas',
      });
    }
  };
}
