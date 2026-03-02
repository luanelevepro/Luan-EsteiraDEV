import { NfseOrigem, Prisma, PrismaClient } from '@prisma/client';
import { getFiscalEmpresa } from './fiscal-empresa.service';
import { prisma } from '../prisma';
import {
  sincronizarFornecedoresBlackList,
  sincronizarFornecedoresByEmpresaId,
} from './fornecedor.service';
import { createConsumoIntegracao } from '../administrativo/consumo-integracao.service';
import { reverterIntegracaoNfeEntrada } from './onvio/envio-xml.service';
import { sincronizarProdutos } from './produto.service';
import { createDocumentoHistorico } from './documento.service';
// Função utilitária para limpar CNPJ
const cleanCnpj = (cnpj: string): string => {
  if (!cnpj) return cnpj;
  return cnpj.replace(/[^\d]/g, '');
};

// Função utilitária para normalizar números de nota fiscal
const normalizeNotaFiscalNumber = (numero: string): string => {
  if (!numero) return numero;
  // Se for uma string numérica, remover zeros à esquerda
  if (/^\d+$/.test(numero)) {
    return String(parseInt(numero, 10));
  }
  return numero;
};

// Converte para string garantindo que undefined/null vire string vazia
const safeToString = (v: any): string => {
  if (v === undefined || v === null) return '';
  try {
    return v.toString();
  } catch {
    return String(v);
  }
};

// Função para criar range de data (início e fim do dia)
const getDateRange = (dateString: string) => {
  const baseDate =
    dateString.includes('T') || dateString.includes(' ')
      ? dateString.split('T')[0].split(' ')[0]
      : dateString;

  const startOfDay = new Date(`${baseDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${baseDate}T23:59:59.999Z`);

  return { startOfDay, endOfDay };
};

// Obtém todas as notas fiscais de uma empresa
export const getNotasFiscais = async (empresaId: string) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  return prisma.fis_nfse.findMany({
    where: { id_fis_empresas: fis_empresa.id },
  });
};

// Obtém uma nota fiscal específica por ID
export const getNotaFiscalById = async (empresaId: string, id: string) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  return prisma.fis_nfse.findUnique({
    where: { id, id_fis_empresas: fis_empresa.id },
    include: {
      fis_fornecedor: true,
    },
  });
};

// Cria uma nova nota fiscal
export const createNotaFiscal = async (
  empresaId: string,
  data: any,
  usuarioId: string
) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);

  // Normalize ds_numero to handle leading zeros
  if (data.ds_numero) {
    data.ds_numero = normalizeNotaFiscalNumber(data.ds_numero);
  }

  try {
    const notaFiscal = await prisma.fis_nfse.create({
      data: {
        ...data,
        ds_origem: NfseOrigem.ESTEIRA,
        id_fis_empresas: fis_empresa.id,
      },
    });

    const documento = await prisma.fis_documento.create({
      data: {
        id_fis_empresas: fis_empresa.id,
        id_nfse: notaFiscal.id,
        ds_status: 'DIGITADO',
        ds_tipo: 'NFSE',
      },
    });
    await createDocumentoHistorico({
      justificativa: 'Criação da nota fiscal manual',
      id_documento: documento.id,
      id_usuario: usuarioId,
      status_novo: 'DIGITADO',
    });
    return notaFiscal;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as any).code === 'P2002' &&
      (error as any).meta?.target?.includes('id_fis_empresas') &&
      (error as any).meta?.target?.includes('ds_numero')
    ) {
      throw new Error(
        'Já existe uma nota fiscal com este número para esta empresa.'
      );
    }

    throw error;
  }
};

// Atualiza uma nota fiscal existente
export const updateNotaFiscal = async (
  empresaId: string,
  id: string,
  data: any
) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);

  // Normalize ds_numero to handle leading zeros
  if (data.ds_numero) {
    data.ds_numero = normalizeNotaFiscalNumber(data.ds_numero);
  }
  const existing = await prisma.fis_nfse.findUnique({ where: { id } });
  if (!existing || existing.id_fis_empresas !== fis_empresa.id) {
    throw new Error('Nota fiscal não encontrada ou sem permissão.');
  }

  const allowedFields = [
    'ds_numero',
    'dt_emissao',
    'dt_saida_entrega',
    'dt_competencia',
    'ds_codigo_verificacao',
    'ds_discriminacao',
    'ds_valor_liquido_nfse',
    'ds_valor_servicos',
    'ds_valor_retencoes',
    'ds_valor_descontos',
    'ds_valor_pis',
    'ds_valor_cofins',
    'ds_valor_inss',
    'ds_valor_ir',
    'ds_valor_csll',
    'ds_outras_retencoes',
    'ds_rps_numero',
    'ds_rps_serie',
    'ds_rps_tipo',
    'dt_rps_emissao',
    'ds_id_processamento',
    'ds_codigo_cnae',
    'ds_codigo_municipio',
    'ds_valor_iss',
    'is_iss_retido',
    'is_optante_simples_nacional',
    'js_servicos',
  ];

  const payload: any = {};
  for (const f of allowedFields) {
    if (
      Object.prototype.hasOwnProperty.call(data, f) &&
      data[f] !== undefined
    ) {
      payload[f] = data[f];
    }
  }

  if (data.fis_fornecedor && data.fis_fornecedor.id) {
    payload.fis_fornecedor = { connect: { id: data.fis_fornecedor.id } };
  } else if (data.id_fis_fornecedor) {
    payload.fis_fornecedor = { connect: { id: data.id_fis_fornecedor } };
  }
  payload.fis_empresas = { connect: { id: fis_empresa.id } };

  return prisma.fis_nfse.update({ where: { id }, data: payload });
};

// Deleta uma nota fiscal
export const deleteNotaFiscal = async (empresaId: string, id: string) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);

  const notaFiscal = await prisma.fis_nfse.findUnique({
    where: { id, id_fis_empresas: fis_empresa.id },
  });

  if (!notaFiscal) {
    throw new Error('Nota fiscal não encontrada ou sem permissão.');
  }

  await prisma.fis_documento.delete({
    where: {
      uniq_nfse_por_empresa: {
        id_nfse: notaFiscal.id,
        id_fis_empresas: fis_empresa.id,
      },
    },
  });

  await prisma.fis_nfse.delete({
    where: { id, id_fis_empresas: fis_empresa.id },
  });

  return notaFiscal;
};

export const sincronizarDominioNfseByEmpresaId = async (
  empresaId: string,
  competencia: string
) => {
  try {
    const fisEmp = await getFiscalEmpresa(empresaId);

    const fornBase = await prisma.fis_fornecedores.findMany({
      where: { id_fis_empresas: fisEmp.id },
      select: { id_externo: true, ds_documento: true },
    });
    await sincronizarFornecedoresBlackList(empresaId, fornBase);

    const emp = await prisma.sis_empresas.findUnique({
      where: { id: empresaId },
      select: {
        ds_url: true,
        id: true,
        id_escritorio: true,
        is_escritorio: true,
        id_externo: true,
      },
    });
    if (!emp) throw new Error('Empresa não encontrada');

    const esc = emp.is_escritorio
      ? emp
      : await prisma.sis_empresas.findUnique({
          where: { id: emp.id_escritorio ?? undefined },
          select: { ds_url: true, id_externo: true },
        });

    if (!esc) throw new Error('Escritório não encontrado');

    const url = `${esc.ds_url}/dados/entradas/empresa/${emp.id_externo}/mes/${competencia}/tipo/nfse`;
    createConsumoIntegracao({
      empresaId,
      dt_competencia: new Date().toString(),
      ds_consumo: 1,
      ds_tipo_consumo: 'API_DOMINIO',
      integracaoId: 'dominio',
    });
    const txt = await (
      await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    ).text();
    if (!txt.trim()) throw new Error('Domínio devolveu vazio.');
    let notasApi: any[];
    try {
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) notasApi = parsed;
      else if (parsed == null) notasApi = [];
      else notasApi = [parsed];
    } catch {
      throw new Error('JSON inválido.');
    }

    const primeiroDia = new Date(`${competencia}-01T00:00`);
    const ultimoDia = new Date(
      primeiroDia.getFullYear(),
      primeiroDia.getMonth() + 1,
      0
    );
    const notas = notasApi.filter((n) => new Date(n.dt_emissao) >= primeiroDia);

    const fornecedores = await prisma.fis_fornecedores.findMany({
      where: { id_fis_empresas: fisEmp.id },
    });
    const mapExt = new Map<string, (typeof fornecedores)[0]>();
    const mapCnpj = new Map<string, (typeof fornecedores)[0]>();
    fornecedores.forEach((f) => {
      if (f.id_externo) mapExt.set(f.id_externo.toString(), f);
      mapCnpj.set(cleanCnpj(f.ds_documento), f);
    });
    const resolveForn = (n: any) =>
      mapExt.get(n.id_fornecedor_externo?.toString() || '') ||
      mapCnpj.get(cleanCnpj(n.ds_documento_fornecedor)) ||
      null;

    const semForn = await prisma.fis_nfse.findMany({
      where: { id_fis_empresas: fisEmp.id, id_fis_fornecedor: null },
      select: { id: true, ds_numero: true },
    });
    const mapSemForn = new Map(semForn.map((f) => [f.ds_numero, f.id]));
    let processadas = 0;
    const vistos = new Set<string>();

    for (const nota of notas) {
      let statusDoc;
      const isCancelado = Number(nota.ds_situacao_entrada || 0) === 2;
      statusDoc = isCancelado
        ? 'CANCELADO'
        : nota.ds_conferido === 'S'
          ? 'CONFERIDO_FISCAL'
          : 'DIGITADO_FISCAL';

      const numero = normalizeNotaFiscalNumber(
        nota.ds_numero_documento?.toString()
      );
      if (!numero || vistos.has(numero)) continue;
      vistos.add(numero);

      const forn = resolveForn(nota);
      if (!forn) {
        console.warn(`NF ${numero} ignorada – fornecedor não encontrado`);
        continue;
      }
      const idSemForn = mapSemForn.get(numero);
      if (idSemForn) {
        await prisma.fis_nfse.update({
          where: { id: idSemForn },
          data: { id_fis_fornecedor: forn.id },
        });
        continue;
      }

      const dtEmis = new Date(nota.dt_emissao);
      const dtComp =
        nota.dt_competencia && nota.dt_competencia !== '1900-01-01'
          ? new Date(nota.dt_competencia)
          : dtEmis;

      const toCents = (v: string | number | null | undefined) =>
        (parseFloat((v as any) || '0') * 100).toString();

      const vTotal = toCents(nota.ds_valor_total);
      const vDeducao = toCents(nota.ds_valor_exclusao);
      const vPis = toCents(nota.ds_valor_pis);
      const vCofins = toCents(nota.ds_valor_cofins);
      const vExc01 = toCents(nota.ds_valor_exclusao_01);
      const vExc03 = toCents(nota.ds_valor_exclusao_03);
      const vExc04 = toCents(nota.ds_valor_exclusao_04);

      // Criar range de data para busca mais flexível
      const { startOfDay, endOfDay } = getDateRange(nota.dt_emissao);

      // Primeiro, tentar encontrar NFSe existente com critérios mais flexíveis
      let nfseExistente = await prisma.fis_nfse.findFirst({
        where: {
          id_fis_empresas: fisEmp.id,
          ds_numero: numero,
          id_fis_fornecedor: forn.id,
          ds_valor_servicos: vTotal,
        },
      });
      if (!nfseExistente) {
        nfseExistente = await prisma.fis_nfse.findFirst({
          where: {
            id_fis_empresas: fisEmp.id,
            ds_numero: numero,
            dt_emissao: dtEmis,
          },
        });
        if (!nfseExistente) {
          nfseExistente = await prisma.fis_nfse.findFirst({
            where: {
              id_fis_empresas: fisEmp.id,
              ds_numero: numero,
              dt_emissao: { lte: endOfDay, gte: startOfDay },
            },
          });
          // Se não encontrou pelo fornecedor, buscar apenas por empresa, número e data
          if (!nfseExistente) {
            nfseExistente = await prisma.fis_nfse.findFirst({
              where: {
                id_fis_empresas: fisEmp.id,
                ds_numero: numero,
                ds_valor_servicos: vTotal,
                ds_codigo_verificacao: (nota.ds_chave_nfse || '').replace(
                  /[^a-zA-Z0-9]/g,
                  ''
                ),
              },
            });
          }
        }
      }
      let nfse;
      if (nfseExistente) {
        // Atualizar registro existente
        nfse = await prisma.fis_nfse.update({
          where: { id: nfseExistente.id },
          data: {
            id_fis_fornecedor: forn.id, // Garantir que o fornecedor esteja correto
            dt_competencia: dtComp,
            ds_valor_servicos: vTotal,
            ds_valor_deducoes: vDeducao,
            ds_valor_pis: vPis,
            ds_valor_cofins: vCofins,
            ds_outras_retencoes: vExc01,
            ds_desconto_incondicionado: vExc03,
            ds_desconto_condicionado: vExc04,
            ds_discriminacao: nota.ds_observacao || '',
          },
        });
      } else {
        // Criar novo registro
        nfse = await prisma.fis_nfse.create({
          data: {
            id_fis_empresas: fisEmp.id,
            id_fis_fornecedor: forn.id,
            ds_numero: numero,
            dt_emissao: dtEmis,
            dt_competencia: dtComp,
            ds_valor_servicos: vTotal,
            ds_valor_deducoes: vDeducao,
            ds_valor_pis: vPis,
            ds_valor_cofins: vCofins,
            ds_valor_inss: '0',
            ds_valor_ir: '0',
            ds_valor_csll: '0',
            ds_outras_retencoes: vExc01,
            ds_desconto_incondicionado: vExc03,
            ds_desconto_condicionado: vExc04,
            ds_codigo_municipio: String(nota.ds_codigo_municipio ?? '0'),
            ds_codigo_cnae: '',
            ds_rps_numero: numero,
            ds_rps_serie: nota.ds_serie_documento || '',
            ds_rps_tipo: String(nota.ds_tipo_ate ?? 0),
            dt_rps_emissao: dtEmis,
            ds_id_processamento: String(nota.id_externo ?? ''),
            ds_codigo_verificacao: (nota.ds_chave_nfse || '').replace(
              /[^a-zA-Z0-9]/g,
              ''
            ),
            ds_discriminacao: nota.ds_observacao || '',
            ds_origem: 'DOMINIO',
          },
        });
      }

      await prisma.fis_documento.upsert({
        where: {
          uniq_nfse_por_empresa: {
            id_nfse: nfse.id,
            id_fis_empresas: fisEmp.id,
          },
        },
        create: {
          id_fis_empresas: fisEmp.id,
          id_nfse: nfse.id,
          ds_status: statusDoc,
          ds_tipo: 'NFSE',
          ds_origem: { sistema: 'worker_dominio' },
        },
        update: { ds_status: statusDoc },
      });

      processadas++;

      // console.log(`Sincronização concluída – ${processadas} NFSE(s) processadas.`);
    }
    return `${processadas} NFSE(s) processadas.`;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `Erro ao sincronizar dados do Domínio para ${empresaId}:`,
      errorMsg
    );
    throw error;
  }
};

function swapYearMonthSafe(input: string): string {
  if (typeof input !== 'string') throw new TypeError('input must be a string');
  const m = input.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error('Formato inválido: esperado YYYY-MM');
  const [, year, month] = m;
  return `${month}-${year}`;
}

export const sincronizarDominioNfeByEmpresaId = async (
  empresaId: string,
  competencia: string,
  usuarioId?: string
) => {
  try {
    const sisEmp = await prisma.sis_empresas.findUnique({
      where: { id: empresaId },
    });
    const fisEmp = await getFiscalEmpresa(empresaId);

    // atualiza blacklist/fornecedores locais se necessário
    const fornBase = await prisma.fis_fornecedores.findMany({
      where: { id_fis_empresas: fisEmp.id },
      select: { id_externo: true, ds_documento: true },
    });
    await sincronizarFornecedoresBlackList(empresaId, fornBase);

    const emp = await prisma.sis_empresas.findUnique({
      where: { id: empresaId },
      select: {
        ds_url: true,
        id: true,
        id_escritorio: true,
        is_escritorio: true,
        id_externo: true,
      },
    });
    if (emp == null) throw new Error('Empresa não encontrada');
    if (emp.id_escritorio === null)
      throw new Error('Empresa sem escritório associado');
    const esc = emp.is_escritorio
      ? emp
      : await prisma.sis_empresas.findUnique({
          where: { id: emp.id_escritorio },
          select: { ds_url: true, id_externo: true },
        });

    if (esc == null) throw new Error('Escritório não encontrado');
    const url = `${esc.ds_url}/dados/entradas/empresa/${emp.id_externo}/mes/${competencia}/tipo/nfe`;
    createConsumoIntegracao({
      empresaId,
      dt_competencia: new Date().toString(),
      ds_consumo: 1,
      ds_tipo_consumo: 'API_DOMINIO',
      integracaoId: 'dominio',
    });
    const txt = await (
      await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    ).text();
    if (!txt.trim()) throw new Error('Domínio devolveu vazio.');
    let notasApi: any[];
    try {
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) notasApi = parsed;
      else if (parsed == null) notasApi = [];
      else notasApi = [parsed];
    } catch {
      throw new Error('JSON inválido.');
    }

    const primeiroDia = new Date(`${competencia}-01T00:00`);
    const notasFiltradas = notasApi.filter(
      (n) => new Date(n.dt_emissao) >= primeiroDia
    );

    // Agrupar notas pela chave (mesmo documento fiscal pode vir em múltiplas linhas)
    const notasAgrupadas = new Map<string, any[]>();
    for (const nota of notasFiltradas) {
      const chave = safeToString(nota.ds_chave_nfe);
      if (!chave) continue;

      if (!notasAgrupadas.has(chave)) {
        notasAgrupadas.set(chave, []);
      }
      notasAgrupadas.get(chave)!.push(nota);
    }

    // Consolidar múltiplas entradas da mesma NFe em uma única
    const notas: any[] = [];
    for (const [chave, grupo] of notasAgrupadas.entries()) {
      if (grupo.length === 1) {
        notas.push(grupo[0]);
        continue;
      }

      // Mesclar múltiplas entradas do mesmo documento
      // IMPORTANTE: Converter para centavos ANTES de somar, depois dividir por 100
      const primeira = grupo[0];

      // Somar em centavos: converter cada valor para centavos, somar, depois voltar para reais
      const totalCentavos = grupo.reduce((sum, n) => {
        const valor = parseFloat(n.ds_valor_total || '0');
        return sum + Math.round(valor * 100);
      }, 0);

      const produtosCentavos = grupo.reduce((sum, n) => {
        const valor = parseFloat(
          n.ds_valor_produtos || n.vProd || n.v_prod || '0'
        );
        return sum + Math.round(valor * 100);
      }, 0);

      const icmsCentavos = grupo.reduce((sum, n) => {
        const valor = parseFloat(n.ds_valor_icms || n.vICMS || n.v_icms || '0');
        return sum + Math.round(valor * 100);
      }, 0);

      const consolidada = {
        ...primeira,
        ds_valor_total: totalCentavos / 100,
        ds_valor_produtos: produtosCentavos / 100,
        ds_valor_icms: icmsCentavos / 100,
        produtos: grupo.flatMap((n) =>
          Array.isArray(n.produtos)
            ? n.produtos
            : n.produtos
              ? [n.produtos]
              : []
        ),
      };

      notas.push(consolidada);
    }

    let statusDoc;
    // construir maps de fornecedores
    const fornecedores = await prisma.fis_fornecedores.findMany({
      where: { id_fis_empresas: fisEmp.id },
    });
    const mapExt = new Map<string, (typeof fornecedores)[0]>();
    const mapCnpj = new Map<string, (typeof fornecedores)[0]>();
    const clean = (s: string | undefined) => (s ? s.replace(/[^\d]/g, '') : '');
    fornecedores.forEach((f) => {
      if (f.id_externo) mapExt.set(String(f.id_externo).trim(), f);
      mapCnpj.set(clean(f.ds_documento), f);
    });
    const resolveForn = (n: any) =>
      mapExt.get(String(n.id_fornecedor_externo || '').trim()) ||
      mapCnpj.get(clean(n.ds_documento_fornecedor)) ||
      null;

    // Rastrear chaves NFe que vieram da API
    const chavesVindasApi = new Set(
      notas.map((n) => safeToString(n.ds_chave_nfe)).filter(Boolean)
    );

    // Buscar documentos NFe ativos no período para validar se existem na API
    const docsAtivosNfe = await prisma.fis_documento.findMany({
      where: {
        id_fis_empresas: fisEmp.id,
        ds_status: { in: ['DIGITADO_FISCAL', 'CONFERIDO_FISCAL'] },
        js_nfe: {
          dt_emissao: {
            gte: new Date(primeiroDia),
            lte: new Date(
              new Date(primeiroDia).setMonth(primeiroDia.getMonth() + 1)
            ),
          },
        },
      },
      select: {
        id: true,
        js_nfe: {
          select: {
            ds_chave: true,
          },
        },
      },
    });

    // Marcar como AGUARDANDO_VALIDACAO documentos que não existem mais na API
    const docsParaAguardar = docsAtivosNfe.filter((d) => {
      const chave = safeToString(d.js_nfe?.ds_chave);
      return chave && !chavesVindasApi.has(chave);
    });

    if (docsParaAguardar.length) {
      docsParaAguardar.forEach(async (d) => {
        const statusAntigo = await prisma.fis_documento.findUnique({
          where: { id: d.id },
          select: { ds_status: true },
        });
        createDocumentoHistorico({
          justificativa: 'Sincronização com Dominio - Não localizada',
          id_documento: d.id,
          status_novo: 'AGUARDANDO_VALIDACAO',
          status_antigo: statusAntigo.ds_status,
        });
      });
      await prisma.fis_documento.updateMany({
        where: { id: { in: docsParaAguardar.map((d) => d.id) } },
        data: { ds_status: 'AGUARDANDO_VALIDACAO' },
      });
    }

    const vistos = new Set<string>();

    // Coleções para operações em lote
    const newNfeInputs: Prisma.fis_nfeCreateManyInput[] = [];
    const existingNfeUpdates: Array<{
      id: string;
      data: any;
      ds_status: string;
    }> = [];
    const itemsToInsert: Prisma.fis_nfe_itensCreateManyInput[] = [];
    const docsToCreate: Prisma.fis_documentoCreateManyInput[] = [];

    const makeKey = (fornId: any, numero: string, dtEmis: Date) =>
      `${safeToString(fornId)}|${numero}|${dtEmis.toISOString().slice(0, 10)}`;

    for (const nota of notas) {
      const numero = normalizeNotaFiscalNumber(
        safeToString(nota.ds_numero_documento)
      );
      if (!numero || vistos.has(numero)) continue;
      vistos.add(numero);

      const forn = resolveForn(nota);
      if (!forn) {
        console.warn(`NFe ${numero} ignorada – fornecedor não encontrado`);
        continue;
      }

      const baseDate = (nota.dt_emissao ||
        nota.dataEmissao ||
        nota.data_emissao) as string;
      const dtEmis = nota.dt_emissao
        ? new Date(nota.dt_emissao)
        : nota.dataEmissao
          ? new Date(nota.dataEmissao)
          : new Date();
      const toCents = (v: string | number | null | undefined) =>
        ((v as any) * 100).toString();
      // tenta encontrar NFe existente
      let nfeExistente = await prisma.fis_nfe.findFirst({
        where: {
          id_fis_empresa_destinatario: fisEmp.id,
          ds_numero: numero,
          id_fis_fornecedor: forn.id,
          ds_chave: nota.ds_chave_nfe,
          vl_nf: toCents(nota.ds_valor_total),
        },
      });

      if (!nfeExistente) {
        nfeExistente = await prisma.fis_nfe.findFirst({
          where: {
            id_fis_empresa_destinatario: fisEmp.id,
            ds_numero: numero,
            ds_chave: nota.ds_chave_nfe,
            vl_nf: toCents(nota.ds_valor_total),
          },
        });
        if (!nfeExistente) {
          nfeExistente = await prisma.fis_nfe.findFirst({
            where: {
              id_fis_empresa_destinatario: fisEmp.id,
              ds_numero: numero,
              ds_chave: nota.ds_chave_nfe,
              dt_emissao: dtEmis,
            },
          });
          if (!nfeExistente) {
            nfeExistente = await prisma.fis_nfe.findFirst({
              where: {
                id_fis_empresa_destinatario: fisEmp.id,
                ds_chave: nota.ds_chave_nfe,
              },
            });
          }
        }
      }

      const vTotal = toCents(nota.ds_valor_total || nota.vNF || nota.v_nf);
      const vProd = toCents(
        nota.ds_valor_produtos || nota.vProd || nota.v_prod || '0'
      );
      const vIcms = toCents(
        nota.ds_valor_icms || nota.vICMS || nota.v_icms || '0'
      );

      // Verificar se o documento está cancelado a partir de ds_situacao_entrada
      // 0 = ativo, 2 = cancelado
      const isCancelado = Number(nota.ds_situacao_entrada || 0) === 2;
      statusDoc = isCancelado
        ? 'CANCELADO'
        : nota.ds_conferido === 'S'
          ? 'CONFERIDO_FISCAL'
          : 'DIGITADO_FISCAL';

      if (nfeExistente) {
        // NFe já existe - apenas atualizar cabeçalho, NÃO mexer nos itens
        existingNfeUpdates.push({
          id: nfeExistente.id,
          data: {
            ds_numero: numero,
            ds_serie: nota.ds_serie || nota.ds_serie_documento || '',
            ds_modelo: nota.ds_modelo || nota.ds_modelo_documento || '',
            ds_chave: safeToString(nota.ds_chave_nfe),
          },
          ds_status: statusDoc,
        });

        // NÃO processar itens - manter itens existentes intactos

        // documentação relacionada
        docsToCreate.push({
          id_fis_empresas: fisEmp.id,
          id_nfe: nfeExistente.id,
          ds_status: statusDoc,
          ds_tipo: 'NFE',
          ds_origem: { sistema: 'worker_dominio' } as any,
        } as any);
      } else {
        newNfeInputs.push({
          id_fis_empresa_destinatario: fisEmp.id,
          ds_documento_destinatario: sisEmp?.ds_documento || '',
          ds_razao_social_destinatario: sisEmp?.ds_nome || '',
          id_fis_fornecedor: forn.id,
          ds_documento_emitente: forn.ds_documento || '',
          ds_razao_social_emitente: forn.ds_nome || '',
          ds_numero: numero,
          ds_chave: safeToString(nota.ds_chave_nfe),
          dt_emissao: dtEmis,
          vl_nf: vTotal,
          vl_produto: vProd,
          vl_icms: vIcms,
        } as Prisma.fis_nfeCreateManyInput);

        // guardar itens temporariamente com chave para mapear depois
        const key = makeKey(forn.id, numero, dtEmis);
        const items = Array.isArray(nota.produtos)
          ? nota.produtos
          : nota.produtos || [];
        for (const it of items) {
          const codigo = safeToString(it.ds_codigo_produto).trim();
          const vlUnit = toCents(it.vl_unitario_produto);
          const qtd = toCents(it.vl_quantidade_produto);
          const ordemNum =
            it.ds_ordem_produto !== undefined && it.ds_ordem_produto !== null
              ? Number(it.ds_ordem_produto)
              : undefined;

          itemsToInsert.push({
            id_fis_nfe: -newNfeInputs.length,
            ds_ordem: isNaN(ordemNum as number) ? undefined : ordemNum,
            ds_codigo: codigo,
            ds_produto: it.ds_produto_nome || '',
            ds_unidade: it.unidade_produto || '',
            vl_quantidade: qtd,
            vl_unitario: vlUnit,
            vl_total: toCents(it.vl_total_produto),
            cd_ncm: safeToString(it.cd_ncm),
            cd_cfop: safeToString(it.cd_cfop_produto),
            ds_cst: safeToString(it.ds_cst_produto),
            vl_base_calculo_cofins: toCents(it.vl_base_calculo_cofins_produto),
            vl_base_calculo_icms: toCents(it.vl_base_calculo_icms_produto),
            vl_icms: toCents(it.vl_icms_produto),
            vl_cofins: toCents(it.vl_cofins_produto),
            vl_base_calculo_pis: toCents(it.vl_base_calculo_pis_produto),
            vl_pis: toCents(it.vl_pis_produto),
            vl_porcentagem_pis: toCents(it.vl_porcentagem_pis_produto),
            vl_porcentagem_cofins: toCents(it.vl_porcentagem_cofins_produto),
            cd_cst_pis: safeToString(it.cd_cst_pis_produto),
            cd_cst_cofins: safeToString(it.cd_cst_cofins_produto),

            __nfe_key: key,
          } as any);
        }

        // criar documento eventual (será mapeado depois)
        docsToCreate.push({
          id_nfe: -newNfeInputs.length,
          id_fis_empresas: fisEmp.id,
          ds_status: statusDoc,
          ds_tipo: 'NFE',
          ds_origem: { sistema: 'worker_dominio' } as any,
        } as any);
      }
    }

    // Executar updates para NFes existentes: atualizar NFe e atualizar/garantir documento
    const existingIds = existingNfeUpdates.map((u) => u.id);
    if (existingIds.length) {
      // atualizar NFes em paralelo
      await Promise.all(
        existingNfeUpdates.map((u) =>
          prisma.fis_nfe.update({ where: { id: u.id }, data: u.data })
        )
      );

      // atualizar/garantir documentos (upsert por NFe)
      await Promise.all(
        existingNfeUpdates.map((u) =>
          prisma.fis_documento.upsert({
            where: {
              uniq_nfe_por_empresa: {
                id_nfe: u.id,
                id_fis_empresas: fisEmp.id,
              },
            },
            create: {
              id_fis_empresas: fisEmp.id,
              id_nfe: u.id,
              ds_status: u.ds_status as any,
              ds_tipo: 'NFE',
              ds_origem: { sistema: 'worker_dominio' } as any,
            } as any,
            update: { ds_status: u.ds_status as any },
          })
        )
      );
      const chaves = existingNfeUpdates.map((u) => u.data.ds_chave);
      const compt = swapYearMonthSafe(competencia);
      try {
        if (chaves.length > 0) {
          reverterIntegracaoNfeEntrada(empresaId, chaves, compt, false);
        }
      } catch (err) {}
    }

    // Inserir NFes novas em lote
    if (newNfeInputs.length) {
      await prisma.fis_nfe.createMany({
        data: newNfeInputs,
        skipDuplicates: true,
      });

      // Mapear NFes recém-criadas para seus ids
      const numeros = Array.from(
        new Set(
          newNfeInputs
            .map((n) => safeToString((n as any).ds_numero))
            .filter(Boolean)
        )
      );
      const createdNfes = await prisma.fis_nfe.findMany({
        where: {
          id_fis_empresa_destinatario: fisEmp.id,
          ds_numero: { in: numeros },
        },
        select: {
          id: true,
          ds_numero: true,
          id_fis_fornecedor: true,
          dt_emissao: true,
        },
      });

      // construir map por chave usada acima
      const createdMap = new Map<string, string>();
      for (const c of createdNfes) {
        const key = `${safeToString(c.id_fis_fornecedor)}|${safeToString(
          c.ds_numero
        )}|${c.dt_emissao ? c.dt_emissao.toISOString().slice(0, 10) : ''}`;
        createdMap.set(key, c.id);
      }

      // Atualizar itemsToInsert que têm a chave e id_fis_nfe negativo
      const finalItems: Prisma.fis_nfe_itensCreateManyInput[] = [];
      const unresolved: any[] = [];
      for (const it of itemsToInsert as any[]) {
        if (typeof it.__nfe_key === 'string') {
          const mappedId = createdMap.get(it.__nfe_key);
          if (mappedId) {
            const copy = { ...it };
            copy.id_fis_nfe = mappedId;
            delete copy.__nfe_key;
            finalItems.push(copy as any);
            continue;
          }
          unresolved.push(it);
        } else {
          finalItems.push(it as any);
        }
      }

      // inserir itens finais em lote (inclui itens de NFes existentes e novos mapeados)
      if (finalItems.length) {
        // dividir em lotes caso ocorra erros
        await prisma.fis_nfe_itens.createMany({
          data: finalItems,
          skipDuplicates: true,
        });
      }

      // criar docs para novas NFes
      const docsFinal: Prisma.fis_documentoCreateManyInput[] = [];
      for (const d of docsToCreate as any[]) {
        if (d.id_nfe && typeof d.id_nfe === 'number' && d.id_nfe < 0) {
          // placeholder: -k maps to newNfeInputs[k-1]
          const idx = Math.abs(d.id_nfe) - 1;
          const nfeInput = newNfeInputs[idx];
          const key = `${safeToString(nfeInput.id_fis_fornecedor)}|${nfeInput.ds_numero}|${(nfeInput.dt_emissao as Date).toISOString().slice(0, 10)}`;
          const mappedId = createdMap.get(key);
          if (mappedId) {
            docsFinal.push({
              id_fis_empresas: d.id_fis_empresas,
              id_nfe: mappedId,
              ds_status: d.ds_status,
              ds_tipo: d.ds_tipo,
              ds_origem: d.ds_origem,
            } as any);
          }
        } else if (d.id_nfe && typeof d.id_nfe === 'string') {
          docsFinal.push(d as any);
        }
      }

      if (docsFinal.length) {
        await prisma.fis_documento.createMany({
          data: docsFinal,
          skipDuplicates: true,
        });

        const documentosCriados = await prisma.fis_documento.findMany({
          where: {
            id_nfe: {
              in: docsFinal.map((d) => d.id_nfe).filter(Boolean) as string[],
            },
            id_fis_empresas: fisEmp.id,
          },
          select: { id: true, ds_status: true },
        });
        await Promise.all(
          documentosCriados.map((documento) =>
            createDocumentoHistorico({
              justificativa: usuarioId
                ? 'Sincronização com Dominio'
                : 'Rotina de Sincronização com Dominio',
              id_documento: documento.id,
              id_usuario: usuarioId ? usuarioId : null,
              status_novo: documento.ds_status,
            })
          )
        );
      }
    } else {
      if (itemsToInsert.length)
        await prisma.fis_nfe_itens.createMany({
          data: itemsToInsert as any,
          skipDuplicates: true,
        });
      if (docsToCreate.length) {
        await prisma.fis_documento.createMany({
          data: docsToCreate as any,
          skipDuplicates: true,
        });
        const documentosCriados = await prisma.fis_documento.findMany({
          where: {
            id_nfe: {
              in: docsToCreate.map((d) => d.id_nfe).filter(Boolean) as string[],
            },
            id_fis_empresas: fisEmp.id,
          },
          select: { id: true, ds_status: true },
        });
        await Promise.all(
          documentosCriados.map((documento) =>
            createDocumentoHistorico({
              justificativa: usuarioId
                ? 'Sincronização com Dominio'
                : 'Rotina de Sincronização com Dominio',
              id_documento: documento.id,
              id_usuario: usuarioId ? usuarioId : null,
              status_novo: documento.ds_status,
            })
          )
        );
      }
    }

    // Verificar se alguma NFe atualizada tem produto com status NOVO
    if (existingNfeUpdates.length > 0) {
      let encontrouProdutoNovo = false;
      for (const nfeUpdate of existingNfeUpdates) {
        if (encontrouProdutoNovo) break; // só precisa encontrar um

        const nfeComItens = await prisma.fis_nfe.findUnique({
          where: { id: nfeUpdate.id },
          include: {
            fis_nfe_itens: {
              include: {
                fis_nfe_itens_alter_entrada: {
                  include: {
                    fis_produtos: {
                      select: { ds_status: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (nfeComItens?.fis_nfe_itens) {
          for (const item of nfeComItens.fis_nfe_itens) {
            const produtoVinculado =
              item.fis_nfe_itens_alter_entrada?.[0]?.fis_produtos;
            if (produtoVinculado?.ds_status === 'NOVO') {
              encontrouProdutoNovo = true;
              try {
                sincronizarProdutos(empresaId);
              } catch (err) {}
              break;
            }
          }
        }
      }
    }

    return { sucesso: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `Erro ao sincronizar NFe do Domínio para ${empresaId}:`,
      errorMsg
    );
    throw error;
  }
};

function tentarRepetidamente() {
  let tentativa = 1;
  const intervalo = 60 * 1000; // 1 minuto em milissegundos

  const id = setInterval(() => {
    console.log(`Tentativa ${tentativa} às ${new Date().toLocaleTimeString()}`);

    tentativa++;
    if (tentativa > 10) {
      clearInterval(id);
      console.log('Concluído após 5 tentativas.');
    }
  }, intervalo);
}

export const sincronizarDominioVerfNotas = async (
  empresaId: string,
  competencia: string
) => {
  try {
    const fisEmp = await getFiscalEmpresa(empresaId);

    const emp = await prisma.sis_empresas.findUnique({
      where: { id: empresaId },
      select: {
        ds_url: true,
        id: true,
        id_escritorio: true,
        is_escritorio: true,
        id_externo: true,
      },
    });
    if (!emp) throw new Error('Empresa não encontrada');

    const esc = emp.is_escritorio
      ? emp
      : await prisma.sis_empresas.findUnique({
          where: { id: emp.id_escritorio ?? undefined },
          select: { ds_url: true, id_externo: true },
        });

    if (!esc) throw new Error('Escritório não encontrado');

    const url = `${esc.ds_url}/dados/entradas/empresa/${emp.id_externo}/mes/${competencia}/verf`;
    createConsumoIntegracao({
      empresaId,
      dt_competencia: new Date().toString(),
      ds_consumo: 1,
      ds_tipo_consumo: 'API_DOMINIO',
      integracaoId: 'dominio',
    });
    const txt = await (await fetch(url)).text();
    // const txt = await (
    //   await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    // ).text();
    if (!txt.trim()) throw new Error('Domínio devolveu vazio.');
    let notasApi: any[];
    try {
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) notasApi = parsed;
      else if (parsed == null) notasApi = [];
      else notasApi = [parsed];
    } catch {
      throw new Error('JSON inválido.');
    }

    const primeiroDia = new Date(`${competencia}-01T00:00`);
    const ultimoDia = new Date(
      primeiroDia.getFullYear(),
      primeiroDia.getMonth() + 1,
      0
    );
    const notas = notasApi.filter((n) => new Date(n.dt_emissao) >= primeiroDia);

    const fornecedores = await prisma.fis_fornecedores.findMany({
      where: { id_fis_empresas: fisEmp.id },
    });
    const mapExt = new Map<string, (typeof fornecedores)[0]>();
    const mapCnpj = new Map<string, (typeof fornecedores)[0]>();
    fornecedores.forEach((f) => {
      if (f.id_externo) mapExt.set(f.id_externo.toString(), f);
      mapCnpj.set(cleanCnpj(f.ds_documento), f);
    });
    const resolveForn = (n: any) =>
      mapExt.get(n.id_fornecedor_externo?.toString() || '') ||
      mapCnpj.get(cleanCnpj(n.ds_documento_fornecedor)) ||
      null;

    const semForn = await prisma.fis_nfse.findMany({
      where: { id_fis_empresas: fisEmp.id, id_fis_fornecedor: null },
      select: { id: true, ds_numero: true },
    });
    // Buscar todos os documentos de uma vez para evitar múltiplas consultas
    const numerosParaBuscar = [
      ...new Set(
        notas
          .map((n) =>
            normalizeNotaFiscalNumber(safeToString(n.ds_numero_documento))
          )
          .filter(Boolean)
      ),
    ];
    const rangesDatas = new Map<string, { startOfDay: Date; endOfDay: Date }>();
    notas.forEach((nota) => {
      const numero = normalizeNotaFiscalNumber(
        nota.ds_numero_documento?.toString()
      );
      if (numero && !rangesDatas.has(numero)) {
        rangesDatas.set(numero, getDateRange(nota.dt_emissao));
      }
    });

    // Buscar todos os documentos de uma vez
    const [allNfse, allNfe, allCte] = await Promise.all([
      prisma.fis_nfse.findMany({
        where: {
          OR: [
            { id_fis_empresas: fisEmp.id },
            { id_fis_empresa_emitente: fisEmp.id },
          ],
          ds_numero: { in: numerosParaBuscar },
          dt_emissao: { gte: primeiroDia, lte: ultimoDia },
        },
        select: { id: true, ds_numero: true, dt_emissao: true },
      }),
      prisma.fis_nfe.findMany({
        where: {
          OR: [
            { id_fis_empresa_destinatario: fisEmp.id },
            { id_fis_empresa_emitente: fisEmp.id },
          ],
          ds_numero: { in: numerosParaBuscar },
          dt_emissao: { gte: primeiroDia, lte: ultimoDia },
        },
        select: { id: true, ds_numero: true, dt_emissao: true },
      }),
      prisma.fis_cte.findMany({
        where: {
          OR: [
            { id_fis_empresa_destinatario: fisEmp.id },
            { id_fis_empresa_emitente: fisEmp.id },
          ],
          ds_numero: { in: numerosParaBuscar },
          dt_emissao: { gte: primeiroDia, lte: ultimoDia },
        },
        select: { id: true, ds_numero: true, dt_emissao: true },
      }),
    ]);
    const nfseMap = new Map<string, string>();
    const nfeMap = new Map<string, string>();
    const cteMap = new Map<string, string>();

    allNfse.forEach((doc) => {
      const range = rangesDatas.get(safeToString(doc.ds_numero));
      if (
        range &&
        doc.dt_emissao &&
        doc.dt_emissao >= range.startOfDay &&
        doc.dt_emissao <= range.endOfDay
      ) {
        nfseMap.set(safeToString(doc.ds_numero), doc.id);
      }
    });

    allNfe.forEach((doc) => {
      const range = rangesDatas.get(safeToString(doc.ds_numero));
      if (
        range &&
        doc.dt_emissao &&
        doc.dt_emissao >= range.startOfDay &&
        doc.dt_emissao <= range.endOfDay
      ) {
        nfeMap.set(safeToString(doc.ds_numero), doc.id);
      }
    });

    allCte.forEach((doc) => {
      const range = rangesDatas.get(safeToString(doc.ds_numero));
      if (
        range &&
        doc.dt_emissao &&
        doc.dt_emissao >= range.startOfDay &&
        doc.dt_emissao <= range.endOfDay
      ) {
        cteMap.set(safeToString(doc.ds_numero), doc.id);
      }
    });

    let processadas = 0;
    const vistos = new Set<string>();
    // coletar atualizações para aplicar em lote após o loop
    const pendingUpdates: Array<{
      relation: 'nfse' | 'nfe' | 'cte';
      relatedId: string;
      status: any;
    }> = [];

    for (const nota of notas) {
      const numero = normalizeNotaFiscalNumber(
        nota.ds_numero_documento?.toString()
      );
      if (!numero || vistos.has(numero)) continue;
      vistos.add(numero);

      const forn = resolveForn(nota);
      if (!forn) {
        // console.warn(`NF ${numero} ignorada – fornecedor não encontrado`);
        continue;
      }

      // Usar os maps criados ao invés de fazer consultas individuais
      const nfseId = nfseMap.get(numero);
      const nfeId = nfeMap.get(numero);
      const cteId = cteMap.get(numero);

      const statusDoc =
        nota.ds_conferido === 'S' ? 'CONFERIDO_FISCAL' : 'DIGITADO_FISCAL';

      if (nfseId) {
        pendingUpdates.push({
          relation: 'nfse',
          relatedId: nfseId,
          status: statusDoc,
        });
      } else if (nfeId) {
        pendingUpdates.push({
          relation: 'nfe',
          relatedId: nfeId,
          status: statusDoc,
        });
      } else if (cteId) {
        pendingUpdates.push({
          relation: 'cte',
          relatedId: cteId,
          status: statusDoc,
        });
      } else {
        // console.warn(`Documento ${numero} não encontrado no sistema - ignorando`);
        continue;
      }
    }

    // Agrupar e aplicar updates em lote por relação e status
    try {
      const groups = new Map<string, Set<string>>();
      for (const u of pendingUpdates) {
        const key = `${u.relation}|${u.status}`;
        if (!groups.has(key)) groups.set(key, new Set());
        groups.get(key)!.add(u.relatedId);
      }

      let totalUpdated = 0;
      // executar updates em paralelo
      const updatePromises = [];

      for (const [key, idSet] of groups.entries()) {
        const [relation, status] = key.split('|');
        const ids = Array.from(idSet);
        if (!ids.length) continue;

        const where: any = { id_fis_empresas: fisEmp.id };
        if (relation === 'nfse') where.id_nfse = { in: ids };
        else if (relation === 'nfe') where.id_nfe = { in: ids };
        else if (relation === 'cte') where.id_cte = { in: ids };

        updatePromises.push(
          prisma.fis_documento
            .updateMany({
              where,
              data: { ds_status: status as any },
            })
            .then((res) => res.count ?? 0)
            .catch(() => 0)
        );
      }

      const results = await Promise.all(updatePromises);
      totalUpdated = results.reduce((sum, count) => sum + count, 0);
      processadas = totalUpdated;
    } catch (err) {
      // se algo falhar no processo de batch, manter processadas = 0 (compatível com comportamento anterior silencioso)
    }

    return `${processadas} Docs processados.`;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `Erro ao sincronizar verificação de notas do Domínio para ${empresaId}:`,
      errorMsg
    );
    throw error;
  }
};

export const getChavesXml = async (
  ano: string,
  escritorioId?: string,
  documento_escritorio?: string
) => {
  const escritorio = await prisma.sis_empresas.findFirst({
    where: {
      ...(escritorioId ? { id: escritorioId } : {}),
      ...(documento_escritorio ? { ds_documento: documento_escritorio } : {}),
    },
    select: { id: true },
  });
  if (!escritorio) {
    return { chavesNfe: [], chavesCte: [], error: 'Escritório não encontrado' };
  }
  const yearNum = Number(ano);
  // usa UTC para evitar deslocamento de fuso-horário (ex.: +03:00)
  const dataInicio = new Date(Date.UTC(yearNum, 0, 1, 0, 0, 0));
  const dataFim = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59)); // fim do ano (UTC)
  const sisEmpresas = await prisma.sis_empresas.findMany({
    where: { id_escritorio: escritorio.id },
    select: { id: true },
  });
  const empresaIds = sisEmpresas.map((e) => e.id);
  const fisEmpresas = await prisma.fis_empresas.findMany({
    where: { id_sis_empresas: { in: empresaIds } },
    select: { id: true },
  });
  try {
    const baseWhereNfe: any = {
      dt_emissao: { gte: dataInicio, lte: dataFim },
      OR: [
        { id_fis_empresa_destinatario: { in: fisEmpresas.map((e) => e.id) } },
        { id_fis_empresa_emitente: { in: fisEmpresas.map((e) => e.id) } },
        { id_fis_empresa_transportadora: { in: fisEmpresas.map((e) => e.id) } },
      ],
    };

    const baseWhereCte: any = {
      dt_emissao: { gte: dataInicio, lte: dataFim },
      OR: [
        { id_fis_empresa_destinatario: { in: fisEmpresas.map((e) => e.id) } },
        { id_fis_empresa_emitente: { in: fisEmpresas.map((e) => e.id) } },
        { id_fis_empresa_remetente: { in: fisEmpresas.map((e) => e.id) } },
        { id_fis_empresa_tomador: { in: fisEmpresas.map((e) => e.id) } },
      ],
    };

    const rawChavesNfe = await prisma.fis_nfe.findMany({
      where: baseWhereNfe,
      select: { ds_chave: true },
    });

    const rawChavesCte = await prisma.fis_cte.findMany({
      where: baseWhereCte,
      select: { ds_chave: true },
    });

    const chavesNfe = rawChavesNfe.map((r) => r.ds_chave).filter(Boolean);
    const chavesCte = rawChavesCte.map((r) => r.ds_chave).filter(Boolean);

    return { chavesNfe, chavesCte };
  } catch (error) {
    return { chavesNfe: [], chavesCte: [], error: error };
  }
};

/**
 * Sincroniza CTe do Domínio para a base local.
 * Busca CTes por competência e atualiza status com base em ds_situacao_entrada e ds_conferido.
 *
 * @param empresaId - ID da empresa (sis_empresas)
 * @param competencia - Competência no formato YYYY-MM (ex: "2025-11")
 * @param usuarioId - ID do usuário que está executando a sincronização (opcional)
 * @returns Mensagem com total de CTes processados
 */
export const sincronizarCteDominio = async (
  empresaId: string,
  competencia: string,
  usuarioId?: string
) => {
  try {
    const fisEmp = await getFiscalEmpresa(empresaId);
    const sisEmp = await prisma.sis_empresas.findUnique({
      where: { id: empresaId },
      select: {
        ds_url: true,
        id: true,
        id_escritorio: true,
        is_escritorio: true,
        id_externo: true,
      },
    });

    if (!sisEmp) throw new Error('Empresa não encontrada');
    if (!sisEmp.id_escritorio)
      throw new Error('Empresa sem escritório associado');

    const esc = sisEmp.is_escritorio
      ? sisEmp
      : await prisma.sis_empresas.findUnique({
          where: { id: sisEmp.id_escritorio },
          select: { ds_url: true, id_externo: true },
        });

    if (!esc) throw new Error('Escritório não encontrado');

    const url = `${esc.ds_url}/dados/entradas/empresa/${sisEmp.id_externo}/mes/${competencia}/tipo/cte`;

    createConsumoIntegracao({
      empresaId,
      dt_competencia: new Date().toString(),
      ds_consumo: 1,
      ds_tipo_consumo: 'API_DOMINIO',
      integracaoId: 'dominio',
    });

    const response = await fetch(url, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar CTes: ${response.statusText}`);
    }

    const txt = await response.text();
    if (!txt.trim()) {
      console.warn('Domínio devolveu vazio para CTe.');
      return '0 CTe(s) processados.';
    }

    let ctesApi: any[];
    try {
      const parsed = JSON.parse(txt);
      ctesApi = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      throw new Error('JSON inválido retornado pela API.');
    }

    console.log(`${ctesApi.length} CTe(s) recebidos da API.`);

    // Parse competência para range de datas
    const [year, month] = competencia.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Preparar dados e coletar chaves/números para busca em lote
    const ctesParaProcessar = ctesApi
      .map((cteData) => ({
        raw: cteData,
        numero: normalizeNotaFiscalNumber(
          safeToString(cteData.ds_numero_documento)
        ),
        chave: safeToString(cteData.ds_chave_cte),
        dtEmissao: cteData.dt_emissao ? new Date(cteData.dt_emissao) : null,
        situacao: Number(cteData.ds_situacao_entrada || 0),
        conferido: safeToString(cteData.ds_conferido).toUpperCase(),
      }))
      .filter((cte) => cte.chave); // Remover CTes sem chave

    if (ctesParaProcessar.length === 0) {
      console.log('Nenhum CTe válido para processar.');
      return '0 CTe(s) processados.';
    }

    const numeros = [...new Set(ctesParaProcessar.map((c) => c.numero))];
    const chaves = [...new Set(ctesParaProcessar.map((c) => c.chave))];

    // Buscar todos os CTes relevantes em uma única consulta
    const ctesExistentes = await prisma.fis_cte.findMany({
      where: {
        OR: [
          {
            ds_chave: { in: chaves },
          },
          {
            ds_numero: { in: numeros },
            dt_emissao: { gte: startDate, lte: endDate },
          },
        ],
      },
      select: {
        id: true,
        ds_numero: true,
        ds_chave: true,
        dt_emissao: true,
        id_fis_empresa_emitente: true,
        id_fis_empresa_destinatario: true,
        id_fis_empresa_remetente: true,
        id_fis_empresa_tomador: true,
        id_fis_empresa_subcontratada: true,
      },
    });

    // Criar maps para busca rápida (busca progressiva)
    const mapPorChave = new Map(
      ctesExistentes.map((cte) => [cte.ds_chave, cte])
    );
    const mapPorNumero = new Map<string, any[]>();
    ctesExistentes.forEach((cte) => {
      if (!mapPorNumero.has(cte.ds_numero || '')) {
        mapPorNumero.set(cte.ds_numero || '', []);
      }
      mapPorNumero.get(cte.ds_numero || '')!.push(cte);
    });

    // Buscar todos os documentos associados em uma única consulta
    const idsCtesEncontrados = ctesExistentes.map((c) => c.id);
    const documentosExistentes = await prisma.fis_documento.findMany({
      where: {
        id_cte: { in: idsCtesEncontrados },
        id_fis_empresas: fisEmp.id,
      },
      select: {
        id: true,
        id_cte: true,
        ds_status: true,
      },
    });

    const mapDocumentos = new Map(
      documentosExistentes.map((doc) => [doc.id_cte, doc])
    );

    // Preparar operações em lote
    const documentosParaAtualizar: Array<{
      id: string;
      novoStatus: string;
      statusAntigo: string;
      cteNumero: string;
      situacao: number;
      conferido: string;
    }> = [];
    const documentosParaCriar: Array<{
      idCte: string;
      novoStatus: string;
      cteNumero: string;
      situacao: number;
      conferido: string;
    }> = [];

    // Processar cada CTe da API e encontrar correspondência
    for (const cteProcessar of ctesParaProcessar) {
      // Busca progressiva: 1) por chave, 2) por número no período, 3) por número
      let cteEncontrado = mapPorChave.get(cteProcessar.chave);

      if (!cteEncontrado) {
        const candidatosPorNumero = mapPorNumero.get(cteProcessar.numero) || [];
        // Tentar encontrar por número e data na competência
        cteEncontrado = candidatosPorNumero.find(
          (c) =>
            c.dt_emissao && c.dt_emissao >= startDate && c.dt_emissao <= endDate
        );
        // Se não encontrou, pegar qualquer um com o número
        if (!cteEncontrado && candidatosPorNumero.length > 0) {
          cteEncontrado = candidatosPorNumero[0];
        }
      }

      if (!cteEncontrado) {
        console.log(
          `CTe ${cteProcessar.numero} / ${cteProcessar.chave} não encontrado na base local.`
        );
        continue;
      }

      // Determinar novo status
      let novoStatus: string;
      if (cteProcessar.situacao === 2) {
        novoStatus = 'CANCELADO';
      } else if (cteProcessar.conferido === 'S') {
        novoStatus = 'CONFERIDO_FISCAL';
      } else {
        novoStatus = 'DIGITADO_FISCAL';
      }

      const documentoExistente = mapDocumentos.get(cteEncontrado.id);

      if (documentoExistente) {
        // Se o status mudou, adicionar à lista de atualizações
        if (documentoExistente.ds_status !== novoStatus) {
          documentosParaAtualizar.push({
            id: documentoExistente.id,
            novoStatus,
            statusAntigo: documentoExistente.ds_status || '',
            cteNumero: cteProcessar.numero,
            situacao: cteProcessar.situacao,
            conferido: cteProcessar.conferido,
          });
        }
      } else {
        // Documento não existe, adicionar à lista de criação
        documentosParaCriar.push({
          idCte: cteEncontrado.id,
          novoStatus,
          cteNumero: cteProcessar.numero,
          situacao: cteProcessar.situacao,
          conferido: cteProcessar.conferido,
        });
      }
    }

    let processados = 0;

    // Executar atualizações em lote
    if (documentosParaAtualizar.length > 0) {
      await Promise.all(
        documentosParaAtualizar.map(async (doc) => {
          await prisma.fis_documento.update({
            where: { id: doc.id },
            data: { ds_status: doc.novoStatus as any },
          });

          await createDocumentoHistorico({
            justificativa: `Sincronização Domínio CTe - ${doc.situacao === 2 ? 'Cancelado' : doc.conferido === 'S' ? 'Conferido' : 'Digitado'}`,
            id_documento: doc.id,
            status_antigo: doc.statusAntigo as any,
            status_novo: doc.novoStatus as any,
            id_usuario: usuarioId,
          });
        })
      );
      processados += documentosParaAtualizar.length;
    }

    // Executar criações em lote
    if (documentosParaCriar.length > 0) {
      const novosDocumentos = await Promise.all(
        documentosParaCriar.map(async (doc) => {
          const novoDoc = await prisma.fis_documento.create({
            data: {
              id_fis_empresas: fisEmp.id,
              id_cte: doc.idCte,
              ds_status: doc.novoStatus as any,
              ds_tipo: 'CTE',
              ds_tipo_ef: 'ENTRADA',
              ds_origem: { sistema: 'worker_dominio' } as any,
            },
          });

          await createDocumentoHistorico({
            justificativa: `Documento criado via sincronização Domínio CTe - ${doc.situacao === 2 ? 'Cancelado' : doc.conferido === 'S' ? 'Conferido' : 'Digitado'}`,
            id_documento: novoDoc.id,
            status_novo: doc.novoStatus as any,
            id_usuario: usuarioId,
          });

          return novoDoc;
        })
      );
      processados += novosDocumentos.length;
    }

    return `${processados} CTe(s) processados.`;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `Erro ao sincronizar CTe do Domínio para ${empresaId}:`,
      errorMsg
    );
    throw error;
  }
};
