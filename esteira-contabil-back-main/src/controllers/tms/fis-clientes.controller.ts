import { Request, Response } from 'express';
import * as FisClientesService from '../../services/tms/fis-clientes.service';

export class FisClientesController {
  /**
   * Lista clientes fiscais (fis_clientes) da empresa para uso em TMS (tomador/cliente).
   * Retorna id, ds_nome, ds_documento para preencher dropdown e documento automaticamente.
   */
  static async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }
      const clientes = await FisClientesService.getFisClientes(empresaId);
      return res.status(200).json(clientes);
    } catch (error: any) {
      console.error('Erro ao buscar clientes fiscais:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
