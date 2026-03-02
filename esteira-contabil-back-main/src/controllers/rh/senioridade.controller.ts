import { Request, Response } from 'express';
import * as SernioridadeService from '../../services/rh/senioridade.service';

export class SenioridadeController {
  // Criar um nível
  static async createSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { ds_nome, empresaId } = req.body;

    try {
      const nivel = await SernioridadeService.createSenioridade(
        ds_nome,
        empresaId
      );
      return res.status(201).json(nivel);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar nível.' });
    }
  }

  static async createSenioridadeGlobal(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { senioridade } = req.body;

    if (!Array.isArray(senioridade)) {
      return res
        .status(400)
        .json({ error: 'O corpo da requisição deve ser um array de niveis.' });
    }

    const senioridadeUnicos = Array.from(
      new Map(
        senioridade.map((senioridade) => [senioridade.ds_nome, senioridade])
      ).values()
    );

    try {
      const successes: any[] = [];
      const errors: any[] = [];

      for (const senioridade of senioridadeUnicos) {
        try {
          const result =
            await SernioridadeService.createSenioridadeGlobal(senioridade);
          successes.push(result);
        } catch (error) {
          errors.push({ message: error.message });
        }
      }

      return res.status(207).json({
        successes,
        errors,
      });
    } catch (error) {
      console.error('Erro inesperado ao processar as senioridade:', error);
      return res
        .status(500)
        .json({ error: 'Erro inesperado ao processar as senioridade.' });
    }
  }

  // Listar nível
  static async listSenioridade(req: Request, res: Response): Promise<Response> {
    try {
      const nivel = await SernioridadeService.listSenioridade();
      return res.status(200).json(nivel);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar nível.' });
    }
  }

  // Obter um nível pelo ID
  static async getSenioridade(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const nivel = await SernioridadeService.getSenioridade(id);
      if (!nivel) {
        return res.status(404).json({ error: 'Nível não encontrado.' });
      }
      return res.status(200).json(nivel);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar nível.' });
    }
  }

  // Atualizar um nível
  static async updateSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;
    const { ds_nome } = req.body;

    try {
      const nivel = await SernioridadeService.updateSenioridade(id, ds_nome);
      if (!nivel) {
        return res.status(404).json({ error: 'Nível não encontrado.' });
      }
      return res.status(200).json(nivel);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar nível.' });
    }
  }

  // Deletar um nível
  static async deleteSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const nivel = await SernioridadeService.deleteSenioridade(id);
      if (!nivel) {
        return res.status(404).json({ error: 'Nível não encontrado.' });
      }
      return res.status(200).json({ message: 'Nível deletado com sucesso.' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao deletar nível.' });
    }
  }

  // Listar cargos ligados ao nível
  static async listCargosInSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users = await SernioridadeService.listCargosInSenioridade(id);
      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar cargos ligados ao nível.' });
    }
  }

  static async listNiveisInSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users = await SernioridadeService.listNiveisInSenioridade(id);
      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar cargos ligados ao nível.' });
    }
  }

  // Listar competências ligadas ao nível
  static async listCompetenciasInSenioridade(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users = await SernioridadeService.listCompetenciasInSenioridade(id);
      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar copmetências ligadas ao nível.' });
    }
  }

  static async listSenioridadeInEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const cargo = await SernioridadeService.listSenioridadeInEmpresa(id);
      if (!cargo) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }
      return res.status(200).json(cargo);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar empresa.' });
    }
  }
}
