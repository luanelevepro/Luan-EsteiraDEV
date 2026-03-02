import { PrismaClient, ModuleType, sis_access } from '@prisma/client';
import { prisma } from '../prisma';

export const updateModulesInUsuario = async (
  usuarioId: string,
  moduleTypes: ModuleType[]
): Promise<ModuleType[]> => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingAccess = await tx.sis_access.findFirst({
        where: { id_profiles: usuarioId },
      });

      return await tx.sis_access.upsert({
        where: { id: existingAccess?.id ?? usuarioId }, // Usa `usuarioId` se `existingAccess` for `null`
        update: { js_modules: moduleTypes },
        create: {
          id_profiles: usuarioId,
          js_modules: moduleTypes,
        },
      });
    });

    return result.js_modules;
  } catch (error) {
    console.error('Erro ao atualizar módulos do usuário:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

export const listModulesInUsuario = async (
  usuarioId: string
): Promise<Record<ModuleType, boolean>> => {
  const excludedModules: ModuleType[] = [
    ModuleType.SISTEMA,
    ModuleType.ADM_EMPRESA,
    ModuleType.ADM_ESCRITORIO,
    ModuleType.ADM_SISTEMA,
  ];

  const availableModules = (await getModules()).filter(
    (module) => !excludedModules.includes(module)
  );

  const moduleAccess: Record<ModuleType, boolean> = availableModules.reduce(
    (acc, module) => {
      acc[module] = false;
      return acc;
    },
    {} as Record<ModuleType, boolean>
  );

  const userAccess = await prisma.sis_access.findUnique({
    where: { id_profiles: usuarioId },
  });

  if (userAccess?.js_modules) {
    userAccess.js_modules
      .filter((module) => !excludedModules.includes(module)) // Remove módulos indesejados
      .forEach((module) => {
        moduleAccess[module] = true;
      });
  }

  return moduleAccess;
};

export const getModules = async (): Promise<ModuleType[]> => {
  return Object.values(ModuleType) as ModuleType[];
};

export const listModulesUsuarioPermited = async (
  usuarioId: string
): Promise<ModuleType[]> => {
  const userAccess = await prisma.sis_access.findUnique({
    where: { id_profiles: usuarioId },
  });

  return userAccess?.js_modules || [];
};

export const getModulesEmpresaUsuario = async (
  empresaId: string,
  usuarioId: string
): Promise<ModuleType[]> => {
  const userAccess = await prisma.sis_access.findUnique({
    where: { id_profiles: usuarioId },
    select: { js_modules: true },
  });

  const empresaAccess = await prisma.sis_access.findUnique({
    where: { id_empresas: empresaId },
    select: { js_modules: true },
  });

  const usuarioModulos = userAccess?.js_modules || [];
  const empresaModulos = empresaAccess?.js_modules || [];

  if (
    usuarioModulos.includes(ModuleType.ADMINISTRATIVO) &&
    empresaModulos.includes(ModuleType.SISTEMA)
  ) {
    usuarioModulos.push(ModuleType.SISTEMA);
  }

  if (usuarioModulos.includes(ModuleType.ADMINISTRATIVO)) {
    if (empresaModulos.includes(ModuleType.ADM_SISTEMA)) {
      usuarioModulos.push(ModuleType.ADM_SISTEMA);
    } else if (empresaModulos.includes(ModuleType.ADM_ESCRITORIO)) {
      usuarioModulos.push(ModuleType.ADM_ESCRITORIO);
    } else if (empresaModulos.includes(ModuleType.ADM_EMPRESA)) {
      usuarioModulos.push(ModuleType.ADM_EMPRESA);
    }
  }

  // Interseção dos módulos do usuário e da empresa
  const intersectionModules = usuarioModulos.filter((mod) =>
    empresaModulos.includes(mod)
  );

  return intersectionModules;
};
