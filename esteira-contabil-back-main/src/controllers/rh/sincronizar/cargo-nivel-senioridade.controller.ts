import { Request, Response } from 'express';
import * as sincronizarCargoNivelSenioridade from '../../../services/rh/sincronizar/sincronizar-cargos-nivel-senioridade.service';

export class SincronizarCargoNivelSenioridadeController {
  static async sincronizarCargoNivelSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { empresaId } = req.params;
      const sincronizar =
        await sincronizarCargoNivelSenioridade.sincronizarCargosNivelSenioridade(
          empresaId
        );
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar Cargos por Nivel.' });
    }
  }
}
