import { Request, Response } from 'express';
import * as ColunasPersonalizadasService from '../../services/tms/colunas-personalizadas.service';
import type { TabelasPersonalizadas } from '@prisma/client';

const DS_TABELA_VALUES: TabelasPersonalizadas[] = ['CARGASLIST', 'ENTREGASLIST', 'VIAGENSLIST'];

function getEmpresaId(req: Request): string | null {
  const id = req['empresaId'];
  return id ?? null;
}

function parseDsTabela(q: string | undefined): TabelasPersonalizadas | null {
  if (!q || !DS_TABELA_VALUES.includes(q as TabelasPersonalizadas)) return null;
  return q as TabelasPersonalizadas;
}

export class ColunasPersonalizadasController {
  /**
   * GET /api/tms/colunas-personalizadas?ds_tabela=VIAGENSLIST
   */
  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = getEmpresaId(req);
      if (!empresaId) return res.status(400).json({ error: 'Empresa não identificada' });

      const ds_tabela = parseDsTabela(req.query.ds_tabela as string);
      if (!ds_tabela) return res.status(400).json({ error: 'Query ds_tabela é obrigatória (VIAGENSLIST, CARGASLIST ou ENTREGASLIST).' });

      const list = await ColunasPersonalizadasService.listColunas(empresaId, ds_tabela);
      return res.status(200).json(list);
    } catch (error: any) {
      console.error('Erro ao listar colunas personalizadas:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/tms/colunas-personalizadas
   */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = getEmpresaId(req);
      if (!empresaId) return res.status(400).json({ error: 'Empresa não identificada' });

      const { ds_nome_coluna, ds_descricao, ds_tipo, js_valores, ds_tabela } = req.body;
      if (!ds_nome_coluna || typeof ds_nome_coluna !== 'string') {
        return res.status(400).json({ error: 'ds_nome_coluna é obrigatório.' });
      }
      if (!ds_tipo || !DS_TABELA_VALUES.includes(ds_tabela)) {
        return res.status(400).json({ error: 'ds_tipo e ds_tabela (VIAGENSLIST|CARGASLIST|ENTREGASLIST) são obrigatórios.' });
      }

      const created = await ColunasPersonalizadasService.createColuna(empresaId, {
        ds_nome_coluna,
        ds_descricao,
        ds_tipo,
        js_valores,
        ds_tabela,
      });
      return res.status(201).json(created);
    } catch (error: any) {
      console.error('Erro ao criar coluna personalizada:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PUT /api/tms/colunas-personalizadas/:id
   */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = getEmpresaId(req);
      if (!empresaId) return res.status(400).json({ error: 'Empresa não identificada' });

      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });

      const { ds_nome_coluna, ds_descricao, ds_tipo, js_valores } = req.body;
      const data: ColunasPersonalizadasService.ColunaPersonalizadaUpdate = {};
      if (ds_nome_coluna !== undefined) data.ds_nome_coluna = ds_nome_coluna;
      if (ds_descricao !== undefined) data.ds_descricao = ds_descricao;
      if (ds_tipo !== undefined) data.ds_tipo = ds_tipo;
      if (js_valores !== undefined) data.js_valores = js_valores;

      const updated = await ColunasPersonalizadasService.updateColuna(empresaId, id, data);
      return res.status(200).json(updated);
    } catch (error: any) {
      console.error('Erro ao atualizar coluna personalizada:', error);
      if (error.message === 'Coluna personalizada não encontrada.') return res.status(404).json({ error: error.message });
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PATCH /api/tms/colunas-personalizadas/reorder
   * Body: { ds_tabela, orderedIds: string[] }
   */
  static async reorder(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = getEmpresaId(req);
      if (!empresaId) return res.status(400).json({ error: 'Empresa não identificada' });

      const { ds_tabela, orderedIds } = req.body;
      const ds_tabelaParsed = parseDsTabela(ds_tabela);
      if (!ds_tabelaParsed) return res.status(400).json({ error: 'ds_tabela é obrigatório (VIAGENSLIST, CARGASLIST ou ENTREGASLIST).' });
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return res.status(400).json({ error: 'orderedIds deve ser um array não vazio de IDs.' });
      }

      await ColunasPersonalizadasService.reorderColunas(empresaId, ds_tabelaParsed, orderedIds);
      return res.status(200).json({ message: 'Ordem atualizada.' });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Erro ao reordenar colunas personalizadas:', err);
      if (err.message?.includes('não pertencem')) return res.status(400).json({ error: err.message });
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * DELETE /api/tms/colunas-personalizadas/:id
   */
  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = getEmpresaId(req);
      if (!empresaId) return res.status(400).json({ error: 'Empresa não identificada' });

      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });

      await ColunasPersonalizadasService.removeColuna(empresaId, id);
      return res.status(200).json({ message: 'Coluna personalizada removida com sucesso.' });
    } catch (error: any) {
      console.error('Erro ao excluir coluna personalizada:', error);
      if (error.message === 'Coluna personalizada não encontrada.') return res.status(404).json({ error: error.message });
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/tms/colunas-personalizadas/dados?ds_tabela=VIAGENSLIST&ids=id1,id2,id3
   */
  static async getDados(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = getEmpresaId(req);
      if (!empresaId) return res.status(400).json({ error: 'Empresa não identificada' });

      const ds_tabela = parseDsTabela(req.query.ds_tabela as string);
      if (!ds_tabela) return res.status(400).json({ error: 'Query ds_tabela é obrigatória.' });

      const idsParam = req.query.ids as string;
      const ids = idsParam ? idsParam.split(',').map((s) => s.trim()).filter(Boolean) : [];

      const dados = await ColunasPersonalizadasService.getDados(empresaId, ds_tabela, ids);
      return res.status(200).json(dados);
    } catch (error: any) {
      console.error('Erro ao listar dados de colunas personalizadas:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PUT /api/tms/colunas-personalizadas/dados
   * Body: { id_sis_colunas_personalizadas, id_referencia, ds_valor }
   */
  static async upsertDado(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = getEmpresaId(req);
      if (!empresaId) return res.status(400).json({ error: 'Empresa não identificada' });

      const { id_sis_colunas_personalizadas, id_referencia, ds_valor } = req.body;
      if (!id_sis_colunas_personalizadas || !id_referencia) {
        return res.status(400).json({ error: 'id_sis_colunas_personalizadas e id_referencia são obrigatórios.' });
      }

      const result = await ColunasPersonalizadasService.upsertDado(empresaId, {
        id_sis_colunas_personalizadas,
        id_referencia,
        ds_valor: ds_valor != null ? String(ds_valor) : '',
      });
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao salvar dado de coluna personalizada:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
