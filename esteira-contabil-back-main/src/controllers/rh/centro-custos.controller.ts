import { Request, Response } from 'express';
import * as CentroCustosService from '../../services/rh/centro-custos.service';

// Criar um Centro de Custos
export class CentroCustosController {
  static async createCentroCustos(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { ds_nome, empresaId } = req.body;

    try {
      const centroCustos = await CentroCustosService.createCentroCustos(
        ds_nome,
        empresaId
      );
      return res.status(201).json(centroCustos);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar centro de custos.' });
    }
  }

  // Listar Centros de Custos
  static async listCentrosCustos(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const centroCustos = await CentroCustosService.listCentrosCustos();
      return res.status(200).json(centroCustos);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar centro de custos.' });
    }
  }

  // Obter um Centro de Custos pelo ID
  static async getCentroCustos(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const centroCustos = await CentroCustosService.getCentroCustos(id);
      if (!centroCustos) {
        return res
          .status(404)
          .json({ error: 'Centro de custos não encontrado.' });
      }
      return res.status(200).json(centroCustos);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao buscar centro de custos.' });
    }
  }

  // Atualizar um Centro de Custos
  static async updateCentroCustos(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;
    const { ds_nome, ds_salario, ds_sexo, empresaId, cargoNivelId } = req.body;

    try {
      const centroCustos = await CentroCustosService.updateCentroCustos(
        id,
        ds_nome,
        ds_salario,
        ds_sexo,
        empresaId,
        cargoNivelId
      );
      if (!centroCustos) {
        return res
          .status(404)
          .json({ error: 'Centro de custos não encontrado.' });
      }
      return res.status(200).json(centroCustos);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao atualizar centro de custos.' });
    }
  }

  // Deletar um Centro de Custos
  static async deleteCentroCustos(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const funcionario = await CentroCustosService.deleteCentroCustos(id);
      if (!funcionario) {
        return res
          .status(404)
          .json({ error: 'Centro de custos não encontrado.' });
      }
      return res
        .status(200)
        .json({ message: 'Centro de custos deletado com sucesso.' });
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao deletar centro de custos.' });
    }
  }

  // Listar funcionarios de um Centro de Custos
  static async listFuncionariosInCentroCustos(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const centroCustos =
        await CentroCustosService.listFuncionariosInCentroCustos(id);
      if (!centroCustos) {
        return res
          .status(404)
          .json({ error: 'Centro de custos não encontrado.' });
      }
      return res.status(200).json(centroCustos);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao buscar centro de custos.' });
    }
  }

  static async createOrUpdateCentroCustos(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresa = await CentroCustosService.createOrUpdateCentroCustos(
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
