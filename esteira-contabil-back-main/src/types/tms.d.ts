// TMS - TIPOS E INTERFACES
import { StatusEntrega, StatusCarga, StatusViagem } from '@prisma/client';

export namespace TMS {
  // ENUMS
  export type TStatusEntrega = StatusEntrega;
  export type TStatusCarga = StatusCarga;
  export type TStatusViagem = StatusViagem;

  // DOCUMENTOS
  export interface DocumentoEntrega {
    id: string;
    ds_numero: string;
    ds_tipo: 'CTE' | 'NFE';
    js_uf: {
      id: number;
      ds_uf: string;
      ds_state: string;
    };
    ds_destinatario?: string;
    ds_cidade_destino?: string;
    valor?: number;
    relatedDocIds?: string[];
  }

  // ENTREGAS - DTOs
  export interface CreateEntregaDTO {
    id_carga: string;
    id_cidade_destino: number;
    nr_sequencia: number;
    ds_endereco?: string;
    ds_complemento?: string;
    dt_limite_entrega?: Date;
    ds_observacoes?: string;
    vl_peso_bruto?: number;
    vl_cubagem?: number;
    vl_qtd_volumes?: number;
  }

  export interface UpdateEntregaDTO {
    id_cidade_destino?: number;
    ds_endereco?: string;
    ds_complemento?: string;
    dt_limite_entrega?: Date;
    dt_entrega?: Date;
    ds_comprovante_entrega?: string;
    ds_comprovante_key?: string;
    ds_observacoes?: string;
    vl_peso_bruto?: number;
    vl_cubagem?: number;
    vl_qtd_volumes?: number;
    ds_status?: StatusEntrega;
  }

  export interface AddDocumentosToEntregaDTO {
    id_entrega: string;
    documentos: Array<{
      id: string;
      tipo: 'CTE' | 'NFE';
    }>;
  }

  // ENTREGAS - Respostas
  export interface EntregaComDocumentos {
    id: string;
    cd_entrega?: string;
    ds_status: StatusEntrega;
    id_carga: string;
    id_cidade_destino: number;
    ds_endereco?: string;
    ds_complemento?: string;
    dt_limite_entrega?: Date;
    dt_entrega?: Date;
    ds_observacoes?: string;
    vl_peso_bruto?: number;
    vl_cubagem?: number;
    vl_qtd_volumes?: number;
    nr_sequencia: number;
    dt_created: Date;
    dt_updated: Date;
    sis_cidade_destino: {
      id: number;
      ds_city: string;
      js_uf: {
        id: number;
        ds_uf: string;
        ds_state: string;
      };
    };
    js_entregas_ctes: Array<{
      id: string;
      id_cte: string;
      ordem: number;
      js_cte: {
        id: string;
        ds_numero: string;
        dt_emissao: Date;
        ds_nome_mun_fim: string;
        vl_total?: string;
      };
    }>;
    js_entregas_nfes: Array<{
      id: string;
      id_nfe: string;
      ordem: number;
      js_nfe: {
        id: string;
        ds_numero: string;
        dt_emissao: Date;
        vl_nf?: string;
      };
    }>;
  }

  // CARGAS - DTOs
  export interface CreateCargaDTO {
    id_tms_empresa: string;
    id_cidade_origem: number;
    ds_observacoes?: string;
    ds_tipo_carroceria?: string;
    ds_prioridade?: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
    vl_peso_bruto?: number;
    vl_cubagem?: number;
    vl_qtd_volumes?: number;
    vl_limite_empilhamento?: number;
    fl_requer_seguro?: boolean;
    id_segmento?: string;
    id_motorista_veiculo?: string;
  }

  export interface CreateCargaComDocumentosDTO {
    id_viagem: string;
    carga: CreateCargaDTO;
    entregas: Array<{
      id_cidade_destino: number;
      nr_sequencia: number;
      documentos: Array<{
        id: string;
        tipo: 'CTE' | 'NFE';
      }>;
      ds_endereco?: string;
      ds_complemento?: string;
      dt_limite_entrega?: Date;
      ds_observacoes?: string;
    }>;
  }

  export interface UpdateCargaDTO {
    ds_observacoes?: string;
    ds_tipo_carroceria?: string;
    ds_prioridade?: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
    vl_peso_bruto?: number;
    vl_cubagem?: number;
    vl_qtd_volumes?: number;
    vl_limite_empilhamento?: number;
    fl_requer_seguro?: boolean;
    id_segmento?: string;
    id_motorista_veiculo?: string;
    ds_status?: StatusCarga;
  }

  // CARGAS - Respostas
  export interface CargaComEntregas {
    id: string;
    cd_carga?: string;
    ds_status: StatusCarga;
    id_cidade_origem: number;
    ds_observacoes?: string;
    ds_tipo_carroceria?: string;
    ds_prioridade: string;
    vl_peso_bruto?: number;
    vl_cubagem?: number;
    vl_qtd_volumes?: number;
    vl_limite_empilhamento?: number;
    fl_requer_seguro: boolean;
    dt_created: Date;
    dt_updated: Date;
    sis_cidade_origem: {
      id: number;
      ds_city: string;
      ds_state: string;
    };
    js_entregas: EntregaComDocumentos[];
    id_motorista_veiculo?: string;
    id_segmento?: string;
  }

  // CARGAS - Respostas (para listagem)
  export interface CargaListItem {
    id: string;
    cd_carga?: string;
    ds_status: StatusCarga;
    sis_cidade_origem: {
      ds_city: string;
      ds_state: string;
    };
    nr_entregas: number;
    vl_total_peso?: number;
    dt_created: Date;
    ds_prioridade: string;
  }

  // VIAGENS - DTOs
  export interface CreateViagemDTO {
    cd_viagem: string;
    id_tms_empresa: string;
    ds_motorista: string;
    ds_placa_cavalo: string;
    ds_placa_carreta_1?: string;
    ds_placa_carreta_2?: string;
    ds_placa_carreta_3?: string;
    dt_agendada?: Date;
    dt_previsao_retorno?: Date;
  }

  export interface UpdateViagemDTO {
    ds_status?: StatusViagem;
    dt_agendada?: Date;
    dt_previsao_retorno?: Date;
    dt_conclusao?: Date;
  }

  // VIAGENS - Respostas
  export interface ViagemComCargas {
    id: string;
    cd_viagem: string;
    ds_status: StatusViagem;
    ds_motorista: string;
    ds_placa_cavalo: string;
    ds_placa_carreta_1?: string;
    ds_placa_carreta_2?: string;
    ds_placa_carreta_3?: string;
    dt_agendada?: Date;
    dt_previsao_retorno?: Date;
    dt_conclusao?: Date;
    dt_created: Date;
    dt_updated: Date;
    js_viagens_cargas: Array<{
      id_carga: string;
      nr_sequencia: number;
      dt_vinculacao: Date;
      tms_cargas: CargaComEntregas;
    }>;
  }

  // API RESPONSES
  export interface ApiResponse<T> {
    sucesso: boolean;
    mensagem: string;
    dados?: T;
    cargas?: any[];
    erros?: string[];
    nfesNaoRelacionadas?: Array<{
      id: string;
      ds_numero: string;
    }>;
  }

  export interface EntregasResponse {
    sucesso: boolean;
    mensagem: string;
    entregas: EntregaComDocumentos[];
    totalEntregas: number;
  }

  // HELPERS / UTILITIES
  export interface CargaStatusInfo {
    status: StatusCarga;
    totalEntregas: number;
    entregasCompletas: number;
    percentualCompleto: number;
    proximaEntrega?: EntregaComDocumentos;
  }

  export interface EntregaStatusInfo {
    status: StatusEntrega;
    totalDocumentos: number;
    documentosEntregues: number;
    cidade: string;
    proximoEvento?: Date;
  }
}
