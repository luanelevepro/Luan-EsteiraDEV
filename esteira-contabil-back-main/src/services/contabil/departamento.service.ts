import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { getConEmpresa } from './con-empresa.service';
import { createConsumoIntegracao } from '../administrativo/consumo-integracao.service';

/**
 * Sincroniza departamentos de uma empresa a partir da API externa
 */
export const sincronizarDepartamentosByEmpresaId = async (
  empresaId: string
): Promise<any> => {
  const empresa = await prisma.sis_empresas.findFirst({
    where: {
      AND: [
        { id: empresaId },
        {
          js_access: {
            some: { js_modules: { hasSome: ['CONTABILIDADE', 'TMS'] } },
          },
        },
      ],
    },
    select: {
      id_externo: true,
      id_escritorio: true,
      id: true,
    },
  });

  if (!empresa) {
    throw new Error('Empresa não encontrada ou sem permissão CONTABILIDADE');
  }

  const idEscritorio = empresa.id_escritorio ?? empresa.id;

  const escritorio = await prisma.sis_empresas.findUnique({
    where: { id: idEscritorio },
    select: { ds_url: true, id: true },
  });

  if (!escritorio?.ds_url) {
    throw new Error('URL do escritório não configurada');
  }

  const patch = '/dados/con-departamentos/empresa/';
  const urlPatch = `${escritorio.ds_url}${patch}${empresa.id_externo}`;

  createConsumoIntegracao({
    empresaId,
    dt_competencia: new Date().toString(),
    ds_consumo: 1,
    ds_tipo_consumo: 'API_DOMINIO',
    integracaoId: 'dominio',
  });
  console.log(`Sincronizando departamentos: ${urlPatch}`);

  try {
    const resposta = await fetch(urlPatch, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });

    if (!resposta.ok) {
      throw new Error(`Erro HTTP: ${resposta.status}`);
    }

    const data: any[] = await resposta.json();

    const resultados = await createDepartamentos(data, empresa.id);
    return resultados;
  } catch (error: any) {
    throw new Error(`Erro ao sincronizar departamentos: ${error.message}`);
  }
};

/**
 * Cria novos departamentos no banco de dados
 */
export const createDepartamentos = async (
  departamentos: any[],
  empresaId: string
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  if (departamentos.length === 0) {
    return { create: { count: 0 }, update: [] };
  }

  try {
    // Buscar departamentos existentes
    const idsExternos = departamentos
      .map((d) => d.id_departamento_externo?.toString())
      .filter(Boolean);
    const departamentosExistentes = await prisma.con_departamentos.findMany({
      where: {
        id_con_empresas: conEmpresa.id,
        id_depart_externo: { in: idsExternos as string[] },
      },
    });

    // Criar mapa de departamentos existentes
    const existentesMap = new Map<
      string,
      (typeof departamentosExistentes)[number]
    >();
    departamentosExistentes.forEach((dep) => {
      if (dep.id_depart_externo) {
        existentesMap.set(dep.id_depart_externo, dep);
      }
    });

    // Separar novos e para atualizar
    const novos: Prisma.con_departamentosUncheckedCreateInput[] = [];
    const atualizar: any[] = [];

    for (const departamento of departamentos) {
      const idExterno = departamento.id_departamento_externo?.toString();

      const data = {
        id_con_empresas: conEmpresa.id,
        id_depart_externo: idExterno,
        ds_nome_depart: departamento.ds_departamento,
        ds_origem_registro: departamento.ds_origem_registro?.toString(),
        is_ativo: true,
      };

      if (existentesMap.has(idExterno)) {
        atualizar.push({
          id: existentesMap.get(idExterno)!.id,
          data,
        });
      } else {
        novos.push(data);
      }
    }

    // Criar novos departamentos
    let resultadoCreate = null;
    if (novos.length > 0) {
      resultadoCreate = await prisma.con_departamentos.createMany({
        data: novos,
        skipDuplicates: true,
      });
    }

    // Atualizar departamentos existentes
    const resultadoUpdate = [];
    if (atualizar.length > 0) {
      const CHUNK_SIZE = 500;
      let i = 0;
      while (i < atualizar.length) {
        const chunk = atualizar.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async ({ id, data }) => {
            const updated = await prisma.con_departamentos.update({
              where: { id },
              data,
            });
            resultadoUpdate.push(updated);
          })
        );
        i += CHUNK_SIZE;
      }
    }

    return { create: resultadoCreate, update: resultadoUpdate };
  } catch (error: any) {
    console.error('Erro ao criar departamentos:', error);
    throw new Error(`Erro ao criar departamentos: ${error.message}`);
  }
};

/**
 * Atualiza departamentos existentes
 */
export const updateDepartamentos = async (
  departamentos: any[],
  empresaId: string
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  if (departamentos.length === 0) {
    return [];
  }

  try {
    const resultados = [];
    const CHUNK_SIZE = 500;
    let i = 0;

    while (i < departamentos.length) {
      const chunk = departamentos.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (departamento) => {
          const idExterno = departamento.id_departamento_externo?.toString();

          const existente = await prisma.con_departamentos.findFirst({
            where: {
              id_con_empresas: conEmpresa.id,
              id_depart_externo: idExterno,
            },
          });

          if (existente) {
            const updated = await prisma.con_departamentos.update({
              where: { id: existente.id },
              data: {
                ds_nome_depart: departamento.ds_departamento,
                ds_origem_registro: departamento.ds_origem_registro?.toString(),
              },
            });
            resultados.push(updated);
          }
        })
      );
      i += CHUNK_SIZE;
    }

    return resultados;
  } catch (error: any) {
    console.error('Erro ao atualizar departamentos:', error);
    throw new Error(`Erro ao atualizar departamentos: ${error.message}`);
  }
};

/**
 * Busca departamentos por empresa
 */
export const getDepartamentosByEmpresaId = async (
  empresaId: string
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  try {
    const departamentos = await prisma.con_departamentos.findMany({
      where: {
        id_con_empresas: conEmpresa.id,
      },
      orderBy: {
        ds_nome_depart: 'asc',
      },
    });

    return departamentos;
  } catch (error: any) {
    console.error('Erro ao buscar departamentos:', error);
    throw new Error(`Erro ao buscar departamentos: ${error.message}`);
  }
};

/**
 * Busca departamentos com paginação e filtros
 */
export const getDepartamentosPaginacao = async (
  empresaId: string,
  status?: string[]
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  try {
    const whereClause: any = { id_con_empresas: conEmpresa.id };

    if (status?.length) {
      // Se tiver apenas um status, usa equals direto
      if (status.length === 1) {
        whereClause.is_ativo = status[0] === 'ATIVO';
      }
      // Se tiver múltiplos status diferentes, não filtra por is_ativo
      // (retorna todos, já que tanto ATIVO quanto INATIVO foram solicitados)
    }

    const departamentos = await prisma.con_departamentos.findMany({
      where: whereClause,
      orderBy: {
        ds_nome_depart: 'asc',
      },
    });
    return { departamentos };
  } catch (error: any) {
    console.error('Erro ao buscar departamentos paginados:', error);
    throw new Error(`Erro ao buscar departamentos paginados: ${error.message}`);
  }
};

/**
 * Ativa departamentos selecionados
 */
export const ativarTodosDepartamentos = async (
  empresaId: string,
  ids: string[]
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  try {
    const result = await prisma.con_departamentos.updateMany({
      where: {
        id_con_empresas: conEmpresa.id,
        id: { in: ids },
      },
      data: { is_ativo: true },
    });

    return result;
  } catch (error: any) {
    console.error('Erro ao ativar departamentos:', error);
    throw new Error(`Erro ao ativar departamentos: ${error.message}`);
  }
};

/**
 * Inativa departamentos selecionados
 */
export const inativarTodosDepartamentos = async (
  empresaId: string,
  ids: string[]
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  try {
    const result = await prisma.con_departamentos.updateMany({
      where: {
        id_con_empresas: conEmpresa.id,
        id: { in: ids },
      },
      data: { is_ativo: false },
    });

    return result;
  } catch (error: any) {
    console.error('Erro ao inativar departamentos:', error);
    throw new Error(`Erro ao inativar departamentos: ${error.message}`);
  }
};

/**
 * Atualiza um departamento específico
 */
export const updateDepartamento = async (
  empresaId: string,
  id: string,
  data: any
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  try {
    const updated = await prisma.con_departamentos.update({
      where: {
        id,
        id_con_empresas: conEmpresa.id,
      },
      data,
    });

    return updated;
  } catch (error: any) {
    console.error('Erro ao atualizar departamento:', error);
    throw new Error(`Erro ao atualizar departamento: ${error.message}`);
  }
};
