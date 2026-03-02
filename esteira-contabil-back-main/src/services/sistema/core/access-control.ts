import { ModuleType } from '@prisma/client';
import { prisma } from '../../prisma';

export const getAccessModules = async (
  id: string,
  modulo: ModuleType
): Promise<string | null> => {
  const access = await prisma.sis_access.findFirst({
    where: {
      OR: [
        { id_profiles: id, js_modules: { has: modulo } },
        { id_empresas: id, js_modules: { has: modulo } },
      ],
    },
    select: {
      id_empresas: true,
    },
  });

  return access?.id_empresas || null;
};
