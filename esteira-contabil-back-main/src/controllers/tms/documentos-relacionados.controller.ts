// TMS DOCUMENTOS RELACIONADOS CONTROLLER
// Endpoints para buscar e agrupar documentos

import { Request, Response } from 'express';
import * as DocumentosRelacionadosService from '../../services/tms/documentos-relacionados.service';

export class DocumentosRelacionadosController {
  /**
   * Busca documentos disponíveis para uma empresa
   * GET /api/tms/documentos/disponiveis
   */
  static async getDisponiveis(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { search, tipo, dataInicio, dataFim, idCargaIncluir, backfill } = req.query;
      const skipBackfill = backfill === 'false';

      const documentos =
        await DocumentosRelacionadosService.getDocumentosDisponiveis(
          empresaId,
          {
            search: search as string,
            tipo: (tipo as 'CTE' | 'NFE' | 'AMBOS') || 'AMBOS',
            dataInicio: dataInicio as string,
            dataFim: dataFim as string,
            idCargaIncluir: idCargaIncluir as string | undefined,
            backfill: !skipBackfill,
          }
        );

      return res.status(200).json(documentos);
    } catch (error: any) {
      console.error('Erro ao buscar documentos disponíveis:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Busca documentos disponíveis segmentados: CT-e próprio (left) e DFe relacionados (right).
   * GET /api/tms/documentos/disponiveis-separados
   */
  static async getDisponiveisSeparados(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }
      const { competencia, dataInicio, dataFim, search, incluirRelacionamentos, backfill } = req.query;
      const incluirRel = incluirRelacionamentos !== 'false';
      const payload = await DocumentosRelacionadosService.getDocumentosDisponiveisSeparados(
        empresaId,
        {
          competencia: competencia as string,
          dataInicio: dataInicio as string,
          dataFim: dataFim as string,
          search: search as string,
          incluirRelacionamentos: incluirRel,
          backfill: backfill !== 'false',
        }
      );
      return res.status(200).json(payload);
    } catch (error: any) {
      console.error('Erro ao buscar documentos disponíveis (separados):', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Busca apenas documentos de despesas (NFE / NFSE) onde a empresa é destinatário
   * GET /api/tms/documentos/despesas
   */
  static async getDespesasDisponiveis(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId)
        return res.status(400).json({ error: 'Empresa não identificada' });

      const { search, competencia } = req.query;

      const documentos =
        await DocumentosRelacionadosService.getDocumentosDespesasDisponiveis(
          empresaId,
          {
            search: search as string,
            competencia: competencia as string,
          }
        );

      return res.status(200).json(documentos);
    } catch (error: any) {
      console.error('Erro ao buscar documentos de despesas:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Agrupa documentos de forma inteligente para criação de entregas
   * POST /api/tms/documentos/agrupar
   * Body: { documentosIds: string[] }
   */
  static async agruparParaEntregas(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { documentosIds } = req.body;

      if (
        !documentosIds ||
        !Array.isArray(documentosIds) ||
        documentosIds.length === 0
      ) {
        return res.status(400).json({
          error: 'documentosIds é obrigatório e deve ser um array não vazio',
        });
      }

      const grupos =
        await DocumentosRelacionadosService.agruparDocumentosParaEntregas(
          documentosIds
        );

      return res.status(200).json({
        total: grupos.length,
        grupos,
      });
    } catch (error: any) {
      console.error('Erro ao agrupar documentos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Busca relacionamentos de um documento específico
   * GET /api/tms/documentos/:id/relacionamentos
   */
  static async getRelacionamentos(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID do documento não fornecido' });
      }

      const relacionamentos =
        await DocumentosRelacionadosService.getDocumentoRelacionamentos(id);

      return res.status(200).json(relacionamentos);
    } catch (error: any) {
      console.error('Erro ao buscar relacionamentos:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
