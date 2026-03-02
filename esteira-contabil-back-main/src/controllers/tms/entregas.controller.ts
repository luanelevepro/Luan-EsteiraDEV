import { Request, Response } from 'express';
import { EntregasService } from '../../services/tms/entregas.service';
import * as tripFlowService from '../../services/tms/trip-flow.service';
import { TripFlowRuleError } from '../../services/tms/trip-flow.errors';

export class EntregasController {
  static async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da entrega não fornecido' });
      }

      const entrega = await EntregasService.obterEntrega(id);
      return res.status(200).json(entrega);
    } catch (error: any) {
      console.error('Erro ao buscar entrega:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async listByCarga(req: Request, res: Response): Promise<Response> {
    try {
      const { idCarga } = req.params;
      if (!idCarga) {
        return res.status(400).json({ error: 'ID da carga não fornecido' });
      }

      const entregas = await EntregasService.listarEntregasPorCarga(idCarga);
      return res.status(200).json(entregas);
    } catch (error: any) {
      console.error('Erro ao listar entregas da carga:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PATCH /entregas/carga/:idCarga/reordenar
   * Reordena as entregas de uma carga
   */
  static async reordenarEntregas(req: Request, res: Response): Promise<Response> {
    try {
      const { idCarga } = req.params;
      const { entregas } = req.body;

      if (!idCarga) {
        return res.status(400).json({ error: 'ID da carga não fornecido' });
      }

      if (!entregas || !Array.isArray(entregas)) {
        return res.status(400).json({
          error: 'entregas é obrigatório e deve ser um array com objetos { id, nr_sequencia }',
        });
      }

      const resultado = await EntregasService.reordenarEntregasCarga(
        idCarga,
        entregas
      );
      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao reordenar entregas:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /entregas/:id/iniciar — inicia rota da entrega (esteira sequencial)
   * Body: { dt_inicio_rota?: string } (ISO) — opcional; se não informado, usa data/hora atual.
   */
  static async iniciarEntrega(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da entrega não fornecido' });
      }
      const { dt_inicio_rota } = req.body || {};
      const fluxo = await tripFlowService.iniciarEntrega(empresaId, id, {
        dt_inicio_rota,
      });
      return res.status(200).json(fluxo);
    } catch (error: any) {
      if (error instanceof TripFlowRuleError) {
        return res.status(422).json({ message: error.message });
      }
      console.error('Erro ao iniciar entrega:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /entregas/:id/finalizar — finaliza entrega (esteira sequencial)
   */
  static async finalizarEntrega(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da entrega não fornecido' });
      }
      const comprovante = req.body;
      const fluxo = await tripFlowService.finalizarEntrega(
        empresaId,
        id,
        comprovante
      );
      return res.status(200).json(fluxo);
    } catch (error: any) {
      if (error instanceof TripFlowRuleError) {
        return res.status(422).json({ message: error.message });
      }
      console.error('Erro ao finalizar entrega:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const entrega = await EntregasService.criarEntrega(req.body);
      return res.status(201).json(entrega);
    } catch (error: any) {
      console.error('Erro ao criar entrega:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async createMultiplas(req: Request, res: Response): Promise<Response> {
    try {
      const { idCarga } = req.params;
      const { entregas, id_viagem, idViagem } = req.body;

      if (!idCarga) {
        return res.status(400).json({ error: 'ID da carga não fornecido' });
      }

      if (!entregas || !Array.isArray(entregas) || entregas.length === 0) {
        return res.status(400).json({
          error: 'entregas é obrigatório e deve ser um array não vazio',
        });
      }

      const resultado = await EntregasService.criarEntregasComDocumentos(
        idCarga,
        entregas,
        id_viagem || idViagem
      );

      if (resultado.sucesso) {
        return res.status(201).json(resultado);
      } else {
        return res.status(400).json(resultado);
      }
    } catch (error: any) {
      console.error('Erro ao criar múltiplas entregas:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da entrega não fornecido' });
      }

      const entrega = await EntregasService.atualizarEntrega(id, req.body);
      return res.status(200).json(entrega);
    } catch (error: any) {
      console.error('Erro ao atualizar entrega:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da entrega não fornecido' });
      }

      await EntregasService.deletarEntrega(id);
      return res.status(200).json({ sucesso: true });
    } catch (error: any) {
      console.error('Erro ao deletar entrega:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async addDocumentos(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { documentos } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID da entrega não fornecido' });
      }

      if (!documentos || !Array.isArray(documentos)) {
        return res.status(400).json({ error: 'Documentos inválidos' });
      }

      const entrega = await EntregasService.adicionarDocumentos(id, documentos);
      return res.status(200).json(entrega);
    } catch (error: any) {
      console.error('Erro ao adicionar documentos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async removeDocumento(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { idDocumento, tipo } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID da entrega não fornecido' });
      }

      if (!idDocumento || !tipo) {
        return res.status(400).json({ error: 'Dados do documento inválidos' });
      }

      const entrega = await EntregasService.removerDocumento(
        id,
        idDocumento,
        tipo
      );
      return res.status(200).json(entrega);
    } catch (error: any) {
      console.error('Erro ao remover documento:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { ds_status, dt_entrega } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID da entrega não fornecido' });
      }

      if (!ds_status) {
        return res.status(400).json({ error: 'Status não informado' });
      }

      const entrega = await EntregasService.atualizarStatusEntrega(
        id,
        ds_status,
        dt_entrega
      );
      return res.status(200).json(entrega);
    } catch (error: any) {
      console.error('Erro ao atualizar status da entrega:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
