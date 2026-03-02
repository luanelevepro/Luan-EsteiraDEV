import { Request, Response } from 'express';
import * as ArmadoresService from '../../services/tms/armadores.service';

export class ArmadoresController {
  /**
   * Busca todos os armadores (cadastro global)
   * GET /api/tms/armadores
   */
  static async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const armadores = await ArmadoresService.getArmadores();
      return res.status(200).json(armadores);
    } catch (error: any) {
      console.error('Erro ao buscar armadores:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cria um armador
   * POST /api/tms/armadores
   */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const { ds_nome } = req.body;
      if (!ds_nome || typeof ds_nome !== 'string') {
        return res.status(400).json({ error: 'Nome (ds_nome) é obrigatório.' });
      }
      const armador = await ArmadoresService.createArmador({ ds_nome });
      return res.status(201).json(armador);
    } catch (error: any) {
      console.error('Erro ao criar armador:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Atualiza um armador
   * PUT /api/tms/armadores/:id
   */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { ds_nome } = req.body;
      if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });
      if (!ds_nome || typeof ds_nome !== 'string') {
        return res.status(400).json({ error: 'Nome (ds_nome) é obrigatório.' });
      }
      const armador = await ArmadoresService.updateArmador(id, { ds_nome });
      return res.status(200).json(armador);
    } catch (error: any) {
      console.error('Erro ao atualizar armador:', error);
      if (error.code === 'P2025') return res.status(404).json({ error: 'Armador não encontrado.' });
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Remove um armador
   * DELETE /api/tms/armadores/:id
   */
  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });
      await ArmadoresService.deleteArmador(id);
      return res.status(200).json({ message: 'Armador removido com sucesso.' });
    } catch (error: any) {
      console.error('Erro ao excluir armador:', error);
      if (error.code === 'P2025') return res.status(404).json({ error: 'Armador não encontrado.' });
      return res.status(500).json({ error: error.message });
    }
  }
}
