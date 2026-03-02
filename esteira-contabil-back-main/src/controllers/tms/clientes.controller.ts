import { Request, Response } from 'express';
import * as ClientesService from '../../services/tms/clientes.service';

export class ClientesController {
  /**
   * Busca todos os clientes da empresa
   */
  static async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const clientes = await ClientesService.getClientes(empresaId);
      return res.status(200).json(clientes);
    } catch (error: any) {
      console.error('Erro ao buscar clientes:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Busca clientes com paginação e filtros
   */
  static async getPaginacao(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const {
        page = '1',
        pageSize = '50',
        orderBy = 'asc',
        orderColumn = 'ds_nome',
        search = '',
      } = req.query;

      const resultado = await ClientesService.getClientesPaginacao(
        empresaId,
        parseInt(page as string, 10),
        parseInt(pageSize as string, 10),
        orderBy as 'asc' | 'desc',
        orderColumn as string,
        search as string
      );
      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao buscar clientes paginados:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Busca um cliente por ID
   */
  static async getOne(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente não fornecido' });
      }

      const cliente = await ClientesService.getClienteById(empresaId, id);
      return res.status(200).json(cliente);
    } catch (error: any) {
      console.error('Erro ao buscar cliente:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cria um novo cliente
   */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { ds_nome, id_cidade } = req.body;

      if (!ds_nome) {
        return res.status(400).json({
          error: 'Nome do cliente é obrigatório',
        });
      }

      if (!id_cidade) {
        return res.status(400).json({
          error: 'Cidade é obrigatória',
        });
      }

      const cliente = await ClientesService.createCliente(empresaId, {
        ds_nome,
        id_cidade: parseInt(id_cidade, 10),
      });
      return res.status(201).json(cliente);
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Atualiza um cliente
   */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente não fornecido' });
      }

      const { ds_nome, id_cidade } = req.body;

      const cliente = await ClientesService.updateCliente(empresaId, id, {
        ds_nome,
        id_cidade: id_cidade ? parseInt(id_cidade, 10) : undefined,
      });
      return res.status(200).json(cliente);
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Deleta um cliente
   */
  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente não fornecido' });
      }

      await ClientesService.deleteCliente(empresaId, id);
      return res.status(200).json({ message: 'Cliente deletado com sucesso' });
    } catch (error: any) {
      console.error('Erro ao deletar cliente:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
