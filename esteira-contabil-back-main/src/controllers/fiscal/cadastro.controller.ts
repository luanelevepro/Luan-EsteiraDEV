import { Request, Response } from 'express';
import * as CadastrosFiscaisService from '../../services/fiscal/cadastro.service';

export class FiscalCadastroController {
  // Segmentos Empresas
  static async getSegmentosEmpresas(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const segmentos =
        await CadastrosFiscaisService.getSegmentosEmpresas(empresaId);
      return res.status(200).json(segmentos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter segmentos de empresas.' });
    }
  }
  static async getSegmentosById(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const segmentos = await CadastrosFiscaisService.getSegmentosById(id);
      return res.status(200).json(segmentos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter segmentos de empresas.' });
    }
  }

  static async getSegmentosEmpresasPorEscritorio(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const segmentos =
        await CadastrosFiscaisService.getSegmentosEmpresasPorEscritorio(
          empresaId
        );
      return res.status(200).json(segmentos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter segmentos do Escritório.' });
    }
  }

  static async createSegmentoEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const segmento = await CadastrosFiscaisService.createSegmentoEmpresa(
        empresaId,
        req.body
      );
      return res.status(201).json(segmento);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao criar segmento de empresa.' });
    }
  }

  static async updateSegmentoEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const empresaId = req['empresaId'];
      const updated = await CadastrosFiscaisService.updateSegmentoEmpresa(
        empresaId,
        id,
        req.body
      );
      return res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao atualizar segmento de empresa.' });
    }
  }

  static async deleteSegmentoEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const empresaId = req['empresaId'];
      const deleted = await CadastrosFiscaisService.deleteSegmentoEmpresa(
        empresaId,
        id
      );
      return res.status(200).json(deleted);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao deletar segmento de empresa.' });
    }
  }

  // Produtos Segmento
  static async getPadraoSegmento(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const produtosSegmento =
        await CadastrosFiscaisService.getPadraoSegmento(empresaId);
      return res.status(200).json(produtosSegmento);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter padrões de segmento.' });
    }
  }

  // Produtos Segmento por escritorio
  static async getPadraoSegmentoEscritorio(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const produtosSegmento =
        await CadastrosFiscaisService.getPadraoSegmentoEscritorio(empresaId);
      return res.status(200).json(produtosSegmento);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter padrões de segmento.' });
    }
  }

  static async getPadraoSegmentoById(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      const produtosSegmento =
        await CadastrosFiscaisService.getPadraoSegmentoById(empresaId, id);
      return res.status(200).json(produtosSegmento);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter padrões de segmento.' });
    }
  }

  static async createPadraoSegmento(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const produtoSegmento =
        await CadastrosFiscaisService.createPadraoSegmento(empresaId, req.body);
      return res.status(201).json(produtoSegmento);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao criar padrão do segmento. ' + error.message });
    }
  }

  static async updatePadraoSegmento(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const empresaId = req['empresaId'];
      const updated = await CadastrosFiscaisService.updatePadraoSegmento(
        empresaId,
        id,
        req.body
      );
      return res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao atualizar produto do segmento.' + error.message,
      });
    }
  }

  static async deletePadraoSegmento(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const empresaId = req['empresaId'];
      const deleted = await CadastrosFiscaisService.deletePadraoSegmento(
        empresaId,
        id
      );
      return res.status(200).json(deleted);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao excluir produto do segmento.' });
    }
  }
}
