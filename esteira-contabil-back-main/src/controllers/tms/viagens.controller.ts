import { Response } from 'express';
import * as viagensService from '../../services/tms/viagens.service';
import * as tripFlowService from '../../services/tms/trip-flow.service';
import { TripFlowRuleError } from '../../services/tms/trip-flow.errors';
import { importViagens } from '../../services/tms/viagens-import.service';
import * as ImportLayoutsService from '../../services/tms/import-layouts.service';

/**
 * Busca todas as viagens com paginação
 */
export const getPaginacao = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '50', 10);
    const orderBy = (req.query.orderBy as string) || 'asc';
    const orderColumn = (req.query.orderColumn as string) || 'cd_viagem';
    const search = (req.query.search as string) || '';
    const status = req.query.status;
    const month = req.query.month !== undefined && req.query.month !== '' ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year !== undefined && req.query.year !== '' ? parseInt(req.query.year as string, 10) : undefined;

    const result = await viagensService.getViagensPaginacao(
      empresaId,
      page,
      pageSize,
      orderBy as 'asc' | 'desc',
      orderColumn,
      search,
      status,
      month,
      year
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao buscar viagens paginadas:', error);
    res.status(500).json({
      message: error.message || 'Erro ao buscar viagens paginadas',
      error: error,
    });
  }
};

/**
 * Busca todas as viagens
 */
export const getAll = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];

    const viagens = await viagensService.getViagens(empresaId);

    res.status(200).json(viagens);
  } catch (error: any) {
    console.error('Erro ao buscar viagens:', error);
    res.status(500).json({
      message: error.message || 'Erro ao buscar viagens',
      error: error,
    });
  }
};

/**
 * Busca uma viagem por ID
 */
export const getById = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id } = req.params;

    const viagem = await viagensService.getViagemById(empresaId, id);

    res.status(200).json(viagem);
  } catch (error: any) {
    console.error('Erro ao buscar viagem:', error);
    res.status(500).json({
      message: error.message || 'Erro ao buscar viagem',
      error: error,
    });
  }
};

/**
 * GET /viagens/:id/fluxo — fluxo da esteira sequencial
 */
export const getFluxo = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id } = req.params;
    const fluxo = await tripFlowService.getFluxo(empresaId, id);
    res.status(200).json(fluxo);
  } catch (error: any) {
    if (error instanceof TripFlowRuleError) {
      return res.status(422).json({ message: error.message });
    }
    console.error('Erro ao buscar fluxo da viagem:', error);
    res.status(500).json({
      message: error.message || 'Erro ao buscar fluxo',
      error: error,
    });
  }
};

/**
 * POST /viagens/:id/itens/:itemId/iniciar
 * Body: { dt_inicio?: string } (ISO) — opcional; se não informado, usa data/hora atual.
 */
export const iniciarItem = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id, itemId } = req.params;
    const { dt_inicio } = req.body || {};
    const fluxo = await tripFlowService.iniciarItem(empresaId, id, itemId, {
      dt_inicio,
    });
    res.status(200).json(fluxo);
  } catch (error: any) {
    if (error instanceof TripFlowRuleError) {
      return res.status(422).json({ message: error.message });
    }
    console.error('Erro ao iniciar item:', error);
    res.status(500).json({
      message: error.message || 'Erro ao iniciar item',
      error: error,
    });
  }
};

/**
 * POST /viagens/:id/itens/:itemId/finalizar
 * Body: { dt_fim?: string } (ISO) — opcional; se não informado, usa data/hora atual.
 */
export const finalizarItem = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id, itemId } = req.params;
    const { dt_fim } = req.body || {};
    const fluxo = await tripFlowService.finalizarItem(empresaId, id, itemId, {
      dt_fim,
    });
    res.status(200).json(fluxo);
  } catch (error: any) {
    if (error instanceof TripFlowRuleError) {
      return res.status(422).json({ message: error.message });
    }
    console.error('Erro ao finalizar item:', error);
    res.status(500).json({
      message: error.message || 'Erro ao finalizar item',
      error: error,
    });
  }
};

/**
 * Cria uma nova viagem
 */
export const create = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const {
      ds_motorista,
      ds_placa_cavalo,
      ds_placa_carreta_1,
      ds_placa_carreta_2,
      ds_placa_carreta_3,
      dt_agendada,
      dt_previsao_retorno,
      ds_status,
      id_motorista_veiculo,
    } = req.body;

    if (!ds_motorista) {
      return res.status(400).json({ message: 'Motorista é obrigatório' });
    }

    if (!ds_placa_cavalo) {
      return res
        .status(400)
        .json({ message: 'Placa do cavalo mecânico é obrigatória' });
    }

    const viagem = await viagensService.createViagem(empresaId, {
      ds_motorista,
      ds_placa_cavalo,
      ds_placa_carreta_1,
      ds_placa_carreta_2,
      ds_placa_carreta_3,
      dt_agendada,
      dt_previsao_retorno,
      ds_status,
      id_motorista_veiculo,
    });

    res.status(201).json(viagem);
  } catch (error: any) {
    console.error('Erro ao criar viagem:', error);
    res.status(500).json({
      message: error.message || 'Erro ao criar viagem',
      error: error,
    });
  }
};

/**
 * POST /viagens/import — importa viagens a partir de planilha (mapeamento DE→PARA)
 */
export const import_ = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    if (!empresaId) {
      return res.status(400).json({ error: 'Empresa não identificada' });
    }
    const { mapColunas, mapFormatoData, mapPersonalizadas, rows } = req.body ?? {};
    if (!mapColunas || typeof mapColunas !== 'object') {
      return res.status(400).json({ error: 'mapColunas é obrigatório.' });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows é obrigatório e deve ter ao menos uma linha.' });
    }
    const result = await importViagens(empresaId, {
      mapColunas,
      mapFormatoData: mapFormatoData || {},
      mapPersonalizadas: mapPersonalizadas || {},
      rows,
    });
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao importar viagens:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * GET /viagens/import/layouts — lista layouts de mapeamento de viagens da empresa
 */
export const listImportLayouts = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    if (!empresaId) {
      return res.status(400).json({ error: 'Empresa não identificada' });
    }
    const layouts = await ImportLayoutsService.listImportLayouts(empresaId, 'VIAGENS');
    return res.status(200).json(layouts);
  } catch (error: any) {
    console.error('Erro ao listar layouts de importação de viagens:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * POST /viagens/import/layouts — cria layout de mapeamento de viagens
 */
export const createImportLayout = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    if (!empresaId) {
      return res.status(400).json({ error: 'Empresa não identificada' });
    }
    const { ds_nome, ds_descricao, js_mapeamento } = req.body ?? {};
    const layout = await ImportLayoutsService.createImportLayout(
      empresaId,
      { ds_nome, ds_descricao, js_mapeamento },
      'VIAGENS'
    );
    return res.status(201).json(layout);
  } catch (error: any) {
    console.error('Erro ao criar layout de importação de viagens:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /viagens/import/layouts/:id — atualiza layout de mapeamento de viagens
 */
export const updateImportLayout = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id } = req.params;
    if (!empresaId) {
      return res.status(400).json({ error: 'Empresa não identificada' });
    }
    const { ds_nome, ds_descricao, js_mapeamento } = req.body ?? {};
    const layout = await ImportLayoutsService.updateImportLayout(empresaId, id, {
      ds_nome,
      ds_descricao,
      js_mapeamento,
    });
    return res.status(200).json(layout);
  } catch (error: any) {
    console.error('Erro ao atualizar layout de importação de viagens:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /viagens/import/layouts/:id — remove layout de mapeamento de viagens
 */
export const deleteImportLayout = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id } = req.params;
    if (!empresaId) {
      return res.status(400).json({ error: 'Empresa não identificada' });
    }
    await ImportLayoutsService.deleteImportLayout(empresaId, id);
    return res.status(204).send();
  } catch (error: any) {
    console.error('Erro ao remover layout de importação de viagens:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Atualiza uma viagem
 */
export const update = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id } = req.params;
    const {
      cd_viagem,
      ds_motorista,
      ds_placa_cavalo,
      ds_placa_carreta_1,
      ds_placa_carreta_2,
      ds_placa_carreta_3,
      dt_agendada,
      dt_previsao_retorno,
      ds_status,
      id_motorista_veiculo,
    } = req.body;

    const viagem = await viagensService.updateViagem(empresaId, id, {
      cd_viagem,
      ds_motorista,
      ds_placa_cavalo,
      ds_placa_carreta_1,
      ds_placa_carreta_2,
      ds_placa_carreta_3,
      dt_agendada,
      dt_previsao_retorno,
      ds_status,
      id_motorista_veiculo,
    });

    res.status(200).json(viagem);
  } catch (error: any) {
    console.error('Erro ao atualizar viagem:', error);
    res.status(500).json({
      message: error.message || 'Erro ao atualizar viagem',
      error: error,
    });
  }
};

/**
 * Atualiza o status de uma viagem
 */
export const updateStatus = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id } = req.params;
    const { ds_status } = req.body;

    if (!ds_status) {
      return res.status(400).json({ message: 'Status é obrigatório' });
    }

    const viagem = await viagensService.updateViagemStatus(
      empresaId,
      id,
      ds_status
    );

    res.status(200).json(viagem);
  } catch (error: any) {
    console.error('Erro ao atualizar status da viagem:', error);
    res.status(500).json({
      message: error.message || 'Erro ao atualizar status da viagem',
      error: error,
    });
  }
};

/**
 * Deleta uma viagem
 */
export const delete_ = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id } = req.params;

    await viagensService.deleteViagem(empresaId, id);

    res.status(204).send();
  } catch (error: any) {
    console.error('Erro ao deletar viagem:', error);
    res.status(500).json({
      message: error.message || 'Erro ao deletar viagem',
      error: error,
    });
  }
};

/**
 * Vincula uma carga à viagem
 */
export const vincularCarga = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id } = req.params;
    const { id_carga, nr_sequencia, id_motorista_veiculo } = req.body;

    if (!id_carga) {
      return res.status(400).json({ message: 'ID da carga é obrigatório' });
    }

    if (nr_sequencia === undefined) {
      return res.status(400).json({ message: 'Sequência é obrigatória' });
    }

    const vinculo = await viagensService.vincularCargaAViagem(
      empresaId,
      id,
      id_carga,
      nr_sequencia,
      id_motorista_veiculo !== undefined ? { id_motorista_veiculo } : undefined
    );

    res.status(201).json(vinculo);
  } catch (error: any) {
    console.error('Erro ao vincular carga à viagem:', error);
    res.status(500).json({
      message: error.message || 'Erro ao vincular carga à viagem',
      error: error,
    });
  }
};

/**
 * Remove uma carga da viagem
 */
export const removerCarga = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id, idCarga } = req.params;

    await viagensService.removerCargaDaViagem(empresaId, id, idCarga);

    res.status(204).send();
  } catch (error: any) {
    console.error('Erro ao remover carga da viagem:', error);
    res.status(500).json({
      message: error.message || 'Erro ao remover carga da viagem',
      error: error,
    });
  }
};

/**
 * Reordena as cargas de uma viagem
 */
export const reordenarCargas = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id } = req.params;
    const { cargas } = req.body;

    if (!cargas || !Array.isArray(cargas)) {
      return res.status(400).json({
        message:
          'Cargas deve ser um array com objetos { id_carga, nr_sequencia }',
      });
    }

    const viagem = await viagensService.reordenarCargasViagem(
      empresaId,
      id,
      cargas
    );

    res.status(200).json(viagem);
  } catch (error: any) {
    console.error('Erro ao reordenar cargas da viagem:', error);
    res.status(500).json({
      message: error.message || 'Erro ao reordenar cargas da viagem',
      error: error,
    });
  }
};

/**
 * Finaliza uma carga e atualiza automaticamente a viagem
 */
export const finalizarCarga = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id, idCarga } = req.params;
    const { dt_conclusao } = req.body || {};

    const viagem = await viagensService.finalizarCarga(empresaId, id, idCarga, {
      dt_conclusao,
    });

    res.status(200).json(viagem);
  } catch (error: any) {
    console.error('Erro ao finalizar carga:', error);
    res.status(500).json({
      message: error.message || 'Erro ao finalizar carga',
      error: error,
    });
  }
};

/**
 * Busca documentos (NFes e CTes) para vincular com viagem
 */
export const getDocsParaVincular = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { competencia } = req.query;

    if (!competencia) {
      return res.status(400).json({
        error: 'Competência é obrigatória no formato YYYY-MM',
      });
    }

    // Validar formato YYYY-MM
    const regexCompetencia = /^\d{4}-\d{2}$/;
    if (!regexCompetencia.test(competencia as string)) {
      return res.status(400).json({
        error: 'Formato de competência inválido. Use YYYY-MM (ex: 2026-02)',
      });
    }

    const docs = await viagensService.getDocsParaVincularComViagem({
      empresaId,
      competencia: competencia as string,
    });

    res.status(200).json(docs);
  } catch (error: any) {
    console.error('Erro ao buscar documentos para vincular:', error);
    res.status(500).json({
      message: error.message || 'Erro ao buscar documentos para vincular',
      error: error,
    });
  }
};

/**
 * Vincula documentos (NFes e CTes) a uma viagem
 */
export const linkDocsToViagem = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { documentos, cargaId } = req.body;

    if (!documentos || !Array.isArray(documentos) || documentos.length === 0) {
      return res.status(400).json({
        error:
          'O campo documentos é obrigatório e deve ser uma lista não vazia',
      });
    }

    // Validar estrutura dos documentos
    const isValid = documentos.every(
      (doc) =>
        doc.id &&
        typeof doc.id === 'string' &&
        doc.ordem !== undefined &&
        (typeof doc.ordem === 'number' || typeof doc.ordem === 'string')
    );

    if (!isValid) {
      return res.status(400).json({
        error:
          'Cada documento deve conter { id: string, ordem: number | string }',
      });
    }

    const result = await viagensService.linkDocsToViagem({
      documentos,
      viagemId: id,
      cargaId,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao vincular documentos à viagem:', error);
    res.status(500).json({
      message: error.message || 'Erro ao vincular documentos à viagem',
      error: error,
    });
  }
};

/**
 * Cria uma ou mais cargas a partir de documentos fiscais selecionados
 */
export const criarCargasComDocumentos = async (req: any, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const { id } = req.params;
    const { documentos } = req.body;

    if (!documentos || !Array.isArray(documentos) || documentos.length === 0) {
      return res.status(400).json({
        error: 'Documentos é obrigatório e deve ser uma lista não vazia',
      });
    }

    const result = await viagensService.criarCargasComDocumentos(
      empresaId,
      id,
      documentos
    );

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Erro ao criar cargas com documentos:', error);
    res.status(500).json({
      message: error.message || 'Erro ao criar cargas com documentos',
      error: error,
    });
  }
};
