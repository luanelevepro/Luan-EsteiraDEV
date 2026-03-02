import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { getTmsEmpresa } from './tms-empresa.service';
import { createConsumoIntegracao } from '../administrativo/consumo-integracao.service';
import { sincronizarCentroCustosByEmpresaId } from '../contabil/centro-custos.service';
import { getConEmpresa } from '../contabil/con-empresa.service';

export const getVeiculosIsInUse = async ({
  veiculoId,
}: {
  veiculoId: string;
}) => {
  try {
    // Conta viagens que ainda não estão concluídas e que possuem pelo menos
    // uma carga atribuída ao veículo com status não-entregue (AGENDADA, PENDENTE, EM_COLETA, EM_TRANSITO).
    const usoCount = await prisma.tms_viagens.count({
      where: {
        ds_status: { not: 'CONCLUIDA' },
        js_viagens_cargas: {
          some: {
            tms_cargas: {
              tms_motoristas_veiculos: { id_tms_veiculos: veiculoId },
              ds_status: { in: ['AGENDADA', 'PENDENTE', 'EM_COLETA', 'EM_TRANSITO'] },
            },
          },
        },
      },
    });
    if (usoCount > 0) {
      return true;
    } else return false;
  } catch (err) {
    throw new Error(`Erro ao verificar uso do veículo: ${err}`);
  }
};

/**
 * Retorna um Set com os ids de veículos que estão sendo usados
 * por viagens não concluídas e com cargas em status AGENDADA/PENDENTE/EM_COLETA/EM_TRANSITO.
 * Faz isso em uma única query para evitar esgotar a pool de conexões.
 */
export const getVeiculosInUseForIds = async (
  veiculoIds: string[]
): Promise<Set<string>> => {
  if (!veiculoIds || veiculoIds.length === 0) return new Set<string>();

  try {
    // Monta lista parametrizada para IN (...) usando Prisma.sql
    const params = veiculoIds.map((id) => Prisma.sql`${id}`);

    const rows: Array<{ veiculo_id: string }> = await prisma.$queryRaw(
      Prisma.sql`
        SELECT DISTINCT mv.id_tms_veiculos AS veiculo_id
        FROM tms_viagens v
        JOIN tms_viagens_cargas vc ON vc.id_viagem = v.id
        JOIN tms_cargas c ON c.id = vc.id_carga
        JOIN tms_motoristas_veiculos mv ON mv.id = c.id_motorista_veiculo
        WHERE v.ds_status != 'CONCLUIDA'
          AND c.ds_status IN ('AGENDADA', 'PENDENTE', 'EM_COLETA', 'EM_TRANSITO')
          AND mv.id_tms_veiculos IN (${Prisma.join(params)})
      `
    );

    const set = new Set<string>();
    for (const r of rows) {
      if (r && (r as any).veiculo_id) set.add((r as any).veiculo_id);
    }

    return set;
  } catch (error: any) {
    console.error('Erro ao calcular veículos em uso (batch):', error);
    // Em caso de erro, retornar Set vazio para não bloquear a listagem
    return new Set<string>();
  }
};

/**
 * Obtém todas as empresas relacionadas (matriz + filiais)
 * Se for matriz, retorna a matriz + todas as filiais
 * Se for filial, retorna a matriz + todas as filiais
 */
async function getEmpresasRelacionadas(empresaId: string): Promise<string[]> {
  try {
    // 1) Buscar a empresa atual
    const empresa = await prisma.sis_empresas.findUnique({
      where: { id: empresaId },
      select: { id: true, ds_documento: true },
    });

    if (!empresa || !empresa.ds_documento) {
      return [empresaId]; // Se não tiver CNPJ, retorna só ela mesma
    }

    // 2) Limpar CNPJ e extrair raiz (primeiros 8 dígitos)
    const cleanCnpj = String(empresa.ds_documento).replace(/\D/g, '');
    if (cleanCnpj.length < 8) {
      return [empresaId]; // CNPJ inválido
    }

    const raizCnpj = cleanCnpj.substring(0, 8);

    // 3) Buscar todas as empresas no banco com a mesma raiz
    // Isso retorna matriz + todas as filiais
    const empresasRelacionadas = await prisma.sis_empresas.findMany({
      where: {
        ds_documento: {
          contains: raizCnpj, // Busca empresas que começam com a raiz
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    const ids = empresasRelacionadas.map((e) => e.id);
    return ids.length > 0 ? ids : [empresaId];
  } catch (error) {
    console.error('Erro ao buscar empresas relacionadas:', error);
    return [empresaId]; // Fallback: retorna só a empresa atual
  }
}

/**
 * Obtém todas as tmsEmpresas relacionadas
 */
async function getTmsEmpresasRelacionadas(
  empresaId: string
): Promise<string[]> {
  const empresasIds = await getEmpresasRelacionadas(empresaId);

  // Buscar tmsEmpresas relacionadas
  const tmsEmpresas = await prisma.tms_empresas.findMany({
    where: {
      id_sis_empresas: { in: empresasIds },
    },
    select: { id: true },
  });

  return tmsEmpresas.map((te) => te.id);
}

/**
 * Extrai placa de veículo de uma string
 * Formatos aceitos:
 * - Padrão antigo: ABC1234, ABC-1234, [ABC1234], [ABC-1234]
 * - Padrão Mercosul: ABC1D23, ABC-1D23, [ABC1D23], [ABC-1D23]
 */
function extrairPlaca(texto: string | null): string | null {
  if (!texto) return null;

  // Regex para placas brasileiras (padrão antigo e Mercosul)
  // Padrão antigo: 3 letras + 4 números (LLLNNNN)
  // Padrão Mercosul: 3 letras + 1 número + 1 letra + 2 números (LLLNLNN)
  const regexPlaca = /\[?([A-Z]{3})-?(\d{1}[A-Z0-9]{1}\d{2}|\d{4})\]?/gi;
  const match = regexPlaca.exec(texto);

  if (match) {
    // Retorna a placa sem hífen e sem colchetes
    return `${match[1]}${match[2]}`.toUpperCase();
  }

  return null;
}

/**
 * Formata placa para padrão visual
 * Padrão antigo: ABC-1234
 * Padrão Mercosul: ABC-1D23
 */
function formatarPlaca(placa: string): string {
  if (!placa || placa.length !== 7) return placa;

  // Detecta se é Mercosul (posição 4 é letra)
  const isMercosul = /[A-Z]/.test(placa.charAt(4));

  if (isMercosul) {
    // ABC1D23 -> ABC-1D23
    return `${placa.substring(0, 3)}-${placa.substring(3, 7)}`;
  } else {
    // ABC1234 -> ABC-1234
    return `${placa.substring(0, 3)}-${placa.substring(3, 7)}`;
  }
}

/**
 * Sincroniza veículos a partir dos bens patrimoniais da API externa
 */
export const sincronizarVeiculosByEmpresaId = async (
  empresaId: string
): Promise<any> => {
  const empresa = await prisma.sis_empresas.findFirst({
    where: {
      AND: [
        { id: empresaId },
        { js_access: { some: { js_modules: { has: 'TMS' } } } },
      ],
    },
    select: {
      id_externo: true,
      id_escritorio: true,
      id: true,
    },
  });

  if (!empresa) {
    throw new Error('Empresa não encontrada ou sem permissão TMS');
  }

  const idEscritorio = empresa.id_escritorio ?? empresa.id;

  const escritorio = await prisma.sis_empresas.findUnique({
    where: { id: idEscritorio },
    select: { ds_url: true, id: true },
  });

  if (!escritorio?.ds_url) {
    throw new Error('URL do escritório não configurada');
  }

  const patch = '/dados/patrimonio/bens/empresa/';
  const urlPatch = `${escritorio.ds_url}${patch}${empresa.id_externo}`;

  createConsumoIntegracao({
    empresaId,
    dt_competencia: new Date().toString(),
    ds_consumo: 1,
    ds_tipo_consumo: 'API_DOMINIO',
    integracaoId: 'dominio',
  });

  console.log(`Sincronizando veículos (patrimônio): ${urlPatch}`);

  try {
    const resposta = await fetch(urlPatch, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });

    if (!resposta.ok) {
      throw new Error(`Erro HTTP: ${resposta.status}`);
    }

    const data: any[] = await resposta.json();

    // Filtrar apenas bens que possuem placa
    const veiculosComPlaca = data
      .map((bem) => {
        const placaNome = extrairPlaca(bem.ds_nome);
        const placaHistorico = extrairPlaca(bem.ds_historico);
        const placa = placaNome || placaHistorico;

        if (!placa) return null;

        return {
          ...bem,
          placa_extraida: placa,
        };
      })
      .filter(Boolean);

    console.log(
      `Encontrados ${veiculosComPlaca.length} veículos com placa de ${data.length} bens`
    );

    const resultados = await createVeiculos(veiculosComPlaca, empresa.id);
    return resultados;
  } catch (error: any) {
    throw new Error(`Erro ao sincronizar veículos: ${error.message}`);
  }
};

/**
 * Cria ou atualiza veículos no banco de dados
 */
export const createVeiculos = async (
  veiculos: any[],
  empresaId: string
): Promise<any> => {
  const tmsEmpresa = await getTmsEmpresa(empresaId);

  if (veiculos.length === 0) {
    return { create: { count: 0 }, update: [] };
  }

  try {
    // Buscar veículos existentes (select mínimo para não depender de id_modelo)
    const placas = veiculos.map((v) => v.placa_extraida).filter(Boolean);
    const veiculosExistentes = await prisma.tms_veiculos.findMany({
      where: {
        ds_placa: { in: placas as string[] },
        id_tms_empresas: tmsEmpresa.id,
      },
      select: { id: true, ds_placa: true },
    });

    // Criar mapa de veículos existentes (placa -> { id, ds_placa })
    const existentesMap = new Map<string, { id: string; ds_placa: string }>();
    veiculosExistentes.forEach((veiculo) => {
      if (veiculo.ds_placa) {
        existentesMap.set(veiculo.ds_placa, veiculo);
      }
    });

    // Buscar centros de custos para mapeamento (filtrado por empresa)
    const idsCentrosCustos = [
      ...new Set(
        veiculos
          .map((v) => v.id_centro_custo_externo?.toString())
          .filter(Boolean)
      ),
    ];

    // Buscar con_empresas para obter o id correto
    const conEmpresa = await getConEmpresa(empresaId);

    if (!conEmpresa) {
      throw new Error('Empresa contábil não encontrada');
    }

    const centrosCustos = await prisma.con_centro_custos.findMany({
      where: {
        id_externo_ccusto: { in: idsCentrosCustos as string[] },
        id_con_empresas: conEmpresa.id,
      },
      select: {
        id: true,
        id_externo_ccusto: true,
      },
    });

    const centrosCustosMap = new Map<string, string>();
    centrosCustos.forEach((cc) => {
      if (cc.id_externo_ccusto) {
        centrosCustosMap.set(cc.id_externo_ccusto, cc.id);
      }
    });

    // Verificar se há centros de custos faltantes e sincronizar se necessário
    const centrosCustosFaltantes = idsCentrosCustos.filter(
      (id) => !centrosCustosMap.has(id)
    );

    if (centrosCustosFaltantes.length > 0) {
      console.log(
        `Sincronizando centros de custos faltantes: ${centrosCustosFaltantes.join(', ')}`
      );
      await sincronizarCentroCustosByEmpresaId(empresaId);

      // Re-buscar centros de custos após sincronização
      const centrosCustosAtualizados = await prisma.con_centro_custos.findMany({
        where: {
          id_externo_ccusto: { in: idsCentrosCustos as string[] },
          id_con_empresas: conEmpresa.id,
        },
        select: {
          id: true,
          id_externo_ccusto: true,
        },
      });

      // Atualizar o mapa
      centrosCustosAtualizados.forEach((cc) => {
        if (cc.id_externo_ccusto) {
          centrosCustosMap.set(cc.id_externo_ccusto, cc.id);
        }
      });
    }

    // Separar novos e para atualizar
    const novos: Prisma.tms_veiculosUncheckedCreateInput[] = [];
    const atualizar: any[] = [];

    for (const veiculo of veiculos) {
      const placa = veiculo.placa_extraida;
      const idCentroCustoExterno = veiculo.id_centro_custo_externo?.toString();
      const idCentroCusto = idCentroCustoExterno
        ? centrosCustosMap.get(idCentroCustoExterno)
        : undefined;

      const data = {
        id_tms_empresas: tmsEmpresa.id,
        ds_placa: placa,
        ds_nome: veiculo.ds_nome || '',
        id_externo: veiculo.id_bem_externo?.toString(),
        cd_identificador: veiculo.cd_identificador,
        dt_aquisicao: veiculo.dt_aquisicao
          ? new Date(veiculo.dt_aquisicao)
          : undefined,
        dt_baixa: veiculo.dt_baixa ? new Date(veiculo.dt_baixa) : undefined,
        dt_cadastro: veiculo.dt_cadastro
          ? new Date(veiculo.dt_cadastro)
          : undefined,
        vl_aquisicao: veiculo.vl_aquisicao,
        is_ativo: veiculo.dt_baixa ? false : true,
        id_centro_custos: idCentroCusto,
      };

      if (existentesMap.has(placa)) {
        atualizar.push({
          id: existentesMap.get(placa)!.id,
          data,
        });
      } else {
        novos.push(data);
      }
    }

    // Criar novos veículos
    let resultadoCreate = null;
    if (novos.length > 0) {
      resultadoCreate = await prisma.tms_veiculos.createMany({
        data: novos,
        skipDuplicates: true,
      });
    }

    // Atualizar veículos existentes
    const resultadoUpdate = [];
    if (atualizar.length > 0) {
      const CHUNK_SIZE = 500;
      let i = 0;
      while (i < atualizar.length) {
        const chunk = atualizar.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async ({ id, data }) => {
            const updated = await prisma.tms_veiculos.update({
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
    console.error('Erro ao criar veículos:', error);
    throw new Error(`Erro ao criar veículos: ${error.message}`);
  }
};

/**
 * Busca veículos com paginação e filtros complexos
 */
export const getVeiculosPaginacao = async (
  empresaId: string,
  page: number = 1,
  pageSize: number = 50,
  orderBy: 'asc' | 'desc' = 'asc',
  orderColumn: string = 'ds_placa',
  search: string = '',
  status?: string | string[],
  tipoVeiculo?: string | string[]
): Promise<any> => {
  const tmsEmpresa = await getTmsEmpresa(empresaId);

  // Buscar tmsEmpresas relacionadas (matriz + filiais)
  const tmsEmpresasIds = await getTmsEmpresasRelacionadas(empresaId);

  try {
    // 1) Construir where clause base
    const whereClause: any = {
      id_tms_empresas: { in: tmsEmpresasIds },
    };

    // 2) Filtro de status
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

    // 2.1) Filtro de tipo de veículo (TRACIONADOR/CARROCERIA/RIGIDO)
    // Normalizar tipoVeiculo para sempre ser array (compatível com string separada por vírgula)
    let tipoVeiculoArray: string[] = [];
    if (tipoVeiculo) {
      if (Array.isArray(tipoVeiculo)) {
        tipoVeiculoArray = tipoVeiculo;
      } else if (typeof tipoVeiculo === 'string') {
        // Separa por vírgula e limpa espaços
        tipoVeiculoArray = tipoVeiculo
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
    }

    if (tipoVeiculoArray.length) {
      const tipoConditions: any[] = [];

      if (tipoVeiculoArray.includes('TRACIONADOR')) {
        tipoConditions.push({
          OR: [{ ds_tipo_unidade: 'TRACIONADOR' }],
        });
      }

      if (tipoVeiculoArray.includes('RIGIDO')) {
        tipoConditions.push({
          OR: [{ ds_tipo_unidade: 'RIGIDO' }],
        });
      }

      if (tipoVeiculoArray.includes('CARROCERIA')) {
        tipoConditions.push({
          OR: [{ ds_tipo_unidade: 'CARROCERIA' }],
        });
      }

      if (tipoConditions.length === 1) {
        Object.assign(whereClause, tipoConditions[0]);
      } else if (tipoConditions.length > 1) {
        whereClause.OR = tipoConditions;
      }
    }

    // 3) Filtro de busca (placa, nome, código, centro de custo)
    if (search) {
      const searchTerm = search.trim();
      const searchConditions = [
        { ds_placa: { contains: searchTerm, mode: 'insensitive' } },
        { ds_nome: { contains: searchTerm, mode: 'insensitive' } },
        { cd_identificador: { contains: searchTerm, mode: 'insensitive' } },
        { id_externo: { contains: searchTerm, mode: 'insensitive' } },
        {
          js_con_centro_custos: {
            ds_nome_ccusto: { contains: searchTerm, mode: 'insensitive' },
          },
        },
      ];

      // Se já existe OR (do filtro de tipo), combinar com AND
      if (whereClause.OR) {
        whereClause.AND = [{ OR: whereClause.OR }, { OR: searchConditions }];
        delete whereClause.OR;
      } else {
        whereClause.OR = searchConditions;
      }
    }

    // 4) Determinar se precisa raw query (para ordenação numérica)
    let necessitaRaw = false;
    switch (orderColumn) {
      case 'dt_aquisicao':
      case 'dt_baixa':
      case 'vl_aquisicao':
        necessitaRaw = true;
        break;
    }

    // 5) Contar total de registros
    const total = await prisma.tms_veiculos.count({ where: whereClause });
    const totalPages = Math.ceil(total / pageSize);

    let veiculos: any[] = [];

    if (necessitaRaw) {
      // 6) Raw SQL query para ordenação numérica
      const offset = (page - 1) * pageSize;
      const direction = orderBy.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Montar filtro de busca em SQL
      const searchConditions: any[] = [];
      if (search) {
        const searchTerm = `%${search}%`;
        searchConditions.push(
          Prisma.sql`v.ds_placa ILIKE ${searchTerm}`,
          Prisma.sql`v.ds_nome ILIKE ${searchTerm}`,
          Prisma.sql`v.cd_identificador ILIKE ${searchTerm}`,
          Prisma.sql`v.id_externo ILIKE ${searchTerm}`,
          Prisma.sql`cc.ds_nome_ccusto ILIKE ${searchTerm}`
        );
      }

      const searchFilterSql =
        searchConditions.length > 0
          ? Prisma.sql`AND (${Prisma.join(searchConditions, ' OR ')})`
          : Prisma.empty;

      // Montar filtro de tipo
      let tipoFilterSql = Prisma.empty;
      if (tipoVeiculoArray.length > 0) {
        const tipoClauses: Prisma.Sql[] = [];

        if (tipoVeiculoArray.includes('TRACIONADOR')) {
          tipoClauses.push(
            Prisma.sql`v.ds_tipo_unidade = 'TRACIONADOR'`,
            Prisma.sql`v.ds_tipo_unidade = 'RIGIDO'`,
            Prisma.sql`v.is_tracionador = true`
          );
        }
        if (tipoVeiculoArray.includes('RIGIDO')) {
          tipoClauses.push(
            Prisma.sql`v.ds_tipo_unidade = 'RIGIDO'`,
            Prisma.sql`v.is_tracionador = true`
          );
        }
        if (tipoVeiculoArray.includes('CARROCERIA')) {
          tipoClauses.push(Prisma.sql`v.ds_tipo_unidade = 'CARROCERIA'`);
        }

        if (tipoClauses.length > 0) {
          tipoFilterSql = Prisma.sql`AND (${Prisma.join(tipoClauses, ' OR ')})`;
        }
      }

      // Montar filtro de status
      let statusFilterSql = Prisma.empty;
      if (statusArray.length === 1) {
        const isActive = statusArray[0] === 'ATIVO';
        statusFilterSql = Prisma.sql`AND v.is_ativo = ${isActive}`;
      }

      // Construir ORDER BY dinamicamente
      let orderByClause: any;
      switch (orderColumn) {
        case 'dt_aquisicao':
          orderByClause = Prisma.sql`v.dt_aquisicao`;
          break;
        case 'dt_baixa':
          orderByClause = Prisma.sql`v.dt_baixa`;
          break;
        case 'vl_aquisicao':
          orderByClause = Prisma.sql`CAST(v.vl_aquisicao AS NUMERIC)`;
          break;
        default:
          orderByClause = Prisma.sql`v.ds_placa`;
      }

      // Raw query
      const raw: any[] = await prisma.$queryRaw`
        SELECT
          v.id,
          v.dt_created,
          v.dt_updated,
          v.ds_placa,
          v.ds_nome,
          v.id_externo,
          v.cd_identificador,
          v.dt_aquisicao,
          v.dt_baixa,
          v.vl_aquisicao,
          v.is_ativo,
          v.ds_tipo_unidade,
          v.ds_classificacao_tracionador,
          v.ds_classificacao_carroceria,
          v.ds_classificacao_rigido,
          v.ds_tipo_carroceria_carga,
          v.ds_marca,
          v.ds_modelo,
          v.vl_ano_modelo,
          v.vl_ano_fabricacao,
          v.vl_eixos,
          v.id_tms_empresas,
          v.id_centro_custos,
          cc.id as cc_id,
          cc.ds_nome_ccusto,
          cc.id_externo_ccusto
        FROM tms_veiculos v
        LEFT JOIN con_centro_custos cc ON v.id_centro_custos = cc.id
        WHERE v.id_tms_empresas = ANY(${tmsEmpresasIds})
          ${statusFilterSql}
          ${tipoFilterSql}
          ${searchFilterSql}
        ORDER BY ${orderByClause} ${Prisma.raw(direction)}
        LIMIT ${pageSize}
        OFFSET ${offset}
      `;

      // Mapear resultado para o formato esperado
      veiculos = raw.map((r: any) => ({
        id: r.id,
        dt_created: r.dt_created,
        dt_updated: r.dt_updated,
        ds_placa: r.ds_placa,
        ds_nome: r.ds_nome,
        id_externo: r.id_externo,
        cd_identificador: r.cd_identificador,
        dt_aquisicao: r.dt_aquisicao,
        dt_baixa: r.dt_baixa,
        vl_aquisicao: r.vl_aquisicao,
        is_ativo: r.is_ativo,
        ds_tipo_unidade: r.ds_tipo_unidade,
        ds_classificacao_tracionador: r.ds_classificacao_tracionador,
        ds_classificacao_carroceria: r.ds_classificacao_carroceria,
        ds_classificacao_rigido: r.ds_classificacao_rigido,
        ds_tipo_carroceria_carga: r.ds_tipo_carroceria_carga,
        ds_marca: r.ds_marca,
        ds_modelo: r.ds_modelo,
        vl_ano_modelo: r.vl_ano_modelo,
        vl_ano_fabricacao: r.vl_ano_fabricacao,
        vl_eixos: r.vl_eixos,
        id_tms_empresas: r.id_tms_empresas,
        id_centro_custos: r.id_centro_custos,
        js_con_centro_custos: r.cc_id
          ? {
              id: r.cc_id,
              ds_nome_ccusto: r.ds_nome_ccusto,
              id_externo_ccusto: r.id_externo_ccusto,
            }
          : null,
      }));
    } else {
      // 7) Prisma.findMany normal para ordenações de texto
      let orderByClause: any = {};
      switch (orderColumn) {
        case 'ds_placa':
          orderByClause = { ds_placa: orderBy };
          break;
        case 'ds_nome':
          orderByClause = { ds_nome: orderBy };
          break;
        case 'is_ativo':
          orderByClause = { is_ativo: orderBy };
          break;
        case 'ds_tipo_unidade':
          orderByClause = { ds_tipo_unidade: orderBy };
          break;
        case 'centro_custo':
          orderByClause = {
            js_con_centro_custos: { ds_nome_ccusto: orderBy },
          };
          break;
        default:
          orderByClause = { ds_placa: orderBy };
      }

      veiculos = await prisma.tms_veiculos.findMany({
        where: whereClause,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: orderByClause,
        select: {
          id: true,
          dt_created: true,
          dt_updated: true,
          ds_placa: true,
          ds_nome: true,
          id_externo: true,
          cd_identificador: true,
          dt_aquisicao: true,
          dt_baixa: true,
          vl_aquisicao: true,
          is_ativo: true,
          ds_tipo_unidade: true,
          ds_classificacao_tracionador: true,
          ds_classificacao_carroceria: true,
          ds_classificacao_rigido: true,
          ds_tipo_carroceria_carga: true,
          ds_marca: true,
          ds_modelo: true,
          vl_ano_modelo: true,
          vl_ano_fabricacao: true,
          vl_eixos: true,
          id_tms_empresas: true,
          id_centro_custos: true,
          js_con_centro_custos: {
            select: {
              id: true,
              ds_nome_ccusto: true,
              id_externo_ccusto: true,
            },
          },
        },
      });
    }

    // 8) Buscar todos os IDs (para seleção em massa)
    const allIds = await prisma.tms_veiculos.findMany({
      where: whereClause,
      select: { id: true },
    });

    return {
      total,
      totalPages,
      page,
      pageSize,
      veiculos,
      allIds: allIds.map((v) => v.id),
    };
  } catch (error: any) {
    console.error('Erro ao buscar veículos paginados:', error);
    throw new Error(`Erro ao buscar veículos paginados: ${error.message}`);
  }
};

/**
 * Busca todos os veículos (incluindo de matriz/filiais relacionadas)
 */
export const getVeiculos = async (
  empresaId: string,
  is_ativo?: boolean | undefined
): Promise<any> => {
  try {
    // Buscar tmsEmpresas relacionadas (matriz + filiais)
    const tmsEmpresasIds = await getTmsEmpresasRelacionadas(empresaId);

    // Select explícito sem id_modelo/js_modelo para compatibilidade com banco onde a coluna ainda não existe
    const veiculos = await prisma.tms_veiculos.findMany({
      where: {
        id_tms_empresas: { in: tmsEmpresasIds },
        ...(is_ativo !== undefined ? { is_ativo } : {}),
      },
      select: {
        id: true,
        dt_created: true,
        dt_updated: true,
        ds_placa: true,
        ds_nome: true,
        id_externo: true,
        cd_identificador: true,
        dt_aquisicao: true,
        dt_baixa: true,
        dt_cadastro: true,
        vl_aquisicao: true,
        is_ativo: true,
        ds_marca: true,
        ds_modelo: true,
        vl_ano_fabricacao: true,
        vl_ano_modelo: true,
        vl_eixos: true,
        ds_ano_fabricacao: true,
        ds_tipo_unidade: true,
        ds_tipo_carroceria_carga: true,
        ds_classificacao_tracionador: true,
        ds_classificacao_carroceria: true,
        ds_classificacao_rigido: true,
        id_tms_empresas: true,
        id_centro_custos: true,
        js_con_centro_custos: {
          select: {
            id: true,
            ds_nome_ccusto: true,
          },
        },
        tms_empresas: {
          select: {
            id: true,
            sis_empresas: {
              select: {
                id: true,
                ds_nome: true,
              },
            },
          },
        },
        tms_motoristas_veiculos: {
          select: {
            id: true,
            is_principal: true,
            is_ativo: true,
            tms_motoristas: {
              select: {
                id: true,
                rh_funcionarios: {
                  select: {
                    id: true,
                    ds_nome: true,
                    ds_documento: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        ds_placa: 'asc',
      },
    });

    // Adicionar informação de uso para cada veículo.
    // Em vez de executar uma query por veículo (o que pode esgotar a pool),
    // buscamos em lote os veículos em uso e marcamos localmente.
    const vehicleIds = veiculos.map((v) => v.id).filter(Boolean);
    const inUseSet = await getVeiculosInUseForIds(vehicleIds);

    const veiculosComUso = veiculos.map((veiculo) => ({
      ...veiculo,
      is_in_use: inUseSet.has(veiculo.id),
    }));

    return veiculosComUso;
  } catch (error: any) {
    console.error('Erro ao buscar veículos:', error);
    throw new Error(`Erro ao buscar veículos: ${error.message}`);
  }
};

/**
 * Cria um único veículo (usado pelo controller)
 */
export const createVeiculo = async (
  empresaId: string,
  data: Prisma.tms_veiculosUncheckedCreateInput
): Promise<any> => {
  const tmsEmpresa = await getTmsEmpresa(empresaId);
  try {
    const created = await prisma.tms_veiculos.create({
      data: {
        ...data,
        id_tms_empresas: tmsEmpresa.id,
      },
    });
    return created;
  } catch (error: any) {
    console.error('Erro ao criar veículo:', error);
    throw new Error(`Erro ao criar veículo: ${error.message}`);
  }
};

/**
 * Atualiza um veículo específico
 */
export const updateVeiculo = async (
  empresaId: string,
  id: string,
  data: any
): Promise<any> => {
  const tmsEmpresa = await getTmsEmpresa(empresaId);

  try {
    const updated = await prisma.tms_veiculos.update({
      where: { id },
      data,
    });

    return updated;
  } catch (error: any) {
    console.error('Erro ao atualizar veículo:', error);
    throw new Error(`Erro ao atualizar veículo: ${error.message}`);
  }
};

/**
 * Ativa veículos selecionados
 */
export const ativarTodosVeiculos = async (
  empresaId: string,
  ids: string[]
): Promise<any> => {
  const tmsEmpresa = await getTmsEmpresa(empresaId);

  try {
    const result = await prisma.tms_veiculos.updateMany({
      where: {
        id_tms_empresas: tmsEmpresa.id,
        id: { in: ids },
      },
      data: { is_ativo: true },
    });

    return result;
  } catch (error: any) {
    console.error('Erro ao ativar veículos:', error);
    throw new Error(`Erro ao ativar veículos: ${error.message}`);
  }
};

/**
 * Inativa veículos selecionados
 */
export const inativarTodosVeiculos = async (
  empresaId: string,
  ids: string[]
): Promise<any> => {
  const tmsEmpresa = await getTmsEmpresa(empresaId);

  try {
    const result = await prisma.tms_veiculos.updateMany({
      where: {
        id_tms_empresas: tmsEmpresa.id,
        id: { in: ids },
      },
      data: { is_ativo: false },
    });

    return result;
  } catch (error: any) {
    console.error('Erro ao inativar veículos:', error);
    throw new Error(`Erro ao inativar veículos: ${error.message}`);
  }
};

/**
 * Define o tipo de unidade (TRACIONADOR | CARROCERIA | RIGIDO) e limpa classificações incompatíveis.
 */
export const setTipoUnidade = async (
  empresaId: string,
  ids: string[],
  tipo: 'TRACIONADOR' | 'CARROCERIA' | 'RIGIDO'
): Promise<any> => {
  const tmsEmpresa = await getTmsEmpresa(empresaId);

  const clearFields: Prisma.tms_veiculosUpdateManyMutationInput = {
    ds_tipo_unidade: tipo,
    ds_classificacao_tracionador: tipo === 'TRACIONADOR' ? undefined : null,
    ds_classificacao_carroceria: tipo === 'CARROCERIA' ? undefined : null,
    ds_classificacao_rigido: tipo === 'RIGIDO' ? undefined : null,
    ds_tipo_carroceria_carga:
      tipo === 'CARROCERIA' || tipo === 'RIGIDO' ? undefined : null,
  };

  try {
    const result = await prisma.tms_veiculos.updateMany({
      where: {
        id_tms_empresas: tmsEmpresa.id,
        id: { in: ids },
      },
      data: clearFields,
    });
    return result;
  } catch (error: any) {
    console.error('Erro ao definir tipo de unidade:', error);
    throw new Error(`Erro ao definir tipo de unidade: ${error.message}`);
  }
};
