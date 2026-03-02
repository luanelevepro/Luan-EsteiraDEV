import { Request, Response } from 'express';
import * as ModuleService from '../../services/sistema/module.service';
import { ModuleType } from '@prisma/client';

export class ModuleController {
  static async getModules(req: Request, res: Response): Promise<Response> {
    try {
      const modulesTypes = await ModuleService.getModules();
      return res.status(200).json(modulesTypes);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao receber módulos do perfil.' });
    }
  }

  static async updateModulesInUsuario(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { usuarioId } = req.params;
    const { moduleTypes }: { moduleTypes: ModuleType[] } = req.body;
    try {
      if (
        !Array.isArray(moduleTypes) ||
        moduleTypes.some((mt) => !Object.values(ModuleType).includes(mt))
      ) {
        return res.status(400).json({ error: 'Módulos Inválidos' });
      }

      const updatedModules = await ModuleService.updateModulesInUsuario(
        usuarioId,
        moduleTypes
      );
      return res.status(200).json(updatedModules);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao atualizar módulos do perfil.' });
    }
  }

  static async getModulesInUsuario(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { usuarioId } = req.params;

    try {
      const modules = await ModuleService.listModulesInUsuario(usuarioId);
      return res.status(200).json(modules);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar módulos do perfil.' });
    }
  }

  static async getModulesUsuarioPermited(
    req: Request,
    res: Response
  ): Promise<Response> {
    const usuarioId = req['usuarioId'];
    try {
      const modules = await ModuleService.listModulesUsuarioPermited(usuarioId);
      return res.status(200).json(modules);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar módulos do perfil.' });
    }
  }

  static async getModulesEmpresaUsuario(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { empresaId, usuarioId } = req.params;
    try {
      const modules = await ModuleService.getModulesEmpresaUsuario(
        empresaId,
        usuarioId
      );
      return res.status(200).json(modules);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erro ao listar módulos do perfil.' });
    }
  }
}
