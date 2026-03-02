import { Request, Response } from 'express';
import * as CargoNivelService from '../../services/rh/cargo-nivel.service';

export class CargoNivelController {
  static async createCargoNivelSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { cargoId, nivelId, senioridadeId, empresaId } = req.body;

    try {
      const cargo_nivel = await CargoNivelService.createCargoNivelSenioridade(
        cargoId,
        nivelId,
        senioridadeId,
        empresaId
      );
      return res.status(201).json(cargo_nivel);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao criar cargo_nível_senioridade.' });
    }
  }

  static async listCargosNiveisSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const cargo_nivel = await CargoNivelService.listCargosNiveisSenioridade();
      return res.status(200).json(cargo_nivel);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar cargo_nível_senioridade.' });
    }
  }

  static async listFuncionariosInCargoNivelSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const cargo_nivel =
        await CargoNivelService.listFuncionariosInCargoNivelSenioridade(id);
      return res.status(200).json(cargo_nivel);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar cargo_nível_senioridade.' });
    }
  }

  static async getCargoNivelSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const cargo_nivel = await CargoNivelService.getCargoNivelSenioridade(id);
      if (!cargo_nivel) {
        return res
          .status(404)
          .json({ error: 'Cargo_nível_senioridade não encontrado.' });
      }
      return res.status(200).json(cargo_nivel);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao buscar cargo_nível_senioridade.' });
    }
  }

  static async updateCargoNivelSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;
    const { cargoId, nivelId } = req.body;

    try {
      const cargo_nivel = await CargoNivelService.updateCargoNivelSenioridade(
        id,
        cargoId,
        nivelId
      );
      if (!cargo_nivel) {
        return res
          .status(404)
          .json({ error: 'Cargo_nível_senioridade não encontrado.' });
      }
      return res.status(200).json(cargo_nivel);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao atualizar cargo_nível_senioridade.' });
    }
  }

  static async deleteCargoNivelSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const cargo_nivel =
        await CargoNivelService.deleteCargoNivelSenioridade(id);
      if (!cargo_nivel) {
        return res
          .status(404)
          .json({ error: 'Cargo_nível_senioridade não encontrado.' });
      }
      return res
        .status(200)
        .json({ message: 'Cargo_nível_senioridade deletado com sucesso.' });
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao deletar cargo_nível_senioridade.' });
    }
  }

  static async getCargoNivelSenioridadeInEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { empresaId } = req.params;

    try {
      const cargo_nivel =
        await CargoNivelService.getCargoNivelSenioridadeInEmpresa(empresaId);
      if (!cargo_nivel) {
        return res
          .status(404)
          .json({ error: 'Cargo_nível_senioridade não encontrado.' });
      }
      return res.status(200).json(cargo_nivel);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao buscar cargo_nível_senioridade.' });
    }
  }

  static async getCargoNivelSenioridadeById(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { cargoId } = req.params;

    try {
      const cargo_nivel =
        await CargoNivelService.getCargoNivelSenioridadeById(cargoId);
      if (!cargo_nivel) {
        return res
          .status(404)
          .json({ error: 'Cargo_nível_senioridade não encontrado.' });
      }
      return res.status(200).json(cargo_nivel);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao buscar cargo_nível_senioridade.' });
    }
  }

  static async updateCargoSalarios(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;
    const {
      ds_salario_min,
      ds_salario_max,
      id_cargo,
      id_nivel,
      id_senioridade,
    } = req.body;

    try {
      const cargo_nivel = await CargoNivelService.updateCargoSalarios(
        id,
        ds_salario_min,
        ds_salario_max,
        id_cargo,
        id_nivel,
        id_senioridade
      );
      if (!cargo_nivel) {
        return res
          .status(404)
          .json({ error: 'Cargo_nível_senioridade não encontrado.' });
      }
      return res.status(200).json(cargo_nivel);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao buscar cargo_nível_senioridade.' });
    }
  }

  static async processCargoItems(req: Request, res: Response) {
    const { cargoId } = req.params;
    const { items } = req.body;
    try {
      const result = await CargoNivelService.processCargoItems(cargoId, items);
      return res.status(200).json(result);
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'Erro ao processar itens do cargo.' });
    }
  }
}
