import e, { Request, Response } from 'express';
import * as EscritorioService from '../../services/sistema/escritorio.service';
import { getAccessModules } from '../../services/sistema/core/access-control';
import { ModuleType } from '@prisma/client';

export class EscritorioController {
  static async getEscritorios(req: Request, res: Response): Promise<Response> {
    try {
      const result = await EscritorioService.getEscritorios();
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar os escritórios.' });
    }
  }

  static async addEmpresaToEscritorio(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { escritorioId, empresaId } = req.params;
      const result = await EscritorioService.addEmpresaToEscritorio(
        escritorioId,
        empresaId
      );
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao adicionar. ' + error.message });
    }
  }

  static async getEmpresasByEscritorio(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const id = req['usuarioId'];
      const idEscritorio = req['escritorioId'];
      const hasAdmSistemaAccess = await getAccessModules(
        id,
        ModuleType.ADM_SISTEMA
      );

      let result;
      if (hasAdmSistemaAccess) {
        result = await EscritorioService.getEmpresas();
      } else {
        result = await EscritorioService.getEmpresasByEscritorio(idEscritorio);
      }
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar as empresas.' });
    }
  }

  static async createOrUpdateUrl(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const { url } = req.body;

      const result = await EscritorioService.createOrUpdateUrl(id, url);
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar URL.' });
    }
  }

  static async createOrUpdateKey(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const { key } = req.body;

      const result = await EscritorioService.createOrUpdateKey(id, key);
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar chave' });
    }
  }

  static async setAsEscritorio(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const result = await EscritorioService.setAsEscritorio(id);
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao tornar a empresa um escritório.' });
    }
  }

  static async setAsEmpresa(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const result = await EscritorioService.setAsEmpresa(id);
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao tornar a empresa um escritório.' });
    }
  }

  static async setAsSistema(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const result = await EscritorioService.setAsSistema(id);
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao tornar a empresa um escritório.' });
    }
  }

  static async removeEmpresaEscritorio(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { escritorioId, empresaId } = req.params;
      const result = await EscritorioService.removeEmpresaEscritorio(
        escritorioId,
        empresaId
      );
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao tornar a empresa um escritório.' });
    }
  }
}
