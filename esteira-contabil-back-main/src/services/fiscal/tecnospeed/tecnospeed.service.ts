import axios, { AxiosInstance } from 'axios';
import {
  fis_empresas_tecnospeed,
  PrismaClient,
  StatusDocumento,
  StatusExtracao,
} from '@prisma/client';
import { ImportarXmlNfseService } from '../onvio/nfse-parser.service';
import { getFiscalEmpresa } from '../fiscal-empresa.service';
import { getCachedData } from '../../../core/cache';
import FormData from 'form-data';
import { decryptPassword } from '@/services/sistema/core/certificate-security';
import { createConsumoIntegracao } from '@/services/administrativo/consumo-integracao.service';
import { prisma } from '@/services/prisma';
import { createDocumentoHistorico } from '../documento.service';
import {
  extrairDadosCancelamentoNfse,
  extrairCancelamentoDoXml,
} from '../nfse-cancelamento.service';

const TOKEN_SH = 'f1bb566b0d366e11faba574c87e02e49';
const CPF_CNPJ_SH = '39878647000156';
const POLL_INTERVAL_MS = 5_000;

const BASE_URL = 'https://api.nfse.tecnospeed.com.br/v1';
const TOMADAS_URL = `${BASE_URL}/tomadas`;

export const getEmpresaTecnospeed = async (
  empresaId: string
): Promise<fis_empresas_tecnospeed> => {
  return getCachedData(`fiscal_empresa_tecnospeed_${empresaId}`, async () => {
    const fisEmpresa = await getFiscalEmpresa(empresaId);
    let empresaFiscal = await prisma.fis_empresas_tecnospeed.findUnique({
      where: { id_fis_empresas: fisEmpresa.id },
    });

    if (!empresaFiscal) {
      empresaFiscal = await prisma.fis_empresas_tecnospeed.create({
        data: { id_fis_empresas: fisEmpresa.id },
      });
      await enviarCertificadosTecnospeed(empresaId);
      empresaFiscal = await prisma.fis_empresas_tecnospeed.findUnique({
        where: { id_fis_empresas: fisEmpresa.id },
      });
    }

    return empresaFiscal;
  });
};

export async function enviarCertificadosTecnospeed(empresaId: string) {
  console.log(`\nEnviando certificado para TecnoSpeed`);
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: { ds_documento: true },
  });
  if (!empresa) throw new Error(`Empresa ${empresaId} não encontrada.`);

  const fisEmp = await getFiscalEmpresa(empresaId);
  const tecnoEmp = await getEmpresaTecnospeed(empresaId);
  if (!fisEmp) {
    throw new Error(`fis_empresas não encontrado para ${empresaId}`);
  } else if (
    tecnoEmp.dt_certificado_expiracao !== null &&
    new Date() <= new Date(tecnoEmp.dt_certificado_expiracao)
  ) {
    return;
  }
  const hoje = new Date();
  const cert = await prisma.sis_certificados.findFirst({
    where: { id_empresa: empresaId, dt_expiracao: { gt: hoje } },
    orderBy: { dt_expiracao: 'asc' },
  });
  if (!cert) throw new Error('Nenhum certificado válido encontrado.');

  const senha = decryptPassword(cert.ds_senha);
  const base64Clean = cert.ds_pfx.replace(/^data:.*;base64,/, '');
  const pfxBuffer = Buffer.from(base64Clean, 'base64');

  const form = new FormData();
  form.append('arquivo', pfxBuffer, {
    filename: cert.ds_nome_arquivo || 'certificado.pfx',
    contentType: 'application/x-pkcs12',
    knownLength: pfxBuffer.length,
  });
  form.append('senha', senha);

  const length = await new Promise<number>((res, rej) =>
    form.getLength((err, len) => (err ? rej(err) : res(len)))
  );

  const headers = {
    ...form.getHeaders(),
    'Content-Length': length,
    token_sh: TOKEN_SH,
    cpfCnpjSoftwareHouse: CPF_CNPJ_SH,
    cpfCnpjTomador: empresa.ds_documento,
  };
  let tentativas = 0;
  let certificadoId: { id?: string } = {};
  do {
    try {
      const resp = await axios.post(`${BASE_URL}/certificados`, form, {
        headers,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      const { resposta } = resp.data ?? {};
      if (!resposta?.id) {
        throw new Error(`Resposta inesperada: ${JSON.stringify(resp.data)}`);
      }

      console.log(`Certificado cadastrado!`);

      await prisma.fis_empresas_tecnospeed.update({
        where: { id: tecnoEmp.id },
        data: {
          id_tecnospeed_certificado: resposta.id,
          dt_certificado_expiracao: cert.dt_expiracao,
        },
      });

      certificadoId = resposta;
      return resposta.id;
    } catch (e: any) {
      tentativas++;
      const msg = e.response?.data
        ? JSON.stringify(e.response.data)
        : e.message;
      console.error(
        `Falha ao cadastrar certificado (tentativa ${tentativas}): ${msg}`
      );
      await new Promise((r) => setTimeout(r, 1000));
    }
  } while (!certificadoId.id && tentativas < 3);
}

export const SincronizarCidadesHomologadas = async () => {
  const resp = await fetch(`${BASE_URL}/cidades`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      token_sh: TOKEN_SH,
      CpfCnpjSoftwareHouse: CPF_CNPJ_SH,
      cpfCnpjTomador: CPF_CNPJ_SH,
    } as any,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);

  const cfg = (await resp.json()) as {
    resposta: Array<{
      nome: string;
      padrao: string;
      consultarNotasTomada: boolean;
      tipoComunicacao: string;
      prestadorObrigatorioTomadas: boolean;
      possuiPaginacao?: boolean;
      certificado: boolean;
      login?: boolean;
      codigoIbge: string;
    }>;
    acoes: Record<string, { url: string; metodo: string; descricao: string }>;
  };

  for (const item of cfg.resposta) {
    await prisma.fis_tecnospeed_cidade_homologada.upsert({
      where: { ds_ibge_codigo: item.codigoIbge },
      update: {
        ds_nome: item.nome,
        ds_padrao: item.padrao,
        fl_consultar_notas_tomada: item.consultarNotasTomada,
        fl_prestador_obrigatorio: item.prestadorObrigatorioTomadas,
        fl_precisa_certificado: item.certificado,
        fl_requer_login: item.login || false,
        fl_paginar: item.possuiPaginacao || false,
        ds_tipo_comunicacao: item.tipoComunicacao,
      },
      create: {
        ds_ibge_codigo: item.codigoIbge,
        ds_nome: item.nome,
        ds_padrao: item.padrao,
        fl_consultar_notas_tomada: item.consultarNotasTomada,
        fl_requer_login: item.login || false,
        fl_prestador_obrigatorio: item.prestadorObrigatorioTomadas,
        fl_precisa_certificado: item.certificado,
        fl_paginar: item.possuiPaginacao || false,
        ds_tipo_comunicacao: item.tipoComunicacao,
      },
    });
  }
};

export const SincronizarProtocolosTecnoSpeed = async (
  empresaId: string,
  competencia: string
) => {
  let sisEmpresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: {
      ds_documento: true,
      ds_inscricao_municipal: true,
      ds_municipio: true,
      ds_uf: true,
    },
  });
  if (!sisEmpresa?.ds_documento)
    throw new Error(`sis_empresas inválido: ${empresaId}`);

  if (!sisEmpresa.ds_municipio || !sisEmpresa.ds_uf) {
    try {
      const r = await fetch(
        `https://www.receitaws.com.br/v1/cnpj/${sisEmpresa.ds_documento}`
      );
      if (r.ok) {
        const j: any = await r.json();
        const mun = j.municipio?.trim();
        const uf = j.uf?.trim().toUpperCase();
        if (mun && uf) {
          await prisma.sis_empresas.update({
            where: { id: empresaId },
            data: { ds_municipio: mun, ds_uf: uf },
          });
          sisEmpresa = { ...sisEmpresa, ds_municipio: mun, ds_uf: uf };
        }
      }
    } catch (e) {
      console.warn('ReceitaWS falhou:', e);
    }
  }
  // data de competencia, vindo como YYYY-MM e deve ser verificado se não passa o dia atual, tornando a data inválida
  const tecnoEmp = await getEmpresaTecnospeed(empresaId);
  prisma.fis_empresas_tecnospeed.update({
    where: {
      id: tecnoEmp.id,
    },
    data: {
      ds_status_consulta: 'ENVIO',
    },
  });
  const [anoStr, mesStr] = competencia.split('-');
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  let inicio: string;
  if (tecnoEmp?.dt_consulta_api) {
    const ultima = new Date(tecnoEmp.dt_consulta_api);
    const competenciaDate = new Date(`${competencia}-01`);
    // Se a competência for anterior ao mês/ano de dt_consulta_api, usa {competencia}-01
    if (
      competenciaDate.getFullYear() < ultima.getFullYear() ||
      (competenciaDate.getFullYear() === ultima.getFullYear() &&
        competenciaDate.getMonth() < ultima.getMonth())
    ) {
      inicio = `${competencia}-01`;
    } else {
      ultima.setDate(ultima.getDate() + 1);
      const yy = ultima.getFullYear();
      const mm = String(ultima.getMonth() + 1).padStart(2, '0');
      const dd = String(ultima.getDate()).padStart(2, '0');
      inicio = `${yy}-${mm}-${dd}`;
    }
  } else {
    inicio = `${competencia}-01`;
  }
  let fim = '';

  // consts para verificar se o dia passa do dia atual no mês atual
  // se for o mês atual, usa o dia atual; caso contrário, usa o último dia do mês e evita erro de data inválida
  const dataAtual = new Date();
  const anoAtual = dataAtual.getFullYear();
  const mesAtual = dataAtual.getMonth() + 1;

  if (ano === anoAtual && mes === mesAtual) {
    const diaHoje = String(dataAtual.getDate()).padStart(2, '0');
    fim = `${competencia}-${diaHoje}`;
  } else {
    fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;
  }

  const cnpjTomador = sisEmpresa.ds_documento;
  const imTomador = sisEmpresa.ds_inscricao_municipal || '';
  const fisEmpresa = await getFiscalEmpresa(empresaId);

  const batch = await prisma.fis_tecnospeed_process.create({
    data: { id_fis_empresas_tecnospeed: tecnoEmp.id, ds_status: 'PENDING' },
  });
  if (
    sisEmpresa.ds_inscricao_municipal === '' ||
    !sisEmpresa.ds_inscricao_municipal ||
    sisEmpresa.ds_inscricao_municipal === null ||
    sisEmpresa.ds_inscricao_municipal === 'ISENTO'
  ) {
    await prisma.fis_tecnospeed_process.update({
      where: { id: batch.id },
      data: {
        ds_status: 'FAILED',
        ds_mensagem_geral:
          'Inscrição municipal do tomador não informada ou inválida.',
      },
    });
    await prisma.fis_empresas_tecnospeed.update({
      where: { id: tecnoEmp.id },
      data: { ds_status_consulta: 'ERRO' },
    });
    return;
  }
  console.log('Batch', batch.id);
  let payloadDB: any;
  let headersDB: any;
  try {
    const fornecedores = await prisma.fis_fornecedores.findMany({
      where: {
        id_fis_empresas: fisEmpresa.id,
        ds_documento: { not: '' },
        ds_ibge: { notIn: null },
      },
      select: {
        id: true,
        ds_documento: true,
        ds_ibge: true,
        ds_inscricao_municipal: true,
      },
    });
    const cidades = await prisma.fis_tecnospeed_cidade_homologada.findMany({
      where: { fl_requer_login: false },
      select: {
        id: true,
        ds_ibge_codigo: true,
        ds_nome: true,
        ds_tipo_comunicacao: true,
        fl_prestador_obrigatorio: true,
        fl_precisa_certificado: true,
        vl_timeout_ms: true,
        vl_max_retries: true,
      },
    });

    const cidadesAmbNacional =
      await prisma.sis_municipio_ambiente_nacional.findMany({
        where: { is_ativo: true },
        select: { ds_ibge_codigo: true },
      });

    const cidadesSemAmbNacional = cidades.filter(
      (city) =>
        !cidadesAmbNacional.some(
          (cityAmb) => cityAmb.ds_ibge_codigo === city.ds_ibge_codigo
        )
    );
    const cidadesFiltradas = cidadesSemAmbNacional.filter((city) =>
      fornecedores.some(
        (fornecedor) => fornecedor.ds_ibge.toString() === city.ds_ibge_codigo
      )
    );
    // console.log(
    //   `Total de cidades homologadas: ${cidades.length}, porém, apenas ${cidadesSemAmbNacional.length} não estão no ambiente nacional.`
    // );
    // console.log(
    //   `Apenas ${cidadesFiltradas.length} de ${cidadesSemAmbNacional.length} cidades possuem fornecedores correspondentes.`
    // );
    cidadesSemAmbNacional.splice(
      0,
      cidadesSemAmbNacional.length,
      ...cidadesFiltradas
    );
    for (const city of cidadesFiltradas) {
      const prestadores = fornecedores.filter(
        (f) => String(f.ds_ibge) === city.ds_ibge_codigo
      );
      // console.log(
      //   `\nCidade ${city.ds_ibge_codigo} – ${city.ds_nome} › ${prestadores.length} prestadores`
      // );

      const includePrestador = city.fl_prestador_obrigatorio === true;

      const needCert = city.fl_precisa_certificado === true;
      const timeout = city.vl_timeout_ms ?? 30000;
      const maxRetries = city.vl_max_retries ?? 1;
      // console.log(
      //   (
      //     sisEmpresa.ds_municipio.toUpperCase() + sisEmpresa.ds_uf.toUpperCase()
      //   ).trim()
      // );

      // inicialização para controle de IM do tomador em casos onde não é necessário, mas unica forma possivel para fazaer isso, aparentemente é fazendo hardCoded para cada municipio/UF. KK
      let includeIMTomador = false;
      if (
        city.ds_nome ==
        (
          sisEmpresa.ds_municipio.toUpperCase().trim() +
          sisEmpresa.ds_uf.toUpperCase()
        ).trim()
      ) {
        includeIMTomador = true;
      }

      if (!includePrestador) {
        let protocolo: string | null = null;
        let erro: string | null = null;
        let tentativas = 0;

        do {
          tentativas += 1;
          const payload: any = {
            codigoCidade: city.ds_ibge_codigo,
            destinatario: {
              cpfCnpj: cnpjTomador,
              ...(includeIMTomador ? { inscricaoMunicipal: imTomador } : {}),
            },
            periodo: { inicial: inicio, final: fim },
            ...(needCert
              ? { certificado: tecnoEmp.id_tecnospeed_certificado }
              : {}),
          };

          if (needCert && tecnoEmp?.id_tecnospeed_certificado) {
            payload.certificado = tecnoEmp.id_tecnospeed_certificado;
          }

          const headersRest: any = {
            'Content-Type': 'application/json',
            token_sh: TOKEN_SH,
            cpfCnpjSoftwareHouse: CPF_CNPJ_SH,
            cpfCnpjTomador: sisEmpresa.ds_documento,
          };
          if (tecnoEmp?.id_tecnospeed_certificado) {
            headersRest.certificadoid = tecnoEmp.id_tecnospeed_certificado;
          }

          const client: AxiosInstance = axios.create({
            baseURL: TOMADAS_URL,
            headers: headersRest,
            timeout,
            ...(needCert
              ? { certificado: tecnoEmp.id_tecnospeed_certificado }
              : {}),
          });
          try {
            const resp = await client.post('', payload);
            protocolo =
              resp.data?.resposta?.protocolo ??
              (resp.data as any).protocolo ??
              null;
            if (protocolo) {
            } else {
              erro = JSON.stringify(resp.data);
            }
            payloadDB = payload;
          } catch (e: any) {
            erro = e.response?.data
              ? `HTTP ${e.response.status}: ${JSON.stringify(e.response.data)}`
              : e.message;

            const campos = e.response?.data?.erro?.campos;
            if (
              campos?.['destinatario.inscricaoMunicipal'] ===
              'Preenchimento obrigatório'
            ) {
              let tentativasEspecial = 0;
              do {
                tentativasEspecial += 1;

                const specialPayload = {
                  ...payload,
                  destinatario: {
                    cpfCnpj: cnpjTomador,
                    inscricaoMunicipal: imTomador,
                  },
                };

                try {
                  const resp2 = await client.post('', specialPayload);
                  protocolo = resp2.data?.resposta?.protocolo || null;
                  payloadDB = specialPayload;
                } catch (err2: any) {}

                erro =
                  'Erro de inscrição municipal obrigatório, corrigido com retry especial';
              } while (
                !protocolo &&
                tentativasEspecial < maxRetries &&
                protocolo === null
              );
            }
          }

          if (!protocolo && tentativas < maxRetries) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          }
          headersDB = headersRest;
        } while (!protocolo && tentativas < maxRetries && protocolo === null);
        await prisma.fis_tecnospeed_request.create({
          data: {
            id_process: batch.id,
            id_fis_fornecedor: null,
            ds_cidade_ibge: city.ds_ibge_codigo,
            ds_protocolo: protocolo,
            ds_erro: erro,
            ds_body: JSON.stringify(payloadDB),
            ds_headers: JSON.stringify(headersDB),
            vl_tentativas: tentativas,
            id_cidade_homologada: city.id,
          },
        });

        continue;
      }

      if (prestadores.length === 0) {
        continue;
      }

      for (const forn of prestadores) {
        let protocolo: string | null = null;
        let erro: string | null = null;
        let tentativas = 0;

        do {
          tentativas += 1;
          // console.log(`Tentativa ${tentativas}/${maxRetries}`);

          const payload: any = {
            codigoCidade: city.ds_ibge_codigo,
            destinatario: {
              cpfCnpj: cnpjTomador,
              ...(includeIMTomador ? { inscricaoMunicipal: imTomador } : {}),
            },
            periodo: { inicial: inicio, final: fim },
            prestador: {
              cpfCnpj: forn.ds_documento,
              ...(forn.ds_inscricao_municipal
                ? { inscricaoMunicipal: forn.ds_inscricao_municipal }
                : {}),
            },
          };

          const headersRest: any = {
            'Content-Type': 'application/json',
            token_sh: TOKEN_SH,
            cpfCnpjSoftwareHouse: CPF_CNPJ_SH,
            cpfCnpjTomador: sisEmpresa.ds_documento,
            ...(tecnoEmp?.id_tecnospeed_certificado
              ? { certificadoid: tecnoEmp.id_tecnospeed_certificado }
              : {}),
          };
          headersDB = headersRest;

          const client: AxiosInstance = axios.create({
            baseURL: TOMADAS_URL,
            headers: headersRest,
            timeout,
          });

          try {
            const resp = await client.post('', payload);
            protocolo =
              resp.data?.resposta?.protocolo ??
              (resp.data as any).protocolo ??
              null;
            if (protocolo) {
            } else {
              erro = JSON.stringify(resp.data);
            }
            payloadDB = payload;
          } catch (e: any) {
            {
              let tentativasEspecial = 0;
              do {
                tentativasEspecial += 1;

                const specialPayload = {
                  ...payload,
                  destinatario: {
                    cpfCnpj: cnpjTomador,
                    inscricaoMunicipal: imTomador,
                  },
                };
                try {
                  const resp2 = await client.post('', specialPayload);
                  protocolo = resp2.data?.resposta?.protocolo || null;
                  payloadDB = specialPayload;
                } catch (err2: any) {}
                erro =
                  'Erro de inscrição municipal obrigatório, corrigido com retry especial';
              } while (
                !protocolo &&
                tentativasEspecial < maxRetries &&
                protocolo === null
              );
            }
          }
          if (!protocolo && tentativas < maxRetries) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          }
        } while (!protocolo && tentativas < maxRetries && protocolo === null);

        await prisma.fis_tecnospeed_request.create({
          data: {
            id_process: batch.id,
            id_fis_fornecedor: forn.id,
            ds_cidade_ibge: city.ds_ibge_codigo,
            ds_protocolo: protocolo,
            ds_erro: erro,
            ds_body: JSON.stringify(payloadDB),
            ds_headers: JSON.stringify(headersDB),
            vl_tentativas: tentativas,
            id_cidade_homologada: city.id,
          },
        });
      }
    }
    await prisma.fis_tecnospeed_process.update({
      where: { id: batch.id },
      data: { ds_status: 'COMPLETED' },
    });
    await prisma.fis_empresas_tecnospeed.update({
      where: { id: tecnoEmp.id },
      data: { dt_consulta_api: new Date(fim) },
    });
    await prisma.fis_empresas_tecnospeed.update({
      where: { id: tecnoEmp.id },
      data: { ds_status_consulta: 'COLETA' },
    });
    console.log(' Batch COMPLETED', batch.id);
  } catch (e: any) {
    await prisma.fis_tecnospeed_process.update({
      where: { id: batch.id },
      data: { ds_status: 'FAILED', ds_mensagem_geral: e.message },
    });
    console.error(' Batch FAILED', batch.id, e.message);
    throw e;
  }
};

export const ColetarNotasTecnoSpeed = async (empresaId: string) => {
  let competencia = '';
  const sisEmpresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: { ds_documento: true, ds_inscricao_municipal: true },
  });
  if (!sisEmpresa?.ds_documento) {
    throw new Error(`sis_empresas inválido: ${empresaId}`);
  }
  const tecnoEmp = await getEmpresaTecnospeed(empresaId);
  const lastBatch = await prisma.fis_tecnospeed_process.findFirst({
    where: { id_fis_empresas_tecnospeed: tecnoEmp.id, ds_status: 'COMPLETED' },
    orderBy: { dt_execucao: 'desc' },
  });
  if (!lastBatch) throw new Error('Nenhum batch COMPLETED encontrado.');
  const requests = await prisma.fis_tecnospeed_request.findMany({
    where: { id_process: lastBatch.id, ds_protocolo: { not: null } },
  });
  if (!requests.length) return;
  const importer = new ImportarXmlNfseService();
  for (const req of requests) {
    // console.log('protocolo');
    // console.log(req.ds_protocolo);
    // 1) faz o “pre‐check” do protocolo
    const checkUrl = `${TOMADAS_URL}/${req.ds_protocolo}`;
    const checkResp = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        token_sh: TOKEN_SH,
        cpfCnpjSoftwareHouse: CPF_CNPJ_SH,
        cpfCnpjTomador: sisEmpresa.ds_documento,
      },
    });
    if (!checkResp.ok) {
      // lê o corpo — pode vir HTML ou JSON
      const contentType = checkResp.headers.get('content-type') || '';
      let errorText: string;

      if (contentType.includes('application/json')) {
        const jsonErr = await checkResp.json();
        errorText = jsonErr.resposta?.mensagem ?? JSON.stringify(jsonErr);
      } else {
        // lê como texto e remove tags HTML
        const rawErr = await checkResp.text();
        errorText = rawErr.replace(/<\/?[^>]+(>|$)/g, '').trim();
      }

      // grava o erro no banco e pula para o próximo protocolo
      await prisma.fis_tecnospeed_request.update({
        where: { id: req.id },
        data: { ds_erro: `HTTP ${checkResp.status} — ${errorText}` },
      });
      continue;
    }

    const checkJson = (await checkResp.json()) as any;
    const pre = checkJson.resposta ?? {
      situacao: checkJson.situacao,
      mensagem: checkJson.mensagem,
    };

    if (pre.situacao === 'ERRO') {
      // grava só o erro e segue para o próximo protocolo
      await prisma.fis_tecnospeed_request.update({
        where: { id: req.id },
        data: { ds_erro: pre.mensagem },
      });
      continue;
    }
    let pagina = 1;
    while (true) {
      try {
        const url =
          pagina === 1
            ? `${TOMADAS_URL}/${req.ds_protocolo}/notas`
            : `${TOMADAS_URL}/${req.ds_protocolo}/notas?pagina=${pagina}`;

        const headersGet: any = {
          'Content-Type': 'application/json',
          token_sh: TOKEN_SH,
          cpfCnpjSoftwareHouse: CPF_CNPJ_SH,
          cpfCnpjTomador: sisEmpresa.ds_documento,
        };

        const resp = await fetch(url, {
          method: 'GET',
          headers: headersGet as any,
        });
        if (!resp.ok) {
          throw new Error(
            `HTTP ${resp.status} ao buscar notas (página ${pagina})`
          );
        }
        const jsonBody = (await resp.json()) as any;
        const notas: any[] = jsonBody.resposta?.notas ?? [];
        // console.log(jsonBody.resposta.situacao);
        if (jsonBody.resposta.situacao === 'ERRO') {
          await prisma.fis_tecnospeed_request.update({
            where: {
              id: req.id,
            },
            data: {
              ds_erro: jsonBody.resposta.mensagem,
            },
          });
        }
        if (notas.length === 0) {
          break;
        }

        const rawExistente = await prisma.fis_tecnospeed_raw.findFirst({
          where: { id_request: req.id, pagina },
        });

        if (rawExistente) {
          await prisma.fis_tecnospeed_raw.update({
            where: { id: rawExistente.id },
            data: {
              js_raw: JSON.stringify(jsonBody),
              dt_fetched: new Date(),
            },
          });
        } else {
          await prisma.fis_tecnospeed_raw.create({
            data: {
              id_request: req.id,
              pagina,
              js_raw: JSON.stringify(jsonBody),
              dt_fetched: new Date(),
            },
          });
        }
        let cancelada = false;
        const importedIds: string[] = [];
        for (const notaRaw of notas) {
          const rawProtocolo = await prisma.fis_tecnospeed_raw.findFirst({
            where: {
              id_request: req.id,
            },
            select: {
              id: true,
            },
          });
          if (notaRaw.servicos[0].situacao === 'CANCELADA') {
            cancelada = true;
          } else cancelada = false;
          try {
            const saved = await importer.processXmlData(
              notaRaw,
              empresaId,
              'tecnoSpeed',
              cancelada ? StatusDocumento.CANCELADO : StatusDocumento.IMPORTADO,
              false
            );

            // Se a nota foi cancelada, tentar extrair dados de cancelamento do XML
            if (cancelada && notaRaw.xml) {
              console.log(
                `[NFSE-CANCELAMENTO] Processando cancelamento para NFS-e ${notaRaw.servicos[0].nfse.numero}`
              );
              await processarCancelamentoNfse(
                notaRaw,
                saved.nfse.id,
                sisEmpresa.ds_documento
              );
            }

            if (
              saved.resposta
                ?.toString()
                .includes(
                  `Nota ${saved.nfse.ds_numero} já existe para esta empresa.`
                )
            ) {
              const exists = await prisma.fis_documento_dfe.findFirst({
                where: {
                  id_nfse: saved.nfse.id,
                },
              });
              if (exists) {
                await prisma.fis_documento_dfe.update({
                  where: { id: exists.id },
                  data: {
                    id_protocolo_raw: rawProtocolo?.id || null,
                  },
                });
              }
              continue;
            } else if (
              saved.resposta
                ?.toString()
                .includes(
                  'Formato XML não suportado (abrasf/siegAPI/sieg/tecnoSpeed).'
                )
            ) {
              await prisma.fis_documento_dfe.create({
                data: {
                  ds_error: saved.resposta?.toString(),
                  ds_raw: JSON.stringify(notaRaw),
                  ds_situacao_integracao: StatusExtracao.ERRO,
                  ds_origem: 'DFE_TECNOSPEED_TOMADOS',
                  ds_tipo: 'NFSE',
                },
              });
            } else if (saved.resposta === null) {
              const exists = await prisma.fis_nfse.findFirst({
                where: {
                  id_fis_empresas: tecnoEmp.id_fis_empresas,
                  ds_numero: saved.nfse.ds_numero,
                },
              });
              if (exists && cancelada) {
                const documentoExists = await prisma.fis_documento.findFirst({
                  where: {
                    id_nfse: exists.id,
                    ds_status: {
                      notIn: [
                        StatusDocumento.CANCELADO,
                        StatusDocumento.CONFERIDO_FISCAL,
                        StatusDocumento.DIGITADO_FISCAL,
                      ],
                    },
                  },
                });
                if (documentoExists) {
                  await prisma.fis_documento.update({
                    where: {
                      uniq_nfse_por_empresa: {
                        id_nfse: exists.id,
                        id_fis_empresas: tecnoEmp.id_fis_empresas,
                      },
                    },
                    data: {
                      ds_status: StatusDocumento.CANCELADO,
                    },
                  });
                  createDocumentoHistorico({
                    justificativa: 'Evento de Cancelamento via TecnoSpeed',
                    id_documento: documentoExists.id,
                    status_novo: StatusDocumento.CANCELADO,
                    status_antigo: documentoExists.ds_status,
                  });
                  await prisma.fis_documento_dfe.update({
                    where: {
                      id_nfse: exists.id,
                    },
                    data: {
                      ds_status: StatusDocumento.CANCELADO,
                    },
                  });
                }
              }
              let nota: any = null;
              if (!exists) {
                nota = await prisma.fis_nfse.create({
                  data: { ...saved.nfse },
                });
              } else {
                nota = saved.nfse;
              }
              const fornecedor = await prisma.fis_fornecedores.findFirst({
                where: {
                  id: nota.id_fis_fornecedor,
                },
              });

              const existsDocDfe = await prisma.fis_documento_dfe.findFirst({
                where: {
                  id_nfse: nota.id,
                },
              });

              let docDfe: any = null;
              if (!existsDocDfe) {
                docDfe = await prisma.fis_documento_dfe.create({
                  data: {
                    id_nfse: nota.id,
                    ds_raw: JSON.stringify(notaRaw),
                    ds_error: saved.resposta?.toString() || null,
                    dt_emissao: saved.nfse.dt_emissao,
                    ds_origem: 'DFE_TECNOSPEED_TOMADOS',
                    ds_documento_emitente: fornecedor.ds_documento,
                    ds_documento_tomador: sisEmpresa.ds_documento,
                    ds_situacao_integracao: 'IMPORTADO',
                    ds_tipo: 'NFSE',
                    id_protocolo_raw: rawProtocolo?.id || null,
                    ...(cancelada
                      ? { ds_status: StatusDocumento.CANCELADO }
                      : {}),
                  },
                });
              } else {
                docDfe = await prisma.fis_documento_dfe.update({
                  where: { id: existsDocDfe.id },
                  data: {
                    id_protocolo_raw: rawProtocolo?.id || null,
                  },
                });
              }
              competencia = docDfe.dt_emissao.toISOString().slice(0, 7);
              importedIds.push(nota.id);
              createConsumoIntegracao({
                empresaId,
                dt_competencia: competencia,
                ds_consumo: 1,
                ds_tipo_consumo: 'NFSE_TOMADOS_TECNOSPEED',
                integracaoId: 'Tomados - Tecnospeed',
              });
            }
          } catch (err) {
            console.error(
              `[TecnoSpeed] falha ao importar nota ${notaRaw.id}:`,
              err
            );
          }
        }

        pagina++;
      } catch (e: any) {
        console.error(
          `Falha request ${req.id} (página ${pagina}): ${e.message}`
        );
        break;
      }
    }
  }
  await inclusaoNfseTecnoSpeed(empresaId, competencia).catch((err) => {
    console.error(
      `[TecnoSpeed] Falha ao incluir NFSe após coleta: ${err.message}`
    );
  });
  await prisma.fis_empresas_tecnospeed.update({
    where: { id: tecnoEmp.id },
    data: { ds_status_consulta: 'CONCLUIDO' },
  });
};

export const inclusaoNfseTecnoSpeed = async (
  empresaId: string,
  competencia: string // formato "YYYY-MM"
): Promise<{ importedCount: number; importedIds: string[] }> => {
  let importedCount = 0;
  let importedIds: string[] = [];
  const fisEmp = await getFiscalEmpresa(empresaId);
  const primeiroDia = `${competencia}-01`;
  const docDfeImportados = await prisma.fis_documento_dfe.findMany({
    where: {
      id_fis_documento: null, // só os que ainda não foram importados
      ds_situacao_integracao: 'IMPORTADO',
      ds_origem: 'DFE_TECNOSPEED_TOMADOS',
      dt_emissao: {
        gte: new Date(primeiroDia),
      },
      js_nfse: {
        id_fis_empresas: fisEmp.id,
      },
    },
  });
  if (docDfeImportados.length === 0) {
    return { importedCount: 0, importedIds: [] };
  } else {
    for (const docDfe of docDfeImportados) {
      // console.log(`[TECNOSPEED] Processando DFE para inclusão: ${docDfe.id}`);
      try {
        const docExists = await prisma.fis_documento.findFirst({
          where: {
            id_nfse: docDfe.id_nfse,
            ds_tipo: 'NFSE',
          },
        });
        let integrados: any = null;
        if (!docExists) {
          integrados = await prisma.fis_documento.create({
            data: {
              id_fis_empresas: fisEmp.id,
              ds_tipo: 'NFSE',
              id_nfse: docDfe.id_nfse,
              ds_origem: { sistema: 'api_tecnospeed' },
              ...(docDfe.ds_status === StatusDocumento.CANCELADO
                ? { ds_status: StatusDocumento.CANCELADO }
                : { ds_status: StatusDocumento.IMPORTADO }),
            },
          });
          createDocumentoHistorico({
            justificativa: 'Sincronização Tomados - TecnoSpeed',
            id_documento: integrados.id,
            status_novo: integrados.ds_status,
          });
          importedIds.push(integrados.id);
          importedCount++;
        }
        await prisma.fis_documento_dfe.update({
          where: { id: docDfe.id },
          data: {
            id_fis_documento: integrados.id,
            ds_situacao_integracao: 'INTEGRADO',
          },
        });
      } catch (error) {
        console.error(
          `[TECNOSPEED] Erro ao processar DFE ${docDfe.id}:`,
          error
        );
      }
    }
    return { importedCount, importedIds };
  }
};

/**
 * Processa dados de cancelamento de NFS-e extraídos da Tecnospeed
 * Busca o XML completo via URL e extrai os dados do <NfseCancelamento>
 */
async function processarCancelamentoNfse(
  notaRaw: any,
  nfseId: string,
  cnpjTomador: string
): Promise<void> {
  try {
    const xmlUrl = notaRaw.xml;
    if (!xmlUrl || typeof xmlUrl !== 'string') {
      console.warn('[NFSE-CANCELAMENTO] URL do XML não fornecida');
      return;
    }

    // Headers padrão para requisição na Tecnospeed
    const headers = {
      'Content-Type': 'application/json',
      token_sh: TOKEN_SH,
      cpfCnpjSoftwareHouse: CPF_CNPJ_SH,
      cpfCnpjTomador: cnpjTomador,
    };

    // Buscar e extrair dados de cancelamento do XML
    const cancelData = await extrairDadosCancelamentoNfse(xmlUrl, headers);

    if (!cancelData) {
      console.warn(
        '[NFSE-CANCELAMENTO] Não foi possível extrair dados de cancelamento'
      );
      return;
    }

    // Atualizar fis_nfse com dados de cancelamento
    const dtCancelamento = new Date(cancelData.dataHora);

    const updateData: any = {
      dt_cancelamento: dtCancelamento,
      cd_codigo_cancelamento: cancelData.codigoCancelamento || '1',
      ds_protocolo_cancelamento: cancelData.codigoCancelamento || null,
      ds_xml_cancelamento: cancelData.xmlCompleto,
      ds_status_cancelamento: 'PROCESSADO',
    };

    // Se a nota tem informações de cancelamento do JSON, salvar também
    if (notaRaw.servicos?.[0]?.cancelamento?.data) {
      updateData.ds_justificativa_cancelamento = `Cancelamento ${cancelData.codigoCancelamento === '1' ? 'por solicitação' : 'por evento'} - ${notaRaw.servicos[0].cancelamento.chave || 'sem chave'}`;
    }

    await prisma.fis_nfse.update({
      where: { id: nfseId },
      data: updateData,
    });

    console.log(
      `[NFSE-CANCELAMENTO] Dados de cancelamento salvos com sucesso para NFS-e ${cancelData.numero}`
    );
  } catch (error) {
    console.error('[NFSE-CANCELAMENTO] Erro ao processar cancelamento:', error);
    // Não falha o fluxo completo se o cancelamento não puder ser processado
  }
}
