import * as tipoGrupoService from '../../services/contabil/tipo-grupo-contas.service';
import { Request, Response } from 'express';

export class TipoGrupoController {
  // GET operations
  static async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const result = await tipoGrupoService.getTipoGrupoByEmpresaId();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao obter tipos de grupo:', error);
      return res.status(500).json({ error: 'Erro ao obter tipos de grupo.' });
    }
  }

  // POST/PUT operations
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const { ds_nome_tipo } = req.body;
      const result = await tipoGrupoService.createTipoGrupo(ds_nome_tipo);
      return res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao criar tipo de grupo:', error);
      return res.status(500).json({ error: 'Erro ao criar tipo de grupo.' });
    }
  }

  // DELETE operations
  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { tipoId } = req.params;
      const result = await tipoGrupoService.deleteTipoGrupo(tipoId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao deletar tipo de grupo:', error);
      return res.status(500).json({ error: 'Erro ao deletar tipo de grupo.' });
    }
  }

  // Status operations
  static async activate(req: Request, res: Response): Promise<Response> {
    try {
      const { tipoId } = req.params;
      const result = await tipoGrupoService.activateTipoGrupo(tipoId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao ativar tipo de grupo:', error);
      return res.status(500).json({ error: 'Erro ao ativar tipo de grupo.' });
    }
  }

  static async deactivate(req: Request, res: Response): Promise<Response> {
    try {
      const { tipoId } = req.params;
      const result = await tipoGrupoService.deactivateTipoGrupo(tipoId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao desativar tipo de grupo:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao desativar tipo de grupo.' });
    }
  }
  static async updateGrupoContas(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { tipoId } = req.params;
      const { ds_nome_tipo } = req.body;
      const sincronizar = await tipoGrupoService.updateTipoGrupo(
        tipoId,
        ds_nome_tipo
      );
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter tipo de grupo conta por empresas.' });
    }
  }
}
