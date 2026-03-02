import { Request, RequestHandler, Response } from 'express';
import * as AdmEmpresaService from '../../services/administrativo/administrativo-empresa.service';

export class AdmEmpresaController {
  static getSisEmpByAdmEmpList = async (req: Request, res: Response) => {
    try {
      const { admEmpresas } = req.body as {
        admEmpresas: string[];
      };

      if (!admEmpresas) {
        return res.status(400).json({
          error: 'lista de empresas é obrigatório',
        });
      }

      const result =
        await AdmEmpresaService.getSisEmpresasByAdmEmpresaList(admEmpresas);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar empresas:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao coletar empresas',
      });
    }
  };
}
