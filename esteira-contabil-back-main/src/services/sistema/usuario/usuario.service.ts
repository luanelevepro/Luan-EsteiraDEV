import { sis_empresas, PrismaClient, sis_profiles } from '@prisma/client';
import { prisma } from '../../prisma';
// Obter todos os perfis
export const getUsuarios = async (): Promise<sis_profiles[]> => {
  try {
    const usuarios = await prisma.sis_profiles.findMany();

    if (usuarios.length === 0) {
      throw new Error('Nenhum perfil encontrado.');
    }

    return usuarios;
  } catch (error) {
    throw new Error('Erro ao obter perfis: ' + error.message);
  }
};

// Obter informações de um perfil
export const getUsuario = async (id: string): Promise<sis_profiles> => {
  try {
    const usuario = await prisma.sis_profiles.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new Error('Perfil não encontrado.');
    }

    return usuario;
  } catch (error) {
    throw new Error('Erro ao obter perfil: ' + error.message);
  }
};

// Atualizar informações de um perfil
export const updateUsuario = async (
  id: string,
  data: Promise<sis_profiles>
): Promise<sis_profiles> => {
  try {
    const updatedUsuario = await prisma.sis_profiles.update({
      where: { id },
      data: data,
    });

    return updatedUsuario;
  } catch (error) {
    console.log(error);
    throw new Error('Erro ao atualizar perfil: ' + error.message);
  }
};

// Atualizar informações de um perfil
export const confirmUsuario = async (id: string): Promise<sis_profiles> => {
  try {
    const confirmedUsuario = await prisma.sis_profiles.update({
      where: { id },
      data: {
        is_confirmed: true,
      },
    });

    return confirmedUsuario;
  } catch (error) {
    throw new Error('Erro ao confirmar perfil: ' + error.message);
  }
};

// Listar empresas associadas ao perfil, sem as bloqueadas
export const getEmpresasUsuarioById = async (
  id: string
): Promise<sis_empresas[]> => {
  try {
    const usuario = await prisma.sis_profiles.findUnique({
      where: { id },
      include: {
        js_empresas: true,
        js_access: true,
        js_empresas_bloqueadas: true, // Incluindo as empresas bloqueadas
      },
    });

    if (!usuario) {
      throw new Error('Perfil não encontrado.');
    }

    // Se o usuário for admin, retorna todas as empresas
    if (usuario.is_admin) {
      return prisma.sis_empresas.findMany();
    }

    // Filtra as empresas que o usuário não está bloqueado
    const empresasNaoBloqueadas = usuario.js_empresas.filter(
      (empresa) =>
        !usuario.js_empresas_bloqueadas.some(
          (bloqueada) => bloqueada.id === empresa.id
        )
    );

    // Empresas associadas ao usuário que são escrórios
    const escritoriosIds = empresasNaoBloqueadas
      .filter((empresa) => empresa.is_escritorio)
      .map((empresa) => empresa.id);

    // Buscando as empresas dentro dos escritórios
    const empresasDentroDeEscritorios = await prisma.sis_empresas.findMany({
      where: {
        id_escritorio: {
          in: escritoriosIds,
        },
        // Certificando-se de que essas empresas também não estão bloqueadas
        NOT: {
          js_bloqueados: {
            some: {
              id: usuario.id, // Exclui empresas bloqueadas pelo usuário
            },
          },
        },
      },
    });

    // Junta as empresas não bloqueadas e as empresas dentro de escritórios
    const todasEmpresas = [
      ...empresasNaoBloqueadas,
      ...empresasDentroDeEscritorios,
    ];

    return todasEmpresas;
  } catch (error) {
    throw new Error(
      'Erro ao listar empresas associadas ao perfil: ' + error.message
    );
  }
};
