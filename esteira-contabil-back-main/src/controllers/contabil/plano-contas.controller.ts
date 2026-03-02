import * as planoContasService from '../../services/contabil/plano-contas.service';
import { Request, Response } from 'express';

export class PlanoContasController {
  // GET operations
  static async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const { empresaId } = req.params;
      const result = await planoContasService.getPlanoContas(empresaId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao obter plano de contas:', error);
      return res.status(500).json({ error: 'Erro ao obter plano de contas.' });
    }
  }

  static async getAllOrdenado(req: Request, res: Response): Promise<Response> {
    try {
      const { empresaId } = req.params;
      const result = await planoContasService.getPlanoContasOrdenado(empresaId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao obter plano de contas ordenado:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter plano de contas ordenado.' });
    }
  }

  static async getAnalisticasOrdenado(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { empresaId } = req.params;
      const result =
        await planoContasService.getContasAnaliticasOrdenado(empresaId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao obter plano de contas ordenado:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter plano de contas ordenado.' });
    }
  }

  static async getContasDespesaTmsByEmpresaId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { empresaId } = req.params;
      const result =
        await planoContasService.getContasDespesaTmsByEmpresaId(empresaId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao obter contas de despesa TMS:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter contas de despesa.' });
    }
  }

  static async getAnalisticasPaginado(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const {
        empresaId,
        page = 1,
        pageSize = 10,
        orderBy = 'asc',
        orderColumn = 'ds_classificacao_cta',
        search = '',
        status = null,
        tipos = '',
      } = req.query;

      const pageNumber = parseInt(page as string, 10);
      const pageSizeNumber = parseInt(pageSize as string, 10);

      const result = await planoContasService.getContasAnaliticasPaginacao(
        empresaId as string,
        pageNumber,
        pageSizeNumber,
        orderBy as 'asc' | 'desc',
        orderColumn as string,
        search as string,
        status as string | null
      );

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao obter contas analíticas com paginação:', error);
      return res.status(500).json({
        error:
          'Erro ao obter contas analíticas com paginação: ' + error.message,
      });
    }
  }

  static async getAllPaginado(req: Request, res: Response): Promise<Response> {
    try {
      const {
        empresaId,
        page = 1,
        pageSize = 10,
        orderBy = 'asc',
        orderColumn = 'ds_classificacao_cta',
        search = '',
        status = null,
        tipos = '',
      } = req.query;

      const pageNumber = parseInt(page as string, 10);
      const pageSizeNumber = parseInt(pageSize as string, 10);

      const result = await planoContasService.getPlanoContasPaginacao(
        empresaId as string,
        pageNumber,
        pageSizeNumber,
        orderBy as 'asc' | 'desc',
        orderColumn as string,
        search as string,
        status as string | null,
        typeof tipos === 'string' && tipos
          ? (tipos as string)
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined
      );

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao obter plano de contas com paginação:', error);
      return res.status(500).json({
        error: 'Erro ao obter plano de contas com paginação: ' + error.message,
      });
    }
  }

  // POST/PUT operations
  static async linkGrupo(req: Request, res: Response): Promise<Response> {
    try {
      const { planosContas, grupoContaId } = req.body;
      const planosParaLink = planosContas as { id: string }[];
      const result = await planoContasService.linkPlanoGrupo(
        planosParaLink,
        grupoContaId
      );
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao vincular plano de contas ao grupo:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao vincular plano de contas ao grupo.' });
    }
  }
  static async setContaTipoDespesa(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { contasIds, tipoDespesa } = req.body;
      console.log('IDs das contas recebidos:', contasIds);
      const contaIdArray = Array.isArray(contasIds) ? contasIds : [contasIds];
      const validIds = (contaIdArray || []).filter((id) => id);
      if (!validIds.length) {
        return res
          .status(400)
          .json({ error: 'Nenhum id de conta válido fornecido.' });
      }
      const result = await planoContasService.setContaTipoDespesa(
        validIds as string[],
        tipoDespesa
      );
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao atualizar tipo de despesa da conta:', error);
      let errorMessage = 'Erro desconhecido';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      return res.status(500).json({
        error:
          'Erro ao atualizar tipo de despesa da conta. Detalhes: ' +
          errorMessage,
      });
    }
  }
}
