import {
  PrismaClient,
  Prisma,
  sis_empresas,
  sis_profiles,
  ModuleType,
} from '@prisma/client';
import { getAccessModules } from '../core/access-control';
import { prisma } from '../../prisma';

export const getUfEmpresa = async (id: string): Promise<string | null> => {
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id },
    select: { ds_uf: true },
  });
  return empresa ? empresa.ds_uf : null;
};

export const createOrUpdateEmpresa = async (
  empresaData: Prisma.sis_empresasCreateInput
): Promise<any> => {
  try {
    let escritorioId;
    if (empresaData['id_escritorio']) {
      escritorioId = empresaData['id_escritorio'];
      const empresaEscritorio = await prisma.sis_empresas.findUnique({
        where: { id: escritorioId },
        include: { js_access: true },
      });
      if (empresaEscritorio?.js_access?.length > 0) {
        const accessModules = empresaEscritorio.js_access[0].js_modules;
        console.log(accessModules);

        const hasAdmSistema = accessModules.includes('ADM_SISTEMA');
        if (hasAdmSistema) {
          empresaData['id_escritorio'] = null;
        }
      }
    }
    const empresa = await prisma.sis_empresas.upsert({
      where: { ds_documento: empresaData.ds_documento },
      update: empresaData,
      create: empresaData,
    });

    const existingAccess = await prisma.sis_access.findFirst({
      where: { id_empresas: empresa.id },
    });

    if (!existingAccess) {
      await prisma.sis_access.create({
        data: {
          id_empresas: empresa.id,
          js_modules: [ModuleType.ADM_EMPRESA],
        },
      });
    }
    return empresa;
  } catch (error) {
    console.error('Erro ao criar ou atualizar empresa:', error);
    throw new Error(
      'Erro ao criar ou atualizar empresa. Detalhes:' + error.message
    );
  } finally {
    await prisma.$disconnect();
  }
};

// Listar empresas
export const getEmpresas = async (
  isEscritorio?: boolean
): Promise<sis_empresas[]> => {
  const where =
    isEscritorio !== undefined ? { is_escritorio: isEscritorio } : undefined;
  return prisma.sis_empresas.findMany({ where });
};

// Obter uma empresa pelo código
export const getEmpresa = async (id: string): Promise<sis_empresas | null> => {
  return prisma.sis_empresas.findUnique({
    where: { id },
  });
};

// Atualizar uma empresa
export const updateEmpresa = async (
  id: string,
  ds_nome: string,
  ds_documento: string
): Promise<sis_empresas | null> => {
  return prisma.sis_empresas.update({
    where: { id },
    data: {
      ds_nome,
      ds_documento,
    },
  });
};

// Deletar uma empresa
export const deleteEmpresa = async (
  id: string
): Promise<sis_empresas | null> => {
  return prisma.sis_empresas.delete({
    where: { id },
  });
};

// Adicionar um perfil a uma empresa
export const addUsuarioEmpresa = async (
  id: string,
  usuarioId: string
): Promise<sis_profiles> => {
  return prisma.sis_profiles.update({
    where: { id: usuarioId },
    data: {
      js_empresas: {
        connect: { id },
      },
    },
  });
};

export const toggleBlockUsuarioEmpresa = async (
  empresaId: string,
  usuarioId: string
): Promise<sis_profiles> => {
  // Verifica se o usuário já bloqueou a empresa
  const usuario = await prisma.sis_profiles.findUnique({
    where: { id: usuarioId },
    select: {
      js_empresas_bloqueadas: { select: { id: true } },
    },
  });

  if (!usuario) {
    throw new Error('Usuário não encontrado');
  }

  const isBlocked = usuario.js_empresas_bloqueadas.some(
    (e) => e.id === empresaId
  );

  return prisma.sis_profiles.update({
    where: { id: usuarioId },
    data: {
      js_empresas_bloqueadas: isBlocked
        ? { disconnect: { id: empresaId } } // Desbloqueia
        : { connect: { id: empresaId } }, // Bloqueia
    },
  });
};

// Adicionar um perfil a uma empresa
export const deleteUsuarioEmpresa = async (
  id: string,
  usuarioId: string
): Promise<sis_profiles> => {
  return prisma.sis_profiles.update({
    where: { id: usuarioId },
    data: {
      js_empresas: {
        disconnect: { id },
      },
    },
  });
};

export const addUsuarioByEmailEmpresa = async (
  id: string,
  email: string
): Promise<sis_profiles> => {
  return prisma.sis_profiles.update({
    where: { ds_email: email },
    data: {
      js_empresas: {
        connect: { id },
      },
    },
  });
};

// Listar perfis de uma empresa
export const getUsuariosEmpresa = async (
  id: string
): Promise<sis_profiles[]> => {
  const hasAdmSistemaAccess = await getAccessModules(
    id,
    ModuleType.ADM_SISTEMA
  );

  let result;
  if (hasAdmSistemaAccess) {
    result = await prisma.sis_profiles.findMany();
  } else {
    result = await prisma.sis_profiles.findMany({
      where: {
        js_empresas: {
          some: { id },
        },
      },
    });
  }

  return result;
};

export const getAcessosEmpresa = async (
  id: string
): Promise<
  {
    id: string;
    ds_name: string | null;
    ds_email: string;
    is_confirmed: boolean;
    ds_fantasia: string | null;
    is_blocked: boolean;
  }[]
> => {
  const acessos = await prisma.sis_empresas.findUnique({
    where: { id },
    select: {
      ds_fantasia: true,
      js_profiles: {
        select: {
          id: true,
          ds_name: true,
          ds_email: true,
          is_confirmed: true,
          js_empresas_bloqueadas: {
            select: { id: true },
          },
        },
      },
      js_escritorio: {
        select: {
          ds_fantasia: true,
          js_profiles: {
            select: {
              id: true,
              ds_name: true,
              ds_email: true,
              is_confirmed: true,
              js_empresas_bloqueadas: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (!acessos) return [];

  // Perfis da empresa principal
  const empresaProfiles = acessos.js_profiles.map((profile) => ({
    id: profile.id,
    ds_name: profile.ds_name,
    ds_email: profile.ds_email,
    is_confirmed: profile.is_confirmed,
    ds_fantasia: acessos.ds_fantasia,
    is_blocked: profile.js_empresas_bloqueadas.some((emp) => emp.id === id),
  }));

  // Perfis do escritório (se houver)
  const escritorioProfiles =
    acessos.js_escritorio?.js_profiles?.map((profile) => ({
      id: profile.id,
      ds_name: profile.ds_name,
      ds_email: profile.ds_email,
      is_confirmed: profile.is_confirmed,
      ds_fantasia: acessos.js_escritorio?.ds_fantasia || null,
      is_blocked: profile.js_empresas_bloqueadas.some((emp) => emp.id === id),
    })) || [];

  // Combinar todas as listas
  const allProfiles = [...empresaProfiles, ...escritorioProfiles];

  // Remover duplicatas baseando-se no e-mail do usuário
  const uniqueProfiles = Array.from(
    new Map(allProfiles.map((profile) => [profile.ds_email, profile])).values()
  );

  return uniqueProfiles;
};

export const getAcessosBloqueados = async (
  id: string
): Promise<
  {
    id: string;
    ds_name: string | null;
    ds_email: string;
    is_confirmed: boolean;
    ds_fantasia: string | null;
  }[]
> => {
  try {
    const empresa = await prisma.sis_empresas.findUnique({
      where: { id },
      select: {
        js_bloqueados: {
          select: {
            id: true,
            ds_name: true,
            ds_email: true,
            is_confirmed: true,
          },
        },
        ds_fantasia: true,
      },
    });

    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    const acessosBloqueadosEmpresa = empresa.js_bloqueados.map((user) => ({
      id: user.id,
      ds_name: user.ds_name,
      ds_email: user.ds_email,
      is_confirmed: user.is_confirmed,
      ds_fantasia: empresa.ds_fantasia,
    }));

    return acessosBloqueadosEmpresa;
  } catch (error) {
    console.error('Erro ao buscar acessos bloqueados:', error);
    return [];
  }
};

export const addSegmentoToEmpresa = async (
  empresaId: string,
  segmentoId: string
): Promise<sis_empresas | null> => {
  return prisma.sis_empresas.update({
    where: { id: empresaId },
    data: {
      js_segmento: {
        connect: { id: segmentoId },
      },
    },
  });
};

export const addRegimeTributarioToEmpresa = async (
  empresaId: string,
  regimeId: string
): Promise<sis_empresas | null> => {
  return prisma.sis_empresas.update({
    where: { id: empresaId },
    data: {
      js_regime_tributario: {
        connect: { id: regimeId },
      },
    },
  });
};

export const getSegmentosEmpresa = async (
  empresaId: string
): Promise<
  {
    id: string;
    ds_descricao: string | null;
  }[]
> => {
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      js_segmento: {
        select: {
          id: true,
          ds_descricao: true,
        },
      },
    },
  });

  return empresa && Array.isArray(empresa.js_segmento)
    ? empresa.js_segmento
    : [];
};
