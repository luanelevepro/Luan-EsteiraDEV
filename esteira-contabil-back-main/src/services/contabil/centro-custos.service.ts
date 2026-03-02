import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { getConEmpresa } from './con-empresa.service';
import { createConsumoIntegracao } from '../administrativo/consumo-integracao.service';
import { sincronizarDepartamentosByEmpresaId } from './departamento.service';

/**
 * Verifica se todos os departamentos referenciados existem, caso contrário sincroniza
 */
async function verificarDepartamentosExistentes(
  centrosCustos: any[],
  empresaId: string
): Promise<void> {
  const conEmpresa = await getConEmpresa(empresaId);

  // Extrair IDs únicos de departamentos
  const idsExternosDepartamentos = [
    ...new Set(
      centrosCustos
        .map((cc) => cc.id_departamento_externo?.toString())
        .filter(Boolean)
    ),
  ];

  if (idsExternosDepartamentos.length === 0) {
    return;
  }

  // Buscar departamentos existentes
  const departamentosExistentes = await prisma.con_departamentos.findMany({
    where: {
      id_con_empresas: conEmpresa.id,
      id_depart_externo: { in: idsExternosDepartamentos as string[] },
    },
    select: {
      id_depart_externo: true,
    },
  });

  const existentesSet = new Set(
    departamentosExistentes.map((d) => d.id_depart_externo)
  );

  // Verificar se há departamentos faltantes
  const departamentosFaltantes = idsExternosDepartamentos.filter(
    (id) => !existentesSet.has(id as string)
  );

  if (departamentosFaltantes.length > 0) {
    await sincronizarDepartamentosByEmpresaId(empresaId);
  }
}

/**
 * Sincroniza centros de custos de uma empresa a partir da API externa
 */
export const sincronizarCentroCustosByEmpresaId = async (
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

  const patch = '/dados/con-centrocustos/empresa/';
  const urlPatch = `${escritorio.ds_url}${patch}${empresa.id_externo}`;

  createConsumoIntegracao({
    empresaId,
    dt_competencia: new Date().toString(),
    ds_consumo: 1,
    ds_tipo_consumo: 'API_DOMINIO',
    integracaoId: 'dominio',
  });

  console.log(`Sincronizando centros de custos: ${urlPatch}`);

  try {
    const resposta = await fetch(urlPatch, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });

    if (!resposta.ok) {
      throw new Error(`Erro HTTP: ${resposta.status}`);
    }

    const data: any[] = await resposta.json();

    // Verificar se todos os departamentos necessários existem
    await verificarDepartamentosExistentes(data, empresa.id);

    const resultados = await createCentroCustos(data, empresa.id);
    return resultados;
  } catch (error: any) {
    throw new Error(`Erro ao sincronizar centros de custos: ${error.message}`);
  }
};

/**
 * Cria novos centros de custos no banco de dados
 */
export const createCentroCustos = async (
  centrosCustos: any[],
  empresaId: string
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  if (centrosCustos.length === 0) {
    return { create: { count: 0 }, update: [] };
  }

  try {
    // Buscar departamentos para mapear id_externo -> id
    const idsExternosDepartamentos = [
      ...new Set(
        centrosCustos
          .map((cc) => cc.id_departamento_externo?.toString())
          .filter(Boolean)
      ),
    ];

    const departamentos = await prisma.con_departamentos.findMany({
      where: {
        id_con_empresas: conEmpresa.id,
        id_depart_externo: { in: idsExternosDepartamentos as string[] },
      },
      select: {
        id: true,
        id_depart_externo: true,
      },
    });

    const departamentosMap = new Map<string, string>();
    departamentos.forEach((dep) => {
      if (dep.id_depart_externo) {
        departamentosMap.set(dep.id_depart_externo, dep.id);
      }
    });

    // Buscar centros de custos existentes
    const centrosCustosExistentes = await prisma.con_centro_custos.findMany({
      where: {
        id_con_empresas: conEmpresa.id,
        id_externo_ccusto: {
          in: centrosCustos
            .map((cc) => cc.id_centro_custo_externo?.toString())
            .filter(Boolean) as string[],
        },
      },
    });

    // Criar mapa de centros de custos existentes
    const existentesMap = new Map<
      string,
      (typeof centrosCustosExistentes)[number]
    >();
    centrosCustosExistentes.forEach((cc) => {
      if (cc.id_externo_ccusto) {
        existentesMap.set(cc.id_externo_ccusto, cc);
      }
    });

    // Separar novos e para atualizar
    const novos: Prisma.con_centro_custosUncheckedCreateInput[] = [];
    const atualizar: any[] = [];

    for (const centroCusto of centrosCustos) {
      const codigoCentro = centroCusto.id_centro_custo_externo?.toString();
      const idDepartamentoExterno =
        centroCusto.id_departamento_externo?.toString();
      const idDepartamento = departamentosMap.get(idDepartamentoExterno);

      if (!idDepartamento) {
        console.warn(
          `Departamento não encontrado para centro de custo ${codigoCentro}`
        );
        continue;
      }

      const data = {
        id_con_empresas: conEmpresa.id,
        id_con_departamentos: idDepartamento,
        id_externo_ccusto: codigoCentro,
        ds_nome_ccusto: centroCusto.ds_centro_custo,
        ds_origem_registro: centroCusto.ds_origem_registro?.toString(),
        dt_cadastro: centroCusto.dt_cadastro_centro_custo
          ? new Date(centroCusto.dt_cadastro_centro_custo)
          : undefined,
        is_ativo: true,
      };

      if (existentesMap.has(codigoCentro)) {
        atualizar.push({
          id: existentesMap.get(codigoCentro)!.id,
          data,
        });
      } else {
        novos.push(data);
      }
    }

    // Criar novos centros de custos
    let resultadoCreate = null;
    if (novos.length > 0) {
      resultadoCreate = await prisma.con_centro_custos.createMany({
        data: novos,
        skipDuplicates: true,
      });
    }

    // Atualizar centros de custos existentes
    const resultadoUpdate = [];
    if (atualizar.length > 0) {
      const CHUNK_SIZE = 500;
      let i = 0;
      while (i < atualizar.length) {
        const chunk = atualizar.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async ({ id, data }) => {
            const updated = await prisma.con_centro_custos.update({
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
    console.error('Erro ao criar centros de custos:', error);
    throw new Error(`Erro ao criar centros de custos: ${error.message}`);
  }
};

/**
 * Atualiza centros de custos existentes
 */
export const updateCentroCustos = async (
  centrosCustos: any[],
  empresaId: string
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  if (centrosCustos.length === 0) {
    return [];
  }

  try {
    // Buscar departamentos para mapear id_externo -> id
    const idsExternosDepartamentos = [
      ...new Set(
        centrosCustos
          .map((cc) => cc.id_departamento_externo?.toString())
          .filter(Boolean)
      ),
    ];

    const departamentos = await prisma.con_departamentos.findMany({
      where: {
        id_con_empresas: conEmpresa.id,
        id_depart_externo: { in: idsExternosDepartamentos as string[] },
      },
      select: {
        id: true,
        id_depart_externo: true,
      },
    });

    const departamentosMap = new Map<string, string>();
    departamentos.forEach((dep) => {
      if (dep.id_depart_externo) {
        departamentosMap.set(dep.id_depart_externo, dep.id);
      }
    });

    const resultados = [];
    const CHUNK_SIZE = 500;
    let i = 0;

    while (i < centrosCustos.length) {
      const chunk = centrosCustos.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (centroCusto) => {
          const codigoCentro = centroCusto.id_centro_custo_externo?.toString();
          const idDepartamentoExterno =
            centroCusto.id_departamento_externo?.toString();
          const idDepartamento = departamentosMap.get(idDepartamentoExterno);

          if (!idDepartamento) {
            console.warn(
              `Departamento não encontrado para centro de custo ${codigoCentro}`
            );
            return;
          }

          const existente = await prisma.con_centro_custos.findFirst({
            where: {
              id_con_empresas: conEmpresa.id,
              id_externo_ccusto: codigoCentro,
            },
          });

          if (existente) {
            const updated = await prisma.con_centro_custos.update({
              where: { id: existente.id },
              data: {
                ds_nome_ccusto: centroCusto.ds_centro_custo,
                ds_origem_registro: centroCusto.ds_origem_registro?.toString(),
                dt_cadastro: centroCusto.dt_cadastro_centro_custo
                  ? new Date(centroCusto.dt_cadastro_centro_custo)
                  : undefined,
                id_con_departamentos: idDepartamento,
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
    console.error('Erro ao atualizar centros de custos:', error);
    throw new Error(`Erro ao atualizar centros de custos: ${error.message}`);
  }
};

/**
 * Busca centros de custos por empresa
 */
export const getCentroCustosByEmpresaId = async (
  empresaId: string
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  try {
    const centrosCustos = await prisma.con_centro_custos.findMany({
      where: {
        id_con_empresas: conEmpresa.id,
      },
      include: {
        js_con_departamentos: {
          select: {
            id: true,
            ds_nome_depart: true,
          },
        },
      },
      orderBy: {
        id_externo_ccusto: 'asc',
      },
    });
    return centrosCustos;
  } catch (error: any) {
    console.error('Erro ao buscar centros de custos:', error);
    throw new Error(`Erro ao buscar centros de custos: ${error.message}`);
  }
};

/**
 * Busca centros de custos com paginação e filtros
 */
export const getCentroCustosPaginacao = async (
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

    const centrosCustos = await prisma.con_centro_custos.findMany({
      where: whereClause,
      include: {
        js_con_departamentos: {
          select: {
            id: true,
            ds_nome_depart: true,
          },
        },
      },
      orderBy: {
        id_externo_ccusto: 'asc',
      },
    });

    return { centrosCustos };
  } catch (error: any) {
    console.error('Erro ao buscar centros de custos paginados:', error);
    throw new Error(
      `Erro ao buscar centros de custos paginados: ${error.message}`
    );
  }
};

/**
 * Ativa centros de custos selecionados
 */
export const ativarTodosCentroCustos = async (
  empresaId: string,
  ids: string[]
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  try {
    const result = await prisma.con_centro_custos.updateMany({
      where: {
        id_con_empresas: conEmpresa.id,
        id: { in: ids },
      },
      data: { is_ativo: true },
    });

    return result;
  } catch (error: any) {
    console.error('Erro ao ativar centros de custos:', error);
    throw new Error(`Erro ao ativar centros de custos: ${error.message}`);
  }
};

/**
 * Inativa centros de custos selecionados
 */
export const inativarTodosCentroCustos = async (
  empresaId: string,
  ids: string[]
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  try {
    const result = await prisma.con_centro_custos.updateMany({
      where: {
        id_con_empresas: conEmpresa.id,
        id: { in: ids },
      },
      data: { is_ativo: false },
    });

    return result;
  } catch (error: any) {
    console.error('Erro ao inativar centros de custos:', error);
    throw new Error(`Erro ao inativar centros de custos: ${error.message}`);
  }
};

/**
 * Atualiza um centro de custos específico
 */
export const updateCentroCusto = async (
  empresaId: string,
  id: string,
  data: any
): Promise<any> => {
  const conEmpresa = await getConEmpresa(empresaId);

  try {
    const updated = await prisma.con_centro_custos.update({
      where: {
        id,
        id_con_empresas: conEmpresa.id,
      },
      data,
    });

    return updated;
  } catch (error: any) {
    console.error('Erro ao atualizar centro de custos:', error);
    throw new Error(`Erro ao atualizar centro de custos: ${error.message}`);
  }
};
