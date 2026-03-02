import { Request, Response } from 'express';
import * as DepartamentoService from '../../services/rh/departamento.service';

// Criar um departamento
export class DepartamentoController {
  static async createDepartamento(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { ds_nome, empresaId } = req.body;

    try {
      const departamento = await DepartamentoService.createDepartamento(
        ds_nome,
        empresaId
      );
      return res.status(201).json(departamento);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar departamento.' });
    }
  }

  // Listar departamentos
  static async listDepartamentos(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const departamento = await DepartamentoService.listDepartamentos();
      return res.status(200).json(departamento);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar departamento.' });
    }
  }

  // Obter um departamento pelo ID
  static async getDepartamento(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const departamento = await DepartamentoService.getDepartamento(id);
      if (!departamento) {
        return res.status(404).json({ error: 'Departamento não encontrado.' });
      }
      return res.status(200).json(departamento);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar departamento.' });
    }
  }

  // Atualizar um departamento
  static async updateDepartamento(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;
    const { ds_nome, empresaId } = req.body;

    try {
      const departamento = await DepartamentoService.updateDepartamento(
        id,
        ds_nome,
        empresaId
      );
      if (!departamento) {
        return res.status(404).json({ error: 'Departamento não encontrado.' });
      }
      return res.status(200).json(departamento);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar departamento.' });
    }
  }

  // Deletar um departamento
  static async deleteDepartamento(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const departamento = await DepartamentoService.deleteDepartamento(id);
      if (!departamento) {
        return res.status(404).json({ error: 'Funcionário não encontrado.' });
      }
      return res
        .status(200)
        .json({ message: 'Funcionário deletado com sucesso.' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao deletar funcionário.' });
    }
  }

  // Listar funcionarios de um departamento
  static async listFuncionariosInDepartamento(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users =
        await DepartamentoService.listFuncionariosInDepartamento(id);
      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar funcionários do departamento.' });
    }
  }

  static async createOrUpdateDepartamento(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresa = await DepartamentoService.createOrUpdateDepartamento(
        req.body,
        req.body.empresaId
      );
      return res.status(201).json(empresa);
    } catch (error) {
      console.error('Erro ao criar/atualizar empresa:', error.message);
      return res.status(500).json({ error: 'Erro ao criar empresa.' });
    }
  }
}
