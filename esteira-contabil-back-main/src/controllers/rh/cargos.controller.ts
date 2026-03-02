import { Request, Response } from 'express';
import * as CargoService from '../../services/rh/cargo.service';

export class CargosController {
  // Criar um cargo
  static async createCargo(req: Request, res: Response): Promise<Response> {
    const { ds_nome, is_gerencia_supervisao, empresaId } = req.body;

    try {
      const cargo = await CargoService.createCargo(
        ds_nome,
        is_gerencia_supervisao,
        empresaId
      );
      return res.status(201).json(cargo);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar cargo.' });
    }
  }

  // Listar cargos
  static async listCargos(req: Request, res: Response): Promise<Response> {
    try {
      const cargo = await CargoService.listCargos();
      return res.status(200).json(cargo);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar cargo.' });
    }
  }

  // Obter um cargo pelo ID
  static async getCargo(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const cargo = await CargoService.getCargo(id);
      if (!cargo) {
        return res.status(404).json({ error: 'Cargo não encontrado.' });
      }
      return res.status(200).json(cargo);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar cargo.' });
    }
  }

  // Atualizar um cargo
  static async updateCargo(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const { ds_nome, is_gerencia_supervisao } = req.body;

    try {
      const cargo = await CargoService.updateCargo(
        id,
        ds_nome,
        is_gerencia_supervisao
      );
      if (!cargo) {
        return res.status(404).json({ error: 'Cargo não encontrado.' });
      }
      return res.status(200).json(cargo);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar cargo.' });
    }
  }

  // Ativar um cargo
  static async activateCargo(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const cargo = await CargoService.activateCargo(id);
      if (!cargo) {
        return res.status(404).json({ error: 'Cargo não encontrado.' });
      }
      return res.status(200).json(cargo);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao ativar o cargo.' });
    }
  }

  // Desativar um cargo
  static async deactivateCargo(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const cargo = await CargoService.deactivateCargo(id);
      if (!cargo) {
        return res.status(404).json({ error: 'Cargo não encontrado.' });
      }
      return res.status(200).json(cargo);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao desativar o cargo.' });
    }
  }

  // Deletar uma empresa
  static async deleteCargo(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const cargo = await CargoService.deleteCargo(id);
      if (!cargo) {
        return res.status(404).json({ error: 'Cargo não encontrado.' });
      }
      return res.status(200).json({ message: 'Cargo deletado com sucesso.' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao deletar cargo.' });
    }
  }

  // Listar níveis em um cargo
  static async listNiveisInCargo(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users = await CargoService.listNiveisInCargo(id);
      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar níveis ligados ao cargo.' });
    }
  }

  // Listar competências em um cargo
  static async listCompetenciasInCargo(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users = await CargoService.listCompetenciasInCargo(id);
      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar competências ligadas ao cargo.' });
    }
  }

  static async listCargoInEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const cargo = await CargoService.listCargoInEmpresa(id);
      if (!cargo) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }
      return res.status(200).json(cargo);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar empresa.' });
    }
  }

  static async createOrUpdateCargo(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresa = await CargoService.createOrUpdateCargo(
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
