import { Request, Response } from 'express';
import * as CargasService from '../../services/tms/cargas.service';
import { parseDocumentosParaCarga } from '../../services/tms/parser-carga-documentos.service';
import * as tripFlowService from '../../services/tms/trip-flow.service';
import { TripFlowRuleError } from '../../services/tms/trip-flow.errors';
import { importCargas } from '../../services/tms/cargas-import.service';
import * as ImportLayoutsService from '../../services/tms/import-layouts.service';

export class CargasController {
  /**
   * Busca todas as cargas da empresa
   */
  static async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const cargas = await CargasService.getCargas(empresaId);
      return res.status(200).json(cargas);
    } catch (error: any) {
      console.error('Erro ao buscar cargas:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Busca cargas com paginação e filtros
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
        orderColumn = 'cd_carga',
        search = '',
        status = '',
        month,
        year,
        includeCargasSemData,
      } = req.query;

      const statusArray = status
        ? (status as string).split(',').map((s) => s.trim())
        : [];

      const monthNum =
        month !== undefined && month !== ''
          ? parseInt(month as string, 10)
          : undefined;
      const yearNum =
        year !== undefined && year !== ''
          ? parseInt(year as string, 10)
          : undefined;

      const includeCargasSemDataBool =
        includeCargasSemData === undefined || includeCargasSemData === ''
          ? true
          : (includeCargasSemData as string).toLowerCase() === 'true';

      const resultado = await CargasService.getCargasPaginacao(
        empresaId,
        parseInt(page as string, 10),
        parseInt(pageSize as string, 10),
        orderBy as 'asc' | 'desc',
        orderColumn as string,
        search as string,
        statusArray,
        monthNum,
        yearNum,
        includeCargasSemDataBool
      );
      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao buscar cargas paginadas:', error);
      return res
        .status(500)
        .json({ error: error?.message || 'Erro ao buscar cargas' });
    }
  }

  /**
   * Parseia documentos (fis_documento_dfe) e retorna DTO para pré-preenchimento da carga
   * POST /api/tms/cargas/parser-documentos
   * Body: { documentoDfeIds: string[] }
   */
  static async parserDocumentos(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { documentoDfeIds } = req.body;
      if (!Array.isArray(documentoDfeIds)) {
        return res.status(400).json({
          error: 'documentoDfeIds é obrigatório e deve ser um array',
        });
      }

      const result = await parseDocumentosParaCarga(empresaId, documentoDfeIds);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao parsear documentos para carga:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Importa cargas a partir de planilha já parseada no frontend (mapeamento DE→PARA)
   * POST /api/tms/cargas/import
   */
  static async import(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const {
        operacaoContainer = false,
        mapColunas,
        mapFormatoData,
        mapPersonalizadas,
        mapContainer,
        rows,
      } = req.body ?? {};

      if (!mapColunas || typeof mapColunas !== 'object') {
        return res.status(400).json({ error: 'mapColunas é obrigatório.' });
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        return res
          .status(400)
          .json({ error: 'rows é obrigatório e deve ter ao menos uma linha.' });
      }

      const result = await importCargas(empresaId, {
        operacaoContainer: Boolean(operacaoContainer),
        mapColunas,
        mapFormatoData: mapFormatoData || {},
        mapPersonalizadas: mapPersonalizadas || {},
        mapContainer: mapContainer || {},
        rows,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro ao importar cargas:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/tms/cargas/import/layouts — lista layouts de mapeamento da empresa
   */
  static async listImportLayouts(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }
      const layouts = await ImportLayoutsService.listImportLayouts(
        empresaId,
        'CARGAS'
      );
      return res.status(200).json(layouts);
    } catch (error: any) {
      console.error('Erro ao listar layouts de importação:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/tms/cargas/import/layouts — cria layout de mapeamento
   */
  static async createImportLayout(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }
      const { ds_nome, ds_descricao, js_mapeamento } = req.body ?? {};
      const layout = await ImportLayoutsService.createImportLayout(
        empresaId,
        { ds_nome, ds_descricao, js_mapeamento },
        'CARGAS'
      );
      return res.status(201).json(layout);
    } catch (error: any) {
      console.error('Erro ao criar layout de importação:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * PUT /api/tms/cargas/import/layouts/:id — atualiza layout de mapeamento
   */
  static async updateImportLayout(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID do layout não fornecido' });
      }
      const { ds_nome, ds_descricao, js_mapeamento } = req.body ?? {};
      const layout = await ImportLayoutsService.updateImportLayout(
        empresaId,
        id,
        {
          ds_nome,
          ds_descricao,
          js_mapeamento,
        }
      );
      return res.status(200).json(layout);
    } catch (error: any) {
      console.error('Erro ao atualizar layout de importação:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/tms/cargas/import/layouts/:id — remove layout de mapeamento
   */
  static async deleteImportLayout(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID do layout não fornecido' });
      }
      await ImportLayoutsService.deleteImportLayout(empresaId, id);
      return res.status(200).json({ message: 'Layout removido com sucesso' });
    } catch (error: any) {
      console.error('Erro ao remover layout de importação:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Busca uma carga por ID
   */
  static async getOne(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID da carga não fornecido' });
      }

      const carga = await CargasService.getCargaById(empresaId, id);
      return res.status(200).json(carga);
    } catch (error: any) {
      console.error('Erro ao buscar carga:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cria uma nova carga.
   * Se body.entregas for um array não vazio, usa createCargaCompletaComEntregas (fluxo com parser/documentos).
   */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const entregas = req.body.entregas;
      const comEntregas = Array.isArray(entregas) && entregas.length > 0;

      if (comEntregas) {
        const {
          cd_carga,
          ds_status,
          dt_coleta_inicio,
          dt_coleta_fim,
          dt_coleta,
          ds_observacoes,
          ds_tipo_carroceria,
          ds_prioridade,
          vl_peso_bruto,
          vl_cubagem,
          vl_qtd_volumes,
          fl_requer_seguro,
          id_cidade_origem,
          id_cidade_destino,
          id_fis_cliente,
          id_embarcador,
          id_segmento,
          id_carroceria_planejada,
          cliente,
          embarcador,
          container,
        } = req.body;

        const carga = await CargasService.createCargaCompletaComEntregas(
          empresaId,
          {
            cd_carga: cd_carga?.trim() || undefined,
            ds_status,
            dt_coleta_inicio,
            dt_coleta_fim,
            dt_coleta,
            ds_observacoes,
            ds_tipo_carroceria,
            ds_prioridade,
            vl_peso_bruto,
            vl_cubagem,
            vl_qtd_volumes,
            fl_requer_seguro,
            id_cidade_origem: parseInt(id_cidade_origem, 10),
            id_cidade_destino: id_cidade_destino
              ? parseInt(id_cidade_destino, 10)
              : undefined,
            id_fis_cliente: id_fis_cliente || undefined,
            id_embarcador: id_embarcador || undefined,
            id_segmento: id_segmento || undefined,
            id_carroceria_planejada: id_carroceria_planejada || undefined,
            cliente: cliente || undefined,
            embarcador: embarcador || undefined,
            container,
            entregas: entregas.map((e: any) => ({
              id_cidade_destino: parseInt(e.id_cidade_destino, 10),
              ds_nome_recebedor: e.ds_nome_recebedor,
              ds_documento_recebedor: e.ds_documento_recebedor,
              ds_nome_destinatario: e.ds_nome_destinatario,
              ds_documento_destinatario: e.ds_documento_destinatario,
              vl_total_mercadoria: e.vl_total_mercadoria,
              js_produtos: e.js_produtos,
              documentos: e.documentos || [],
            })),
          }
        );
        return res.status(201).json(carga);
      }

      const {
        cd_carga,
        ds_status,
        dt_coleta_inicio,
        dt_coleta_fim,
        dt_coleta,
        dt_limite_entrega,
        dt_entrega,
        ds_comprovante_entrega,
        ds_comprovante_key,
        ds_observacoes,
        ds_tipo_carroceria,
        ds_prioridade,
        vl_peso_bruto,
        vl_cubagem,
        vl_qtd_volumes,
        vl_limite_empilhamento,
        fl_requer_seguro,
        fl_carroceria_desacoplada,
        fl_deslocamento_vazio,
        id_cidade_origem,
        id_cidade_destino,
        id_motorista_veiculo,
        id_fis_cliente,
        id_segmento,
        id_embarcador,
        id_carroceria_planejada,
        container,
      } = req.body;

      const carga = await CargasService.createCarga(empresaId, {
        cd_carga: cd_carga?.trim() || undefined,
        ds_status,
        dt_coleta_inicio,
        dt_coleta_fim,
        dt_coleta,
        ds_comprovante_entrega,
        ds_comprovante_key,
        ds_observacoes,
        ds_tipo_carroceria,
        ds_prioridade,
        vl_peso_bruto,
        vl_cubagem,
        vl_qtd_volumes,
        vl_limite_empilhamento,
        fl_requer_seguro,
        fl_carroceria_desacoplada,
        fl_deslocamento_vazio,
        id_cidade_origem: id_cidade_origem
          ? parseInt(id_cidade_origem, 10)
          : undefined,
        id_cidade_destino: id_cidade_destino
          ? parseInt(id_cidade_destino, 10)
          : undefined,
        id_motorista_veiculo,
        id_fis_cliente,
        id_segmento,
        id_embarcador,
        id_carroceria_planejada: id_carroceria_planejada || undefined,
        container,
      });
      return res.status(201).json(carga);
    } catch (error: any) {
      console.error('Erro ao criar carga:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Atualiza uma carga
   */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID da carga não fornecido' });
      }

      const {
        cd_carga,
        ds_status,
        dt_coleta_inicio,
        dt_coleta_fim,
        dt_coleta,
        dt_limite_entrega,
        dt_entrega,
        ds_comprovante_entrega,
        ds_comprovante_key,
        ds_observacoes,
        ds_tipo_carroceria,
        ds_prioridade,
        vl_peso_bruto,
        vl_cubagem,
        vl_qtd_volumes,
        vl_limite_empilhamento,
        fl_requer_seguro,
        fl_carroceria_desacoplada,
        fl_deslocamento_vazio,
        id_cidade_origem,
        id_cidade_destino,
        id_motorista_veiculo,
        id_fis_cliente,
        id_segmento,
        id_embarcador,
        id_carroceria_planejada,
        container,
      } = req.body;

      const carga = await CargasService.updateCarga(empresaId, id, {
        cd_carga,
        ds_status,
        dt_coleta_inicio,
        dt_coleta_fim,
        dt_coleta,
        ds_comprovante_entrega,
        ds_comprovante_key,
        ds_observacoes,
        ds_tipo_carroceria,
        ds_prioridade,
        vl_peso_bruto,
        vl_cubagem,
        vl_qtd_volumes,
        vl_limite_empilhamento,
        fl_requer_seguro,
        fl_carroceria_desacoplada,
        fl_deslocamento_vazio,
        id_cidade_origem: id_cidade_origem
          ? parseInt(id_cidade_origem, 10)
          : undefined,
        id_cidade_destino: id_cidade_destino
          ? parseInt(id_cidade_destino, 10)
          : undefined,
        id_motorista_veiculo,
        id_fis_cliente,
        id_segmento,
        id_embarcador,
        id_carroceria_planejada: id_carroceria_planejada ?? undefined,
        container,
      });
      return res.status(200).json(carga);
    } catch (error: any) {
      console.error('Erro ao atualizar carga:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Atualiza o status de uma carga
   */
  static async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { id } = req.params;
      const { ds_status } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID da carga não fornecido' });
      }

      if (!ds_status) {
        return res.status(400).json({ error: 'Status é obrigatório' });
      }

      const carga = await CargasService.updateCargaStatus(
        empresaId,
        id,
        ds_status
      );
      return res.status(200).json(carga);
    } catch (error: any) {
      console.error('Erro ao atualizar status da carga:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Deleta uma carga
   */
  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID da carga não fornecido' });
      }

      await CargasService.deleteCarga(empresaId, id);
      return res.status(200).json({ message: 'Carga deletada com sucesso' });
    } catch (error: any) {
      console.error('Erro ao deletar carga:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Busca o status da viagem mais recente de uma carga
   */
  static async getStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID da carga não fornecido' });
      }

      const viagem = await CargasService.getCargaStatus({ cargaId: id });

      if (!viagem) {
        return res.status(404).json({
          message: 'Nenhuma viagem encontrada para esta carga',
          ds_status: null,
        });
      }

      return res.status(200).json(viagem);
    } catch (error: any) {
      console.error('Erro ao buscar status da carga:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /cargas/:id/coleta/iniciar — inicia etapa de coleta (esteira sequencial)
   */
  static async iniciarColeta(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da carga não fornecido' });
      }
      const { dt_coleta_inicio } = req.body || {};
      const fluxo = await tripFlowService.iniciarColeta(empresaId, id, {
        dt_coleta_inicio,
      });
      return res.status(200).json(fluxo);
    } catch (error: any) {
      if (error instanceof TripFlowRuleError) {
        return res.status(422).json({ message: error.message });
      }
      console.error('Erro ao iniciar coleta:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /cargas/:id/coleta/finalizar — finaliza etapa de coleta (esteira sequencial)
   */
  static async finalizarColeta(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID da carga não fornecido' });
      }
      const { dt_coleta_fim } = req.body || {};
      const fluxo = await tripFlowService.finalizarColeta(empresaId, id, {
        dt_coleta_fim,
      });
      return res.status(200).json(fluxo);
    } catch (error: any) {
      if (error instanceof TripFlowRuleError) {
        return res.status(422).json({ message: error.message });
      }
      console.error('Erro ao finalizar coleta:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Finaliza uma carga e gerencia transição automática do status da viagem
   */
  static async finalizarCarga(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { id } = req.params;
      const comprovante = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID da carga não fornecido' });
      }

      const resultado = await CargasService.finalizarCarga(
        empresaId,
        id,
        comprovante
      );

      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao finalizar carga:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Finaliza uma viagem completamente
   */
  static async finalizarViagem(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { viagemId } = req.params;
      const { dt_conclusao } = req.body || {};

      if (!viagemId) {
        return res.status(400).json({ error: 'ID da viagem não fornecido' });
      }

      const viagem = await CargasService.finalizarViagem(empresaId, viagemId, {
        dt_conclusao,
      });

      return res.status(200).json(viagem);
    } catch (error: any) {
      console.error('Erro ao finalizar viagem:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Reabre viagem para adicionar mais cargas (volta para PLANEJADA)
   */
  static async reabrirViagem(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa não identificada' });
      }

      const { viagemId } = req.params;

      if (!viagemId) {
        return res.status(400).json({ error: 'ID da viagem não fornecido' });
      }

      const viagem = await CargasService.reabrirViagemParaNovasCargas(
        empresaId,
        viagemId
      );

      return res.status(200).json(viagem);
    } catch (error: any) {
      console.error('Erro ao reabrir viagem:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
