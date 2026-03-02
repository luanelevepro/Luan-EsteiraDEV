import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { getTmsEmpresa } from './tms-empresa.service';
import { getFiscalEmpresa } from '../fiscal/fiscal-empresa.service';
import { cargaInclude } from '../../utils/tms/queries';
import FechamentoMotoristasService from './fechamento-motoristas.service';
import type { ClienteOuEmbarcadorDTO } from './parser-carga-documentos.service';

/**
 * Enriquece carga com status da viagem associada
 */
export function enrichCargaWithViagemStatus(carga: any): any {
  const viagemAtual = carga.tms_viagens_cargas?.[0]?.tms_viagens;
  return {
    ...carga,
    ds_status_viagem: viagemAtual?.ds_status || null,
    viagem_info: viagemAtual
      ? {
          id: viagemAtual.id,
          cd_viagem: viagemAtual.cd_viagem,
          ds_status: viagemAtual.ds_status,
          dt_agendada: viagemAtual.dt_agendada,
          dt_conclusao: viagemAtual.dt_conclusao,
        }
      : null,
  };
}

async function validarCidade(id_cidade: number): Promise<void> {
  const cidade = await prisma.sis_igbe_city.findUnique({
    where: { id: id_cidade },
  });

  if (!cidade) {
    throw new Error('Cidade não encontrada');
  }
}

async function validarSegmento(
  id_segmento: string,
  id_tms_empresa: string
): Promise<void> {
  const segmento = await prisma.tms_segmentos.findFirst({
    where: {
      id: id_segmento,
      id_tms_empresas: id_tms_empresa,
    },
  });

  if (!segmento) {
    throw new Error('Segmento não encontrado');
  }
}

async function validarMotoristaVeiculo(
  id_motorista_veiculo: string,
  id_tms_empresa: string
): Promise<void> {
  const motoristaVeiculo = await prisma.tms_motoristas_veiculos.findFirst({
    where: {
      id: id_motorista_veiculo,
      tms_veiculos: {
        id_tms_empresas: id_tms_empresa,
      },
    },
  });

  if (!motoristaVeiculo) {
    throw new Error('Motorista/Véiculo não encontrado');
  }
}

async function validarEmbarcador(
  id_embarcador: string,
  id_tms_empresa: string
): Promise<void> {
  const emb = await prisma.tms_embarcadores.findFirst({
    where: {
      id: id_embarcador,
      id_tms_empresa,
    },
  });
  if (!emb) {
    throw new Error('Embarcador não encontrado');
  }
}

async function validarFisCliente(
  id_fis_cliente: string,
  empresaId: string
): Promise<void> {
  const fisEmpresa = await getFiscalEmpresa(empresaId);
  const fc = await prisma.fis_clientes.findFirst({
    where: {
      id: id_fis_cliente,
      id_fis_empresas: fisEmpresa.id,
    },
  });
  if (!fc) {
    throw new Error('Cliente fiscal não encontrado');
  }
}

async function validarCarroceriaPlanejada(
  id_carroceria_planejada: string,
  id_tms_empresa: string
): Promise<void> {
  const veiculo = await prisma.tms_veiculos.findFirst({
    where: {
      id: id_carroceria_planejada,
      id_tms_empresas: id_tms_empresa,
    },
    select: { id: true, ds_tipo_unidade: true },
  });
  if (!veiculo) {
    throw new Error('Veículo (carroceria planejada) não encontrado');
  }
  if (!veiculo.ds_tipo_unidade || veiculo.ds_tipo_unidade !== 'CARROCERIA') {
    throw new Error('O veículo informado não é uma carroceria');
  }
}

/**
 * Retorna o próximo código de carga sequencial para a empresa (ex.: CARGA-1, CARGA-2).
 * Considera apenas registros com fl_deslocamento_vazio !== true.
 * Ignora códigos no formato antigo CARGA-<timestamp> (13+ dígitos) para que a sequência recomece em 1, 2, 3...
 */
const CARGA_SEQ_MAX_LEGADO = 9999999; // números maiores são tratados como timestamp legado (ex.: Date.now())

export async function getProximoNumeroCarga(
  idTmsEmpresa: string,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const db = tx ?? prisma;
  const result = await (db as any).$queryRaw<
    { next: bigint }[]
  >`SELECT COALESCE(MAX(CAST(SUBSTRING(cd_carga FROM 7) AS BIGINT)), 0) + 1 AS next
    FROM tms_cargas
    WHERE id_tms_empresa = ${idTmsEmpresa}
      AND (fl_deslocamento_vazio IS NULL OR fl_deslocamento_vazio = false)
      AND cd_carga ~ '^CARGA-[0-9]+$'
      AND CAST(SUBSTRING(cd_carga FROM 7) AS BIGINT) <= ${CARGA_SEQ_MAX_LEGADO}`;
  const next = Number(result[0]?.next ?? 1);
  return `CARGA-${next}`;
}

/**
 * Retorna o próximo código de deslocamento vazio sequencial para a empresa (ex.: VAZIO_1, VAZIO_2).
 * Considera apenas registros com fl_deslocamento_vazio = true e cd_carga no padrão VAZIO_<número>.
 */
export async function getProximoNumeroVazio(
  idTmsEmpresa: string,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const db = tx ?? prisma;
  const result = await (db as any).$queryRaw<
    { next: bigint }[]
  >`SELECT COALESCE(MAX(CAST(SUBSTRING(cd_carga FROM 7) AS BIGINT)), 0) + 1 AS next
    FROM tms_cargas
    WHERE id_tms_empresa = ${idTmsEmpresa}
      AND fl_deslocamento_vazio = true
      AND cd_carga ~ '^VAZIO_[0-9]+$'`;
  const next = Number(result[0]?.next ?? 1);
  return `VAZIO_${next}`;
}

/**
 * Busca cargas com paginação e filtros
 */
export const getCargasPaginacao = async (
  empresaId: string,
  page: number = 1,
  pageSize: number = 50,
  orderBy: 'asc' | 'desc' = 'asc',
  orderColumn: string = 'cd_carga',
  search: string = '',
  status?: string | string[],
  month?: number,
  year?: number,
  includeCargasSemData: boolean = true
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const andConditions: any[] = [];

    // Filtro por mês/ano (dt_created, dt_coleta, dt_coleta_inicio ou dt_entregue_em para ENTREGUE)
    if (
      year !== undefined &&
      year !== null &&
      month !== undefined &&
      month !== null
    ) {
      const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const dateConditions: any[] = [
        { dt_created: { gte: startOfMonth, lte: endOfMonth } },
        { dt_coleta: { gte: startOfMonth, lte: endOfMonth } },
        { dt_coleta_inicio: { gte: startOfMonth, lte: endOfMonth } },
        {
          AND: [
            { ds_status: 'ENTREGUE' },
            { dt_entregue_em: { gte: startOfMonth, lte: endOfMonth } },
          ],
        },
      ];
      // Cargas "sem data" = sem datas de coleta (dt_created é obrigatório no schema, não pode ser null)
      if (includeCargasSemData) {
        dateConditions.push({
          AND: [{ dt_coleta: null }, { dt_coleta_inicio: null }],
        });
      }
      andConditions.push({ OR: dateConditions });
    }

    // Filtro de status
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

    if (statusArray.length > 0) {
      andConditions.push({ ds_status: { in: statusArray } });
    }

    if (search) {
      const searchTerm = search.trim();
      andConditions.push({
        OR: [
          { cd_carga: { contains: searchTerm, mode: 'insensitive' } },
          {
            fis_clientes: {
              ds_nome: { contains: searchTerm, mode: 'insensitive' },
            },
          },
          {
            fis_clientes: {
              ds_nome_fantasia: { contains: searchTerm, mode: 'insensitive' },
            },
          },
          {
            sis_cidade_origem: {
              ds_city: { contains: searchTerm, mode: 'insensitive' },
            },
          },
          {
            sis_cidade_destino: {
              ds_city: { contains: searchTerm, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    const whereClause: any = {
      id_tms_empresa: tmsEmpresa.id,
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };

    let orderByClause: any = {};
    switch (orderColumn) {
      case 'cd_carga':
        orderByClause = { cd_carga: orderBy };
        break;
      case 'dt_created':
        orderByClause = { dt_created: orderBy };
        break;
      case 'dt_coleta':
        orderByClause = { dt_coleta: orderBy };
        break;
      case 'ds_prioridade':
        orderByClause = { ds_prioridade: orderBy };
        break;
      case 'ds_status':
        orderByClause = { ds_status: orderBy };
        break;
      default:
        orderByClause = { cd_carga: orderBy };
    }

    const total = await prisma.tms_cargas.count({ where: whereClause });
    const totalPages = Math.ceil(total / pageSize);

    const cargas = await prisma.tms_cargas.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: orderByClause,
      include: cargaInclude,
    });

    const allIds = await prisma.tms_cargas.findMany({
      where: whereClause,
      select: { id: true },
    });

    // Enriquecer cargas com status da viagem
    const cargasEnriquecidas = cargas.map(enrichCargaWithViagemStatus);

    return {
      total,
      totalPages,
      page,
      pageSize,
      cargas: cargasEnriquecidas,
      allIds: allIds.map((c) => c.id),
    };
  } catch (error: any) {
    console.error('Erro ao buscar cargas paginadas:', error);
    throw new Error(
      `Erro ao buscar cargas paginadas: ${error?.message ?? 'erro desconhecido'}`
    );
  }
};

/**
 * Busca todas as cargas da empresa
 */
export const getCargas = async (empresaId: string): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const cargas = await prisma.tms_cargas.findMany({
      where: { id_tms_empresa: tmsEmpresa.id },
      orderBy: { cd_carga: 'asc' },
      include: cargaInclude,
    });

    // Enriquecer cargas com status da viagem
    const cargasEnriquecidas = cargas.map(enrichCargaWithViagemStatus);

    return cargasEnriquecidas;
  } catch (error: any) {
    console.error('Erro ao buscar cargas:', error);
    throw new Error(`Erro ao buscar cargas: ${error.message}`);
  }
};

/**
 * Busca uma carga por ID
 */
export const getCargaById = async (
  empresaId: string,
  id: string
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const carga = await prisma.tms_cargas.findFirst({
      where: {
        id,
        id_tms_empresa: tmsEmpresa.id,
      },
      include: cargaInclude,
    });

    if (!carga) {
      throw new Error('Carga não encontrada');
    }

    // Enriquecer carga com status da viagem
    const cargaEnriquecida = enrichCargaWithViagemStatus(carga);

    return cargaEnriquecida;
  } catch (error: any) {
    console.error('Erro ao buscar carga:', error);
    throw new Error(`Erro ao buscar carga: ${error.message}`);
  }
};

/**
 * Cria uma nova carga
 */
const containerDataFromPayload = (container?: {
  id_armador?: string | null;
  nr_container?: string | null;
  nr_lacre_container?: string | null;
  ds_destino_pais?: string | null;
  ds_setor_container?: string | null;
}) => ({
  id_armador: container?.id_armador?.trim() || undefined,
  nr_container: container?.nr_container?.trim() || undefined,
  nr_lacre_container: container?.nr_lacre_container?.trim() || undefined,
  ds_destino_pais: container?.ds_destino_pais?.trim() || undefined,
  ds_setor_container: container?.ds_setor_container?.trim() || undefined,
});

export const createCarga = async (
  empresaId: string,
  data: {
    cd_carga?: string;
    ds_status?: string;
    dt_coleta_inicio?: Date | string;
    dt_coleta_fim?: Date | string;
    dt_coleta?: Date | string;
    ds_comprovante_entrega?: string | null;
    ds_comprovante_key?: string | null;
    ds_observacoes?: string;
    ds_tipo_carroceria?: string;
    ds_prioridade?: string;
    vl_peso_bruto?: number;
    vl_cubagem?: number;
    vl_qtd_volumes?: number;
    vl_limite_empilhamento?: number;
    fl_requer_seguro?: boolean;
    id_cidade_origem?: number;
    id_cidade_destino?: number;
    id_motorista_veiculo?: string | null;
    id_fis_cliente?: string | null;
    id_segmento?: string | null;
    id_embarcador?: string | null;
    fl_carroceria_desacoplada?: boolean | null;
    fl_deslocamento_vazio?: boolean | null;
    id_carroceria_planejada?: string | null;
    ds_produto_predominante?: string | null;
    container?: {
      id_armador?: string | null;
      nr_container?: string | null;
      nr_lacre_container?: string | null;
      ds_destino_pais?: string | null;
      ds_setor_container?: string | null;
    };
  },
  opts?: { tx?: Prisma.TransactionClient }
): Promise<any> => {
  try {
    const db = opts?.tx ?? prisma;
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    let cdCarga = (data.cd_carga ?? '').trim() || undefined;
    // Deslocamento vazio: sempre usar VAZIO_ + sequência (ignorar cd_carga enviado como DESLOCAMENTO_VAZIO ou vazio)
    if (data.fl_deslocamento_vazio === true) {
      const tx = opts?.tx;
      cdCarga = await getProximoNumeroVazio(tmsEmpresa.id, tx);
    } else {
      // Carga normal: ignorar cd_carga no formato antigo (CARGA-<timestamp>) para usar sequência 1, 2, 3...
      const numPart = cdCarga?.startsWith('CARGA-')
        ? parseInt(cdCarga.slice(6), 10)
        : NaN;
      const ehFormatoLegado =
        !Number.isNaN(numPart) && numPart > CARGA_SEQ_MAX_LEGADO;
      if (!cdCarga || ehFormatoLegado) {
        const tx = opts?.tx;
        cdCarga = await getProximoNumeroCarga(tmsEmpresa.id, tx);
      }
    }
    if (!cdCarga) {
      throw new Error('Código da carga é obrigatório');
    }

    if (data.id_cidade_origem != null) {
      await validarCidade(data.id_cidade_origem);
    }

    if (data.id_fis_cliente) {
      await validarFisCliente(data.id_fis_cliente, empresaId);
    }

    if (data.id_segmento) {
      await validarSegmento(data.id_segmento, tmsEmpresa.id);
    }

    if (data.id_embarcador) {
      await validarEmbarcador(data.id_embarcador, tmsEmpresa.id);
    }

    if (data.id_motorista_veiculo) {
      await validarMotoristaVeiculo(data.id_motorista_veiculo, tmsEmpresa.id);
    }

    if (data.id_carroceria_planejada) {
      await validarCarroceriaPlanejada(
        data.id_carroceria_planejada,
        tmsEmpresa.id
      );
    }

    const toDate = (v: Date | string | undefined): Date | undefined =>
      v == null ? undefined : typeof v === 'string' ? new Date(v) : v;

    const carga = await db.tms_cargas.create({
      data: {
        cd_carga: cdCarga,
        ds_status: (data.ds_status as any) ?? 'PENDENTE',
        dt_coleta_inicio: toDate(data.dt_coleta_inicio),
        dt_coleta_fim: toDate(data.dt_coleta_fim),
        dt_coleta: toDate(data.dt_coleta),
        ds_comprovante_entrega: data.ds_comprovante_entrega ?? undefined,
        ds_comprovante_key: data.ds_comprovante_key ?? undefined,
        ds_observacoes: data.ds_observacoes,
        ds_tipo_carroceria: data.ds_tipo_carroceria as any,
        ds_prioridade: data.ds_prioridade as any,
        vl_peso_bruto: data.vl_peso_bruto,
        vl_cubagem: data.vl_cubagem,
        vl_qtd_volumes: data.vl_qtd_volumes,
        vl_limite_empilhamento: data.vl_limite_empilhamento,
        fl_requer_seguro: data.fl_requer_seguro ?? true,
        // id_cidade_origem é opcional: só incluir quando houver valor (evita P2011)
        ...(data.id_cidade_origem != null
          ? { id_cidade_origem: Number(data.id_cidade_origem) }
          : {}),
        id_cidade_destino: data.id_cidade_destino,
        id_tms_empresa: tmsEmpresa.id,
        id_motorista_veiculo: data.id_motorista_veiculo ?? undefined,
        id_fis_cliente: data.id_fis_cliente ?? undefined,
        fl_carroceria_desacoplada: data.fl_carroceria_desacoplada ?? undefined,
        fl_deslocamento_vazio: data.fl_deslocamento_vazio ?? undefined,
        id_segmento: data.id_segmento ?? undefined,
        id_embarcador: data.id_embarcador ?? undefined,
        id_carroceria_planejada: data.id_carroceria_planejada ?? undefined,
        ds_produto_predominante: data.ds_produto_predominante ?? undefined,
      },
      include: cargaInclude,
    });

    if (data.ds_tipo_carroceria === 'PORTA_CONTAINER') {
      const containerPayload = containerDataFromPayload(data.container);
      await db.tms_cargas_container.create({
        data: {
          id_carga: carga.id,
          ...containerPayload,
        },
      });
    }

    const cargaComContainer = await db.tms_cargas.findUnique({
      where: { id: carga.id },
      include: cargaInclude,
    });

    const cargaEnriquecida = enrichCargaWithViagemStatus(
      cargaComContainer ?? carga
    );
    return cargaEnriquecida;
  } catch (error: any) {
    console.error('Erro ao criar carga:', error);
    throw error;
  }
};

/**
 * Atualiza uma carga
 */
export const updateCarga = async (
  empresaId: string,
  id: string,
  data: {
    cd_carga?: string;
    ds_status?: string | null;
    dt_coleta_inicio?: Date | string | null;
    dt_coleta_fim?: Date | string | null;
    dt_coleta?: Date | string | null;
    ds_comprovante_entrega?: string | null;
    ds_comprovante_key?: string | null;
    ds_observacoes?: string | null;
    ds_tipo_carroceria?: string | null;
    ds_prioridade?: string | null;
    vl_peso_bruto?: number | null;
    vl_cubagem?: number | null;
    vl_qtd_volumes?: number | null;
    vl_limite_empilhamento?: number | null;
    fl_requer_seguro?: boolean | null;
    fl_carroceria_desacoplada?: boolean | null;
    fl_deslocamento_vazio?: boolean | null;
    id_cidade_origem?: number;
    id_cidade_destino?: number;
    id_motorista_veiculo?: string | null;
    id_fis_cliente?: string | null;
    id_segmento?: string | null;
    id_embarcador?: string | null;
    id_carroceria_planejada?: string | null;
    ds_produto_predominante?: string | null;
    container?: {
      id_armador?: string | null;
      nr_container?: string | null;
      nr_lacre_container?: string | null;
      ds_destino_pais?: string | null;
      ds_setor_container?: string | null;
    };
  },
  opts?: { tx?: Prisma.TransactionClient }
): Promise<any> => {
  try {
    const db = opts?.tx ?? prisma;
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const carga = await db.tms_cargas.findFirst({
      where: {
        id,
        id_tms_empresa: tmsEmpresa.id,
      },
      include: { tms_cargas_container: true },
    });

    if (!carga) {
      throw new Error('Carga não encontrada');
    }

    if (data.id_cidade_origem) {
      await validarCidade(data.id_cidade_origem);
    }

    if (data.id_cidade_destino) {
      await validarCidade(data.id_cidade_destino);
    }

    if (data.id_fis_cliente) {
      await validarFisCliente(data.id_fis_cliente, empresaId);
    }

    if (data.id_segmento) {
      await validarSegmento(data.id_segmento, tmsEmpresa.id);
    }

    if (data.id_embarcador) {
      await validarEmbarcador(data.id_embarcador, tmsEmpresa.id);
    }

    if (data.id_motorista_veiculo) {
      await validarMotoristaVeiculo(data.id_motorista_veiculo, tmsEmpresa.id);
    }

    if (data.id_carroceria_planejada) {
      await validarCarroceriaPlanejada(
        data.id_carroceria_planejada,
        tmsEmpresa.id
      );
    }

    const novoTipo =
      data.ds_tipo_carroceria !== undefined
        ? data.ds_tipo_carroceria
        : carga.ds_tipo_carroceria;

    if (novoTipo !== 'PORTA_CONTAINER' && carga.tms_cargas_container) {
      await db.tms_cargas_container.delete({
        where: { id_carga: id },
      });
    }

    const cargaAtualizada = await db.tms_cargas.update({
      where: { id },
      data: {
        cd_carga: data.cd_carga ?? undefined,
        ds_status: (data.ds_status as any) ?? undefined,
        dt_coleta_inicio:
          data.dt_coleta_inicio !== undefined
            ? data.dt_coleta_inicio
            : undefined,
        dt_coleta_fim:
          data.dt_coleta_fim !== undefined ? data.dt_coleta_fim : undefined,
        dt_coleta: data.dt_coleta ?? undefined,
        ds_comprovante_entrega: data.ds_comprovante_entrega ?? undefined,
        ds_comprovante_key: data.ds_comprovante_key ?? undefined,
        ds_observacoes: data.ds_observacoes ?? undefined,
        ds_tipo_carroceria: (data.ds_tipo_carroceria as any) ?? undefined,
        ds_prioridade: (data.ds_prioridade as any) ?? undefined,
        vl_peso_bruto: data.vl_peso_bruto ?? undefined,
        vl_cubagem: data.vl_cubagem ?? undefined,
        vl_qtd_volumes: data.vl_qtd_volumes ?? undefined,
        vl_limite_empilhamento: data.vl_limite_empilhamento ?? undefined,
        fl_requer_seguro: data.fl_requer_seguro ?? undefined,
        fl_carroceria_desacoplada: data.fl_carroceria_desacoplada ?? undefined,
        fl_deslocamento_vazio: data.fl_deslocamento_vazio ?? undefined,
        id_cidade_origem: data.id_cidade_origem ?? undefined,
        id_cidade_destino: data.id_cidade_destino ?? undefined,
        id_motorista_veiculo:
          data.id_motorista_veiculo !== undefined
            ? data.id_motorista_veiculo
            : undefined,
        id_fis_cliente:
          data.id_fis_cliente !== undefined ? data.id_fis_cliente : undefined,
        id_segmento:
          data.id_segmento !== undefined ? data.id_segmento : undefined,
        id_embarcador:
          data.id_embarcador !== undefined ? data.id_embarcador : undefined,
        id_carroceria_planejada:
          data.id_carroceria_planejada !== undefined
            ? data.id_carroceria_planejada
            : undefined,
        ds_produto_predominante:
          data.ds_produto_predominante !== undefined
            ? data.ds_produto_predominante
            : undefined,
      },
      include: cargaInclude,
    });

    if (novoTipo === 'PORTA_CONTAINER') {
      const containerPayload = containerDataFromPayload(data.container);
      const existente = cargaAtualizada.tms_cargas_container;
      if (existente) {
        await db.tms_cargas_container.update({
          where: { id_carga: id },
          data: containerPayload,
        });
      } else {
        await db.tms_cargas_container.create({
          data: {
            id_carga: id,
            ...containerPayload,
          },
        });
      }
    }

    const cargaFinal = await db.tms_cargas.findUnique({
      where: { id },
      include: cargaInclude,
    });

    const cargaEnriquecida = enrichCargaWithViagemStatus(
      cargaFinal ?? cargaAtualizada
    );
    return cargaEnriquecida;
  } catch (error: any) {
    console.error('Erro ao atualizar carga:', error);
    throw new Error(`Erro ao atualizar carga: ${error.message}`);
  }
};

/**
 * Atualiza o status de uma carga
 */
export const updateCargaStatus = async (
  empresaId: string,
  id: string,
  ds_status: string
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const carga = await prisma.tms_cargas.findFirst({
      where: {
        id,
        id_tms_empresa: tmsEmpresa.id,
      },
    });

    if (!carga) {
      throw new Error('Carga não encontrada');
    }

    const cargaAtualizada = await prisma.tms_cargas.update({
      where: { id },
      data: {
        ds_status: ds_status as any,
      },
      include: cargaInclude,
    });

    // Enriquecer carga com status da viagem
    const cargaEnriquecida = enrichCargaWithViagemStatus(cargaAtualizada);

    return cargaEnriquecida;
  } catch (error: any) {
    console.error('Erro ao atualizar status da carga:', error);
    throw new Error(`Erro ao atualizar status da carga: ${error.message}`);
  }
};

/**
 * Deleta uma carga
 */
export const deleteCarga = async (
  empresaId: string,
  id: string
): Promise<void> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const carga = await prisma.tms_cargas.findFirst({
      where: {
        id,
        id_tms_empresa: tmsEmpresa.id,
      },
    });

    if (!carga) {
      throw new Error('Carga não encontrada');
    }

    await prisma.tms_cargas.delete({
      where: { id },
    });
  } catch (error: any) {
    console.error('Erro ao deletar carga:', error);
    throw new Error(`Erro ao deletar carga: ${error.message}`);
  }
};

export const getCargaStatus = async ({ cargaId }: { cargaId: string }) => {
  try {
    const viagem = await prisma.tms_viagens.findFirst({
      where: {
        js_viagens_cargas: {
          some: {
            id_carga: cargaId,
          },
        },
      },
      select: { ds_status: true },
      orderBy: {
        dt_updated: 'desc',
      },
    });

    return viagem;
  } catch (e) {
    throw e;
  }
};

export const getDocsAbleToCarga = async ({
  empresaId,
  competencia,
}: {
  empresaId: string;
  competencia: string;
}) => {};

/**
 * Cria uma carga completa com documentos e vinculação à viagem
 * Operação atômica usando transação do Prisma
 */
export const createCargaCompleta = async (
  empresaId: string,
  data: {
    // Dados da carga
    cd_carga: string;
    ds_status?: string;
    dt_coleta_inicio?: Date | string;
    dt_coleta_fim?: Date | string;
    dt_coleta?: Date | string;
    ds_comprovante_entrega?: string | null;
    ds_comprovante_key?: string | null;
    ds_observacoes?: string;
    ds_tipo_carroceria?: string;
    ds_prioridade?: string;
    vl_peso_bruto?: number;
    vl_cubagem?: number;
    vl_qtd_volumes?: number;
    vl_limite_empilhamento?: number;
    fl_requer_seguro?: boolean;
    id_cidade_origem: number;
    id_motorista_veiculo?: string | null;
    id_fis_cliente?: string | null;
    id_segmento?: string | null;

    // Vinculação com viagem
    id_viagem?: string;
    nr_sequencia?: number;

    // Documentos fiscais
    documentos?: Array<{
      id: string;
      tipo: 'NFE' | 'CTE';
      ordem: number;
    }>;
  }
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    // Validações
    if (!data.cd_carga) {
      throw new Error('Código da carga é obrigatório');
    }

    if (!data.id_cidade_origem) {
      throw new Error('Cidade de origem é obrigatória');
    }

    await validarCidade(data.id_cidade_origem);

    if (data.id_fis_cliente) {
      await validarFisCliente(data.id_fis_cliente, empresaId);
    }

    if (data.id_segmento) {
      await validarSegmento(data.id_segmento, tmsEmpresa.id);
    }

    if (data.id_motorista_veiculo) {
      await validarMotoristaVeiculo(data.id_motorista_veiculo, tmsEmpresa.id);
    }

    // Validar viagem se fornecida
    if (data.id_viagem) {
      const viagem = await prisma.tms_viagens.findFirst({
        where: {
          id: data.id_viagem,
          id_tms_empresa: tmsEmpresa.id,
        },
      });

      if (!viagem) {
        throw new Error('Viagem não encontrada');
      }
    }

    // Validar documentos se fornecidos
    if (data.documentos && data.documentos.length > 0) {
      const documentoIds = data.documentos.map((doc) => doc.id);
      const docs = await prisma.fis_documento_dfe.findMany({
        where: { id: { in: documentoIds } },
        include: {
          js_nfe: { select: { id: true } },
          js_cte: { select: { id: true } },
        },
      });

      if (docs.length !== data.documentos.length) {
        throw new Error('Um ou mais documentos não foram encontrados');
      }
    }

    // Criar carga com todos os relacionamentos em uma transação
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Criar a carga
      const novaCarga = await tx.tms_cargas.create({
        data: {
          cd_carga: data.cd_carga,
          ds_status: (data.ds_status as any) ?? 'PENDENTE',
          dt_coleta_inicio: data.dt_coleta_inicio,
          dt_coleta_fim: data.dt_coleta_fim,
          dt_coleta: data.dt_coleta,
          ds_comprovante_entrega: data.ds_comprovante_entrega ?? undefined,
          ds_comprovante_key: data.ds_comprovante_key ?? undefined,
          ds_observacoes: data.ds_observacoes,
          ds_tipo_carroceria: data.ds_tipo_carroceria as any,
          ds_prioridade: data.ds_prioridade as any,
          vl_peso_bruto: data.vl_peso_bruto,
          vl_cubagem: data.vl_cubagem,
          vl_qtd_volumes: data.vl_qtd_volumes,
          vl_limite_empilhamento: data.vl_limite_empilhamento,
          fl_requer_seguro: data.fl_requer_seguro ?? true,
          id_cidade_origem: data.id_cidade_origem,
          id_tms_empresa: tmsEmpresa.id,
          id_motorista_veiculo: data.id_motorista_veiculo ?? undefined,
          id_fis_cliente: data.id_fis_cliente ?? undefined,
          id_segmento: data.id_segmento ?? undefined,
        },
      });

      // 2. Vincular à viagem se fornecida
      if (data.id_viagem) {
        // Se não foi fornecida sequência, pegar a próxima disponível
        let sequencia = data.nr_sequencia;
        const { _max } = await tx.tms_viagens_cargas.aggregate({
          where: { id_viagem: data.id_viagem },
          _max: { nr_sequencia: true },
        });
        const proximaSequencia = (_max.nr_sequencia ?? 0) + 1;
        if (sequencia === undefined) {
          sequencia = proximaSequencia;
        } else if (
          _max.nr_sequencia != null &&
          _max.nr_sequencia >= sequencia
        ) {
          sequencia = proximaSequencia; // força ir para o fim caso já exista igual ou maior
        }

        const isFirstItem = sequencia === 1;
        await tx.tms_viagens_cargas.create({
          data: {
            id_viagem: data.id_viagem,
            id_carga: novaCarga.id,
            nr_sequencia: sequencia,
            ds_status: isFirstItem
              ? ('DISPONIVEL' as const)
              : ('BLOQUEADO' as const),
          },
        });

        // Atualizar carga com o id_motorista_veiculo da viagem
        const viagem = await tx.tms_viagens.findUnique({
          where: { id: data.id_viagem },
          select: { id_motorista_veiculo: true },
        });
        if (viagem?.id_motorista_veiculo) {
          await tx.tms_cargas.update({
            where: { id: novaCarga.id },
            data: { id_motorista_veiculo: viagem.id_motorista_veiculo },
          });
        }
      }

      // 3. Vincular documentos se fornecidos
      if (data.documentos && data.documentos.length > 0) {
        const docs = await tx.fis_documento_dfe.findMany({
          where: { id: { in: data.documentos.map((d) => d.id) } },
          include: {
            js_nfe: { select: { id: true } },
            js_cte: { select: { id: true } },
          },
        });

        // Criar mapa de documentos com ordem
        const docMap = new Map(
          data.documentos.map((doc) => [
            doc.id,
            { tipo: doc.tipo, ordem: doc.ordem },
          ])
        );

        for (const doc of docs) {
          const docInfo = docMap.get(doc.id);
          if (!docInfo) continue;

          if (doc.ds_tipo === 'NFE' && doc.js_nfe) {
            // Verificar se já existe vínculo
            const exists = await tx.tms_cargas_nfe.findFirst({
              where: {
                id_carga: novaCarga.id,
                id_nfe: doc.js_nfe.id,
              },
            });

            if (!exists) {
              await tx.tms_cargas_nfe.create({
                data: {
                  id_carga: novaCarga.id,
                  id_nfe: doc.js_nfe.id,
                  ordem: docInfo.ordem,
                },
              });
            }
          } else if (doc.ds_tipo === 'CTE' && doc.js_cte) {
            // Verificar se já existe vínculo
            const exists = await tx.tms_cargas_cte.findFirst({
              where: {
                id_carga: novaCarga.id,
                id_cte: doc.js_cte.id,
              },
            });

            if (!exists) {
              await tx.tms_cargas_cte.create({
                data: {
                  id_carga: novaCarga.id,
                  id_cte: doc.js_cte.id,
                  ordem: docInfo.ordem,
                },
              });
            }
          }
        }
      }

      // 4. Buscar a carga completa com todos os relacionamentos
      const cargaCompleta = await tx.tms_cargas.findUnique({
        where: { id: novaCarga.id },
        include: cargaInclude,
      });

      return cargaCompleta;
    });

    // Enriquecer carga com status da viagem
    const cargaEnriquecida = enrichCargaWithViagemStatus(resultado);

    return cargaEnriquecida;
  } catch (error: any) {
    console.error('Erro ao criar carga completa:', error);
    throw new Error(`Erro ao criar carga completa: ${error.message}`);
  }
};

/** Payload de uma entrega para criação com documentos */
export interface EntregaComDocumentosPayload {
  id_cidade_destino: number;
  ds_endereco?: string;
  ds_complemento?: string;
  ds_nome_recebedor?: string;
  ds_documento_recebedor?: string;
  ds_nome_destinatario?: string;
  ds_documento_destinatario?: string;
  vl_total_mercadoria?: number;
  js_produtos?: string[];
  documentos: Array<{ id: string; tipo: 'CTE' | 'NFE'; ordem?: number }>;
}

/**
 * Cria carga com entregas, vínculos documento↔entrega e opcionalmente upsert de fis_clientes/tms_embarcadores.
 * Usado pelo fluxo Nova Carga a partir de documentos (parser).
 */
export const createCargaCompletaComEntregas = async (
  empresaId: string,
  data: {
    cd_carga?: string;
    ds_status?: string;
    dt_coleta_inicio?: Date | string;
    dt_coleta_fim?: Date | string;
    dt_coleta?: Date | string;
    ds_observacoes?: string;
    ds_tipo_carroceria?: string;
    ds_prioridade?: string;
    vl_peso_bruto?: number;
    vl_cubagem?: number;
    vl_qtd_volumes?: number;
    fl_requer_seguro?: boolean;
    id_cidade_origem: number;
    id_cidade_destino?: number;
    id_fis_cliente?: string | null;
    id_embarcador?: string | null;
    id_segmento?: string | null;
    id_carroceria_planejada?: string | null;
    /** Dados do cliente vindos do parser (upsert fis_clientes + tms_clientes) */
    cliente?: ClienteOuEmbarcadorDTO | null;
    /** Dados do embarcador vindos do parser (upsert tms_embarcadores) */
    embarcador?: ClienteOuEmbarcadorDTO | null;
    entregas: EntregaComDocumentosPayload[];
    container?: {
      id_armador?: string | null;
      nr_container?: string | null;
      nr_lacre_container?: string | null;
      ds_destino_pais?: string | null;
      ds_setor_container?: string | null;
    };
  }
): Promise<any> => {
  const tmsEmpresa = await getTmsEmpresa(empresaId);
  const fisEmpresa = await getFiscalEmpresa(empresaId);

  if (!data.id_cidade_origem) throw new Error('Cidade de origem é obrigatória');
  if (!data.entregas?.length)
    throw new Error('Pelo menos uma entrega é obrigatória');
  if (!data.id_fis_cliente && !data.cliente)
    throw new Error(
      'Cliente é obrigatório (informe id_fis_cliente ou dados do cliente)'
    );
  // Embarcador: obrigatório quando fornecido pelo parser (CT-e); opcional em fluxo só NF-e (preenchimento manual posterior)
  if (data.id_embarcador)
    await validarEmbarcador(data.id_embarcador, tmsEmpresa.id);

  await validarCidade(data.id_cidade_origem);
  for (const ent of data.entregas) {
    await validarCidade(ent.id_cidade_destino);
  }
  if (data.id_fis_cliente)
    await validarFisCliente(data.id_fis_cliente, empresaId);
  if (data.id_embarcador)
    await validarEmbarcador(data.id_embarcador, tmsEmpresa.id);
  if (data.id_segmento) await validarSegmento(data.id_segmento, tmsEmpresa.id);
  if (data.id_carroceria_planejada)
    await validarCarroceriaPlanejada(
      data.id_carroceria_planejada,
      tmsEmpresa.id
    );

  const resultado = await prisma.$transaction(
    async (tx) => {
      let cdCarga = (data.cd_carga ?? '').trim() || undefined;
      const numPart = cdCarga?.startsWith('CARGA-')
        ? parseInt(cdCarga.slice(6), 10)
        : NaN;
      const ehFormatoLegado =
        !Number.isNaN(numPart) && numPart > CARGA_SEQ_MAX_LEGADO;
      if (!cdCarga || ehFormatoLegado) {
        cdCarga = await getProximoNumeroCarga(tmsEmpresa.id, tx);
      }
      let idFisCliente = data.id_fis_cliente ?? undefined;
      let idEmbarcador = data.id_embarcador ?? undefined;

      // Sempre usar fis_clientes (cadastro fiscal). Não usar tms_clientes.
      if (
        data.cliente?.ds_nome &&
        (data.cliente.ds_documento || !idFisCliente)
      ) {
        const doc = (data.cliente.ds_documento || '').trim() || null;
        let fisCliente: { id: string } | null = null;
        if (doc) {
          fisCliente = await tx.fis_clientes.upsert({
            where: {
              id_fis_empresas_ds_documento: {
                id_fis_empresas: fisEmpresa.id,
                ds_documento: doc,
              },
            },
            create: {
              id_fis_empresas: fisEmpresa.id,
              ds_nome: data.cliente.ds_nome,
              ds_documento: doc,
              ds_ie: data.cliente.ds_ie,
              ds_origem_cadastro: 'XML',
              dt_ultima_ocorrencia_xml: new Date(),
            },
            update: {
              ds_nome: data.cliente.ds_nome,
              ds_ie: data.cliente.ds_ie,
              dt_ultima_ocorrencia_xml: new Date(),
            },
          });
        } else {
          const existing = await tx.fis_clientes.findFirst({
            where: {
              id_fis_empresas: fisEmpresa.id,
              ds_nome: data.cliente.ds_nome,
            },
          });
          if (existing) {
            await tx.fis_clientes.update({
              where: { id: existing.id },
              data: {
                ds_ie: data.cliente.ds_ie,
                dt_ultima_ocorrencia_xml: new Date(),
              },
            });
            fisCliente = { id: existing.id };
          } else {
            const created = await tx.fis_clientes.create({
              data: {
                id_fis_empresas: fisEmpresa.id,
                ds_nome: data.cliente.ds_nome,
                ds_origem_cadastro: 'XML',
                dt_ultima_ocorrencia_xml: new Date(),
              },
            });
            fisCliente = { id: created.id };
          }
        }
        if (fisCliente) idFisCliente = fisCliente.id;
      }

      if (
        data.embarcador?.ds_nome &&
        (data.embarcador.ds_documento || !idEmbarcador)
      ) {
        const doc = (data.embarcador.ds_documento || '').trim() || null;
        let emb: { id: string } | null = null;
        if (doc) {
          emb = await tx.tms_embarcadores.upsert({
            where: {
              id_tms_empresa_ds_documento: {
                id_tms_empresa: tmsEmpresa.id,
                ds_documento: doc,
              },
            },
            create: {
              id_tms_empresa: tmsEmpresa.id,
              ds_nome: data.embarcador.ds_nome,
              ds_documento: doc,
              ds_ie: data.embarcador.ds_ie,
              ds_origem_cadastro: 'XML',
            },
            update: {
              ds_nome: data.embarcador.ds_nome,
              ds_ie: data.embarcador.ds_ie,
            },
          });
        } else {
          const existing = await tx.tms_embarcadores.findFirst({
            where: {
              id_tms_empresa: tmsEmpresa.id,
              ds_nome: data.embarcador.ds_nome,
            },
          });
          if (existing) {
            emb = { id: existing.id };
          } else {
            emb = await tx.tms_embarcadores.create({
              data: {
                id_tms_empresa: tmsEmpresa.id,
                ds_nome: data.embarcador.ds_nome,
                ds_ie: data.embarcador.ds_ie,
                ds_origem_cadastro: 'XML',
              },
            });
          }
        }
        idEmbarcador = emb.id;
      }

      const novaCarga = await tx.tms_cargas.create({
        data: {
          cd_carga: cdCarga,
          ds_status: (data.ds_status as any) ?? 'PENDENTE',
          dt_coleta_inicio: data.dt_coleta_inicio,
          dt_coleta_fim: data.dt_coleta_fim,
          dt_coleta: data.dt_coleta,
          ds_observacoes: data.ds_observacoes,
          ds_tipo_carroceria: data.ds_tipo_carroceria as any,
          ds_prioridade: data.ds_prioridade as any,
          vl_peso_bruto: data.vl_peso_bruto,
          vl_cubagem: data.vl_cubagem,
          vl_qtd_volumes: data.vl_qtd_volumes,
          fl_requer_seguro: data.fl_requer_seguro ?? true,
          id_cidade_origem: data.id_cidade_origem,
          id_cidade_destino: data.id_cidade_destino,
          id_tms_empresa: tmsEmpresa.id,
          id_fis_cliente: idFisCliente ?? data.id_fis_cliente ?? undefined,
          id_embarcador: idEmbarcador ?? undefined,
          id_segmento: data.id_segmento ?? undefined,
          id_carroceria_planejada: data.id_carroceria_planejada ?? undefined,
        },
      });

      if (data.ds_tipo_carroceria === 'PORTA_CONTAINER') {
        const containerPayload = containerDataFromPayload(data.container);
        await tx.tms_cargas_container.create({
          data: {
            id_carga: novaCarga.id,
            ...containerPayload,
          },
        });
      }

      const docsByDfeId = new Map<
        string,
        { id_nfe?: string; id_cte?: string; tipo: string }
      >();
      const allDocDfeIds = new Set<string>();
      for (const ent of data.entregas) {
        for (const d of ent.documentos) {
          allDocDfeIds.add(d.id);
        }
      }
      const docDfeList = await tx.fis_documento_dfe.findMany({
        where: { id: { in: Array.from(allDocDfeIds) } },
        select: { id: true, ds_tipo: true, id_nfe: true, id_cte: true },
      });
      for (const d of docDfeList) {
        docsByDfeId.set(d.id, {
          id_nfe: d.id_nfe ?? undefined,
          id_cte: d.id_cte ?? undefined,
          tipo: d.ds_tipo === 'NFE' ? 'NFE' : 'CTE',
        });
      }

      let ordemCarga = 0;
      for (const ent of data.entregas) {
        const novaEntrega = await tx.tms_entregas.create({
          data: {
            id_carga: novaCarga.id,
            id_cidade_destino: ent.id_cidade_destino,
            nr_sequencia: data.entregas.indexOf(ent) + 1,
            ds_endereco: ent.ds_endereco,
            ds_complemento: ent.ds_complemento,
            ds_nome_recebedor: ent.ds_nome_recebedor,
            ds_documento_recebedor: ent.ds_documento_recebedor,
            ds_nome_destinatario: ent.ds_nome_destinatario,
            ds_documento_destinatario: ent.ds_documento_destinatario,
            vl_total_mercadoria: ent.vl_total_mercadoria ?? undefined,
            js_produtos: ent.js_produtos ?? [],
          },
        });

        for (const doc of ent.documentos) {
          const info = docsByDfeId.get(doc.id);
          if (!info) continue;
          const ordem = doc.ordem ?? ++ordemCarga;
          if (info.tipo === 'NFE' && info.id_nfe) {
            await tx.tms_entregas_nfe.create({
              data: { id_entrega: novaEntrega.id, id_nfe: info.id_nfe, ordem },
            });
            const existsCargaNfe = await tx.tms_cargas_nfe.findFirst({
              where: { id_carga: novaCarga.id, id_nfe: info.id_nfe },
            });
            if (!existsCargaNfe) {
              await tx.tms_cargas_nfe.create({
                data: { id_carga: novaCarga.id, id_nfe: info.id_nfe, ordem },
              });
            }
          } else if (info.tipo === 'CTE' && info.id_cte) {
            await tx.tms_entregas_cte.create({
              data: { id_entrega: novaEntrega.id, id_cte: info.id_cte, ordem },
            });
            const existsCargaCte = await tx.tms_cargas_cte.findFirst({
              where: { id_carga: novaCarga.id, id_cte: info.id_cte },
            });
            if (!existsCargaCte) {
              await tx.tms_cargas_cte.create({
                data: { id_carga: novaCarga.id, id_cte: info.id_cte, ordem },
              });
            }
          }
        }
      }

      const cargaCompleta = await tx.tms_cargas.findUnique({
        where: { id: novaCarga.id },
        include: cargaInclude,
      });
      return cargaCompleta;
    },
    { timeout: 15000 } // allow heavier carga creation flows
  );

  return enrichCargaWithViagemStatus(resultado);
};

export const createDeslocamentoVazio = async ({
  viagemId,
  cidadeOrigemId,
  cidadeDestinoId,
  ordem,
}: {
  viagemId: string;
  cidadeOrigemId: number;
  cidadeDestinoId: number;
  ordem: number;
}) => {
  try {
    const viagem = await prisma.tms_viagens.findUnique({
      where: { id: viagemId },
      select: { id_tms_empresa: true, id_motorista_veiculo: true },
    });

    if (!viagem) {
      throw new Error('Viagem não encontrada');
    }

    // Garante que o deslocamento vazio entre sempre na última posição da sequência
    const { _max } = await prisma.tms_viagens_cargas.aggregate({
      where: { id_viagem: viagemId },
      _max: { nr_sequencia: true },
    });
    const nrSequencia =
      _max.nr_sequencia != null ? _max.nr_sequencia + 1 : ordem;

    await prisma.$transaction(async (tx) => {
      const cdCargaVazio = await getProximoNumeroVazio(
        viagem.id_tms_empresa,
        tx
      );
      const novaCarga = await tx.tms_cargas.create({
        data: {
          id_cidade_origem: cidadeOrigemId,
          cd_carga: cdCargaVazio,
          fl_deslocamento_vazio: true,
          ds_status: 'AGENDADA', // Só vai para EM_TRANSITO quando o usuário acionar o botão (iniciar/finalizar deslocamento)
          ds_prioridade: 'NORMAL',
          fl_requer_seguro: false,
          id_tms_empresa: viagem.id_tms_empresa,
          id_motorista_veiculo: viagem.id_motorista_veiculo,
        },
      });

      const isFirstItem = nrSequencia === 1;
      await tx.tms_viagens_cargas.create({
        data: {
          id_viagem: viagemId,
          id_carga: novaCarga.id,
          nr_sequencia: nrSequencia,
          ds_status: isFirstItem
            ? ('DISPONIVEL' as const)
            : ('BLOQUEADO' as const),
        },
      });
    });
  } catch (e) {
    throw e;
  }
};

/**
 * Finaliza uma carga e gerencia a transição automática do status da viagem
 *
 * LÓGICA:
 * 1. Marca a carga como ENTREGUE
 * 2. Verifica se é a última carga da viagem
 * 3. Se NÃO for a última:
 *    - Verifica se a próxima carga é deslocamento vazio
 *    - EM_VIAGEM se for deslocamento vazio
 *    - EM_COLETA se for carga normal
 * 4. Se FOR a última:
 *    - Retorna flag indicando que precisa de decisão do usuário
 */
export const finalizarCarga = async (
  empresaId: string,
  cargaId: string,
  comprovante?: {
    ds_comprovante_entrega?: string;
    ds_comprovante_key?: string;
    dt_conclusao?: string;
  }
): Promise<{
  carga: any;
  viagem: any;
  isUltimaCarga: boolean;
  proximoStatus?: string;
  proximaCargaId?: string;
  mensagem: string;
}> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const dataConclusao =
      comprovante?.dt_conclusao != null
        ? new Date(comprovante.dt_conclusao)
        : new Date();

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Buscar a carga e sua viagem
        const carga = await tx.tms_cargas.findFirst({
          where: {
            id: cargaId,
            id_tms_empresa: tmsEmpresa.id,
          },
          include: {
            tms_viagens_cargas: {
              include: {
                tms_viagens: {
                  include: {
                    js_viagens_cargas: {
                      include: {
                        tms_cargas: true,
                      },
                      orderBy: {
                        nr_sequencia: 'asc',
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!carga) {
          throw new Error('Carga não encontrada');
        }

        // 2. Atualizar status da carga para ENTREGUE e dt_entregue_em
        const cargaAtualizada = await tx.tms_cargas.update({
          where: { id: cargaId },
          data: {
            ds_status: 'ENTREGUE',
            dt_entregue_em: dataConclusao,
            ...(comprovante && {
              ds_comprovante_entrega: comprovante.ds_comprovante_entrega,
              ds_comprovante_key: comprovante.ds_comprovante_key,
            }),
          },
          include: cargaInclude,
        });

        // 2.1 Marcar todas as entregas da carga como ENTREGUE e preencher dt_entrega onde estiver vazio
        await tx.tms_entregas.updateMany({
          where: { id_carga: cargaId },
          data: { ds_status: 'ENTREGUE' },
        });
        await tx.tms_entregas.updateMany({
          where: { id_carga: cargaId, dt_entrega: null },
          data: { dt_entrega: dataConclusao },
        });

        // 3. Verificar se está vinculada a uma viagem
        const viagemCargaLink = carga.tms_viagens_cargas?.[0];
        if (!viagemCargaLink || !viagemCargaLink.tms_viagens) {
          // Carga não está em viagem, apenas retorna
          return {
            carga: cargaAtualizada,
            viagem: null,
            isUltimaCarga: false,
            mensagem: 'Carga finalizada com sucesso (não vinculada a viagem)',
          };
        }

        const viagem = viagemCargaLink.tms_viagens;
        const todasCargasDaViagem = viagem.js_viagens_cargas;

        // 4. Encontrar a posição desta carga na sequência
        const indexCargaAtual = todasCargasDaViagem.findIndex(
          (vc) => vc.id_carga === cargaId
        );

        if (indexCargaAtual === -1) {
          throw new Error('Carga não encontrada na sequência da viagem');
        }

        // 4.1 Atualizar tms_viagens_cargas (esteira sequencial): item atual CONCLUIDO, próximo DISPONIVEL
        await tx.tms_viagens_cargas.update({
          where: { id: viagemCargaLink.id },
          data: {
            ds_status: 'CONCLUIDO',
            dt_finalizado_em: dataConclusao,
          },
        });

        const proximaCargaLink = todasCargasDaViagem[indexCargaAtual + 1];
        if (
          proximaCargaLink &&
          proximaCargaLink.ds_status !== 'CONCLUIDO' &&
          proximaCargaLink.ds_status !== 'EM_DESLOCAMENTO' &&
          proximaCargaLink.ds_status !== 'DISPONIVEL'
        ) {
          await tx.tms_viagens_cargas.update({
            where: { id: proximaCargaLink.id },
            data: { ds_status: 'DISPONIVEL' },
          });
        }

        // 5. Verificar se é a última carga
        const isUltimaCarga =
          indexCargaAtual === todasCargasDaViagem.length - 1;

        if (isUltimaCarga) {
          // É a última carga - retorna para decisão do usuário
          return {
            carga: cargaAtualizada,
            viagem,
            isUltimaCarga: true,
            mensagem:
              'Última carga entregue. Deseja finalizar a viagem ou adicionar mais cargas?',
          };
        }

        // 6. Há próxima carga - determinar próximo status
        const proximaCarga = proximaCargaLink.tms_cargas;

        if (!proximaCarga) {
          throw new Error('Dados da próxima carga não encontrados');
        }

        // Verificar se próxima carga é deslocamento vazio
        const isDeslocamentoVazio = proximaCarga.fl_deslocamento_vazio === true;

        const proximoStatus = isDeslocamentoVazio ? 'EM_VIAGEM' : 'EM_COLETA';

        // 7. Atualizar status da viagem
        const viagemAtualizada = await tx.tms_viagens.update({
          where: { id: viagem.id },
          data: {
            ds_status: proximoStatus as any,
          },
          include: {
            js_viagens_cargas: {
              include: {
                tms_cargas: true,
              },
              orderBy: {
                nr_sequencia: 'asc',
              },
            },
          },
        });

        return {
          carga: cargaAtualizada,
          viagem: viagemAtualizada,
          isUltimaCarga: false,
          proximoStatus,
          proximaCargaId: proximaCarga.id,
          mensagem: isDeslocamentoVazio
            ? 'Viagem avançou para EM_VIAGEM (próxima carga é deslocamento vazio)'
            : 'Viagem avançou para EM_COLETA (próxima carga aguardando coleta)',
        };
      },
      {
        maxWait: 10000, // Espera máxima de 10 segundos
        timeout: 15000, // Timeout de 15 segundos
      }
    );

    // Atualizar fechamento (tms_fechamento_cargas / tms_fechamento_viagens) em todos os casos:
    // carga em viagem (última ou não) e carga sem viagem (quando id_motorista_veiculo na carga).
    try {
      const fechamentoService = new FechamentoMotoristasService();
      await fechamentoService.atualizarFechamentoComCarga({
        empresaId,
        cargaId,
        dataConclusao,
      });
    } catch (e) {
      console.error('Erro ao atualizar fechamento:', e);
    }

    return result;
  } catch (error: any) {
    console.error('Erro ao finalizar carga:', error);
    throw new Error(`Erro ao finalizar carga: ${error.message}`);
  }
};

/**
 * Finaliza uma viagem completamente (após confirmação do usuário)
 * @param options.dt_conclusao Opcional: data/hora de conclusão (ISO string); se não informado, usa now.
 */
export const finalizarViagem = async (
  empresaId: string,
  viagemId: string,
  options?: { dt_conclusao?: string }
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const viagem = await prisma.tms_viagens.findFirst({
      where: {
        id: viagemId,
        id_tms_empresa: tmsEmpresa.id,
      },
    });

    if (!viagem) {
      throw new Error('Viagem não encontrada');
    }

    const dtConclusao =
      options?.dt_conclusao != null
        ? new Date(options.dt_conclusao)
        : new Date();

    const viagemAtualizada = await prisma.tms_viagens.update({
      where: { id: viagemId },
      data: {
        ds_status: 'CONCLUIDA',
        dt_conclusao: dtConclusao,
      },
      include: {
        js_viagens_cargas: {
          include: {
            tms_cargas: true,
          },
          orderBy: {
            nr_sequencia: 'asc',
          },
        },
      },
    });

    // Atualizar fechamento automaticamente quando viagem é concluída
    try {
      const fechamentoService = new FechamentoMotoristasService();
      await fechamentoService.atualizarFechamentoComViagem({
        empresaId,
        viagemId: viagemId,
      });
    } catch (e) {
      // Log erro mas não quebrar o fluxo de conclusão da viagem
      console.error('Erro ao atualizar fechamento:', e);
    }

    return viagemAtualizada;
  } catch (error: any) {
    console.error('Erro ao finalizar viagem:', error);
    throw new Error(`Erro ao finalizar viagem: ${error.message}`);
  }
};

/**
 * Retorna viagem para status PLANEJADA para adicionar mais cargas
 */
export const reabrirViagemParaNovasCargas = async (
  empresaId: string,
  viagemId: string
): Promise<any> => {
  try {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const viagem = await prisma.tms_viagens.findFirst({
      where: {
        id: viagemId,
        id_tms_empresa: tmsEmpresa.id,
      },
    });

    if (!viagem) {
      throw new Error('Viagem não encontrada');
    }

    return await prisma.tms_viagens.update({
      where: { id: viagemId },
      data: {
        ds_status: 'PLANEJADA',
      },
      include: {
        js_viagens_cargas: {
          include: {
            tms_cargas: true,
          },
          orderBy: {
            nr_sequencia: 'asc',
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Erro ao reabrir viagem:', error);
    throw new Error(`Erro ao reabrir viagem: ${error.message}`);
  }
};
