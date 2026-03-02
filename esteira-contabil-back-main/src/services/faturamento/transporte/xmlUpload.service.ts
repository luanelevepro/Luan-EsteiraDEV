import { DecodedXmlData, UploadResult } from '@/interfaces/Ixmls';
import { prisma } from '@/services/prisma';
import { parseStringPromise } from 'xml2js';
import { ImportarXmlNfeService } from '@/services/fiscal/onvio/nfe-parser.service';
import { ImportarXmlCteService } from '@/services/fiscal/onvio/cte-parser.service';
import { ImportarXmlEventoService } from '@/services/fiscal/onvio/eventos-parser.service';
import { createDocumentoHistorico } from '@/services/fiscal/documento.service';
import { StatusDocumento } from '@prisma/client';

// Mapeamento de códigos de eventos para tipos de status
const MAP_CANCELA = new Set(['110111', '101101']);
const MAP_DESCONHECIMENTO = new Set(['210220']); // Desconhecimento da Operação
const MAP_NAO_REALIZADA = new Set(['210240']); // Operação não Realizada

class XmlUploadService {
  private nfeParser = new ImportarXmlNfeService();
  private cteParser = new ImportarXmlCteService();
  private eventoParser = new ImportarXmlEventoService();

  async convertXMLToJSON(xmlContent: string): Promise<any> {
    try {
      const jsonResult = await parseStringPromise(xmlContent, {
        explicitArray: true,
      });
      return jsonResult;
    } catch (error: any) {
      console.error('Error converting XML to JSON:', error.message);
      throw new Error('Failed to convert XML to JSON');
    }
  }

  async decodeXml(
    xmlContent: string,
    fileName: string
  ): Promise<DecodedXmlData | null> {
    try {
      const parsed = await this.convertXMLToJSON(xmlContent);

      // Verifica se é um documento com evento embutido (procEventoCTe/procEventoNFe)
      if (parsed.procEventoCTe || parsed.procEventoNFe) {
        return {
          type: 'EVENTO',
          rawXml: xmlContent,
          fileName,
          parsedData: parsed,
        };
      }

      if (parsed.nfeProc) {
        return {
          type: 'NFE',
          rawXml: xmlContent,
          fileName,
          parsedData: parsed,
        };
      }

      if (parsed.cteProc) {
        return {
          type: 'CTE',
          rawXml: xmlContent,
          fileName,
          parsedData: parsed,
        };
      }

      console.warn(`Unknown XML format: ${fileName}`);
      return null;
    } catch (error: any) {
      console.error(`Error decoding XML ${fileName}:`, error.message);
      return null;
    }
  }

  async processXmlFiles(
    files: Array<{ buffer: Buffer; fileName: string }>
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const decodedFiles: DecodedXmlData[] = [];

    console.log(`\n[EMAIL_API] Processing ${files.length} XML files...`);

    for (const file of files) {
      try {
        const xmlContent = file.buffer.toString('utf-8');
        const decoded = await this.decodeXml(xmlContent, file.fileName);

        if (decoded) {
          decodedFiles.push(decoded);
          console.log(`Decoded ${decoded.type}: ${file.fileName}`);
        } else {
          results.push({
            success: false,
            fileName: file.fileName,
            type: 'NFE',
            error: 'Unknown XML format or invalid structure',
          });
        }
      } catch (error: any) {
        results.push({
          success: false,
          fileName: file.fileName,
          type: 'NFE',
          error: error.message,
        });
      }
    }

    const nfeFiles = decodedFiles.filter((f) => f.type === 'NFE');
    const cteFiles = decodedFiles.filter((f) => f.type === 'CTE');
    const eventoFiles = decodedFiles.filter((f) => f.type === 'EVENTO');

    console.log(
      `Found ${nfeFiles.length} NFe(s), ${cteFiles.length} CTe(s) and ${eventoFiles.length} Evento(s)`
    );

    // Processar NFes
    for (const nfeFile of nfeFiles) {
      try {
        console.log(`\n[NFe] Processing: ${nfeFile.fileName}`);

        const resultado = await this.nfeParser.processXmlData(
          nfeFile.parsedData,
          'EMAIL_API'
        );

        if (
          resultado.resposta &&
          resultado.resposta.message !== 'NFe já importada'
        ) {
          // Houve erro
          results.push({
            success: false,
            fileName: nfeFile.fileName,
            type: 'NFE',
          });
          console.warn(`Falha ao processar: ${resultado.resposta.message}`);
        } else if (resultado.nfe) {
          // Verificar se NFe já existe
          let nfeRecord = await prisma.fis_nfe.findFirst({
            where: {
              ds_chave: resultado.nfe.ds_chave,
            },
          });
          const documentoDfeRecord = await prisma.fis_documento_dfe.findFirst({
            where: {
              id_nfe: nfeRecord ? nfeRecord.id : undefined,
            },
          });

          if (nfeRecord && documentoDfeRecord) {
            console.log(
              `NFe já existe: ${nfeRecord.ds_chave} (ID: ${nfeRecord.id})`
            );

            // Verificar se fis_documento_dfe existe para essa NFe
            const existingDfe = await prisma.fis_documento_dfe.findFirst({
              where: { id_nfe: nfeRecord.id },
            });

            if (existingDfe) {
              // Se ds_origem for diferente, salvar em histórico
              if (existingDfe.ds_origem !== 'API_EMAIL') {
                const historico =
                  await prisma.fis_documento_dfe_historico.findFirst({
                    where: {
                      id_fis_documento_dfe: existingDfe.id,
                      ds_origem: 'API_EMAIL',
                    },
                  });
                if (historico) {
                  console.log(
                    `Histórico já existe para origem API_EMAIL, pulando criação`
                  );
                } else {
                  await prisma.fis_documento_dfe_historico.create({
                    data: {
                      id_fis_documento_dfe: existingDfe.id,
                      ds_raw: JSON.stringify(nfeFile.parsedData),
                      ds_origem: 'API_EMAIL',
                      ds_error: null,
                    },
                  });
                }
                console.log(
                  `Saved to history: origem=${existingDfe.ds_origem} → API_EMAIL`
                );
              } else {
                console.log(`Skipped: mesma origem (${existingDfe.ds_origem})`);
              }

              results.push({
                success: true,
                fileName: nfeFile.fileName,
                type: 'NFE',
                id: nfeRecord.id,
              });
            }
          } else {
            // NFe não existe: criar novo registro
            if (!nfeRecord) {
              nfeRecord = await prisma.fis_nfe.create({
                data: resultado.nfe as any,
              });
            }

            await prisma.fis_documento_dfe.create({
              data: {
                id_nfe: nfeRecord.id,
                ds_raw: JSON.stringify(nfeFile.parsedData),
                ds_error: null,
                dt_emissao: nfeRecord.dt_emissao,
                ds_origem: 'API_EMAIL',
                ds_documento_emitente: nfeRecord.ds_documento_emitente,
                ds_documento_destinatario: nfeRecord.ds_documento_destinatario,
                ds_documento_transportador:
                  nfeRecord.ds_documento_transportador,
                ds_situacao_integracao: 'IMPORTADO',
                ds_tipo: 'NFE',
              },
            });

            results.push({
              success: true,
              fileName: nfeFile.fileName,
              type: 'NFE',
              id: nfeRecord.id,
            });

            console.log(
              `Saved NFe: ${nfeRecord.ds_chave} (ID: ${nfeRecord.id})`
            );
          }
        }
      } catch (error: any) {
        results.push({
          success: false,
          fileName: nfeFile.fileName,
          type: 'NFE',
          error: error.message,
        });
        console.error(`Erro: ${error.message}`);
      }
    }

    // Processar CTes
    for (const cteFile of cteFiles) {
      try {
        console.log(`\n[CTe] Processing: ${cteFile.fileName}`);

        const resultado = await this.cteParser.processXmlData(
          cteFile.parsedData,
          'EMAIL_API'
        );
        console.log(`CTe parser result:`, resultado);

        // Verificar se resultado é válido
        if (!resultado) {
          throw new Error('Resultado do processamento de CTe é nulo');
        }

        if (
          resultado.resposta &&
          resultado.cte &&
          resultado.resposta.message !==
            `CTe ${resultado.cte.ds_numero} já importado.`
        ) {
          results.push({
            success: true,
            fileName: cteFile.fileName,
            type: 'CTE',
          });
          console.warn(`Falha ao processar: ${resultado.resposta.message}`);
        } else if (resultado.cte) {
          // Verificar se CTe já existe
          let cteRecord = await prisma.fis_cte.findFirst({
            where: {
              ds_chave: resultado.cte.ds_chave,
            },
          });

          if (cteRecord) {
            console.log(
              `CTe já existe: ${cteRecord.ds_chave} (ID: ${cteRecord.id})`
            );

            // Verificar se fis_documento_dfe existe para esse CTe
            const existingDfe = await prisma.fis_documento_dfe.findFirst({
              where: { id_cte: cteRecord.id },
            });

            if (existingDfe) {
              // Se ds_origem for diferente, salvar em histórico
              if (existingDfe.ds_origem !== 'API_EMAIL') {
                const historico =
                  await prisma.fis_documento_dfe_historico.findFirst({
                    where: {
                      id_fis_documento_dfe: existingDfe.id,
                      ds_origem: 'API_EMAIL',
                    },
                  });
                if (historico) {
                  console.log(
                    `Histórico já existe para origem API_EMAIL, pulando criação`
                  );
                } else {
                  await prisma.fis_documento_dfe_historico.create({
                    data: {
                      id_fis_documento_dfe: existingDfe.id,
                      ds_raw: JSON.stringify(cteFile.parsedData),
                      ds_origem: 'API_EMAIL',
                      ds_error: null,
                    },
                  });
                }
                console.log(
                  `Saved to history: origem=${existingDfe.ds_origem} → API_EMAIL`
                );
              } else {
                console.log(`Skipped: mesma origem (${existingDfe.ds_origem})`);
              }

              results.push({
                success: true,
                fileName: cteFile.fileName,
                type: 'CTE',
                id: cteRecord.id,
              });
            }
          } else {
            // CTe não existe: criar novo registro
            cteRecord = await prisma.fis_cte.create({
              data: resultado.cte as any,
            });

            await prisma.fis_documento_dfe.create({
              data: {
                id_cte: cteRecord.id,
                ds_raw: JSON.stringify(cteFile.parsedData),
                ds_error: null,
                dt_emissao: cteRecord.dt_emissao,
                ds_origem: 'API_EMAIL',
                ds_documento_emitente: cteRecord.ds_documento_emitente,
                ds_documento_destinatario: cteRecord.ds_documento_destinatario,
                ds_documento_remetente: cteRecord.ds_documento_remetente,
                ds_documento_tomador: cteRecord.ds_documento_tomador,
                ds_documento_subcontratada:
                  cteRecord.ds_documento_subcontratada,
                ds_situacao_integracao: 'IMPORTADO',
                ds_tipo: 'CTE',
              },
            });
            results.push({
              success: true,
              fileName: cteFile.fileName,
              type: 'CTE',
              id: cteRecord.id,
            });

            console.log(
              `Saved CTe: ${cteRecord.ds_chave} (ID: ${cteRecord.id})`
            );
          }
        }
      } catch (error: any) {
        results.push({
          success: false,
          fileName: cteFile.fileName,
          type: 'CTE',
          error: error.message || 'Erro desconhecido ao processar CTe',
        });
        console.error(`Erro ao processar CTe: ${error.message}`);
        console.error('Stack trace:', error.stack);
      }
    }

    // Processar Eventos
    for (const eventoFile of eventoFiles) {
      try {
        console.log(`\n[EVENTO] Processing: ${eventoFile.fileName}`);

        // Detectar tipo de documento (NFe ou CTe)
        let tipoDoc: 'NFE' | 'CTE' | undefined;
        if (eventoFile.parsedData.procEventoNFe) {
          tipoDoc = 'NFE';
        } else if (eventoFile.parsedData.procEventoCTe) {
          tipoDoc = 'CTE';
        }

        if (!tipoDoc) {
          results.push({
            success: false,
            fileName: eventoFile.fileName,
            type: 'EVENTO',
            error: 'Não foi possível determinar o tipo de evento (NFe/CTe)',
          });
          continue;
        }

        // Processar o evento usando o parser de eventos
        const resultado = await this.eventoParser.processXmlData(
          eventoFile.parsedData,
          '', // idFisEmpresas será preenchido depois
          'API_EMAIL',
          'IMPORTADO' as any,
          tipoDoc
        );

        if (resultado.status === 'ERROR') {
          results.push({
            success: false,
            fileName: eventoFile.fileName,
            type: 'EVENTO',
            error: resultado.error || 'Erro ao processar evento',
          });
          console.warn(`Erro ao processar evento: ${resultado.error}`);
          continue;
        }

        if (!resultado.evento) {
          results.push({
            success: false,
            fileName: eventoFile.fileName,
            type: 'EVENTO',
            error: 'Falha ao preparar dados do evento',
          });
          continue;
        }

        const dsEventoId = resultado.evento.ds_evento_id;
        if (!dsEventoId) {
          results.push({
            success: false,
            fileName: eventoFile.fileName,
            type: 'EVENTO',
            error: 'Evento sem ds_evento_id (Id do infEvento)',
          });
          continue;
        }

        // Extrair código do evento e chave do documento
        const codigoEvento = resultado.evento.cd_codigo_evento;

        // Determinar tipo de evento e status correspondente
        let tipoEvento:
          | 'CANCELADO'
          | 'DESCONHECIMENTO_DA_OPERACAO'
          | 'OPERACAO_NAO_REALIZADA'
          | null = null;
        if (codigoEvento) {
          if (MAP_CANCELA.has(codigoEvento)) {
            tipoEvento = 'CANCELADO';
          } else if (MAP_DESCONHECIMENTO.has(codigoEvento)) {
            tipoEvento = 'DESCONHECIMENTO_DA_OPERACAO';
          } else if (MAP_NAO_REALIZADA.has(codigoEvento)) {
            tipoEvento = 'OPERACAO_NAO_REALIZADA';
          }
        }

        try {
          // Verificar se evento já existe em fis_evento_dfe
          let eventoExistente = await prisma.fis_evento_dfe.findFirst({
            where: {
              ds_evento_id: dsEventoId,
              fis_documento_dfe: resultado.id_documento_dfe
                ? { id: resultado.id_documento_dfe }
                : undefined,
            },
          });

          if (eventoExistente) {
            console.log(
              `Evento já existe: ${eventoExistente.ds_evento_id} (ID: ${eventoExistente.id})`
            );
            console.log(`Skipped: evento já processado`);

            results.push({
              success: true,
              fileName: eventoFile.fileName,
              type: 'EVENTO',
              id: eventoExistente.id,
            });
          } else {
            // Buscar o DFE para obter id_fis_documento
            const dfe = resultado.id_documento_dfe
              ? await prisma.fis_documento_dfe.findUnique({
                  where: { id: resultado.id_documento_dfe },
                  select: { id: true, id_fis_documento: true },
                })
              : null;

            // Criar registro em fis_evento_dfe
            const eventoSalvo = await prisma.fis_evento_dfe.create({
              data: resultado.evento as any,
            });

            console.log(
              `✅ Evento salvo em fis_evento_dfe (ID: ${eventoSalvo.id})`
            );

            // Se tiver id_fis_documento, criar também em fis_evento
            if (dfe?.id_fis_documento) {
              // Verificar se evento já existe em fis_evento
              const eventoFiscalExistente = await prisma.fis_evento.findFirst({
                where: {
                  ds_evento_id: dsEventoId,
                  id_fis_documento: dfe.id_fis_documento,
                },
              });

              if (!eventoFiscalExistente) {
                const eventoFiscal = await prisma.fis_evento.create({
                  data: {
                    ds_evento_id: dsEventoId,
                    ds_chave_doc: resultado.evento.ds_chave_doc,
                    cd_codigo_evento: resultado.evento.cd_codigo_evento,
                    ds_descricao_evento: resultado.evento.ds_descricao_evento,
                    ds_seq_evento: resultado.evento.ds_seq_evento,
                    dt_evento: resultado.evento.dt_evento
                      ? new Date(resultado.evento.dt_evento)
                      : null,
                    ds_justificativa_evento:
                      resultado.evento.ds_justificativa_evento,
                    ds_protocolo: resultado.evento.ds_protocolo,
                    ds_status_retorno: resultado.evento.ds_status_retorno,
                    id_fis_documento: dfe.id_fis_documento,
                  },
                });

                // Atualizar fis_evento_dfe com referência ao evento criado
                await prisma.fis_evento_dfe.update({
                  where: { id: eventoSalvo.id },
                  data: {
                    id_evento: eventoFiscal.id,
                    ds_situacao_integracao: 'INTEGRADO',
                  },
                });

                console.log(
                  `✅ Evento vinculado a fis_evento (ID: ${eventoFiscal.id})`
                );
              }
            }

            // Se for evento que altera status, processar documento fiscal e DFE
            if (tipoEvento && dfe?.id_fis_documento) {
              // Marcar fis_documento_dfe como CANCELADO
              await prisma.fis_documento_dfe.update({
                where: { id: resultado.id_documento_dfe },
                data: { ds_status: 'CANCELADO' },
              });

              // Buscar documento atual para comparação
              const documentoAtual = await prisma.fis_documento.findUnique({
                where: { id: dfe.id_fis_documento },
                select: { id: true, ds_status: true },
              });

              if (documentoAtual) {
                const statusAnterior = documentoAtual.ds_status;
                const novoStatus = StatusDocumento[tipoEvento];

                // Atualizar status do documento fiscal
                await prisma.fis_documento.update({
                  where: { id: documentoAtual.id },
                  data: { ds_status: novoStatus },
                });

                // Criar histórico da alteração
                const justificativaMap: Record<string, string> = {
                  CANCELADO: 'Evento de Cancelamento',
                  DESCONHECIMENTO_DA_OPERACAO:
                    'Evento de Desconhecimento da Operação',
                  OPERACAO_NAO_REALIZADA: 'Evento de Operação não Realizada',
                };

                await createDocumentoHistorico({
                  justificativa: justificativaMap[tipoEvento],
                  id_documento: documentoAtual.id,
                  status_novo: novoStatus,
                  status_antigo: statusAnterior || undefined,
                });

                console.log(
                  `✅ Evento de ${tipoEvento} processado - Documento atualizado (${statusAnterior} → ${novoStatus})`
                );
              }
            } else if (tipoEvento && resultado.id_documento_dfe) {
              // Se não tiver fis_documento, apenas marcar DFE como CANCELADO
              await prisma.fis_documento_dfe.update({
                where: { id: resultado.id_documento_dfe },
                data: { ds_status: 'CANCELADO' },
              });

              console.log(
                `✅ Evento processado - DFE marcado como CANCELADO (ID: ${resultado.id_documento_dfe})`
              );
            }

            results.push({
              success: true,
              fileName: eventoFile.fileName,
              type: 'EVENTO',
              id: eventoSalvo.id,
            });
          }
        } catch (error: any) {
          console.error(`Erro ao salvar evento: ${error.message}`);
          results.push({
            success: false,
            fileName: eventoFile.fileName,
            type: 'EVENTO',
            error: `Erro ao salvar evento: ${error.message}`,
          });
        }
      } catch (error: any) {
        results.push({
          success: false,
          fileName: eventoFile.fileName,
          type: 'EVENTO',
          error: error.message,
        });
        console.error(`Erro: ${error.message}`);
      }
    }

    console.log(
      `\n[EMAIL_API] Complete: ${results.filter((r) => r.success).length}/${results.length} files saved\n`
    );

    return results;
  }
}

export default new XmlUploadService();
