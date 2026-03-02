import * as FornecedorService from '../../services/fiscal/fornecedor.service';
import { Request, Response } from 'express';

export class FornecedorController {
  static async sincronizarFornecedoresByEmpresaId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const sincronizar =
        await FornecedorService.sincronizarFornecedoresByEmpresaId(empresaId);
      return res.status(200).json(sincronizar);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar fornecedor por empresas.' });
    }
  }
  static async getFornecedoresByEmpresaId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const fornecedores =
        await FornecedorService.getFornecedoresByEmpresaId(empresaId);
      return res.status(200).json(fornecedores);
    } catch (error) {
      console.error('Erro ao obter fornecedores:', error);
      return res.status(500).json({ error: 'Erro ao obter fornecedores.' });
    }
  }
  static async getFornecedoresPaginacao(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const {
        page = 1,
        pageSize = 10,
        orderBy = 'asc',
        orderColumn = 'ds_nome',
        search = '',
      } = req.query;

      const empresaId = req['empresaId'];
      const pageNumber = parseInt(page as string, 10);
      const pageSizeNumber = parseInt(pageSize as string, 10);

      const result = await FornecedorService.getFornecedoresPaginacao(
        empresaId,
        pageNumber,
        pageSizeNumber,
        orderBy as 'asc' | 'desc',
        orderColumn as string,
        search as string
      );

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao obter fornecedores com paginação:', error);
      return res.status(500).json({
        error: 'Erro ao obter fornecedores com paginação: ' + error.message,
      });
    }
  }
  static async createFornecedor(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const fornecedorData = req.body;
      const empresaId = req['empresaId'];
      const fornecedor = await FornecedorService.createFornecedor(
        empresaId,
        fornecedorData
      );
      return res.status(201).json(fornecedor);
    } catch (error: any) {
      console.error('Erro ao criar fornecedor:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao criar fornecedor: ' + error.message });
    }
  }
  static async updateFornecedor(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const fornecedorData = req.body;

      const fornecedor = await FornecedorService.updateFornecedor(
        id,
        fornecedorData
      );
      return res.status(200).json(fornecedor);
    } catch (error: any) {
      console.error('Erro ao atualizar fornecedor:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao atualizar fornecedor: ' + error.message });
    }
  }
  static async deleteFornecedor(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const fornecedor = await FornecedorService.deleteFornecedor(id);
      return res.status(200).json(fornecedor);
    } catch (error: any) {
      console.error('Erro ao excluir fornecedor:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao excluir fornecedor: ' + error.message });
    }
  }
}
