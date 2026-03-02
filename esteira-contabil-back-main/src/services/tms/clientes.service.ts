import { prisma } from '../prisma';
import { getFiscalEmpresa } from '../fiscal/fiscal-empresa.service';

const cidadeSelect = {
  id: true,
  ds_city: true,
  js_uf: {
    select: {
      id: true,
      ds_uf: true,
      ds_state: true,
    },
  },
};

/** Mapeia fis_clientes (sis_igbe_city) para shape compatível com front (sis_cidades) */
function mapClienteToResponse(cliente: any) {
  if (!cliente) return cliente;
  return {
    ...cliente,
    sis_cidades: cliente.sis_igbe_city ?? undefined,
  };
}

/**
 * Busca clientes com paginação e filtros (fis_clientes)
 */
export const getClientesPaginacao = async (
  empresaId: string,
  page: number = 1,
  pageSize: number = 50,
  orderBy: 'asc' | 'desc' = 'asc',
  orderColumn: string = 'ds_nome',
  search: string = ''
): Promise<any> => {
  try {
    const fisEmpresa = await getFiscalEmpresa(empresaId);

    const whereClause: any = {
      id_fis_empresas: fisEmpresa.id,
    };

    if (search) {
      const searchTerm = search.trim();
      whereClause.OR = [
        { ds_nome: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    let orderByClause: any = {};
    switch (orderColumn) {
      case 'ds_nome':
        orderByClause = { ds_nome: orderBy };
        break;
      case 'dt_created':
        orderByClause = { dt_created: orderBy };
        break;
      default:
        orderByClause = { ds_nome: orderBy };
    }

    const total = await prisma.fis_clientes.count({ where: whereClause });
    const totalPages = Math.ceil(total / pageSize);

    const clientesRaw = await prisma.fis_clientes.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: orderByClause,
      include: {
        sis_igbe_city: {
          select: cidadeSelect,
        },
      },
    });

    const allIds = await prisma.fis_clientes.findMany({
      where: whereClause,
      select: { id: true },
    });

    const clientes = clientesRaw.map(mapClienteToResponse);

    return {
      total,
      totalPages,
      page,
      pageSize,
      clientes,
      allIds: allIds.map((c) => c.id),
    };
  } catch (error: any) {
    console.error('Erro ao buscar clientes paginados:', error);
    throw new Error(`Erro ao buscar clientes paginados: ${error.message}`);
  }
};

/**
 * Busca todos os clientes de uma empresa (fis_clientes)
 */
export const getClientes = async (empresaId: string): Promise<any> => {
  try {
    const fisEmpresa = await getFiscalEmpresa(empresaId);

    const clientesRaw = await prisma.fis_clientes.findMany({
      where: { id_fis_empresas: fisEmpresa.id },
      orderBy: { ds_nome: 'asc' },
      include: {
        sis_igbe_city: {
          select: cidadeSelect,
        },
      },
    });

    return clientesRaw.map(mapClienteToResponse);
  } catch (error: any) {
    console.error('Erro ao buscar clientes:', error);
    throw new Error(`Erro ao buscar clientes: ${error.message}`);
  }
};

/**
 * Busca um cliente por ID (fis_clientes)
 */
export const getClienteById = async (
  empresaId: string,
  id: string
): Promise<any> => {
  try {
    const fisEmpresa = await getFiscalEmpresa(empresaId);

    const cliente = await prisma.fis_clientes.findFirst({
      where: {
        id,
        id_fis_empresas: fisEmpresa.id,
      },
      include: {
        sis_igbe_city: {
          select: cidadeSelect,
        },
      },
    });

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    return mapClienteToResponse(cliente);
  } catch (error: any) {
    console.error('Erro ao buscar cliente:', error);
    throw new Error(`Erro ao buscar cliente: ${error.message}`);
  }
};

/**
 * Cria um novo cliente (fis_clientes)
 */
export const createCliente = async (
  empresaId: string,
  data: {
    ds_nome: string;
    id_cidade: number;
  }
): Promise<any> => {
  try {
    const fisEmpresa = await getFiscalEmpresa(empresaId);

    if (!data.ds_nome) {
      throw new Error('Nome do cliente é obrigatório');
    }

    if (!data.id_cidade) {
      throw new Error('Cidade é obrigatória');
    }

    const cidade = await prisma.sis_igbe_city.findUnique({
      where: { id: data.id_cidade },
    });

    if (!cidade) {
      throw new Error('Cidade não encontrada');
    }

    const cliente = await prisma.fis_clientes.create({
      data: {
        ds_nome: data.ds_nome,
        id_cidade: data.id_cidade,
        id_fis_empresas: fisEmpresa.id,
      },
      include: {
        sis_igbe_city: {
          select: cidadeSelect,
        },
      },
    });

    return mapClienteToResponse(cliente);
  } catch (error: any) {
    console.error('Erro ao criar cliente:', error);
    throw new Error(`Erro ao criar cliente: ${error.message}`);
  }
};

/**
 * Atualiza um cliente (fis_clientes)
 */
export const updateCliente = async (
  empresaId: string,
  id: string,
  data: {
    ds_nome?: string;
    id_cidade?: number;
  }
): Promise<any> => {
  try {
    const fisEmpresa = await getFiscalEmpresa(empresaId);

    const cliente = await prisma.fis_clientes.findFirst({
      where: {
        id,
        id_fis_empresas: fisEmpresa.id,
      },
    });

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    if (data.id_cidade) {
      const cidade = await prisma.sis_igbe_city.findUnique({
        where: { id: data.id_cidade },
      });

      if (!cidade) {
        throw new Error('Cidade não encontrada');
      }
    }

    const clienteAtualizado = await prisma.fis_clientes.update({
      where: { id },
      data: {
        ...(data.ds_nome && { ds_nome: data.ds_nome }),
        ...(data.id_cidade !== undefined && { id_cidade: data.id_cidade }),
      },
      include: {
        sis_igbe_city: {
          select: cidadeSelect,
        },
      },
    });

    return mapClienteToResponse(clienteAtualizado);
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error);
    throw new Error(`Erro ao atualizar cliente: ${error.message}`);
  }
};

/**
 * Deleta um cliente (fis_clientes)
 */
export const deleteCliente = async (
  empresaId: string,
  id: string
): Promise<void> => {
  try {
    const fisEmpresa = await getFiscalEmpresa(empresaId);

    const cliente = await prisma.fis_clientes.findFirst({
      where: {
        id,
        id_fis_empresas: fisEmpresa.id,
      },
    });

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    await prisma.fis_clientes.delete({
      where: { id },
    });
  } catch (error: any) {
    console.error('Erro ao deletar cliente:', error);
    throw new Error(`Erro ao deletar cliente: ${error.message}`);
  }
};
