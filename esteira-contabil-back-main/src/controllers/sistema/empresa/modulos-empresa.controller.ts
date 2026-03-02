import { Request, Response } from 'express';
import * as ModulosEmpresaService from '../../../services/sistema/empresa/modulos-empresa.service';
import { ModuleType } from '@prisma/client';

export class ModulosEmpresaController {
  static async updateModulesInEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { empresaId } = req.params;
    const { moduleTypes }: { moduleTypes: ModuleType[] } = req.body;

    try {
      if (
        !Array.isArray(moduleTypes) ||
        moduleTypes.some((mt) => !Object.values(ModuleType).includes(mt))
      ) {
        return res.status(400).json({ error: 'Invalid moduleTypes array.' });
      }

      const updatedModules = await ModulosEmpresaService.updateModulosEmpresa(
        empresaId,
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

  static async addModuloAdmEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresas = await ModulosEmpresaService.addModuloAdmEmpresa();
      return res.status(200).json(empresas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar empresas.' });
    }
  }

  static async getModulesInEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { empresaId } = req.params;

      const empresas =
        await ModulosEmpresaService.getModulesInEmpresa(empresaId);
      return res.status(200).json(empresas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar empresas.' });
    }
  }
}
