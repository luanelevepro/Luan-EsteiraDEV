import { Request, Response } from 'express';
import { HttpStatusCode } from 'axios';
import { modulesService } from '@/services/sistema/modules.service';

export class ModulesController {
  private service: modulesService;

  constructor() {
    this.service = new modulesService();
  }

  createModule = async (req: Request, res: Response) => {
    try {
      const module = await this.service.createModule(req.body);
      return res.status(HttpStatusCode.Created).json(module);
    } catch (error: any) {
      return res.status(HttpStatusCode.BadRequest).json({
        message: error?.message || 'Erro ao criar módulo',
      });
    }
  };

  linkModulesAndEnterprises = async (req: Request, res: Response) => {
    try {
      const link = await this.service.linkModulesAndEnterprises(req.body);
      return res.status(HttpStatusCode.Ok).json(link);
    } catch (error: any) {
      return res.status(HttpStatusCode.BadRequest).json({
        message: error?.message || 'Erro ao vincular módulo à empresa',
      });
    }
  };

  linkModulesAndProfiles = async (req: Request, res: Response) => {
    try {
      const link = await this.service.linkModulesAndProfiles(req.body);
      return res.status(HttpStatusCode.Ok).json(link);
    } catch (error: any) {
      return res.status(HttpStatusCode.BadRequest).json({
        message: error?.message || 'Erro ao vincular módulo ao perfil',
      });
    }
  };

  findAll = async (req: Request, res: Response) => {
    try {
      const { id_empresa, id_profile } = req.query;

      if (!id_empresa && !id_profile) {
        return res.status(HttpStatusCode.BadRequest).json({
          message: 'ID da empresa ou perfil é obrigatório',
        });
      }

      const modules = await this.service.findAll(
        id_empresa as string,
        id_profile as string
      );

      return res.status(HttpStatusCode.Ok).json(modules);
    } catch (error: any) {
      return res.status(HttpStatusCode.BadRequest).json({
        message: error?.message || 'Erro ao buscar módulos',
      });
    }
  };

  findOne = async (req: Request, res: Response) => {
    try {
      const { ds_module, id_empresa, id_profile } = req.query;

      if (!ds_module) {
        return res.status(HttpStatusCode.BadRequest).json({
          message: 'Nome do módulo é obrigatório',
        });
      }

      if (!id_empresa && !id_profile) {
        return res.status(HttpStatusCode.BadRequest).json({
          message: 'ID da empresa ou perfil é obrigatório',
        });
      }

      const module = await this.service.findOne(
        ds_module as string,
        id_empresa as string,
        id_profile as string
      );

      console.log(module);

      if (!module) {
        return res.status(HttpStatusCode.NotFound).json({
          message: 'Módulo não encontrado',
        });
      }

      return res.status(HttpStatusCode.Ok).json(module);
    } catch (error: any) {
      return res.status(HttpStatusCode.BadRequest).json({
        message: error?.message || 'Erro ao buscar módulo',
      });
    }
  };

  findOnlyModules = async (req: Request, res: Response) => {
    try {
      const modules = await this.service.findOnlyModules();
      return res.status(HttpStatusCode.Ok).json(modules);
    } catch (error: any) {
      return res.status(HttpStatusCode.BadRequest).json({
        message: error?.message || 'Erro ao buscar módulos',
      });
    }
  };
}
