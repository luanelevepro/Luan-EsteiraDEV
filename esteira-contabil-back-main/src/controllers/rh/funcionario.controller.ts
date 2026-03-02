import { Request, Response } from 'express';
import * as FuncionarioService from '../../services/rh/funcionario.service';

// Criar um funcionário
export class FuncionarioController {
  static async createFuncionario(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { ds_nome, ds_salario, ds_sexo, empresaId } = req.body;

    try {
      const funcionario = await FuncionarioService.createFuncionario(
        ds_nome,
        ds_salario,
        ds_sexo,
        empresaId
      );
      return res.status(201).json(funcionario);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar funcionario.' });
    }
  }

  // Listar funcionários
  static async listFuncionarios(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const funcionario = await FuncionarioService.listFuncionarios();
      return res.status(200).json(funcionario);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar funcionario.' });
    }
  }

  // Obter um funcionário pelo ID
  static async getFuncionario(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const funcionario = await FuncionarioService.getFuncionarios(id);
      if (!funcionario) {
        return res.status(404).json({ error: 'Funcionario não encontrado.' });
      }
      return res.status(200).json(funcionario);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar funcionario.' });
    }
  }

  // Atualizar um funcionário
  static async updateFuncionario(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;
    const { ds_nome, ds_salario, ds_sexo, empresaId, cargoNivelId } = req.body;

    try {
      const funcionario = await FuncionarioService.updateFuncionarios(
        id,
        ds_nome,
        ds_salario,
        ds_sexo,
        empresaId,
        cargoNivelId
      );
      if (!funcionario) {
        return res.status(404).json({ error: 'Funcionario não encontrado.' });
      }
      return res.status(200).json(funcionario);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar funcionario.' });
    }
  }

  // Adicionar cargo e nível ao funcionário
  static async addCargoNivelToFuncionario(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id, cargoNivelId } = req.params;

    try {
      const funcionario = await FuncionarioService.addCargoNivelToFuncionario(
        id,
        cargoNivelId
      );
      if (!funcionario) {
        return res.status(404).json({ error: 'Funcionario não encontrado.' });
      }
      return res.status(200).json(funcionario);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar funcionario.' });
    }
  }

  // Adicionar Funcionário para empresa
  static async addFuncionarioToEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;
    const { empresaId } = req.body;

    try {
      const funcionario = await FuncionarioService.addFuncionarioToEmpresa(
        id,
        empresaId
      );
      if (!funcionario) {
        return res.status(404).json({ error: 'Funcionario não encontrado.' });
      }
      return res.status(200).json(funcionario);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar funcionario.' });
    }
  }

  // Deletar um funcionário
  static async deleteFuncionario(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const funcionario = await FuncionarioService.deleteFuncionarios(id);
      if (!funcionario) {
        return res.status(404).json({ error: 'Funcionário não encontrado.' });
      }
      return res
        .status(200)
        .json({ message: 'Funcionário deletado com sucesso.' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao deletar funcionário.' });
    }
  }

  // Listar funcionarios de uma empresa
  static async listFuncionariosInEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users = await FuncionarioService.listFuncionariosInEmpresa(id);
      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar usuários da empresa.' });
    }
  }

  // Listar cargo e nível do funcionário
  static async listCargoNivelInFuncionario(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users = await FuncionarioService.listCargoNivelInFuncionario(id);
      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar cargo e nível do funcionário.' });
    }
  }

  // Listar avaliações de um funcionário
  static async listAvaliacaoInFuncionario(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users = await FuncionarioService.listAvaliacaoInFuncionario(id);
      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar avaliações de um funcionário.' });
    }
  }

  // Criar ou atualizar um funcionário
  static async createOrUpdateFuncionario(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresa = await FuncionarioService.createOrUpdateFuncionario(
        req.body,
        req.body.empresaId
      );
      return res.status(201).json(empresa);
    } catch (error) {
      console.error('Erro ao criar/atualizar empresa:', error.message);
      return res.status(500).json({ error: 'Erro ao criar empresa.' });
    }
  }

  static async updateFuncionarioCargo(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { cargoId } = req.params;
    try {
      const empresa = await FuncionarioService.updateFuncionarioCargo(cargoId);
      return res.status(201).json(empresa);
    } catch (error) {
      console.error('Erro ao criar/atualizar empresa:', error.message);
      return res.status(500).json({ error: 'Erro ao criar empresa.' });
    }
  }
}
