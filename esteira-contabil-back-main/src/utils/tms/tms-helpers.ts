// TMS - UTILITÁRIOS E HELPERS
import { TMS } from '@/types/tms';
import { TMS_CONSTANTS } from './tms-returns';
import { StatusCarga, StatusEntrega } from '@prisma/client';

/**
 * Calcula o status de uma carga baseado no status de suas entregas.
 * Regra: quando uma entrega está em trânsito, a carga é considerada em trânsito até que todas as entregas sejam concluídas.
 * - Se TODAS as entregas estão ENTREGUE → ENTREGUE
 * - Se ALGUMA entrega está EM_TRANSITO (e nem todas ENTREGUE) → EM_TRANSITO
 * - Caso contrário → PENDENTE
 */
export function calcularStatusCarga(
  entregas: TMS.EntregaComDocumentos[]
): StatusCarga {
  if (entregas.length === 0) {
    return TMS_CONSTANTS.STATUS_CARGA.PENDENTE as StatusCarga;
  }

  const statusSet = new Set(entregas.map((e) => e.ds_status));

  // Se todas as entregas estão entregues
  if (
    statusSet.size === 1 &&
    statusSet.has(TMS_CONSTANTS.STATUS_ENTREGA.ENTREGUE as StatusEntrega)
  ) {
    return TMS_CONSTANTS.STATUS_CARGA.ENTREGUE as StatusCarga;
  }

  // Se tem alguma entrega devolvida ou cancelada
  if (
    statusSet.has(TMS_CONSTANTS.STATUS_ENTREGA.DEVOLVIDA as StatusEntrega) ||
    statusSet.has(TMS_CONSTANTS.STATUS_ENTREGA.CANCELADA as StatusEntrega)
  ) {
    return TMS_CONSTANTS.STATUS_CARGA.EM_TRANSITO as StatusCarga;
  }

  // Regra: quando uma entrega está em trânsito, a carga é considerada em trânsito até que todas as entregas sejam concluídas
  if (
    statusSet.has(TMS_CONSTANTS.STATUS_ENTREGA.EM_TRANSITO as StatusEntrega)
  ) {
    return TMS_CONSTANTS.STATUS_CARGA.EM_TRANSITO as StatusCarga;
  }

  return TMS_CONSTANTS.STATUS_CARGA.PENDENTE as StatusCarga;
}

/**
 * Valida os dados de uma entrega antes de criar
 */
export function validarEntrega(data: Partial<TMS.CreateEntregaDTO>): {
  valido: boolean;
  erro?: string;
} {
  if (!data.id_carga) {
    return { valido: false, erro: 'id_carga é obrigatório' };
  }

  if (!data.id_cidade_destino) {
    return { valido: false, erro: 'id_cidade_destino é obrigatório' };
  }

  if (typeof data.nr_sequencia !== 'number' || data.nr_sequencia < 1) {
    return {
      valido: false,
      erro: 'nr_sequencia deve ser um número maior que 0',
    };
  }

  if (data.vl_peso_bruto !== undefined && data.vl_peso_bruto < 0) {
    return { valido: false, erro: 'vl_peso_bruto não pode ser negativo' };
  }

  if (data.vl_cubagem !== undefined && data.vl_cubagem < 0) {
    return { valido: false, erro: 'vl_cubagem não pode ser negativa' };
  }

  if (data.vl_qtd_volumes !== undefined && data.vl_qtd_volumes < 1) {
    return { valido: false, erro: 'vl_qtd_volumes deve ser maior que 0' };
  }

  return { valido: true };
}

/**
 * Valida os dados de uma carga antes de criar
 */
export function validarCarga(data: Partial<TMS.CreateCargaDTO>): {
  valido: boolean;
  erro?: string;
} {
  if (!data.id_tms_empresa) {
    return { valido: false, erro: 'id_tms_empresa é obrigatório' };
  }

  // id_cidade_origem é opcional na importação; usuário preenche antes de iniciar trajeto se vazio
  if (data.vl_peso_bruto !== undefined && data.vl_peso_bruto < 0) {
    return { valido: false, erro: 'vl_peso_bruto não pode ser negativo' };
  }

  if (data.vl_cubagem !== undefined && data.vl_cubagem < 0) {
    return { valido: false, erro: 'vl_cubagem não pode ser negativa' };
  }

  return { valido: true };
}

/**
 * Valida se um status de entrega é válido
 */
export function validarStatusEntrega(status: string): boolean {
  return Object.values(TMS_CONSTANTS.STATUS_ENTREGA).includes(status as any);
}

/**
 * Valida se um status de carga é válido
 */
export function validarStatusCarga(status: string): boolean {
  return Object.values(TMS_CONSTANTS.STATUS_CARGA).includes(status as any);
}

/**
 * Calcula informações resumidas de uma entrega
 */
export function calcularInfoEntrega(
  entrega: TMS.EntregaComDocumentos
): TMS.EntregaStatusInfo {
  const totalDocs =
    (entrega.js_entregas_ctes?.length || 0) +
    (entrega.js_entregas_nfes?.length || 0);
  const docsEntregues =
    (entrega.ds_status === TMS_CONSTANTS.STATUS_ENTREGA.ENTREGUE
      ? totalDocs
      : 0) || 0;

  return {
    status: entrega.ds_status,
    totalDocumentos: totalDocs,
    documentosEntregues: docsEntregues,
    cidade: entrega.sis_cidade_destino?.ds_city || 'Desconhecida',
    proximoEvento: entrega.dt_limite_entrega,
  };
}

/**
 * Calcula informações resumidas de uma carga
 */
export function calcularInfoCarga(
  carga: TMS.CargaComEntregas
): TMS.CargaStatusInfo {
  const totalEntregas = carga.js_entregas?.length || 0;
  const entregasCompletas =
    carga.js_entregas?.filter(
      (e) => e.ds_status === TMS_CONSTANTS.STATUS_ENTREGA.ENTREGUE
    ).length || 0;

  return {
    status: carga.ds_status,
    totalEntregas,
    entregasCompletas,
    percentualCompleto:
      totalEntregas > 0 ? (entregasCompletas / totalEntregas) * 100 : 0,
    proximaEntrega: carga.js_entregas?.find(
      (e) => e.ds_status !== TMS_CONSTANTS.STATUS_ENTREGA.ENTREGUE
    ),
  };
}

/**
 * Ordena entregas de uma carga pela sequência
 */
export function ordenarEntregas(
  entregas: TMS.EntregaComDocumentos[]
): TMS.EntregaComDocumentos[] {
  return [...entregas].sort((a, b) => a.nr_sequencia - b.nr_sequencia);
}

/**
 * Verifica se uma entrega pode ser deletada
 */
export function podeDeleteEntrega(entrega: TMS.EntregaComDocumentos): {
  pode: boolean;
  motivo?: string;
} {
  if (entrega.ds_status === TMS_CONSTANTS.STATUS_ENTREGA.ENTREGUE) {
    return {
      pode: false,
      motivo: 'Não é possível deletar uma entrega já entregue',
    };
  }

  if (entrega.ds_status === TMS_CONSTANTS.STATUS_ENTREGA.EM_TRANSITO) {
    return {
      pode: false,
      motivo: 'Não é possível deletar uma entrega em trânsito',
    };
  }

  return { pode: true };
}

/**
 * Verifica se uma carga pode ser deletada
 */
export function podeDeletarCarga(carga: TMS.CargaComEntregas): {
  pode: boolean;
  motivo?: string;
} {
  if (carga.ds_status === TMS_CONSTANTS.STATUS_CARGA.ENTREGUE) {
    return {
      pode: false,
      motivo: 'Não é possível deletar uma carga já entregue',
    };
  }

  const temEntregaEmTransito = carga.js_entregas?.some(
    (e) => e.ds_status === TMS_CONSTANTS.STATUS_ENTREGA.EM_TRANSITO
  );

  if (temEntregaEmTransito) {
    return {
      pode: false,
      motivo: 'Não é possível deletar uma carga com entrega em trânsito',
    };
  }

  return { pode: true };
}

/**
 * Formata um objeto de resposta da API
 */
export function formatarResposta<T>(
  sucesso: boolean,
  mensagem: string,
  dados?: T,
  erros?: string[]
): TMS.ApiResponse<T> {
  return {
    sucesso,
    mensagem,
    ...(dados && { dados }),
    ...(erros && { erros }),
  };
}
