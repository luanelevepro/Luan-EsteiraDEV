import { prisma } from '@/services/prisma';
import { TMS } from '@/types/tms';
import {
  entregaInclude,
  cargaInclude,
  entregaListSelect,
} from '../../utils/tms/queries';
import {
  validarEntrega,
  calcularStatusCarga,
  podeDeleteEntrega,
  calcularInfoEntrega,
  formatarResposta,
} from '@/utils/tms/tms-helpers';
import { TMS_CONSTANTS } from '@/utils/tms/tms-returns';

/**
 * Service responsável por operações com entregas
 */
export class EntregasService {
  /**
   * Criar uma nova entrega em uma carga
   */
  static async criarEntrega(
    data: TMS.CreateEntregaDTO
  ): Promise<TMS.EntregaComDocumentos> {
    // Validar dados
    const validacao = validarEntrega(data);
    if (!validacao.valido) {
      throw new Error(validacao.erro);
    }

    // Verificar se a carga existe
    const carga = await prisma.tms_cargas.findUnique({
      where: { id: data.id_carga },
    });
    if (!carga) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.CARGA_NAO_ENCONTRADA);
    }

    // Verificar se a cidade existe
    const cidade = await prisma.sis_igbe_city.findUnique({
      where: { id: data.id_cidade_destino },
    });
    if (!cidade) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.CIDADE_NAO_ENCONTRADA);
    }

    // Verificar se já existe uma entrega com essa sequência nessa carga
    const entregaExistente = await prisma.tms_entregas.findUnique({
      where: {
        id_carga_nr_sequencia: {
          id_carga: data.id_carga,
          nr_sequencia: data.nr_sequencia,
        },
      },
    });
    if (entregaExistente) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.SEQUENCIA_DUPLICADA);
    }

    // Criar entrega
    const entrega = await prisma.tms_entregas.create({
      data: {
        id_carga: data.id_carga,
        id_cidade_destino: data.id_cidade_destino,
        nr_sequencia: data.nr_sequencia,
        ds_endereco: data.ds_endereco,
        ds_complemento: data.ds_complemento,
        dt_limite_entrega: data.dt_limite_entrega
          ? new Date(data.dt_limite_entrega)
          : undefined,
        ds_observacoes: data.ds_observacoes,
        vl_peso_bruto: data.vl_peso_bruto,
        vl_cubagem: data.vl_cubagem,
        vl_qtd_volumes: data.vl_qtd_volumes,
        ds_status: TMS_CONSTANTS.STATUS_ENTREGA.PENDENTE,
      },
      include: entregaInclude,
    });

    return entrega as TMS.EntregaComDocumentos;
  }

  /**
   * Atualizar uma entrega
   */
  static async atualizarEntrega(
    id: string,
    data: TMS.UpdateEntregaDTO
  ): Promise<TMS.EntregaComDocumentos> {
    // Verificar se a entrega existe
    const entrega = await prisma.tms_entregas.findUnique({
      where: { id },
    });
    if (!entrega) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.ENTREGA_NAO_ENCONTRADA);
    }

    // Se estiver trocando a cidade, verificar se existe
    if (data.id_cidade_destino) {
      const cidade = await prisma.sis_igbe_city.findUnique({
        where: { id: data.id_cidade_destino },
      });
      if (!cidade) {
        throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.CIDADE_NAO_ENCONTRADA);
      }
    }

    // Atualizar
    const atualizada = await prisma.tms_entregas.update({
      where: { id },
      data: {
        id_cidade_destino: data.id_cidade_destino,
        ds_endereco: data.ds_endereco,
        ds_complemento: data.ds_complemento,
        dt_limite_entrega: data.dt_limite_entrega
          ? new Date(data.dt_limite_entrega)
          : undefined,
        dt_entrega: data.dt_entrega ? new Date(data.dt_entrega) : undefined,
        ds_comprovante_entrega: data.ds_comprovante_entrega,
        ds_comprovante_key: data.ds_comprovante_key,
        ds_observacoes: data.ds_observacoes,
        vl_peso_bruto: data.vl_peso_bruto,
        vl_cubagem: data.vl_cubagem,
        vl_qtd_volumes: data.vl_qtd_volumes,
        ds_status: data.ds_status,
      },
      include: entregaInclude,
    });

    return atualizada as TMS.EntregaComDocumentos;
  }

  /**
   * Deletar uma entrega
   */
  static async deletarEntrega(id: string): Promise<boolean> {
    // Verificar se a entrega existe
    const entrega = await prisma.tms_entregas.findUnique({
      where: { id },
    });
    if (!entrega) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.ENTREGA_NAO_ENCONTRADA);
    }

    // Verificar se pode ser deletada
    const entregaComDocs = await prisma.tms_entregas.findUnique({
      where: { id },
      include: entregaInclude,
    });
    const podeDelete = podeDeleteEntrega(
      entregaComDocs as TMS.EntregaComDocumentos
    );
    if (!podeDelete.pode) {
      throw new Error(podeDelete.motivo);
    }

    // Deletar (cascata deleta documentos automaticamente)
    await prisma.tms_entregas.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Buscar uma entrega por ID com todos os seus documentos
   */
  static async obterEntrega(id: string): Promise<TMS.EntregaComDocumentos> {
    const entrega = await prisma.tms_entregas.findUnique({
      where: { id },
      include: entregaInclude,
    });

    if (!entrega) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.ENTREGA_NAO_ENCONTRADA);
    }

    return entrega as TMS.EntregaComDocumentos;
  }

  /**
   * Reordenar entregas de uma carga.
   * Usa atualização em duas fases para evitar conflitos na chave única (id_carga, nr_sequencia).
   * Valida que todas as entregas pertencem à carga e que nenhuma esteja EM_TRANSITO ou ENTREGUE.
   */
  static async reordenarEntregasCarga(
    idCarga: string,
    entregas: Array<{ id: string; nr_sequencia: number }>
  ): Promise<TMS.EntregasResponse> {
    if (!entregas || entregas.length === 0) {
      throw new Error('entregas deve ser um array não vazio');
    }

    const carga = await prisma.tms_cargas.findUnique({
      where: { id: idCarga },
    });
    if (!carga) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.CARGA_NAO_ENCONTRADA);
    }

    await prisma.$transaction(async (tx) => {
      const OFFSET_TEMP = 9000;

      for (const item of entregas) {
        const entrega = await tx.tms_entregas.findUnique({
          where: { id: item.id },
        });
        if (!entrega) {
          throw new Error(`Entrega ${item.id} não encontrada`);
        }
        if (entrega.id_carga !== idCarga) {
          throw new Error(`Entrega ${item.id} não pertence à carga ${idCarga}`);
        }
        if (
          entrega.ds_status === 'EM_TRANSITO' ||
          entrega.ds_status === 'ENTREGUE'
        ) {
          throw new Error(
            `Não é possível reordenar entrega ${item.id} com status ${entrega.ds_status}`
          );
        }
      }

      // Fase 1: atualizar para valores temporários para evitar conflito de chave única
      for (let i = 0; i < entregas.length; i++) {
        await tx.tms_entregas.update({
          where: { id: entregas[i].id },
          data: { nr_sequencia: OFFSET_TEMP + i },
        });
      }

      // Fase 2: atualizar para valores finais
      for (const item of entregas) {
        await tx.tms_entregas.update({
          where: { id: item.id },
          data: { nr_sequencia: item.nr_sequencia },
        });
      }
    });

    return this.listarEntregasPorCarga(idCarga);
  }

  /**
   * Listar todas as entregas de uma carga
   */
  static async listarEntregasPorCarga(
    idCarga: string
  ): Promise<TMS.EntregasResponse> {
    // Verificar se a carga existe
    const carga = await prisma.tms_cargas.findUnique({
      where: { id: idCarga },
    });
    if (!carga) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.CARGA_NAO_ENCONTRADA);
    }

    // Buscar entregas ordenadas pela sequência
    const entregas = await prisma.tms_entregas.findMany({
      where: { id_carga: idCarga },
      include: entregaInclude,
      orderBy: { nr_sequencia: 'asc' },
    });

    return {
      sucesso: true,
      mensagem: `${entregas.length} entrega(s) encontrada(s)`,
      entregas: entregas as TMS.EntregaComDocumentos[],
      totalEntregas: entregas.length,
    };
  }

  /**
   * Vincular documentos (CTes e/ou NFes) a uma entrega
   */
  static async adicionarDocumentos(
    idEntrega: string,
    documentos: Array<{ id: string; tipo: 'CTE' | 'NFE' }>
  ): Promise<TMS.EntregaComDocumentos> {
    console.log('[adicionarDocumentos] Iniciando:', { idEntrega, documentos });

    // Verificar se a entrega existe
    const entrega = await prisma.tms_entregas.findUnique({
      where: { id: idEntrega },
    });
    if (!entrega) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.ENTREGA_NAO_ENCONTRADA);
    }

    console.log('[adicionarDocumentos] Entrega encontrada:', entrega.id);

    // Processar documentos
    let totalAdicionados = 0;

    for (const doc of documentos) {
      // Buscar o documento DFE para obter o id_cte ou id_nfe
      const documentoDfe = await prisma.fis_documento_dfe.findUnique({
        where: { id: doc.id },
      });

      if (!documentoDfe) {
        console.warn(`Documento DFE não encontrado: ${doc.id}`);
        continue;
      }

      if (doc.tipo === 'CTE') {
        if (!documentoDfe.id_cte) {
          console.warn(`Documento DFE ${doc.id} não possui id_cte`);
          continue;
        }

        // Verificar se o CTE existe
        const cte = await prisma.fis_cte.findUnique({
          where: { id: documentoDfe.id_cte },
        });
        if (!cte) {
          console.warn(`CTe não encontrado: ${documentoDfe.id_cte}`);
          continue;
        }

        // Verificar se já está vinculado
        const jaVinculado = await prisma.tms_entregas_cte.findUnique({
          where: {
            id_entrega_id_cte: {
              id_entrega: idEntrega,
              id_cte: documentoDfe.id_cte,
            },
          },
        });
        if (jaVinculado) {
          console.warn(`CTe já vinculado: ${documentoDfe.id_cte}`);
          continue;
        }

        // Contar CTes existentes para determinar a ordem
        const countCtes = await prisma.tms_entregas_cte.count({
          where: { id_entrega: idEntrega },
        });

        // Criar vinculação
        await prisma.tms_entregas_cte.create({
          data: {
            id_entrega: idEntrega,
            id_cte: documentoDfe.id_cte,
            ordem: countCtes + 1,
          },
        });

        console.log(
          `[adicionarDocumentos] CTe vinculado: ${documentoDfe.id_cte} ordem ${countCtes + 1}`
        );
        totalAdicionados++;
      } else if (doc.tipo === 'NFE') {
        if (!documentoDfe.id_nfe) {
          console.warn(`Documento DFE ${doc.id} não possui id_nfe`);
          continue;
        }

        // Verificar se a NFe existe
        const nfe = await prisma.fis_nfe.findUnique({
          where: { id: documentoDfe.id_nfe },
        });
        if (!nfe) {
          console.warn(`NFe não encontrada: ${documentoDfe.id_nfe}`);
          continue;
        }

        // Verificar se já está vinculada
        const jaVinculada = await prisma.tms_entregas_nfe.findUnique({
          where: {
            id_entrega_id_nfe: {
              id_entrega: idEntrega,
              id_nfe: documentoDfe.id_nfe,
            },
          },
        });
        if (jaVinculada) {
          console.warn(`NFe já vinculada: ${documentoDfe.id_nfe}`);
          continue;
        }

        // Contar NFes existentes para determinar a ordem
        const countNfes = await prisma.tms_entregas_nfe.count({
          where: { id_entrega: idEntrega },
        });

        // Criar vinculação
        await prisma.tms_entregas_nfe.create({
          data: {
            id_entrega: idEntrega,
            id_nfe: documentoDfe.id_nfe,
            ordem: countNfes + 1,
          },
        });

        console.log(
          `[adicionarDocumentos] NFe vinculada: ${documentoDfe.id_nfe} ordem ${countNfes + 1}`
        );
        totalAdicionados++;
      }
    }

    // Retornar entrega atualizada
    const entregaAtualizada = await prisma.tms_entregas.findUnique({
      where: { id: idEntrega },
      include: entregaInclude,
    });

    if (!entregaAtualizada) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.ENTREGA_NAO_ENCONTRADA);
    }

    console.log(`${totalAdicionados} documento(s) adicionado(s) à entrega`);

    return entregaAtualizada as TMS.EntregaComDocumentos;
  }

  /**
   * Remover um documento de uma entrega
   */
  static async removerDocumento(
    idEntrega: string,
    idDocumento: string,
    tipo: 'CTE' | 'NFE'
  ): Promise<TMS.EntregaComDocumentos> {
    // Verificar se a entrega existe
    const entrega = await prisma.tms_entregas.findUnique({
      where: { id: idEntrega },
    });
    if (!entrega) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.ENTREGA_NAO_ENCONTRADA);
    }

    if (tipo === 'CTE') {
      await prisma.tms_entregas_cte.delete({
        where: {
          id_entrega_id_cte: {
            id_entrega: idEntrega,
            id_cte: idDocumento,
          },
        },
      });
    } else if (tipo === 'NFE') {
      await prisma.tms_entregas_nfe.delete({
        where: {
          id_entrega_id_nfe: {
            id_entrega: idEntrega,
            id_nfe: idDocumento,
          },
        },
      });
    }

    // Retornar entrega atualizada
    const entregaAtualizada = await prisma.tms_entregas.findUnique({
      where: { id: idEntrega },
      include: entregaInclude,
    });

    if (!entregaAtualizada) {
      throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.ENTREGA_NAO_ENCONTRADA);
    }

    return entregaAtualizada as TMS.EntregaComDocumentos;
  }

  /**
   * Obter informações resumidas de uma entrega
   */
  static async obterInfoEntrega(id: string): Promise<TMS.EntregaStatusInfo> {
    const entrega = await this.obterEntrega(id);
    return calcularInfoEntrega(entrega);
  }

  /**
   * Atualizar status de uma entrega e da carga pai se necessário.
   * Ao marcar como ENTREGUE, preenche dt_entrega para que a carga conste no fechamento do motorista.
   * @param dt_entrega Opcional: data/hora da entrega (ISO string ou Date); se não informado, usa now.
   */
  static async atualizarStatusEntrega(
    idEntrega: string,
    novoStatus: string,
    dt_entrega?: string | Date
  ): Promise<TMS.EntregaComDocumentos> {
    const updateData: TMS.UpdateEntregaDTO = { ds_status: novoStatus as any };
    if (novoStatus === TMS_CONSTANTS.STATUS_ENTREGA.ENTREGUE) {
      updateData.dt_entrega =
        dt_entrega != null ? new Date(dt_entrega) : new Date();
    }
    const atualizada = await this.atualizarEntrega(idEntrega, updateData);

    // Atualizar status da carga baseado nas entregas
    const carga = await prisma.tms_cargas.findUnique({
      where: { id: atualizada.id_carga },
      include: { js_entregas: true },
    });

    if (carga && carga.js_entregas) {
      const novoStatusCarga = calcularStatusCarga(carga.js_entregas as any);
      await prisma.tms_cargas.update({
        where: { id: carga.id },
        data: { ds_status: novoStatusCarga },
      });
    }

    return atualizada;
  }

  /**
   * Contar documentos de uma entrega
   */
  static async contarDocumentos(
    idEntrega: string
  ): Promise<{ ctes: number; nfes: number; total: number }> {
    const [ctes, nfes] = await Promise.all([
      prisma.tms_entregas_cte.count({
        where: { id_entrega: idEntrega },
      }),
      prisma.tms_entregas_nfe.count({
        where: { id_entrega: idEntrega },
      }),
    ]);

    return {
      ctes,
      nfes,
      total: ctes + nfes,
    };
  }

  /**
   * Criar múltiplas entregas com documentos em uma transação
   * Novo endpoint para suportar o fluxo de agrupamento inteligente
   */
  static async criarEntregasComDocumentos(
    idCarga: string,
    entregas: Array<{
      id_cidade_destino: number;
      nr_sequencia: number;
      ds_endereco?: string;
      ds_complemento?: string;
      dt_limite_entrega?: string;
      ds_observacoes?: string;
      vl_total_mercadoria?: number;
      js_produtos?: string[];
      documentosIds: string[]; // IDs dos documentos a vincular
    }>,
    idViagem?: string
  ): Promise<TMS.ApiResponse<TMS.EntregaComDocumentos[]>> {
    try {
      // Validar carga
      const carga = await prisma.tms_cargas.findUnique({
        where: { id: idCarga },
      });
      if (!carga) {
        throw new Error(TMS_CONSTANTS.MENSAGENS.ERROS.CARGA_NAO_ENCONTRADA);
      }

      if (idViagem) {
        const viagem = await prisma.tms_viagens.findUnique({
          where: { id: idViagem },
          select: { id: true },
        });
        if (!viagem) {
          throw new Error('Viagem não encontrada');
        }
      }

      const entregasCriadas: TMS.EntregaComDocumentos[] = [];

      // Executar em transação com timeout aumentado
      await prisma.$transaction(
        async (tx) => {
          if (idViagem) {
            const vinculoExistente = await tx.tms_viagens_cargas.findFirst({
              where: {
                id_viagem: idViagem,
                id_carga: idCarga,
              },
              select: { id: true },
            });

            if (!vinculoExistente) {
              const ultimaSequencia = await tx.tms_viagens_cargas.findFirst({
                where: { id_viagem: idViagem },
                orderBy: { nr_sequencia: 'desc' },
                select: { nr_sequencia: true },
              });

              const isFirstItem = ultimaSequencia == null;
              await tx.tms_viagens_cargas.create({
                data: {
                  id_viagem: idViagem,
                  id_carga: idCarga,
                  nr_sequencia: (ultimaSequencia?.nr_sequencia ?? 0) + 1,
                  ds_status: isFirstItem
                    ? ('DISPONIVEL' as const)
                    : ('BLOQUEADO' as const),
                },
              });

              // Atualizar carga com o id_motorista_veiculo da viagem
              const viagem = await tx.tms_viagens.findUnique({
                where: { id: idViagem },
                select: { id_motorista_veiculo: true },
              });
              if (viagem?.id_motorista_veiculo) {
                await tx.tms_cargas.update({
                  where: { id: idCarga },
                  data: { id_motorista_veiculo: viagem.id_motorista_veiculo },
                });
              }
            }
          }

          const ultimaEntrega = await tx.tms_entregas.findFirst({
            where: { id_carga: idCarga },
            orderBy: { nr_sequencia: 'desc' },
            select: { nr_sequencia: true },
          });
          let nextSequencia = (ultimaEntrega?.nr_sequencia ?? 0) + 1;

          for (const entregaData of entregas) {
            // Validar cidade
            const cidade = await tx.sis_igbe_city.findUnique({
              where: { id: entregaData.id_cidade_destino },
            });
            if (!cidade) {
              throw new Error(
                `Cidade ${entregaData.id_cidade_destino} não encontrada para entrega ${entregaData.nr_sequencia}`
              );
            }

            let nrSequencia = entregaData.nr_sequencia;
            if (!nrSequencia || nrSequencia <= 0) {
              nrSequencia = nextSequencia++;
            } else {
              const entregaExistente = await tx.tms_entregas.findUnique({
                where: {
                  id_carga_nr_sequencia: {
                    id_carga: idCarga,
                    nr_sequencia: nrSequencia,
                  },
                },
              });
              if (entregaExistente) {
                nrSequencia = nextSequencia++;
              }
            }

            // Criar entrega
            const entrega = await tx.tms_entregas.create({
              data: {
                id_carga: idCarga,
                id_cidade_destino: entregaData.id_cidade_destino,
                nr_sequencia: nrSequencia,
                ds_endereco: entregaData.ds_endereco,
                ds_complemento: entregaData.ds_complemento,
                dt_limite_entrega: entregaData.dt_limite_entrega
                  ? new Date(entregaData.dt_limite_entrega)
                  : undefined,
                ds_observacoes: entregaData.ds_observacoes,
                vl_total_mercadoria:
                  entregaData.vl_total_mercadoria ?? undefined,
                js_produtos: entregaData.js_produtos ?? [],
                ds_status: TMS_CONSTANTS.STATUS_ENTREGA.PENDENTE,
              },
              include: entregaInclude,
            });

            // Vincular documentos
            for (const docId of entregaData.documentosIds) {
              const doc = await tx.fis_documento_dfe.findUnique({
                where: { id: docId },
                select: {
                  ds_tipo: true,
                  js_cte: { select: { id: true } },
                  js_nfe: { select: { id: true } },
                },
              });

              if (!doc) {
                throw new Error(`Documento ${docId} não encontrado`);
              }

              if (doc.ds_tipo === 'CTE' && doc.js_cte?.id) {
                const countCtes = await tx.tms_entregas_cte.count({
                  where: { id_entrega: entrega.id },
                });

                await tx.tms_entregas_cte.create({
                  data: {
                    ordem: countCtes + 1,
                    js_entregas: { connect: { id: entrega.id } },
                    js_cte: { connect: { id: doc.js_cte.id } },
                  },
                });
              } else if (doc.ds_tipo === 'NFE' && doc.js_nfe?.id) {
                const countNfes = await tx.tms_entregas_nfe.count({
                  where: { id_entrega: entrega.id },
                });

                await tx.tms_entregas_nfe.create({
                  data: {
                    ordem: countNfes + 1,
                    js_entregas: { connect: { id: entrega.id } },
                    js_nfe: { connect: { id: doc.js_nfe.id } },
                  },
                });
              }
            }

            entregasCriadas.push(entrega);
          }
        },
        {
          timeout: 30000, // 30 segundos ao invés dos 5 padrões
        }
      );

      return {
        sucesso: true,
        mensagem: `${entregasCriadas.length} entrega(s) criada(s) com sucesso`,
        dados: entregasCriadas,
      };
    } catch (error: any) {
      console.error('Erro ao criar entregas com documentos:', error);
      return {
        sucesso: false,
        mensagem: `Erro ao criar entregas: ${error.message}`,
        erros: [error.message],
      };
    }
  }
}
