import * as centroCustosService from '../../services/contabil/centro-custos.service';
import { Request, Response } from 'express';

export class CentroCustosController {
  // GET operations
  static async getAllByEmpresa(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.params;
      const result =
        await centroCustosService.getCentroCustosByEmpresaId(empresaId);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao obter centros de custos:', error);
      res.status(500).json({
        error: 'Erro ao obter centros de custos.',
        message: error.message,
      });
    }
  }

  static async getPaginacao(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = req['empresaId'];
      const { status = '' } = req.query;

      const statusArray = status
        ? (status as string).split(',').map((s) => s.trim())
        : [];

      const result = await centroCustosService.getCentroCustosPaginacao(
        empresaId,
        statusArray
      );

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao obter centros de custos paginados:', error);
      res.status(500).json({
        error: 'Erro ao obter centros de custos paginados.',
        message: error.message,
      });
    }
  }

  // POST operations
  static async sincronizar(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.params;
      const result =
        await centroCustosService.sincronizarCentroCustosByEmpresaId(empresaId);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao sincronizar centros de custos:', error);
      res.status(500).json({
        error: 'Erro ao sincronizar centros de custos.',
        message: error.message,
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { centrosCustos, empresaId } = req.body;
      const result = await centroCustosService.createCentroCustos(
        centrosCustos,
        empresaId
      );
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro ao criar centros de custos:', error);
      res.status(500).json({
        error: 'Erro ao criar centros de custos.',
        message: error.message,
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { centrosCustos, empresaId } = req.body;
      const result = await centroCustosService.updateCentroCustos(
        centrosCustos,
        empresaId
      );
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao atualizar centros de custos:', error);
      res.status(500).json({
        error: 'Erro ao atualizar centros de custos.',
        message: error.message,
      });
    }
  }

  static async updateOne(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      const data = req.body;

      const result = await centroCustosService.updateCentroCusto(
        empresaId,
        id,
        data
      );

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao atualizar centro de custos:', error);
      res.status(500).json({
        error: 'Erro ao atualizar centro de custos.',
        message: error.message,
      });
    }
  }

  static async ativarTodos(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = req['empresaId'];
      let ids: string[] = [];
      if (req.body.ids) {
        ids = Array.isArray(req.body.ids)
          ? req.body.ids
          : req.body.ids.split(',').map((id: string) => id.trim());
      }

      const result = await centroCustosService.ativarTodosCentroCustos(
        empresaId,
        ids
      );
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao ativar centros de custos:', error);
      res.status(500).json({
        error: 'Erro ao ativar centros de custos.',
        message: error.message,
      });
    }
  }

  static async inativarTodos(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = req['empresaId'];
      let ids: string[] = [];
      if (req.body.ids) {
        ids = Array.isArray(req.body.ids)
          ? req.body.ids
          : req.body.ids.split(',').map((id: string) => id.trim());
      }

      const result = await centroCustosService.inativarTodosCentroCustos(
        empresaId,
        ids
      );
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao inativar centros de custos:', error);
      res.status(500).json({
        error: 'Erro ao inativar centros de custos.',
        message: error.message,
      });
    }
  }
}
