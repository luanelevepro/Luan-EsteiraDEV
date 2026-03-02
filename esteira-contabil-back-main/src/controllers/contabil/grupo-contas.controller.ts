import * as grupoContasService from '../../services/contabil/grupo-contas.service';
import { Request, Response } from 'express';

export class GrupoContasController {
  // GET operations
  static async getAllByEmpresa(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.params;
      const result =
        await grupoContasService.getGrupoContasByEmpresaId(empresaId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao obter grupos de contas:', error);
      res.status(500).json({ error: 'Erro ao obter grupos de contas.' });
    }
  }

  // POST/PUT operations
  static async createOrUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { grupocontas, empresa_id, tipogrupo } = req.body;
      const result = await grupoContasService.createOrUpdateGrupoContas(
        grupocontas,
        empresa_id,
        tipogrupo
      );
      res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao criar/atualizar grupo de contas:', error);
      res
        .status(500)
        .json({ error: 'Erro ao criar/atualizar grupo de contas.' });
    }
  }

  // DELETE operations
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { grupoId } = req.params;
      const result = await grupoContasService.deleteGrupoContas(grupoId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao deletar grupo de contas:', error);
      res.status(500).json({ error: 'Erro ao deletar grupo de contas.' });
    }
  }

  // Status operations
  static async activate(req: Request, res: Response): Promise<void> {
    try {
      const { grupoId } = req.params;
      const result = await grupoContasService.activateGrupoContas(grupoId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao ativar grupo de contas:', error);
      res.status(500).json({ error: 'Erro ao ativar grupo de contas.' });
    }
  }

  static async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { grupoId } = req.params;
      const result = await grupoContasService.deactivateGrupoContas(grupoId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao desativar grupo de contas:', error);
      res.status(500).json({ error: 'Erro ao desativar grupo de contas.' });
    }
  }
}
