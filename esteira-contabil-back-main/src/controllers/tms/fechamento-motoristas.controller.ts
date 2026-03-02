import { Response } from 'express';
import FechamentoMotoristasService from '@/services/tms/fechamento-motoristas.service';

export default class FechamentoMotoristasController {
  static async criar(req: any, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const motoristaId = req.body.motoristaId as string;
      const competencia = req.body.competencia as string;

      if (!motoristaId) return res.status(400).json({ message: 'motoristaId é obrigatório' });
      if (!competencia) return res.status(400).json({ message: 'competencia é obrigatória (YYYY-MM)' });

      const service = new FechamentoMotoristasService();
      const result = await service.criar({ empresaId, motoristaId, competencia });

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro ao criar fechamento:', error);
      if (error.message?.includes('Já existe')) {
        return res.status(409).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || 'Erro ao criar fechamento', error });
    }
  }

  static async list(req: any, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const service = new FechamentoMotoristasService();

      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;

      const competencia = (req.query.competencia as string) || '';
      const status = (req.query.status as string) || 'TODOS';
      const search = (req.query.search as string) || '';

      const orderByRaw = (req.query.orderBy as string) || 'asc';
      const orderBy: 'asc' | 'desc' = orderByRaw === 'desc' ? 'desc' : 'asc';
      const orderColumn = (req.query.orderColumn as string) || 'motorista_nome';

      const result = await service.list({
        empresaId,
        page,
        pageSize,
        competencia,
        status,
        search,
        orderBy,
        orderColumn,
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Erro ao listar fechamentos de motoristas:', error);
      return res.status(500).json({ message: error.message || 'Erro ao listar fechamentos', error });
    }
  }

  static async resumo(req: any, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const competencia = (req.query.competencia as string) || '';
      const service = new FechamentoMotoristasService();

      const result = await service.resumo({ empresaId, competencia });
      return res.json(result);
    } catch (error: any) {
      console.error('Erro ao buscar resumo de fechamentos:', error);
      return res.status(500).json({ message: error.message || 'Erro ao buscar resumo', error });
    }
  }

  static async detalhe(req: any, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const fechamentoId = req.params.id as string;
      if (!fechamentoId) return res.status(400).json({ message: 'id do fechamento é obrigatório' });

      const service = new FechamentoMotoristasService();
      const result = await service.detalhe({ empresaId, fechamentoId });
      return res.json(result);
    } catch (error: any) {
      console.error('Erro ao buscar detalhe de fechamento:', error);
      return res.status(500).json({ message: error.message || 'Erro ao buscar detalhe', error });
    }
  }

  static async fechar(req: any, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const fechamentoId = req.params.id as string;
      if (!fechamentoId) return res.status(400).json({ message: 'id do fechamento é obrigatório' });

      const aprovadorId = req.user?.id || req.body?.aprovadorId || undefined;

      const service = new FechamentoMotoristasService();
      await service.fechar({ empresaId, fechamentoId, aprovadorId });

      return res.status(200).json({ message: 'Fechamento realizado' });
    } catch (error: any) {
      console.error('Erro ao fechar fechamento:', error);
      if (error.message?.includes('Apenas fechamentos')) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || 'Erro ao fechar', error });
    }
  }

  static async reabrir(req: any, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const fechamentoId = req.params.id as string;
      if (!fechamentoId) return res.status(400).json({ message: 'id do fechamento é obrigatório' });

      const service = new FechamentoMotoristasService();
      await service.reabrir({ empresaId, fechamentoId });

      return res.status(200).json({ message: 'Fechamento reaberto' });
    } catch (error: any) {
      console.error('Erro ao reabrir fechamento:', error);
      if (error.message?.includes('Apenas fechamentos')) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message || 'Erro ao reabrir', error });
    }
  }

  static async sincronizarViagens(req: any, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const fechamentoId = req.params.id as string;
      if (!fechamentoId) return res.status(400).json({ message: 'id do fechamento é obrigatório' });

      const service = new FechamentoMotoristasService();
      const result = await service.sincronizarViagensDoFechamento({
        empresaId,
        fechamentoId,
      });
      return res.json(result);
    } catch (error: any) {
      console.error('Erro ao sincronizar viagens do fechamento:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao sincronizar viagens',
        error,
      });
    }
  }

  static async sincronizarCompetencia(req: any, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const competencia = (req.query.competencia as string) || (req.body?.competencia as string) || '';
      if (!competencia) return res.status(400).json({ message: 'competencia é obrigatória (YYYY-MM)' });

      const service = new FechamentoMotoristasService();
      const result = await service.sincronizarCompetencia({ empresaId, competencia });
      return res.json(result);
    } catch (error: any) {
      console.error('Erro ao sincronizar competência:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao sincronizar competência',
        error,
      });
    }
  }
}
