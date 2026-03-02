import { Request, Response } from 'express';
import { DespesasViagensService } from '@/services/tms/despesas-viagens.service';

const service = new DespesasViagensService();

class DespesasController {
  async create(req: Request, res: Response) {
    try {
      const { viagemId } = req.params;
      const despesas = req.body;

      const result = await service.createDespesas({ viagemId, despesas });
      return res.status(201).json(result);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message || 'Internal error' });
    }
  }

  async listByViagem(req: Request, res: Response) {
    try {
      const { viagemId } = req.params;
      const result = await service.getDespesasByViagemId(viagemId);
      return res.json(result);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message || 'Internal error' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await service.getDespesaById(id);
      if (!result)
        return res.status(404).json({ error: 'Despesa não encontrada' });
      return res.json(result);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message || 'Internal error' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const result = await service.updateDespesaById(id, payload);
      return res.json(result);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message || 'Internal error' });
    }
  }

  async deleteByViagem(req: Request, res: Response) {
    try {
      const { viagemId } = req.params;
      await service.deleteDespesasByViagemId(viagemId);
      return res.status(204).send();
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message || 'Internal error' });
    }
  }

  async deleteById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await service.deleteDespesaById(id);
      return res.status(204).send();
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message || 'Internal error' });
    }
  }
}

const controllerInstance = new DespesasController();

export const create = (req: any, res: any) =>
  controllerInstance.create(req, res);
export const listByViagem = (req: any, res: any) =>
  controllerInstance.listByViagem(req, res);
export const getById = (req: any, res: any) =>
  controllerInstance.getById(req, res);
export const update = (req: any, res: any) =>
  controllerInstance.update(req, res);
export const deleteByViagem = (req: any, res: any) =>
  controllerInstance.deleteByViagem(req, res);
export const deleteById = (req: any, res: any) =>
  controllerInstance.deleteById(req, res);

export default controllerInstance;
