import { Request, Response } from 'express';
import * as sincronizarCargos from '../../../services/rh/sincronizar/sincronizar-cargos.service';

export class SincronizarCargosController {
  static async sincronizarCargos(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const sincronizar = await sincronizarCargos.sincronizarCargos();
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res.status(500).json({ error: 'Erro ao sincronizar Cargos.' });
    }
  }
  static async sincronizarCargosByEmpresaId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { empresaId } = req.params;
      const sincronizar =
        await sincronizarCargos.sincronizarCargosByEmpresaId(empresaId);
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar cargos por empresas.' });
    }
  }
}
