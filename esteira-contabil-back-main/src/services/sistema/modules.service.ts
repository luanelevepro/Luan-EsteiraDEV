import {
  IAccess,
  ICreateModules,
  IEmpresasModules,
  IProfilesModules,
} from '@/interfaces/Imodules';
import { prisma } from '../prisma';
import { HttpStatusCode } from 'axios';

export class modulesService {
  async createModule(body: ICreateModules) {
    return await prisma.sis_modules.create({
      data: {
        ds_module: body.ds_module,
      },
    });
  }

  async linkModulesAndEnterprises(body: IEmpresasModules) {
    if (!body?.id_empresa) {
      throw new Error(
        `ID da empresa não fornecido, ${HttpStatusCode.BadRequest}`
      );
    }
    if (!body?.id_module) {
      throw new Error(
        `ID do módulo não fornecido, ${HttpStatusCode.BadRequest}`
      );
    }
    try {
      const enterprise = await prisma.sis_empresas.findFirst({
        where: { id: body?.id_empresa },
      });
      if (!enterprise) {
        throw new Error(`A empresa com o ID: ${body?.id_empresa}, não existe.`);
      }
      const module = await prisma.sis_modules.findFirst({
        where: { id: body?.id_module },
      });
      if (!module) {
        throw new Error(`O módulo com o ID: ${body?.id_module}, não existe.`);
      }
      const linkExists = await prisma.sis_empresas_modules.findFirst({
        where: {
          id_module: module.id,
          id_empresa: enterprise.id,
        },
      });

      let link;
      if (!linkExists) {
        link = await prisma.sis_empresas_modules.create({
          data: {
            dt_updated: this.getDateWithoutTime(),
            dt_ativacao: this.getDateWithoutTime(),
            dt_created: this.getDateWithoutTime(),
            id_empresa: enterprise.id,
            id_module: module.id,
            is_activated: true,
          },
        });
      } else {
        const dt_ativacao = body.dt_ativacao
          ? typeof body.dt_ativacao === 'string'
            ? this.parseDate(body.dt_ativacao)
            : body.dt_ativacao
          : this.getDateWithoutTime();

        link = await prisma.sis_empresas_modules.update({
          where: {
            id_empresa_id_module: {
              id_empresa: enterprise.id,
              id_module: module.id,
            },
          },
          data: {
            dt_updated: this.getDateWithoutTime(),
            is_activated: body.is_activated,
            dt_ativacao: dt_ativacao,
          },
        });
      }
      return this.formatResponseDates(link);
    } catch (error: any) {
      throw new Error(error?.message);
    }
  }

  async linkModulesAndProfiles(body: IProfilesModules) {
    if (!body?.id_profile) {
      throw new Error(
        `ID do usuário não fornecido, ${HttpStatusCode.BadRequest}`
      );
    }
    if (!body?.id_module) {
      throw new Error(
        `ID do módulo não fornecido, ${HttpStatusCode.BadRequest}`
      );
    }
    try {
      const profile = await prisma.sis_profiles.findFirst({
        where: { id: body?.id_profile },
      });
      if (!profile) {
        throw new Error(`O usuário com o ID: ${body?.id_profile}, não existe.`);
      }
      const module = await prisma.sis_modules.findFirst({
        where: { id: body?.id_module },
      });
      if (!module) {
        throw new Error(`O módulo com o ID: ${body?.id_module}, não existe.`);
      }
      const linkExists = await prisma.sis_profiles_modules.findFirst({
        where: {
          id_module: module.id,
          id_profile: profile.id,
        },
      });

      let link;
      if (!linkExists) {
        link = await prisma.sis_profiles_modules.create({
          data: {
            dt_updated: this.getDateWithoutTime(),
            dt_ativacao: this.getDateWithoutTime(),
            dt_created: this.getDateWithoutTime(),
            id_profile: profile.id,
            id_module: module.id,
            is_activated: true,
          },
        });
      } else {
        const dt_ativacao = body.dt_ativacao
          ? typeof body.dt_ativacao === 'string'
            ? this.parseDate(body.dt_ativacao)
            : body.dt_ativacao
          : this.getDateWithoutTime();

        link = await prisma.sis_profiles_modules.update({
          where: {
            id_profile_id_module: {
              id_profile: profile.id,
              id_module: module.id,
            },
          },
          data: {
            dt_updated: this.getDateWithoutTime(),
            is_activated: body.is_activated,
            dt_ativacao: dt_ativacao,
          },
        });
      }
      return this.formatResponseDates(link);
    } catch (error: any) {
      throw new Error(error?.message);
    }
  }

  private parseDate(dateString: string): Date {
    const [day, month, year] = dateString.split('/');
    return new Date(
      Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0)
    );
  }

  private getDateWithoutTime(): Date {
    const now = new Date();

    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
  }

  private convertUTCToBrazilTime(date: Date): Date {
    const brazilDate = new Date(date);
    brazilDate.setUTCHours(brazilDate.getUTCHours() + 3);
    return brazilDate;
  }

  private formatResponseDates(data: any): any {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.formatResponseDates(item));
    }

    if (typeof data === 'object') {
      const formatted: any = {};
      for (const key in data) {
        if (data[key] instanceof Date) {
          formatted[key] = this.convertUTCToBrazilTime(data[key]);
        } else if (typeof data[key] === 'object') {
          formatted[key] = this.formatResponseDates(data[key]);
        } else {
          formatted[key] = data[key];
        }
      }
      return formatted;
    }

    return data;
  }

  async findAll(id_empresa?: string, id_profile?: string) {
    try {
      if (id_empresa) {
        const enterprise = await prisma.sis_empresas.findFirst({
          where: { id: id_empresa },
          include: {
            sis_empresas_modules: {
              include: {
                module: true,
              },
            },
          },
        });

        if (!enterprise) {
          throw new Error(`A empresa com o ID: ${id_empresa}, não existe.`);
        }

        const { sis_empresas_modules, ...empresaData } = enterprise;

        return this.formatResponseDates({
          ...empresaData,
          modules: sis_empresas_modules.map(
            ({ module, ...moduleRelation }) => ({
              ...moduleRelation,
              module,
            })
          ),
        });
      }

      if (id_profile) {
        const profile = await prisma.sis_profiles.findFirst({
          where: { id: id_profile },
        });

        if (!profile) {
          throw new Error(`O perfil com o ID: ${id_profile}, não existe.`);
        }

        return await prisma.sis_profiles_modules
          .findMany({
            where: { id_profile: id_profile },
            include: {
              module: true,
              profile: true,
            },
          })
          .then((result) => this.formatResponseDates(result));
      }

      throw new Error('ID da empresa ou perfil é obrigatório');
    } catch (error: any) {
      throw new Error(error?.message);
    }
  }

  async findOne(ds_module: string, id_empresa?: string, id_profile?: string) {
    try {
      if (!ds_module) {
        throw new Error('Nome do módulo é obrigatório');
      }

      const module = await prisma.sis_modules.findFirst({
        where: { ds_module: ds_module },
      });

      if (!module) {
        throw new Error(`O módulo com o nome: ${ds_module}, não existe.`);
      }

      if (id_empresa) {
        const enterprise = await prisma.sis_empresas.findFirst({
          where: { id: id_empresa },
        });

        if (!enterprise) {
          throw new Error(`A empresa com o ID: ${id_empresa}, não existe.`);
        }

        const sis_empresas_modules = await prisma.sis_empresas_modules
          .findFirst({
            where: {
              id_empresa: enterprise.id,
              id_module: module.id,
            },
            include: {
              module: true,
              empresa: true,
            },
          })
          .then((result) => this.formatResponseDates(result));

        if (!sis_empresas_modules) {
          return {
            data: [],
            error: 'A empresa ou o usuário não possui acesso a este módulo.',
            pagination: {
              page: 1,
              pageSize: 0,
              totalItems: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          };
        }

        return sis_empresas_modules;
      }

      if (id_profile) {
        const profile = await prisma.sis_profiles.findFirst({
          where: { id: id_profile },
        });

        if (!profile) {
          throw new Error(`O perfil com o ID: ${id_profile}, não existe.`);
        }

        return await prisma.sis_profiles_modules
          .findFirst({
            where: {
              id_module: module.id,
              id_profile: profile.id,
            },
            include: {
              module: true,
              profile: true,
            },
          })
          .then((result) => this.formatResponseDates(result));
      }

      throw new Error('ID da empresa ou perfil é obrigatório');
    } catch (error: any) {
      throw new Error(error?.message);
    }
  }

  async findOnlyModules() {
    return await prisma.sis_modules.findMany({});
  }
}
