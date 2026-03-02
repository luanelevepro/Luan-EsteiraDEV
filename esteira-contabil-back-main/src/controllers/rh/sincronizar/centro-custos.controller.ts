import { Request, Response } from 'express';
import * as sincronizarCentroCustos from '../../../services/rh/sincronizar/sincronizar-centro-custos.service';

export class SincronizarCentroCustosController {
  static async sincronizarCentrosCustos(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const sincronizar =
        await sincronizarCentroCustos.sincronizarCentroCustos();
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar Centro de custos.' });
    }
  }

  static async sincronizarCentrosCustosByEmpresaId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { empresaId } = req.params;
      const sincronizar =
        await sincronizarCentroCustos.sincronizarCentroCustosByEmpresaId(
          empresaId
        );
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter informações dos perfis.' });
    }
  }
}
