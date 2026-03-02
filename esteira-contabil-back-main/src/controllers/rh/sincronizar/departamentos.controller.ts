import { Request, Response } from 'express';
import * as sincronizarDepartamento from '../../../services/rh/sincronizar/sincronizar-departamento.service';

export class SincronizarDepartamentoController {
  static async sincronizarDepartamento(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const sincronizar =
        await sincronizarDepartamento.sincronizarDepartamento();
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar departamentos.' });
    }
  }
  static async sincronizarDepartamentoByEmpresaId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { empresaId } = req.params;
      const sincronizar =
        await sincronizarDepartamento.sincronizarDepartamentoByEmpresaId(
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
