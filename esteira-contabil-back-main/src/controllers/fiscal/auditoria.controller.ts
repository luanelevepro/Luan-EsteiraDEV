import { Request, Response } from 'express';
import * as service from '@/services/fiscal/auditoria.service';
import * as mockService from '@/services/fiscal/auditoria-mock.service';

export const list = async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === '1' || req.query.active === 'true';
    const tipos = await service.listTipos({ activeOnly });
    return res.json(tipos);
  } catch (err) {
    console.error('auditoria.list error', err);
    return res.status(500).json({ error: String(err) });
  }
};

// === MOCK ENDPOINTS ===

export const listDocumentos = async (req: Request, res: Response) => {
  try {
    // Extrair empresaId do middleware (req.empresaId está disponível após autenticação)
    const empresaId = req['empresaId'];

    if (!empresaId) {
      return res
        .status(400)
        .json({ error: 'ID da empresa não encontrado no contexto' });
    }

    // Montar filtros opcionais (exceto empresa_cnpj e is_escritorio, que agora são resolvidos automaticamente)
    const filters: any = {};
    if (req.query.status_tecnico)
      filters.status_tecnico = req.query.status_tecnico;
    if (req.query.status_operacional)
      filters.status_operacional = req.query.status_operacional;
    if (req.query.tipo_doc) filters.tipo_doc = req.query.tipo_doc;
    if (req.query.criticidade) filters.criticidade = req.query.criticidade;
    if (req.query.dt_inicio)
      filters.dt_inicio = new Date(String(req.query.dt_inicio));
    if (req.query.dt_fim) filters.dt_fim = new Date(String(req.query.dt_fim));

    const documentos = await mockService.listDocumentos(empresaId, filters);
    return res.json(documentos);
  } catch (err) {
    console.error('auditoria.listDocumentos error', err);
    return res.status(500).json({ error: String(err) });
  }
};

export const getDocumento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const documento = await mockService.getDocumentoById(id);
    if (!documento)
      return res.status(404).json({ error: 'Documento não encontrado' });
    return res.json(documento);
  } catch (err) {
    console.error('auditoria.getDocumento error', err);
    return res.status(500).json({ error: String(err) });
  }
};

export const getInconsistencias = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const inconsistencias = await mockService.getInconsistenciasByDocumento(id);
    return res.json(inconsistencias);
  } catch (err) {
    console.error('auditoria.getInconsistencias error', err);
    return res.status(500).json({ error: String(err) });
  }
};

export const listTiposInconsistencia = async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === '1' || req.query.active === 'true';
    const tipos = await mockService.listTiposInconsistencia(activeOnly);
    return res.json(tipos);
  } catch (err) {
    console.error('auditoria.listTiposInconsistencia error', err);
    return res.status(500).json({ error: String(err) });
  }
};

export const getEstatisticasGerais = async (req: Request, res: Response) => {
  try {
    const empresaId = req['empresaId'];
    const stats = await mockService.getEstatisticasGeraisScoped(empresaId);
    return res.json(stats);
  } catch (err) {
    console.error('auditoria.getEstatisticasGerais error', err);
    return res.status(500).json({ error: String(err) });
  }
};

export const getEstatisticasEmpresa = async (req: Request, res: Response) => {
  try {
    const { cnpj } = req.params;
    const stats = await mockService.getEstatisticasPorEmpresa(cnpj);
    return res.json(stats);
  } catch (err) {
    console.error('auditoria.getEstatisticasEmpresa error', err);
    return res.status(500).json({ error: String(err) });
  }
};

export const getEmpresasComEstatisticas = async (
  req: Request,
  res: Response
) => {
  try {
    const empresaId = req['empresaId'];

    if (!empresaId) {
      return res
        .status(400)
        .json({ error: 'ID da empresa não encontrado no contexto' });
    }

    const empresas = await mockService.getEmpresasComEstatisticas(empresaId);
    return res.json(empresas);
  } catch (err) {
    console.error('auditoria.getEmpresasComEstatisticas error', err);
    return res.status(500).json({ error: String(err) });
  }
};

export const listExecucoes = async (req: Request, res: Response) => {
  try {
    const execucoes = await mockService.listExecucoes();
    return res.json(execucoes);
  } catch (err) {
    console.error('auditoria.listExecucoes error', err);
    return res.status(500).json({ error: String(err) });
  }
};
export const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tipo = await service.getTipoById(id);
    if (!tipo) return res.status(404).json({ error: 'Tipo não encontrado' });
    return res.json(tipo);
  } catch (err) {
    console.error('auditoria.getById error', err);
    return res.status(500).json({ error: String(err) });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || !body.cd_codigo || !body.ds_descricao) {
      return res
        .status(400)
        .json({ error: 'cd_codigo e ds_descricao são obrigatórios' });
    }
    const created = await service.createTipo(body);
    return res.status(201).json(created);
  } catch (err) {
    console.error('auditoria.create error', err);
    return res.status(500).json({ error: String(err) });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const updated = await service.updateTipo(id, body);
    return res.json(updated);
  } catch (err: any) {
    console.error('auditoria.update error', err);
    if (err.code === 'P2025')
      return res.status(404).json({ error: 'Tipo não encontrado' });
    return res.status(500).json({ error: String(err) });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await service.deleteTipo(id);
    return res.status(204).send();
  } catch (err: any) {
    console.error('auditoria.remove error', err);
    if (err.code === 'P2025')
      return res.status(404).json({ error: 'Tipo não encontrado' });
    return res.status(500).json({ error: String(err) });
  }
};

export default {
  list,
  getById,
  create,
  update,
  remove,
  listDocumentos,
  getDocumento,
  getInconsistencias,
  listTiposInconsistencia,
  getEstatisticasGerais,
  getEstatisticasEmpresa,
  getEmpresasComEstatisticas,
  listExecucoes,
};
