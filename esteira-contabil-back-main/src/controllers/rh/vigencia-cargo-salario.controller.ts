import { Request, Response } from 'express';
import * as vigenciaCargoSalarioService from '../../services/rh/vigencia-cargo-salario.service';

export class VigenciaCargoSalarioController {
  static async getVigenciaByCargo(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { cargoId } = req.params;

    try {
      const vigencia =
        await vigenciaCargoSalarioService.getVigenciaByCargo(cargoId);
      if (!vigencia) {
        return res.status(404).json({ error: 'Vigência não encontrado.' });
      }
      return res.status(200).json(vigencia);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar vigência.' });
    }
  }
}
