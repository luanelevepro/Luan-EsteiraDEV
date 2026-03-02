import PessoaService from '@/services/geral/pessoa.service';
import { Request, Response } from 'express';

const pessoaService = new PessoaService();

export class PessoaController {
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const data = req.body;
      const pessoa = await pessoaService.create(data);
      return res.status(201).json(pessoa);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao criar pessoa. ' + error.message });
    }
  }

  static async findOne(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const pessoa = await pessoaService.findOne(id);

      if (!pessoa) {
        return res.status(404).json({ error: 'Pessoa não encontrada.' });
      }

      return res.status(200).json(pessoa);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter pessoa. ' + error.message });
    }
  }

  static async findAll(req: Request, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;

      const pessoas = await pessoaService.findAll(page, pageSize);
      return res.status(200).json(pessoas);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter pessoas. ' + error.message });
    }
  }

  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const data = req.body;
      const pessoa = await pessoaService.update(id, data);
      return res.status(200).json(pessoa);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao atualizar pessoa. ' + error.message });
    }
  }
}
