// TMS - PRISMA QUERIES/INCLUDEs
import { Prisma } from '@prisma/client';

/**
 * Include padrão para buscar uma entrega com todos os seus documentos
 */
export const entregaInclude = {
  sis_cidade_destino: {
    select: {
      id: true,
      ds_city: true,
      js_uf: {
        select: {
          id: true,
          ds_uf: true,
          ds_state: true,
        },
      },
    },
  },
  js_entregas_ctes: {
    include: {
      js_cte: {
        select: {
          id: true,
          ds_numero: true,
          dt_emissao: true,
          ds_chave: true,
          ds_nome_mun_fim: true,
          vl_total: true,
          js_chaves_nfe: true,
          js_documentos_anteriores: true,
          ds_razao_social_emitente: true,
          ds_documento_emitente: true,
          ds_nome_mun_ini: true,
          ds_uf_ini: true,
          ds_endereco_destino: true,
          ds_complemento_destino: true,
          ds_razao_social_remetente: true,
          ds_documento_remetente: true,
          ds_endereco_remetente: true,
          ds_complemento_remetente: true,
          fis_documento_dfe: {
            select: {
              id: true,
              ds_tipo: true,
              fis_documento_relacionado: {
                select: {
                  id_documento_origem: true,
                  id_documento_referenciado: true,
                },
              },
              fis_documento_origem: {
                select: {
                  id_documento_origem: true,
                  id_documento_referenciado: true,
                },
              },
            },
          },
        },
      },
    },
  },
  js_entregas_nfes: {
    include: {
      js_nfe: {
        select: {
          id: true,
          ds_numero: true,
          dt_emissao: true,
          ds_chave: true,
          vl_nf: true,
          js_nfes_referenciadas: true,
          ds_razao_social_emitente: true,
          ds_documento_emitente: true,
          ds_municipio_emitente: true,
          ds_uf_emitente: true,
          fis_documento_dfe: {
            select: {
              id: true,
              ds_tipo: true,
              fis_documento_relacionado: {
                select: {
                  id_documento_origem: true,
                  id_documento_referenciado: true,
                },
              },
              fis_documento_origem: {
                select: {
                  id_documento_origem: true,
                  id_documento_referenciado: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Include padrão para buscar uma carga com todas as suas entregas e documentos
 */
export const cargaInclude = {
  sis_cidade_origem: {
    include: {
      js_uf: true,
    },
  },
  sis_cidade_destino: {
    include: {
      js_uf: true,
    },
  },
  // Sempre usar fis_clientes (cadastro fiscal). tms_clientes não é usado.
  fis_clientes: {
    select: {
      id: true,
      dt_created: true,
      dt_updated: true,
      id_fis_empresas: true,
      ds_nome: true,
      ds_documento: true,
      ds_ie: true,
      ds_nome_fantasia: true,
      id_cidade: true,
      ds_cep: true,
      ds_logradouro: true,
      ds_numero: true,
      ds_complemento: true,
      ds_bairro: true,
      ds_uf: true,
      ds_telefone: true,
      ds_email: true,
      cd_municipio_ibge: true,
      ds_origem_cadastro: true,
      dt_ultima_ocorrencia_xml: true,
    },
  },
  tms_embarcadores: {
    include: {
      sis_igbe_city: true,
    },
  },
  tms_segmentos: true,
  js_entregas: {
    include: entregaInclude,
    orderBy: { nr_sequencia: 'asc' as const },
  },
  tms_viagens_cargas: {
    include: {
      tms_viagens: true,
    },
  },
  tms_motoristas_veiculos: {
    include: {
      tms_veiculos: {
        select: {
          ds_placa: true,
        },
      },
    },
  },
  js_cargas_ctes: {
    include: {
      js_cte: {
        include: {
          fis_documento_dfe: { select: { id: true } },
        },
      },
    },
  },
  js_cargas_nfes: {
    include: {
      js_nfe: {
        include: {
          fis_documento_dfe: { select: { id: true } },
        },
      },
    },
  },
  tms_cargas_container: {
    include: {
      sis_armadores: true,
    },
  },
  tms_carroceria_planejada: {
    select: {
      id: true,
      ds_placa: true,
      ds_nome: true,
    },
  },
} as Prisma.tms_cargasInclude;

/**
 * Include padrão para buscar uma viagem com todas as suas cargas
 */
export const viagemInclude = {
  js_viagens_cargas: {
    include: {
      tms_cargas: {
        include: cargaInclude,
      },
    },
    orderBy: { nr_sequencia: 'asc' as const },
  },
} as Prisma.tms_viagensInclude;

/**
 * Select enxuto para listagem de entregas (sem documentos detalhados)
 */
export const entregaListSelect = {
  id: true,
  cd_entrega: true,
  ds_status: true,
  id_carga: true,
  id_cidade_destino: true,
  dt_limite_entrega: true,
  dt_entrega: true,
  nr_sequencia: true,
  dt_created: true,
  _count: {
    select: {
      js_entregas_ctes: true,
      js_entregas_nfes: true,
    },
  },
  sis_cidade_destino: {
    select: {
      ds_city: true,
      ds_state: true,
    },
  },
} as Prisma.tms_entregasInclude;

/**
 * Select enxuto para listagem de cargas (sem entregas detalhadas)
 */
export const cargaListSelect = {
  id: true,
  cd_carga: true,
  ds_status: true,
  id_cidade_origem: true,
  ds_prioridade: true,
  vl_peso_bruto: true,
  vl_cubagem: true,
  dt_created: true,
  _count: {
    select: {
      js_entregas: true,
    },
  },
  sis_cidade_origem: {
    select: {
      ds_city: true,
      ds_state: true,
    },
  },
} as Prisma.tms_cargasInclude;

/**
 * Select enxuto para listagem de viagens
 */
export const viagemListSelect = {
  id: true,
  cd_viagem: true,
  ds_status: true,
  ds_motorista: true,
  ds_placa_cavalo: true,
  dt_agendada: true,
  dt_conclusao: true,
  dt_created: true,
  _count: {
    select: {
      js_viagens_cargas: true,
    },
  },
} as Prisma.tms_viagensInclude;

/**
 * Type inference para usar nos tipos
 */
export type EntregaWithDocumentos = Prisma.tms_entregasGetPayload<{
  include: typeof entregaInclude;
}>;

export type CargaWithEntregas = Prisma.tms_cargasGetPayload<{
  include: typeof cargaInclude;
}>;

export type ViagemWithCargas = Prisma.tms_viagensGetPayload<{
  include: typeof viagemInclude;
}>;
