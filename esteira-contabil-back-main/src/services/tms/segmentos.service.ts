import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { getTmsEmpresa } from './tms-empresa.service';

/**
 * Obtém o próximo código disponível para uma empresa
 */
export const getNextAvailableCode = async (
  empresaId: string
): Promise<string> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    // Buscar todos os códigos existentes (apenas o campo necessário)
    // e calcular o máximo numérico em JS para evitar ordenação lexicográfica
    const segmentos = await prisma.tms_segmentos.findMany({
      where: { id_tms_empresas: tmsEmpresa.id },
      select: { cd_identificador: true },
    });

    let maxNum = 0;
    for (const s of segmentos) {
      const raw = String(s.cd_identificador ?? '').trim();
      if (/^\d+$/.test(raw)) {
        const n = Number.parseInt(raw, 10);
        if (!Number.isNaN(n) && n > maxNum) maxNum = n;
      }
    }

    const nextCode = maxNum + 1;
    return String(nextCode);
  } catch (error: any) {
    console.error('Erro ao obter próximo código disponível:', error);
    throw new Error(`Erro ao obter próximo código: ${error.message}`);
  }
};

/**
 * Busca segmentos com paginação e filtros
 */
export const getSegmentosPaginacao = async (
  empresaId: string,
  page: number = 1,
  pageSize: number = 50,
  orderBy: 'asc' | 'desc' = 'asc',
  orderColumn: string = 'ds_nome',
  search: string = '',
  status?: string | string[]
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    // 1) Construir where clause base
    const whereClause: any = {
      id_tms_empresas: tmsEmpresa.id,
    };

    // 2) Filtro de status (ativo/inativo)
    let statusArray: string[] = [];
    if (status) {
      if (Array.isArray(status)) {
        statusArray = status;
      } else if (typeof status === 'string') {
        statusArray = status
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
    }

    if (statusArray.length) {
      if (statusArray.length === 1) {
        whereClause.is_ativo = statusArray[0] === 'ATIVO';
      }
      // Se múltiplos status, não filtra (retorna todos)
    }

    // 3) Filtro de busca (nome, código identificador)
    if (search) {
      const searchTerm = search.trim();
      whereClause.OR = [
        { ds_nome: { contains: searchTerm, mode: 'insensitive' } },
        { cd_identificador: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // 4) Construir orderBy clause
    let orderByClause: any = {};
    switch (orderColumn) {
      case 'ds_nome':
        orderByClause = { ds_nome: orderBy };
        break;
      case 'cd_identificador':
        orderByClause = { cd_identificador: orderBy };
        break;
      case 'is_ativo':
        orderByClause = { is_ativo: orderBy };
        break;
      case 'dt_created':
        orderByClause = { dt_created: orderBy };
        break;
      default:
        orderByClause = { ds_nome: orderBy };
    }

    // 5) Contar total de registros
    const total = await prisma.tms_segmentos.count({ where: whereClause });
    const totalPages = Math.ceil(total / pageSize);

    // 6) Buscar segmentos paginados
    const segmentos = await prisma.tms_segmentos.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: orderByClause,
    });

    // 7) Buscar todos os IDs (para seleção em massa)
    const allIds = await prisma.tms_segmentos.findMany({
      where: whereClause,
      select: { id: true },
    });

    return {
      total,
      totalPages,
      page,
      pageSize,
      segmentos,
      allIds: allIds.map((s) => s.id),
    };
  } catch (error: any) {
    console.error('Erro ao buscar segmentos paginados:', error);
    throw new Error(`Erro ao buscar segmentos paginados: ${error.message}`);
  }
};

/**
 * Busca todos os segmentos de uma empresa
 */
export const getSegmentos = async (empresaId: string): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const segmentos = await prisma.tms_segmentos.findMany({
      where: { id_tms_empresas: tmsEmpresa.id },
      orderBy: {
        ds_nome: 'asc',
      },
    });

    return segmentos;
  } catch (error: any) {
    console.error('Erro ao buscar segmentos:', error);
    throw new Error(`Erro ao buscar segmentos: ${error.message}`);
  }
};

/**
 * Busca um segmento por ID
 */
export const getSegmentoById = async (
  empresaId: string,
  id: string
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const segmento = await prisma.tms_segmentos.findFirst({
      where: {
        id,
        id_tms_empresas: tmsEmpresa.id,
      },
    });

    if (!segmento) {
      throw new Error('Segmento não encontrado');
    }

    return segmento;
  } catch (error: any) {
    console.error('Erro ao buscar segmento:', error);
    throw new Error(`Erro ao buscar segmento: ${error.message}`);
  }
};

/**
 * Cria um novo segmento
 */
export const createSegmento = async (
  empresaId: string,
  data: {
    cd_identificador?: string;
    ds_nome: string;
    is_ativo?: boolean;
  }
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    // Se não informou cd_identificador, gerar automaticamente
    let cdIdentificador = data.cd_identificador;
    if (!cdIdentificador) {
      cdIdentificador = await getNextAvailableCode(empresaId);
    }

    // Verificar se já existe um segmento com o mesmo código identificador para esta empresa
    const existente = await prisma.tms_segmentos.findFirst({
      where: {
        id_tms_empresas: tmsEmpresa.id,
        cd_identificador: cdIdentificador,
      },
    });

    if (existente) {
      throw new Error(
        `Já existe um segmento com o código identificador: ${cdIdentificador}`
      );
    }

    const segmento = await prisma.tms_segmentos.create({
      data: {
        cd_identificador: cdIdentificador,
        ds_nome: data.ds_nome,
        is_ativo: data.is_ativo ?? true,
        id_tms_empresas: tmsEmpresa.id,
      },
    });
    return segmento;
  } catch (error: any) {
    console.error('Erro ao criar segmento:', error);
    throw new Error(`Erro ao criar segmento: ${error.message}`);
  }
};

/**
 * Atualiza um segmento
 */
export const updateSegmento = async (
  empresaId: string,
  id: string,
  data: {
    cd_identificador?: string;
    ds_nome?: string;
    is_ativo?: boolean;
  }
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    // Verificar se segmento existe para esta empresa
    const segmento = await prisma.tms_segmentos.findFirst({
      where: {
        id,
        id_tms_empresas: tmsEmpresa.id,
      },
    });

    if (!segmento) {
      throw new Error('Segmento não encontrado');
    }

    // Se estiver alterando o código identificador, verificar se já existe
    if (
      data.cd_identificador &&
      data.cd_identificador !== segmento.cd_identificador
    ) {
      const existente = await prisma.tms_segmentos.findFirst({
        where: {
          id_tms_empresas: tmsEmpresa.id,
          cd_identificador: data.cd_identificador,
          NOT: { id },
        },
      });

      if (existente) {
        throw new Error(
          `Já existe outro segmento com o código identificador: ${data.cd_identificador}`
        );
      }
    }

    const segmentoAtualizado = await prisma.tms_segmentos.update({
      where: { id },
      data,
    });
    return segmentoAtualizado;
  } catch (error: any) {
    console.error('Erro ao atualizar segmento:', error);
    throw new Error(`Erro ao atualizar segmento: ${error.message}`);
  }
};

/**
 * Deleta um segmento
 */
export const deleteSegmento = async (
  empresaId: string,
  id: string
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    // Verificar se segmento existe para esta empresa
    const segmento = await prisma.tms_segmentos.findFirst({
      where: {
        id,
        id_tms_empresas: tmsEmpresa.id,
      },
    });

    if (!segmento) {
      throw new Error('Segmento não encontrado');
    }

    const segmentoDeletado = await prisma.tms_segmentos.delete({
      where: { id },
    });
    return segmentoDeletado;
  } catch (error: any) {
    console.error('Erro ao deletar segmento:', error);
    throw new Error(`Erro ao deletar segmento: ${error.message}`);
  }
};

/**
 * Ativa segmentos selecionados
 */
export const ativarSegmentos = async (
  empresaId: string,
  ids: string[]
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const result = await prisma.tms_segmentos.updateMany({
      where: {
        id: { in: ids },
        id_tms_empresas: tmsEmpresa.id,
      },
      data: { is_ativo: true },
    });
    return result;
  } catch (error: any) {
    console.error('Erro ao ativar segmentos:', error);
    throw new Error(`Erro ao ativar segmentos: ${error.message}`);
  }
};

/**
 * Inativa segmentos selecionados
 */
export const inativarSegmentos = async (
  empresaId: string,
  ids: string[]
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const result = await prisma.tms_segmentos.updateMany({
      where: {
        id: { in: ids },
        id_tms_empresas: tmsEmpresa.id,
      },
      data: { is_ativo: false },
    });

    return result;
  } catch (error: any) {
    console.error('Erro ao inativar segmentos:', error);
    throw new Error(`Erro ao inativar segmentos: ${error.message}`);
  }
};
