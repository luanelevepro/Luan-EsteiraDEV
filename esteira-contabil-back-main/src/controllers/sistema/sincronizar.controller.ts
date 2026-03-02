import { Request, Response } from 'express';
import * as sincronizarService from '../../services/sistema/sincronizar.service';

export class SincronizarController {
  static async sincronizarEmpresas(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const sincronizar = await sincronizarService.sincronizarEmpresas();
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res.status(500).json({ error: 'Erro ao sincronizar empresas.' });
    }
  }

  static async sincronizarEscritorio(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const sincronizar =
        await sincronizarService.sincronizarEscritorio(empresaId);
      return res.status(200).json(sincronizar);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar escritórios. ' + error.message });
    }
  }
}
