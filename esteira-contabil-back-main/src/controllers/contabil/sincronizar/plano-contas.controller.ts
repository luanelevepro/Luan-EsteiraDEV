import * as sincronizarPlanoContas from '../../../services/contabil/sincronizar/plano-contas.service';
import { Request, Response } from 'express';

export class SincronizarPlanoContasController {
  static async sincronizarPlanoContasByEmpresaId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { empresaId } = req.params;
      const sincronizar =
        await sincronizarPlanoContas.sincronizarPlanoContasByEmpresaId(
          empresaId
        );
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar plano conta por empresas.' });
    }
  }
}
