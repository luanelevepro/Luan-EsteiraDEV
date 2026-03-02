// TMS - Retornos e constantes
export const TMS_CONSTANTS = {
  // Status da Carga
  STATUS_CARGA: {
    PENDENTE: 'PENDENTE',
    AGENDADA: 'AGENDADA',
    EM_COLETA: 'EM_COLETA',
    EM_TRANSITO: 'EM_TRANSITO',
    ENTREGUE: 'ENTREGUE',
  } as const,

  // Status da Entrega
  STATUS_ENTREGA: {
    PENDENTE: 'PENDENTE',
    EM_TRANSITO: 'EM_TRANSITO',
    ENTREGUE: 'ENTREGUE',
    DEVOLVIDA: 'DEVOLVIDA',
    CANCELADA: 'CANCELADA',
  } as const,

  // Status da Viagem
  STATUS_VIAGEM: {
    PLANEJADA: 'PLANEJADA',
    EM_COLETA: 'EM_COLETA',
    EM_VIAGEM: 'EM_VIAGEM',
    CONCLUIDA: 'CONCLUIDA',
    ATRASADA: 'ATRASADA',
    CANCELADA: 'CANCELADA',
  } as const,

  // Prioridade
  PRIORIDADE: {
    BAIXA: 'BAIXA',
    NORMAL: 'NORMAL',
    ALTA: 'ALTA',
    URGENTE: 'URGENTE',
  } as const,

  // Tipos de Carroceria
  TIPO_CARROCERIA: {
    GRANELEIRO: 'GRANELEIRO',
    BAU: 'BAU',
    SIDER: 'SIDER',
    FRIGORIFICO: 'FRIGORIFICO',
    TANQUE: 'TANQUE',
    PORTA_CONTAINER: 'PORTA_CONTAINER',
  } as const,

  // Tipos de Documentos
  TIPO_DOCUMENTO: {
    CTE: 'CTE',
    NFE: 'NFE',
  } as const,

  // Mensagens padrão
  MENSAGENS: {
    ENTREGA_CRIADA: 'Entrega criada com sucesso',
    ENTREGA_ATUALIZADA: 'Entrega atualizada com sucesso',
    ENTREGA_DELETADA: 'Entrega deletada com sucesso',
    DOCUMENTOS_VINCULADOS: 'Documentos vinculados com sucesso',
    DOCUMENTOS_DESVINCULADOS: 'Documentos desvinculados com sucesso',
    CARGA_CRIADA: 'Carga criada com sucesso',
    CARGA_ATUALIZADA: 'Carga atualizada com sucesso',
    CARGA_DELETADA: 'Carga deletada com sucesso',
    VIAGEM_CRIADA: 'Viagem criada com sucesso',
    VIAGEM_ATUALIZADA: 'Viagem atualizada com sucesso',
    ERROS: {
      ENTREGA_NAO_ENCONTRADA: 'Entrega não encontrada',
      CARGA_NAO_ENCONTRADA: 'Carga não encontrada',
      VIAGEM_NAO_ENCONTRADA: 'Viagem não encontrada',
      DOCUMENTO_NAO_ENCONTRADO: 'Documento não encontrado',
      CIDADE_NAO_ENCONTRADA: 'Cidade não encontrada',
      ENTREGA_SEM_DOCUMENTOS: 'Entrega não pode estar vazia (sem documentos)',
      CARGA_SEM_ENTREGAS: 'Carga deve ter pelo menos uma entrega',
      DOCUMENTO_JA_VINCULADO: 'Documento já está vinculado a esta entrega',
      SEQUENCIA_DUPLICADA: 'Já existe uma entrega com esta sequência na carga',
    },
  },
};

export type TStatusCarga =
  (typeof TMS_CONSTANTS.STATUS_CARGA)[keyof typeof TMS_CONSTANTS.STATUS_CARGA];
export type TStatusEntrega =
  (typeof TMS_CONSTANTS.STATUS_ENTREGA)[keyof typeof TMS_CONSTANTS.STATUS_ENTREGA];
export type TStatusViagem =
  (typeof TMS_CONSTANTS.STATUS_VIAGEM)[keyof typeof TMS_CONSTANTS.STATUS_VIAGEM];
export type TPrioridade =
  (typeof TMS_CONSTANTS.PRIORIDADE)[keyof typeof TMS_CONSTANTS.PRIORIDADE];
export type TTipoVeiculo =
  (typeof TMS_CONSTANTS.TIPO_CARROCERIA)[keyof typeof TMS_CONSTANTS.TIPO_CARROCERIA];
export type TTipoDocumento =
  (typeof TMS_CONSTANTS.TIPO_DOCUMENTO)[keyof typeof TMS_CONSTANTS.TIPO_DOCUMENTO];
