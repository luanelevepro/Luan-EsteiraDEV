import { Request, Response } from 'express';
import * as NivelService from '../../services/rh/nivel.service';
import * as SincronizarService from '../../services/rh/sincronizar/sincronizar-cargos-nivel-senioridade.service';

export class NiveisController {
  // Criar um nível
  static async createNivel(req: Request, res: Response): Promise<Response> {
    const { ds_nome, empresaId } = req.body;

    try {
      const nivel = await NivelService.createNivel(ds_nome, empresaId);
      SincronizarService.sincronizarCargosNivelSenioridade(empresaId);
      return res.status(201).json(nivel);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar nível.' });
    }
  }
  static async createNivelGlobal(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { niveis } = req.body;

    if (!Array.isArray(niveis)) {
      return res
        .status(400)
        .json({ error: 'O corpo da requisição deve ser um array de niveis.' });
    }

    const niveisUnicos = Array.from(
      new Map(niveis.map((niveis) => [niveis.ds_nome, niveis])).values()
    );

    try {
      const successes: any[] = [];
      const errors: any[] = [];

      for (const niveis of niveisUnicos) {
        try {
          const result = await NivelService.createNivelGlobal(niveis);
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
      console.error('Erro inesperado ao processar os niveis:', error);
      return res
        .status(500)
        .json({ error: 'Erro inesperado ao processar os niveis.' });
    }
  }

  // Listar nível
  static async listNiveis(req: Request, res: Response): Promise<Response> {
    try {
      const nivel = await NivelService.listNiveis();
      return res.status(200).json(nivel);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar nível.' });
    }
  }

  // Obter um nível pelo ID
  static async getNivel(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const nivel = await NivelService.getNivel(id);
      if (!nivel) {
        return res.status(404).json({ error: 'Nível não encontrado.' });
      }
      return res.status(200).json(nivel);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar nível.' });
    }
  }

  // Atualizar um nível
  static async updateNivel(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const { ds_nome } = req.body;

    try {
      const nivel = await NivelService.updateNivel(id, ds_nome);
      if (!nivel) {
        return res.status(404).json({ error: 'Nível não encontrado.' });
      }
      return res.status(200).json(nivel);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar nível.' });
    }
  }

  // Deletar um nível
  static async deleteNivel(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const nivel = await NivelService.deleteNivel(id);
      if (!nivel) {
        return res.status(404).json({ error: 'Nível não encontrado.' });
      }
      return res.status(200).json({ message: 'Nível deletado com sucesso.' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao deletar nível.' });
    }
  }

  // Listar cargos ligados ao nível
  static async listCargosInNivel(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users = await NivelService.listCargosInNivel(id);
      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar cargos ligados ao nível.' });
    }
  }

  // Listar competências ligadas ao nível
  static async listCompetenciasInNivel(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users = await NivelService.listCompetenciasInNiveis(id);
      return res.status(200).json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar copmetências ligadas ao nível.' });
    }
  }

  static async listNiveisInEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const [niveisEmpresa, niveisGerais] = await Promise.all([
        NivelService.listNiveisInEmpresa(id),
        NivelService.listNiveisGerais(),
      ]);
      const niveis = [...niveisEmpresa, ...niveisGerais];
      return res.status(200).json(niveis);
    } catch (error) {
      console.error('Erro ao buscar níveis:', error);
      return res.status(500).json({ error: 'Erro ao buscar níveis.' });
    }
  }
}
