import { Request, Response } from 'express';
import * as FiscaisProdutoService from '../../services/fiscal/produto.service';

export class FiscalProdutoController {
  // Segmentos Empresas
  static async getProdutos(req: Request, res: Response): Promise<Response> {
    try {
      const { tipo } = req.query;
      const empresaId = req['empresaId'];
      const segmentos = await FiscaisProdutoService.getProdutos(
        empresaId,
        tipo as string
      );
      return res.status(200).json(segmentos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter produtos. ' + error.message });
    }
  }
  static async getProdutosAtivos(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { tipo, cd_ncm } = req.query;
      const empresaId = req['empresaId'];
      const segmentos = await FiscaisProdutoService.getProdutosAtivos(
        empresaId,
        tipo as string,
        (cd_ncm as string) || null
      );
      return res.status(200).json(segmentos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter produtos. ' + error.message });
    }
  }

  static async getProdutosPaginacao(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const {
        page = 1,
        pageSize = 10,
        orderBy = 'asc',
        orderColumn = 'ds_nome',
        search = '',
        tipo,
        tipo_item = '',
        status = '',
      } = req.query;
      const tipoArray = tipo_item
        ? (tipo_item as string).split(',').map((s) => s.trim())
        : [];
      const statusArray = status
        ? (status as string).split(',').map((s) => s.trim())
        : [];
      const paginacao = await FiscaisProdutoService.getProdutosPaginacao(
        empresaId as string,
        // Number(page),
        // Number(pageSize),
        // orderBy as 'asc' | 'desc',
        // orderColumn as string,
        // search as string,
        tipo as string,
        tipoArray,
        statusArray
      );

      return res.status(200).json(paginacao);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter produtos. ' + error.message });
    }
  }

  static async updateProduto(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      const data = req.body;
      const segmentos = await FiscaisProdutoService.updateProduto(
        empresaId,
        id,
        data
      );
      return res.status(200).json(segmentos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao atualizar produto. ' + error.message });
    }
  }

  static async inativarTodosProdutos(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const tipo = req.body.tipo;
      const segmentos = await FiscaisProdutoService.inativarTodosProdutos(
        empresaId,
        tipo
      );
      return res.status(200).json(segmentos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao inativar produtos. ' + error.message });
    }
  }

  static async ativarTodosProdutos(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const tipo = req.body.tipo;
      const segmentos = await FiscaisProdutoService.ativarTodosProdutos(
        empresaId,
        tipo
      );
      return res.status(200).json(segmentos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao ativar produtos. ' + error.message });
    }
  }

  static async createProduto(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const data = req.body;
      const segmentos = await FiscaisProdutoService.createProduto(
        empresaId,
        data
      );
      return res.status(200).json(segmentos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao criar produto. ' + error.message });
    }
  }

  static async updateProdutos(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const data = req.body;

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          error:
            'É necessário fornecer uma lista de produtos para atualização.',
        });
      }

      const produtosAtualizados = await FiscaisProdutoService.updateProdutos(
        empresaId,
        data
      );
      return res.status(200).json(produtosAtualizados);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao atualizar produtos. ' + error.message });
    }
  }

  static async sincronizarProdutos(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const produtos =
        await FiscaisProdutoService.sincronizarProdutos(empresaId);
      return res.status(200).json(produtos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar produtos. ' + error.message });
    }
  }
}
