import {
  PrismaClient,
  Prisma,
  sis_empresas,
  sis_profiles,
  sis_access,
} from '@prisma/client';
import { ModuleType } from '@prisma/client';
import { prisma } from '../../prisma';
export const updateModulosEmpresa = async (
  empresaId: string,
  moduleTypes: ModuleType[]
): Promise<sis_access[]> => {
  return await prisma.$transaction(async (tx) => {
    const uniqueModuleTypes = [...new Set(moduleTypes)];

    const adminModules = [
      ModuleType.ADM_SISTEMA,
      ModuleType.ADM_ESCRITORIO,
      ModuleType.ADM_EMPRESA,
    ];

    const hasAdminModule = uniqueModuleTypes.some((moduleType) =>
      adminModules.includes(
        moduleType as 'ADM_SISTEMA' | 'ADM_ESCRITORIO' | 'ADM_EMPRESA'
      )
    );

    if (!hasAdminModule) {
      const existingAccess = await tx.sis_access.findUnique({
        where: { id_empresas: empresaId },
      });

      const existingModules = existingAccess?.js_modules || [];

      const existingAdminModule = existingModules.find((module) =>
        adminModules.includes(
          module as 'ADM_SISTEMA' | 'ADM_ESCRITORIO' | 'ADM_EMPRESA'
        )
      );

      if (existingAdminModule) {
        uniqueModuleTypes.push(existingAdminModule);
      } else {
        uniqueModuleTypes.push(ModuleType.ADM_EMPRESA);
      }
    }

    await tx.sis_access.upsert({
      where: { id_empresas: empresaId },
      update: { js_modules: uniqueModuleTypes },
      create: {
        id_empresas: empresaId,
        js_modules: uniqueModuleTypes,
      },
    });

    return tx.sis_access.findMany({
      where: { id_empresas: empresaId },
    });
  });
};

export const addModuloAdmEmpresa = async (): Promise<void> => {
  try {
    const empresas = await prisma.sis_empresas.findMany();

    await prisma.$transaction(async (tx) => {
      for (const empresa of empresas) {
        const existingAccess = await tx.sis_access.findFirst({
          where: { id_empresas: empresa.id },
        });

        const modules = existingAccess?.js_modules ?? [];

        if (!modules.includes(ModuleType.ADM_EMPRESA)) {
          modules.push(ModuleType.ADM_EMPRESA);

          if (existingAccess) {
            await tx.sis_access.update({
              where: { id: existingAccess.id },
              data: { js_modules: modules },
            });
          } else {
            await tx.sis_access.create({
              data: {
                id_empresas: empresa.id,
                js_modules: modules,
              },
            });
          }
        }
      }
    });

    console.log(`${empresas.length} empresas processadas.`);
  } catch (error) {
    console.error('Erro ao adicionar o módulo ADM_EMPRESA:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

export const getModulesInEmpresa = async (
  empresaId: string
): Promise<sis_access[]> => {
  return prisma.sis_access.findMany({
    where: { id_empresas: empresaId },
  });
};
