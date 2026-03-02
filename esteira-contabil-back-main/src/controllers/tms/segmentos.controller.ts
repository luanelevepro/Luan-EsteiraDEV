import { Request, Response } from 'express';
import * as SegmentosService from '../../services/tms/segmentos.service';

export class SegmentosController {
  /**
   * Busca todos os segmentos da empresa
   */
  static async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const segmentos = await SegmentosService.getSegmentos(empresaId);
      return res.status(200).json(segmentos);
    } catch (error: any) {
      console.error('Erro ao buscar segmentos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Busca segmentos com paginação e filtros
   */
  static async getPaginacao(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const {
        page = '1',
        pageSize = '50',
        orderBy = 'asc',
        orderColumn = 'ds_nome',
        search = '',
        status = '',
      } = req.query;

      const statusArray = status
        ? (status as string).split(',').map((s) => s.trim())
        : [];

      const resultado = await SegmentosService.getSegmentosPaginacao(
        empresaId,
        parseInt(page as string, 10),
        parseInt(pageSize as string, 10),
        orderBy as 'asc' | 'desc',
        orderColumn as string,
        search as string,
        statusArray
      );
      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao buscar segmentos paginados:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Busca um segmento por ID
   */
  static async getOne(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID do segmento não fornecido' });
      }

      const segmento = await SegmentosService.getSegmentoById(empresaId, id);
      return res.status(200).json(segmento);
    } catch (error: any) {
      console.error('Erro ao buscar segmento:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cria um novo segmento
   */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { cd_identificador, ds_nome, is_ativo } = req.body;

      if (!ds_nome) {
        return res.status(400).json({
          error: 'Nome do segmento é obrigatório',
        });
      }

      const segmento = await SegmentosService.createSegmento(empresaId, {
        cd_identificador,
        ds_nome,
        is_ativo,
      });
      return res.status(201).json(segmento);
    } catch (error: any) {
      console.error('Erro ao criar segmento:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Atualiza um segmento
   */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID do segmento não fornecido' });
      }

      const segmento = await SegmentosService.updateSegmento(
        empresaId,
        id,
        req.body
      );
      return res.status(200).json(segmento);
    } catch (error: any) {
      console.error('Erro ao atualizar segmento:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Deleta um segmento
   */
  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID do segmento não fornecido' });
      }

      const segmento = await SegmentosService.deleteSegmento(empresaId, id);
      return res.status(200).json(segmento);
    } catch (error: any) {
      console.error('Erro ao deletar segmento:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Ativa segmentos selecionados
   */
  static async ativar(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const idsBody = req.body?.ids;

      let ids: string[] = [];

      if (Array.isArray(idsBody)) {
        ids = idsBody;
      } else if (typeof idsBody === 'string' && idsBody.trim()) {
        ids = idsBody
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      if (!ids || ids.length === 0) {
        return res.status(400).json({
          error: 'Lista de IDs não fornecida ou vazia',
        });
      }

      const resultado = await SegmentosService.ativarSegmentos(empresaId, ids);
      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao ativar segmentos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Inativa segmentos selecionados
   */
  static async inativar(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const idsBody = req.body?.ids;

      let ids: string[] = [];

      if (Array.isArray(idsBody)) {
        ids = idsBody;
      } else if (typeof idsBody === 'string' && idsBody.trim()) {
        ids = idsBody
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      if (!ids || ids.length === 0) {
        return res.status(400).json({
          error: 'Lista de IDs não fornecida ou vazia',
        });
      }

      const resultado = await SegmentosService.inativarSegmentos(
        empresaId,
        ids
      );
      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao inativar segmentos:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
