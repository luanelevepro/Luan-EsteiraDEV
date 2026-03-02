import * as departamentoService from '../../services/contabil/departamento.service';
import { Request, Response } from 'express';

export class DepartamentoController {
  // GET operations
  static async getAllByEmpresa(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.params;
      const result =
        await departamentoService.getDepartamentosByEmpresaId(empresaId);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao obter departamentos:', error);
      res.status(500).json({
        error: 'Erro ao obter departamentos.',
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

      const result = await departamentoService.getDepartamentosPaginacao(
        empresaId,
        statusArray
      );

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao obter departamentos paginados:', error);
      res.status(500).json({
        error: 'Erro ao obter departamentos paginados.',
        message: error.message,
      });
    }
  }

  // POST operations
  static async sincronizar(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.params;
      const result =
        await departamentoService.sincronizarDepartamentosByEmpresaId(
          empresaId
        );
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao sincronizar departamentos:', error);
      res.status(500).json({
        error: 'Erro ao sincronizar departamentos.',
        message: error.message,
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { departamentos, empresaId } = req.body;
      const result = await departamentoService.createDepartamentos(
        departamentos,
        empresaId
      );
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro ao criar departamentos:', error);
      res.status(500).json({
        error: 'Erro ao criar departamentos.',
        message: error.message,
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { departamentos, empresaId } = req.body;
      const result = await departamentoService.updateDepartamentos(
        departamentos,
        empresaId
      );
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao atualizar departamentos:', error);
      res.status(500).json({
        error: 'Erro ao atualizar departamentos.',
        message: error.message,
      });
    }
  }

  static async updateOne(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      const data = req.body;

      const result = await departamentoService.updateDepartamento(
        empresaId,
        id,
        data
      );

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao atualizar departamento:', error);
      res.status(500).json({
        error: 'Erro ao atualizar departamento.',
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

      const result = await departamentoService.ativarTodosDepartamentos(
        empresaId,
        ids
      );
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao ativar departamentos:', error);
      res.status(500).json({
        error: 'Erro ao ativar departamentos.',
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

      const result = await departamentoService.inativarTodosDepartamentos(
        empresaId,
        ids
      );
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao inativar departamentos:', error);
      res.status(500).json({
        error: 'Erro ao inativar departamentos.',
        message: error.message,
      });
    }
  }
}
