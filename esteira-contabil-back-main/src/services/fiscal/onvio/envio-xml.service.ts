import { Readable } from 'stream';
import FormData from 'form-data';
import https from 'https';
import { URLSearchParams } from 'url';
import { xmlNFe, xmlNotaFiscalServico } from './gerar-xml.service';
import { prisma } from '@/services/prisma';
import { getFiscalEmpresa } from '../fiscal-empresa.service';
import { getEmpresa } from '@/services/sistema/empresa/empresa.service';
import axios from 'axios';
import { createDocumentoHistorico } from '../documento.service';

const ONVIO_AUTH_HOST = 'auth.thomsonreuters.com';
const ONVIO_AUTH_PATH = '/oauth/token';
const ONVIO_API_HOST = 'api.onvio.com.br';
const ONVIO_ACTIVATION_ENABLE_PATH =
  '/dominio/integration/v1/activation/enable';
const ONVIO_SEND_PATH = '/dominio/invoice/v3/batches';
const ONVIO_CONSULT_PATH = '/dominio/invoice/v3/batches';
const CLIENT_ID = process.env.ONVIO_CLIENT_ID;
const CLIENT_SECRET = process.env.ONVIO_CLIENT_SECRET;
const AUDIENCE = process.env.ONVIO_AUDIENCE;
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

function stringToStream(text: string): Readable {
  return Readable.from([text]);
}

async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET || !AUDIENCE) {
    throw new Error(
      'Credenciais da API ONVIO (ONVIO_CLIENT_ID, ONVIO_CLIENT_SECRET, ONVIO_AUDIENCE) não configuradas nas variáveis de ambiente.'
    );
  }

  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  console.log('🔑 Gerando novo Access Token ONVIO...');

  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
    'base64'
  );
  const postData = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    audience: AUDIENCE,
  }).toString();

  const options = {
    hostname: ONVIO_AUTH_HOST,
    path: ONVIO_AUTH_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const data = JSON.parse(body);
            if (data.access_token && data.expires_in) {
              cachedToken = data.access_token;
              tokenExpiry = Date.now() + data.expires_in * 1000;
              console.log(
                `🔑 Novo token gerado. Expira em: ${new Date(
                  tokenExpiry
                ).toLocaleString()}`
              );
              resolve(cachedToken as string);
            } else {
              reject(
                new Error(
                  'Resposta da API de autenticação inválida (sem token ou expires_in): ' +
                    body
                )
              );
            }
          } else {
            reject(
              new Error(
                `Erro ao obter token: Status ${res.statusCode} - ${body}`
              )
            );
          }
        } catch (e: any) {
          reject(
            new Error(
              'Erro ao parsear resposta do token: ' +
                e.message +
                '\nBody: ' +
                body
            )
          );
        }
      });
    });
    req.on('error', (error) =>
      reject(new Error('Erro na requisição do token: ' + error.message))
    );
    req.write(postData);
    req.end();
  });
}

async function getActivationKey(empresaId: string): Promise<string> {
  const sis_empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      ds_integration_key: true,
    },
  });

  if (!sis_empresa) {
    throw new Error(`Empresa com ID ${empresaId} não encontrada.`);
  }

  // Lógica do escritório comentada, conforme original
  // if (!sis_empresa.ds_integration_key && sis_empresa.id_escritorio) {
  //   console.log(`Buscando chave no escritório ${sis_empresa.id_escritorio} para empresa ${empresaId}`);
  //   const escritorio = await prisma.sis_empresas.findUnique({
  //     where: { id: sis_empresa.id_escritorio },
  //     select: { ds_integration_key: true },
  //   });
  //   if (escritorio?.ds_integration_key) {
  //      console.log("Chave encontrada no escritório.");
  //      return escritorio.ds_integration_key;
  //   }
  // }

  if (!sis_empresa.ds_integration_key) {
    throw new Error(
      `Chave de integração inicial (ds_integration_key) não configurada para a empresa ${empresaId}.`
    );
  }

  return sis_empresa.ds_integration_key;
}

/**
 * Gera a Integration Key final (usada para envio/consulta) chamando a API /activation/enable.
 * REQUER a chave de ativação inicial (activationKey).
 * **NÃO ARMAZENA** a chave gerada.
 */
async function generateFinalIntegrationKey(
  activationKey: string
): Promise<string> {
  const accessToken = await getAccessToken();
  console.log(
    `🔑 Gerando Integration Key final via API usando a Activation Key: ${activationKey.substring(
      0,
      5
    )}...`
  );

  const options = {
    hostname: ONVIO_API_HOST,
    path: ONVIO_ACTIVATION_ENABLE_PATH,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-integration-key': activationKey,
      'Content-Length': 0,
      Accept: 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const data = JSON.parse(body);
            if (data.integrationKey) {
              console.log(
                `✅ Integration Key final gerada com sucesso: ${data.integrationKey.substring(
                  0,
                  5
                )}...`
              );
              resolve(data.integrationKey);
            } else {
              reject(
                new Error(
                  "Resposta da API /activation/enable não contém 'integrationKey': " +
                    body
                )
              );
            }
          } else {
            reject(
              new Error(
                `Erro ao gerar Integration Key final: Status ${
                  res.statusCode
                } - ${body}. Verifique se a Activation Key (${activationKey.substring(
                  0,
                  5
                )}...) é válida.`
              )
            );
          }
        } catch (e: any) {
          reject(
            new Error(
              'Erro ao parsear resposta da geração da Integration Key: ' +
                e.message +
                '\nBody: ' +
                body
            )
          );
        }
      });
    });
    req.on('error', (error) =>
      reject(
        new Error(
          'Erro na requisição para /activation/enable: ' + error.message
        )
      )
    );
    req.end();
  });
}

export async function enviarListaXmlParaOnvio(
  empresaId: string,
  notasFiscaisIds: string[]
): Promise<string[]> {
  const resultados: string[] = [];
  for (const notaFiscalID of notasFiscaisIds) {
    try {
      const resultado = await enviarXmlParaOnvio(empresaId, notaFiscalID);
      resultados.push(resultado);
      console.log(`Nota ${notaFiscalID} enviada com sucesso: ${resultado}`);
    } catch (error) {
      console.error(`Erro ao enviar XML da nota ${notaFiscalID}:`, error);
      // resultados.push(`Erro: ${notaFiscalID} - ${error.message}`);
    }
  }

  if (resultados.length === 0) {
    throw new Error('Nenhum XML enviado com sucesso.');
  }

  console.log(
    `Processamento concluído: ${resultados.length}/${notasFiscaisIds.length} notas enviadas`
  );
  return resultados;
}

export async function enviarXmlParaOnvio(
  empresaId: string,
  notaFiscalID: string
): Promise<string> {
  const accessToken = await getAccessToken();

  const activationKey = await getActivationKey(empresaId);
  const finalIntegrationKey = await generateFinalIntegrationKey(activationKey);
  const xmlContent = await xmlNotaFiscalServico(empresaId, notaFiscalID);
  if (!xmlContent) {
    throw new Error(
      `XML da nota fiscal ${notaFiscalID} não encontrado ou inválido.`
    );
  }
  const boxeFile = false;

  console.log(
    `📤 Enviando XML da nota ${notaFiscalID} para ONVIO usando a chave gerada: ${finalIntegrationKey.substring(
      0,
      5
    )}...`
  );

  return new Promise(async (resolve, reject) => {
    const form = new FormData();
    form.append('file[]', stringToStream(xmlContent), {
      contentType: 'application/xml',
      filename: `nota_${notaFiscalID}.xml`,
    });
    form.append('query', JSON.stringify({ boxeFile }), {
      contentType: 'application/json',
      filename: 'query.json',
    });

    const headers = {
      ...form.getHeaders(),
      Authorization: `Bearer ${accessToken}`,
      'x-integration-key': finalIntegrationKey,
    };

    // Create an integration log entry (PENDING) so we have an audit trail
    let integracaoLog: any = null;
    try {
      const fisEmp = await getFiscalEmpresa(empresaId);
      integracaoLog = await prisma.fis_integracao_documentos.create({
        data: {
          id_fis_empresas: fisEmp.id,
          id_fis_nfe: notaFiscalID,
          action: 'SEND',
          status: 'PENDING',
          ds_destination: 'ONVIO',
          ds_filename: `nota_${notaFiscalID}.xml`,
          ds_raw:
            typeof xmlContent === 'string' ? xmlContent : String(xmlContent),
          attempts: 0,
          dt_sent: new Date(),
        },
      });
    } catch (err: any) {
      console.warn(
        'Não foi possível criar log de integração (não-fatal):',
        err?.message || err
      );
    }

    form.submit(
      {
        method: 'POST',
        host: ONVIO_API_HOST,
        path: ONVIO_SEND_PATH,
        headers: headers,
        protocol: 'https:',
      },
      async (err, res) => {
        if (err) {
          console.error('Erro ao submeter formulário de envio:', err);
          try {
            if (integracaoLog) {
              await (prisma as any).fis_integracao_documentos.update({
                where: { id: integracaoLog.id },
                data: {
                  attempts: { increment: 1 },
                  status: 'FAILED',
                  ds_response: String(err?.message || err),
                  dt_finished: new Date(),
                },
              });
            }
          } catch (uerr) {
            console.warn(
              'Falha ao atualizar log de integração após erro de submit:',
              uerr?.message || uerr
            );
          }
          return reject(
            new Error(
              `Falha na comunicação ao enviar lote para ONVIO. Contate o suporte.`
            )
          );
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', async () => {
          const body = Buffer.concat(chunks).toString();
          console.log(
            `📬 Resposta do envio (Status ${res.statusCode}): ${body}`
          );

          try {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              const json = JSON.parse(body);
              if (json.id) {
                console.log(
                  `✅ Lote enviado com sucesso. ID do lote: ${json.id}`
                );

                // Consultar o status do lote para verificar se o arquivo foi armazenado
                const batchStatus = await consultarLote(empresaId, json.id);

                // Verificar se o arquivo foi armazenado com sucesso (apiStatus.code === "SA2")
                const fileStatus = batchStatus.filesExpanded?.[0]?.apiStatus;
                if (fileStatus?.code === 'SA2') {
                  console.log(
                    `✅ Arquivo armazenado com sucesso na API. Atualizando status para INTEGRACAO_ESCRITA.`
                  );
                  try {
                    if (integracaoLog) {
                      await (prisma as any).fis_integracao_documentos.update({
                        where: { id: integracaoLog.id },
                        data: {
                          attempts: { increment: 1 },
                          status: 'SUCCESS',
                          ds_lote_id: String(json.id),
                          ds_response: body,
                          dt_finished: new Date(),
                        },
                      });
                    }
                  } catch (uerr) {
                    console.warn(
                      'Falha ao atualizar log de integração após sucesso:',
                      uerr?.message || uerr
                    );
                  }
                  await updateProcessamento(notaFiscalID, json.id, empresaId);
                  resolve(json.id);
                } else {
                  // Mensagem de retorno (lowercase para comparações)
                  const rawMsg = String(fileStatus?.message ?? '');
                  const msg = rawMsg.toLowerCase();

                  // Verificar se o erro é "Documento já existe na API" - considerar como sucesso
                  const isDocumentAlreadyExists =
                    msg.includes('documento já existe') ||
                    msg.includes('Documento já existe') ||
                    msg.includes('documento ja existe') ||
                    msg.includes('documento already exists');

                  // Verificar se o arquivo está apenas 'aguardando validação' — também considerar como sucesso
                  const isWaitingValidation =
                    msg.includes('aguardando valida') ||
                    msg.includes('Aguardando valida') ||
                    msg.includes('aguarde o arquivo ser valid') ||
                    msg.includes('aguarde o arquivo ser validado') ||
                    msg.includes('aguarde o arquivo');

                  if (isDocumentAlreadyExists || isWaitingValidation) {
                    console.log(
                      `⚠️ Arquivo não armazenado definitivamente, mas tratado como sucesso (motivo: ${rawMsg}). Atualizando status para INTEGRACAO_ESCRITA.`
                    );
                    try {
                      if (integracaoLog) {
                        await (prisma as any).fis_integracao_documentos.update({
                          where: { id: integracaoLog.id },
                          data: {
                            attempts: { increment: 1 },
                            status: 'SUCCESS',
                            ds_lote_id: String(json.id),
                            ds_response: body,
                            dt_finished: new Date(),
                          },
                        });
                      }
                    } catch (uerr) {
                      console.warn(
                        'Falha ao atualizar log de integração (already exists):',
                        uerr?.message || uerr
                      );
                    }
                    await updateProcessamento(notaFiscalID, json.id, empresaId);
                    resolve(json.id);
                  } else {
                    const errorMessage = `Arquivo não foi armazenado na API: ${fileStatus?.message}`;
                    console.log(errorMessage);
                    try {
                      if (integracaoLog) {
                        await (prisma as any).fis_integracao_documentos.update({
                          where: { id: integracaoLog.id },
                          data: {
                            attempts: { increment: 1 },
                            status: 'FAILED',
                            ds_response: body,
                            dt_finished: new Date(),
                          },
                        });
                      }
                    } catch (uerr) {
                      console.warn(
                        'Falha ao atualizar log de integração após falha do fileStatus:',
                        uerr?.message || uerr
                      );
                    }
                    reject(new Error(errorMessage));
                  }
                }
              } else {
                try {
                  if (integracaoLog) {
                    await (prisma as any).fis_integracao_documentos.update({
                      where: { id: integracaoLog.id },
                      data: {
                        attempts: { increment: 1 },
                        status: 'FAILED',
                        ds_response: body,
                        dt_finished: new Date(),
                      },
                    });
                  }
                } catch (uerr) {
                  console.warn(
                    'Falha ao atualizar log de integração (sem lote id):',
                    uerr?.message || uerr
                  );
                }
                reject(
                  new Error(
                    'Resposta da API de envio bem-sucedida, mas não contém ID do lote: ' +
                      body
                  )
                );
              }
            } else {
              try {
                if (integracaoLog) {
                  await (prisma as any).fis_integracao_documentos.update({
                    where: { id: integracaoLog.id },
                    data: {
                      attempts: { increment: 1 },
                      status: 'FAILED',
                      ds_response: body,
                      dt_finished: new Date(),
                    },
                  });
                }
              } catch (uerr) {
                console.warn(
                  'Falha ao atualizar log de integração após status não-sucesso:',
                  uerr?.message || uerr
                );
              }
              console.error(
                `Erro no envio para ONVIO: Status ${res.statusCode} - ${body}`
              );
              reject(
                new Error(
                  `Falha na integração com o Onvio (Status ${res.statusCode}). Verifique os dados ou contate o suporte.`
                )
              );
            }
          } catch (e: any) {
            try {
              if (integracaoLog) {
                await (prisma as any).fis_integracao_documentos.update({
                  where: { id: integracaoLog.id },
                  data: {
                    attempts: { increment: 1 },
                    status: 'FAILED',
                    ds_response: body,
                    dt_finished: new Date(),
                  },
                });
              }
            } catch (uerr) {
              console.warn(
                'Falha ao atualizar log de integração após erro de parse:',
                uerr?.message || uerr
              );
            }
            console.error('Erro ao processar resposta JSON do envio:', e);
            reject(
              new Error(
                'Resposta inválida (não-JSON?) da API de envio: ' + body
              )
            );
          }
        });
        res.on('error', (error) => {
          (async () => {
            try {
              if (integracaoLog) {
                await (prisma as any).fis_integracao_documentos.update({
                  where: { id: integracaoLog.id },
                  data: {
                    attempts: { increment: 1 },
                    status: 'FAILED',
                    ds_response: String(error?.message || error),
                    dt_finished: new Date(),
                  },
                });
              }
            } catch (uerr) {
              console.warn(
                'Falha ao atualizar log de integração após erro de stream:',
                uerr?.message || uerr
              );
            }
            console.error('Erro na stream de resposta do envio:', error);
            reject(
              new Error(
                `Erro de comunicação na resposta do envio ONVIO: ${error.message}`
              )
            );
          })();
        });
      }
    );
  });
}

export async function consultarLote(
  empresaId: string,
  loteId: string
): Promise<any> {
  const accessToken = await getAccessToken();

  const activationKey = await getActivationKey(empresaId);

  const finalIntegrationKey = await generateFinalIntegrationKey(activationKey);

  console.log(
    `🔍 Consultando status do lote ${loteId} usando a chave gerada: ${finalIntegrationKey.substring(
      0,
      5
    )}...`
  );

  const options = {
    hostname: ONVIO_API_HOST,
    path: `${ONVIO_CONSULT_PATH}/${loteId}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-integration-key': finalIntegrationKey,
      Accept: 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        console.log(
          `📬 Resposta da consulta (Status ${res.statusCode}): ${body}`
        );

        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(body);
            console.log(
              '📦 Status do lote:',
              json.status?.message || 'Status não encontrado na resposta'
            );
            resolve(json);
          } else {
            reject(
              new Error(
                `Erro na consulta do lote ${loteId}: Status ${res.statusCode} - ${body}`
              )
            );
          }
        } catch (err: any) {
          console.error('Erro ao processar resposta JSON da consulta:', err);
          reject(
            new Error(
              'Erro ao parsear resposta da consulta (não-JSON?): ' + body
            )
          );
        }
      });
      res.on('error', (error) => {
        console.error('Erro na stream de resposta da consulta:', error);
        reject(
          new Error(
            `Erro de comunicação na resposta da consulta ONVIO: ${error.message}`
          )
        );
      });
    });

    req.on('error', (error) => {
      console.error('Erro na requisição de consulta:', error);
      reject(
        new Error(
          `Falha na comunicação ao consultar lote ${loteId}: ${error.message}`
        )
      );
    });

    req.end();
  });
}

export async function updateProcessamento(
  notaId: string,
  processamentoId: string,
  empresaId: string
) {
  const fisEmp = await getFiscalEmpresa(empresaId);
  try {
    await prisma.$transaction([
      prisma.fis_nfse.update({
        where: { id: notaId },
        data: { ds_id_processamento: processamentoId },
      }),
      prisma.fis_documento.update({
        where: {
          uniq_nfse_por_empresa: {
            id_nfse: notaId,
            id_fis_empresas: fisEmp.id,
          },
        },
        data: { ds_status: 'INTEGRACAO_ESCRITA' },
      }),
    ]);
    const docId = await prisma.fis_documento.findUnique({
      where: {
        uniq_nfse_por_empresa: {
          id_nfse: notaId,
          id_fis_empresas: fisEmp.id,
        },
      },
      select: { id: true, ds_status: true },
    });
    createDocumentoHistorico({
      justificativa: 'Documento encontrado após verificação SAT',
      id_documento: docId.id,
      status_novo: 'INTEGRACAO_ESCRITA',
      status_antigo: docId.ds_status,
    });

    console.log(
      `💾 Status atualizado no banco para nota ${notaId} (Lote ONVIO: ${processamentoId})`
    );
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.warn(
        `⚠️ Aviso: Registro não encontrado para atualização no banco (NFSe ${notaId} ou Documento associado).`
      );
    } else {
      console.error(
        `Erro crítico ao atualizar processamento no banco para nota ${notaId}:`,
        error
      );
    }
  }
}

export const integrarNfeEntradaDominio = async (
  id_empresa: string,
  id_nfe: string[],
  dt_competencia?: string,
  opts: { enviarEmUmaRequisicao?: boolean } = { enviarEmUmaRequisicao: true }
) => {
  const empresa = await getEmpresa(id_empresa);
  const escritorio = await prisma.sis_empresas.findFirst({
    where: { id: empresa.id_escritorio },
    select: {
      ds_url: true,
    },
  });
  const base = empresa.ds_url || escritorio?.ds_url;
  if (!base) throw new Error('URL da API Domínio não configurada');

  const url = `${base.replace(/\/$/, '')}/integrar/nfe/entrada`;

  const ds_documento_empresa = String(empresa.ds_documento ?? '1');
  const cd_empresa = String(empresa.id_externo ?? '1');
  const competencia = dt_competencia;

  const commonHeaders = (fd: FormData) => ({
    ...fd.getHeaders(),
  });

  if (opts.enviarEmUmaRequisicao) {
    const form = new FormData();
    form.append('ds_documento_empresa', ds_documento_empresa);
    form.append('cd_empresa', cd_empresa);
    form.append('dt_competencia', dt_competencia);

    // Apenas anexar NF-e com XML disponível; se xmlNFe retornar null, pulamos o envio.
    const enviados: string[] = [];

    for (const nfeId of id_nfe) {
      const chaveNfe = await prisma.fis_nfe.findUnique({
        where: { id: nfeId },
        select: { ds_chave: true },
      });
      const xml = await xmlNFe(nfeId);
      if (!xml) {
        console.warn(
          `[ONVIO] XML da NFe ${nfeId} não encontrado (provável DFE ausente); nota não será enviada nem atualizada.`
        );
        continue;
      }
      const buf = Buffer.isBuffer(xml) ? xml : Buffer.from(String(xml), 'utf8');
      form.append('arquivo_xml', buf, {
        filename: `${chaveNfe.ds_chave}.xml`,
        contentType: 'application/xml',
      });
      enviados.push(nfeId);
    }

    if (enviados.length === 0) {
      throw new Error(
        'Nenhum XML de NFe disponível para envio (DFE ausente para todas as notas solicitadas).'
      );
    }

    const { status, data } = await axios.post(url, form, {
      headers: commonHeaders(form),
      maxBodyLength: Infinity,
      timeout: 60000,
      responseType: 'text',
      validateStatus: () => true,
    });
    if (status === 502) {
      throw new Error(
        'Erro 502 Possível causa: Sistema Integrador fora do ar.'
      );
    }
    if (status >= 400) {
      throw new Error(
        `Falha ${status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`
      );
    }
    return { status, data, enviados };
  }
  // const resultados: Array<{ id_nfe: string; status: number; data: any }> = [];

  // for (const nfeId of id_nfe) {
  //   const chaveNfe = await prisma.fis_nfe.findUnique({
  //     where: { id: nfeId },
  //     select: { ds_chave: true },
  //   });
  //   const xml = await xmlNFe(nfeId);
  //   const buf = Buffer.isBuffer(xml) ? xml : Buffer.from(String(xml), 'utf8');

  //   const form = new FormData();
  //   form.append('ds_documento_empresa', ds_documento_empresa);
  //   form.append('cd_empresa', cd_empresa);
  //   form.append('dt_competencia', dt_competencia);
  //   form.append('arquivo_xml', buf, {
  //     filename: `${chaveNfe.ds_chave}.xml`,
  //     contentType: 'application/xml',
  //   });

  //   try {
  //     const { status, data } = await axios.post(url, form, {
  //       headers: commonHeaders(form),
  //       maxBodyLength: Infinity,
  //       timeout: 60000,
  //       responseType: 'text',
  //       validateStatus: () => true,
  //     });

  //     if (status >= 400) {
  //       resultados.push({
  //         id_nfe: nfeId,
  //         status,
  //         data: data ?? 'Erro sem corpo de resposta',
  //       });
  //     } else {
  //       resultados.push({ id_nfe: nfeId, status, data });
  //     }
  //   } catch (e: any) {
  //     resultados.push({
  //       id_nfe: nfeId,
  //       status: e?.response?.status ?? 0,
  //       data: e?.response?.data ?? e?.message ?? 'Erro desconhecido',
  //     });
  //   }
  // }
  // return resultados;
};

/**
 * Chama o endpoint do Domínio para reverter integrações de NFe por chave.
 * Envia campos: ds_documento_empresa, cd_empresa, dt_competencia e múltiplos campos 'chaves'.
 */
export const reverterNfeEntradaDominio = async (
  id_empresa: string,
  chaves: string[],
  dt_competencia: string,
  shouldThrow: boolean = true
) => {
  const empresa = await getEmpresa(id_empresa);
  const escritorio = await prisma.sis_empresas.findFirst({
    where: { id: empresa.id_escritorio },
    select: { ds_url: true },
  });
  const base = empresa.ds_url || escritorio?.ds_url;
  if (!base && shouldThrow)
    throw new Error('URL da API Domínio não configurada');

  const url = `${base.replace(/\/$/, '')}/integrar/nfe/entrada/reverter`;

  const ds_documento_empresa = String(empresa.ds_documento ?? '1');
  const cd_empresa = String(empresa.id_externo ?? '1');

  const form = new FormData();
  form.append('ds_documento_empresa', ds_documento_empresa);
  form.append('cd_empresa', cd_empresa);
  form.append('dt_competencia', dt_competencia);

  // append multiple 'chaves' fields
  for (const chave of chaves) {
    form.append('chaves', chave);
  }

  try {
    const { status, data } = await axios.post(url, form, {
      headers: { ...form.getHeaders() },
      maxBodyLength: Infinity,
      timeout: 60000,
      responseType: 'json',
      validateStatus: () => true,
    });

    if (status === 502) {
      if (shouldThrow) {
        throw new Error('Possível causa: Sistema Integrador fora do ar.');
      }
    }

    if (status >= 400) {
      if (shouldThrow) {
        throw new Error(
          `Falha ${status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`
        );
      }
    }

    return { status, data };
  } catch (err: any) {
    // padroniza o erro para ser tratado pelo chamador
    if (shouldThrow) {
      throw new Error(
        err?.response?.data ? JSON.stringify(err.response.data) : err.message
      );
    }
  }
};

/**
 * Wrapper que recebe chaves (strings) e chama o domínio para reverter a integração.
 * Mantém o mesmo estilo da função integrarNfeEntrada (que envia arquivos).
 */
export const reverterIntegracaoNfeEntrada = async (
  id_empresa: string,
  chaves: string[],
  dt_competencia: string,
  shouldThrow: boolean = true
) => {
  if (!chaves || chaves.length === 0) {
    throw new Error('Envie ao menos uma chave para reverter a integração');
  }
  // Delega para a função que chama o Domínio
  const resultado = await reverterNfeEntradaDominio(
    id_empresa,
    chaves,
    dt_competencia,
    shouldThrow
  );
  return resultado;
};
