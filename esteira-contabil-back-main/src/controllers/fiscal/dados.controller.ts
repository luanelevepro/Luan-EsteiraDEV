import { Request, Response } from 'express';
import * as DadosService from '../../services/fiscal/dados.service';

export class DadosController {
  static async getFornecedores(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const fornecedores = await DadosService.getFornecedores(empresaId);
      return res.status(200).json(fornecedores);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao obter fornecedores.' });
    }
  }
}
