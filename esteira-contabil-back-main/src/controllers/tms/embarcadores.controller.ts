import { Request, Response } from 'express';
import * as EmbarcadoresService from '../../services/tms/embarcadores.service';

export class EmbarcadoresController {
  /**
   * Busca todos os embarcadores da empresa TMS
   * GET /api/tms/embarcadores
   */
  static async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const embarcadores = await EmbarcadoresService.getEmbarcadores(empresaId);
      return res.status(200).json(embarcadores);
    } catch (error: any) {
      console.error('Erro ao buscar embarcadores:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
