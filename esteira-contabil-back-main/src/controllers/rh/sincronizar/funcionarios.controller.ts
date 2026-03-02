import * as sincronizarFuncionarios from '../../../services/rh/sincronizar/sincronizar-funcionarios.service';
import { Request, Response } from 'express';

export class SincronizarFuncionarioController {
  static async sincronizarFuncionarios(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const sincronizar =
        await sincronizarFuncionarios.sincronizarFuncionarios();
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar funcionários.' });
    }
  }
  static async sincronizarFuncionariosByEmpresaId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { empresaId } = req.params;
      const sincronizar =
        await sincronizarFuncionarios.sincronizarFuncionariosByEmpresaId(
          empresaId
        );
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar funcionários por empresas.' });
    }
  }
}
