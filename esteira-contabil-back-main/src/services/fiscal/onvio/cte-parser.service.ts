import { Prisma, OrigemExtracao } from '@prisma/client';
import { parseString } from 'xml2js';
import fs from 'fs';
import { getFiscalEmpresaPorDocumento } from '../fiscal-empresa.service';
import { prisma } from '../../prisma';
import { getFornecedoresCached } from '../fornecedor.service';
import { invalidateCache } from '@/core/cache';
import { createDocumentoHistorico } from '../documento.service';

export interface CommonCteDTO {
  id: string; // infCte.$.Id
  chave: string; // sem prefixo "CTe"
  js_chaves_nfe?: string[];
  ds_chave_nfe?: string; // compat: primeira chave NFe
  ds_uf?: string;
  cd_ibge?: string;
  cd_cte?: string;
  ds_cfop?: string;
  ds_natureza_operacao?: string;
  ds_modelo?: number;
  ds_serie?: number;
  ds_numero?: string;
  dt_emissao?: string;
  ds_tp_cte?: number;
  ds_modal?: string;
  ds_tp_serv?: number;
  cd_mun_env?: string;
  ds_nome_mun_env?: string;
  ds_uf_env?: string;
  cd_mun_ini?: string;
  ds_nome_mun_ini?: string;
  ds_uf_ini?: string;
  cd_mun_fim?: string;
  ds_nome_mun_fim?: string;
  ds_uf_fim?: string;
  ds_retira?: number;
  ds_ind_ie_toma?: number;

  emit_CNPJ?: string;
  emit_xNome?: string;
  dest_CNPJ?: string;
  dest_xNome?: string;
  rem_CNPJ?: string;
  rem_xNome?: string;
  toma_CNPJ?: string;
  toma_xNome?: string;
  toma_CPF?: string;
  /** Papel do tomador: REMETENTE | EXPEDIDOR | RECEBEDOR | DESTINATARIO | OUTRO (toma4) */
  tp_tomador?: string;
  /** Origem no XML: toma3 (indicador) ou toma4 (grupo próprio) */
  origem_tomador_xml?: string;

  vl_total?: string;
  vl_rec?: string;
  vl_total_trib?: string;
  ds_cst_tributacao?: string;
  vl_base_calculo_icms?: string;
  vl_icms?: string;
  vl_porcentagem_icms?: string;
  cd_icms?: string;
  ds_icms_tag?: string;

  cargaComponentes?: Array<{ ds_nome: string; vl_comp: string }>;
  cargaItens?: Array<{
    ds_und: string;
    ds_tipo_medida: string;
    vl_qtd_carregada: string;
  }>;
  ds_produto_predominante?: string;
  vl_mercadoria_carga?: string;

  forn_documento?: string;
  forn_nome?: string;
  forn_im?: string;
  forn_ie?: string;
  forn_endereco?: string;
  forn_complemento?: string;
  forn_bairro?: string;
  forn_cep?: string;
  forn_codigo_municipio?: number;
  forn_codigo_uf?: number;
  forn_telefone?: string;
  forn_email?: string;
  js_documentos_autorizados?: Array<{
    tipo: 'CNPJ' | 'CPF' | string;
    documento: string;
  }>;
  js_documentos_anteriores?: string[];
  ds_observacao?: string;
  js_placas_veiculos?: string[];
}

function padronizarUnidadeMedida(unidade: string): string {
  const unidadeUpper = String(unidade).toUpperCase();

  if (['L', 'LI', 'LT', 'LITROS'].includes(unidadeUpper)) {
    return 'LT';
  } else if (['K', 'KG', 'KILOS', 'KILOGRAMA', 'KILO'].includes(unidadeUpper)) {
    return 'KG';
  } else if (['T', 'TON', 'TONELADAS', 'TONELADA'].includes(unidadeUpper)) {
    return 'TON';
  } else if (
    [
      'U',
      'UN',
      'UND',
      'UNID',
      'UNIDADE',
      'P',
      'PC',
      'PÇ',
      'PECA',
      'PEÇA',
    ].includes(unidadeUpper)
  ) {
    return 'UN';
  } else if (['M', 'MT', 'METROS', 'METRO'].includes(unidadeUpper)) {
    return 'MT';
  } else if (['CM', 'CENTIMETRO'].includes(unidadeUpper)) {
    return 'CM';
  } else if (['M2', 'MT2'].includes(unidadeUpper)) {
    return 'M²';
  } else if (['JG'].includes(unidadeUpper)) {
    return 'JG';
  } else if (['GL', 'G'].includes(unidadeUpper)) {
    return 'GL';
  } else if (['FL', 'FOLHA'].includes(unidadeUpper)) {
    return 'FL';
  } else if (['CX', 'CAIXA'].includes(unidadeUpper)) {
    return 'CX';
  } else {
    return unidade; // Retorna a unidade original se não encontrar correspondência
  }
}

export interface CteParser {
  supports(xml: any): boolean;
  extract(xml: any): CommonCteDTO;
}

export class StandardCteParser implements CteParser {
  supports(xml: any): boolean {
    // Verificação de segurança similar aos parsers de NFSe
    if (!xml || typeof xml !== 'object') {
      return false;
    }

    try {
      if (xml.CTe?.[0]?.infCte) return true;
      const p1 = Array.isArray(xml.cteProc) ? xml.cteProc[0] : xml.cteProc;
      if (p1?.CTe?.[0]?.infCte) return true;
      const p2 = Array.isArray(xml.CTeProc) ? xml.CTeProc[0] : xml.CTeProc;
      if (p2?.CTe?.[0]?.infCte) return true;
      const p3 = Array.isArray(xml.procCTe) ? xml.procCTe[0] : xml.procCTe;
      if (p3?.CTe?.[0]?.infCte) return true;
      return false;
    } catch (error) {
      console.warn('Erro ao verificar suporte para XML CTe:', error);
      return false;
    }
  }

  extract(xml: any): CommonCteDTO {
    const inf: any =
      xml.CTe?.[0]?.infCte?.[0] ??
      (Array.isArray(xml.cteProc)
        ? xml.cteProc[0].CTe?.[0]?.infCte?.[0]
        : xml.cteProc?.CTe?.[0]?.infCte?.[0]) ??
      (Array.isArray(xml.CTeProc)
        ? xml.CTeProc[0].CTe?.[0]?.infCte?.[0]
        : xml.CTeProc?.CTe?.[0]?.infCte?.[0]) ??
      (Array.isArray(xml.procCTe)
        ? xml.procCTe[0].CTe?.[0]?.infCte?.[0]
        : xml.procCTe?.CTe?.[0]?.infCte?.[0]);

    if (!inf) throw new Error('infCte não encontrado');

    const ide = inf.ide?.[0] ?? {};
    const emit = inf.emit?.[0] ?? {};
    const rem = inf.rem?.[0] ?? {};
    const dest = inf.dest?.[0] ?? {};
    const receb = inf.receb?.[0] ?? {};
    const toma = inf.toma?.[0] ?? {};
    const vPrest = inf.vPrest?.[0] ?? {};
    const imp = inf.imp?.[0] ?? {};
    const icmsG = imp.ICMS?.[0] ?? {};

    const icmsKeys = Object.keys(icmsG).filter((key) => key.startsWith('ICMS'));
    const icmsType = icmsKeys.length > 0 ? icmsKeys[0] : '';
    const icmsData = icmsType ? (icmsG[icmsType]?.[0] ?? {}) : {};

    let cst = '';
    let vBC = '';
    let pICMS = '';
    let vICMS = '';

    cst = icmsData.CST?.[0] ?? '';

    if (icmsType === 'ICMS00' || icmsType === 'ICMS20') {
      vBC = icmsData.vBC?.[0] ?? '';
      pICMS = icmsData.pICMS?.[0] ?? '';
      vICMS = icmsData.vICMS?.[0] ?? '';
    } else if (icmsType === 'ICMS45') {
      vBC = '';
      pICMS = '';
      vICMS = '';
    } else if (icmsType === 'ICMS60') {
      vBC = icmsData.vBCSTRET?.[0] ?? '';
      pICMS = icmsData.pICMSSTRET?.[0] ?? '';
      vICMS = icmsData.vICMSSTRET?.[0] ?? '';
    } else if (icmsType === 'ICMS90') {
      vBC = icmsData.vBC?.[0] ?? '';
      pICMS = icmsData.pICMS?.[0] ?? '';
      vICMS = icmsData.vICMS?.[0] ?? '';
    } else if (icmsType === 'ICMSOutraUF') {
      vBC = icmsData.vBCOutraUF?.[0] ?? '';
      pICMS = icmsData.pICMSOutraUF?.[0] ?? '';
      vICMS = icmsData.vICMSOutraUF?.[0] ?? '';
    } else if (icmsType === 'ICMSSN101') {
      // Simples Nacional - ICMSSN101
      vBC = '';
      pICMS = icmsData.pCredSN?.[0] ?? '';
      vICMS = icmsData.vCredICMSSN?.[0] ?? '';
    } else if (icmsType === 'ICMSSN') {
      // Outros tipos de Simples Nacional genérico
      vBC = '';
      pICMS = icmsData.pCredSN?.[0] ?? '';
      vICMS = icmsData.vCredICMSSN?.[0] ?? '';
    } else if (icmsType.startsWith('ICMSSN')) {
      // Outros tipos específicos de Simples Nacional
      vBC = '';
      pICMS = icmsData.pCredSN?.[0] ?? '';
      vICMS = icmsData.vCredICMSSN?.[0] ?? '';
    } else if (icmsKeys.length > 0) {
      // Para outros tipos não mapeados, tentamos pegar valores genéricos
      vBC = icmsData.vBC?.[0] ?? icmsData.vBCOutraUF?.[0] ?? '';
      pICMS = icmsData.pICMS?.[0] ?? icmsData.pICMSOutraUF?.[0] ?? '';
      vICMS = icmsData.vICMS?.[0] ?? icmsData.vICMSOutraUF?.[0] ?? '';
    }

    const norm = inf.infCTeNorm?.[0] ?? {};
    const carga = norm.infCarga?.[0] ?? {};
    const infDoc = norm.infDoc?.[0] ?? {};
    const nfeKeysRaw = Array.isArray(infDoc.infNFe) ? infDoc.infNFe : [];
    const jsChavesNfe: string[] = Array.from(
      new Set(
        nfeKeysRaw
          .map((n: any) => {
            const chaveVal = Array.isArray(n?.chave) ? n.chave[0] : n?.chave;
            return Array.isArray(chaveVal) ? chaveVal[0] : chaveVal;
          })
          .map((c: any) => (c ? String(c).trim() : ''))
          .filter(Boolean)
      )
    ) as string[];
    const comp =
      carga.proPred && carga.vCarga
        ? [{ ds_nome: carga.proPred[0], vl_comp: carga.vCarga[0] }]
        : [];
    const itens = Array.isArray(carga.infQ)
      ? carga.infQ.map((q: any) => ({
          ds_und: padronizarUnidadeMedida(q.cUnid?.[0] ?? ''),
          ds_tipo_medida: q.tpMed?.[0] ?? '',
          vl_qtd_carregada: q.qCarga?.[0] ?? '',
        }))
      : [];

    const rawId: string = inf.$.Id;
    const chave = rawId.replace(/^CTe/, '');

    const forn = inf.emit?.[0];
    const endForn = forn.enderEmit?.[0];

    // extrai documentos autorizados (autXML) se presentes
    const docsAut: Array<{
      tipo: 'CNPJ' | 'CPF' | string;
      documento: string;
    }> = [];
    try {
      const autNodes = inf.autXML
        ? Array.isArray(inf.autXML)
          ? inf.autXML
          : [inf.autXML]
        : [];
      for (const a of autNodes) {
        if (!a) continue;
        if (a.CNPJ && a.CNPJ[0]) {
          docsAut.push({ tipo: 'CNPJ', documento: a.CNPJ[0] });
        } else if (a.CPF && a.CPF[0]) {
          docsAut.push({ tipo: 'CPF', documento: a.CPF[0] });
        } else {
          // se elemento direto for string
          const raw = typeof a === 'string' ? a : null;
          if (raw) {
            docsAut.push({ tipo: 'unknown', documento: raw });
          }
        }
      }
    } catch (e) {
      // não falhar se estrutura inesperada
    }

    // extrai documentos anteriores (docAnt) se presentes
    const docsAnteriores: string[] = [];
    try {
      const docAntNodes = norm.docAnt
        ? Array.isArray(norm.docAnt)
          ? norm.docAnt
          : [norm.docAnt]
        : [];
      for (const docAnt of docAntNodes) {
        if (!docAnt) continue;
        const emiDocAnt = docAnt.emiDocAnt
          ? Array.isArray(docAnt.emiDocAnt)
            ? docAnt.emiDocAnt[0]
            : docAnt.emiDocAnt
          : null;
        if (emiDocAnt) {
          const idDocAnt = emiDocAnt.idDocAnt
            ? Array.isArray(emiDocAnt.idDocAnt)
              ? emiDocAnt.idDocAnt[0]
              : emiDocAnt.idDocAnt
            : null;
          if (idDocAnt) {
            // CTe eletrônico
            if (idDocAnt.idDocAntEle) {
              const docEles = Array.isArray(idDocAnt.idDocAntEle)
                ? idDocAnt.idDocAntEle
                : [idDocAnt.idDocAntEle];
              for (const docEle of docEles) {
                if (docEle.chCTe && docEle.chCTe[0]) {
                  docsAnteriores.push(docEle.chCTe[0]);
                }
                if (docEle.chNFe && docEle.chNFe[0]) {
                  docsAnteriores.push(docEle.chNFe[0]);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // não falhar se estrutura inesperada
    }
    // extrai observação complementar (compl.xObs)
    const compl = inf.compl?.[0];
    const dsObservacao = compl?.xObs?.[0]
      ? String(compl.xObs[0]).trim()
      : undefined;

    // Novo padrão: considerar observações complementares (ObsCont)
    const obsContList = Array.isArray(compl?.ObsCont)
      ? compl?.ObsCont
      : compl?.ObsCont
        ? [compl.ObsCont]
        : [];
    const obsContText = obsContList
      .map((o: any) => o?.xTexto?.[0])
      .filter(Boolean)
      .map((t: any) => String(t).trim())
      .join(' | ');

    const dsObservacaoTotal =
      [dsObservacao, obsContText]
        .filter((t) => t && t.length > 0)
        .join(' | ')
        .trim() || undefined;

    // extrai placas a partir da observação (suporta formatos antigo e Mercosul)
    const extractPlacas = (text?: string): string[] => {
      if (!text) return [];
      const t = String(text).toUpperCase();
      // padrões: ABC1234 (antigo) ou ABC1D23 (Mercosul)
      const regex = /([A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z]\d{2})/g;
      const found = new Set<string>();
      let m: RegExpExecArray | null;
      while ((m = regex.exec(t))) {
        if (m[1]) found.add(m[1]);
      }
      return Array.from(found);
    };
    // placas podem aparecer tanto em xObs quanto em ObsCont
    const placas = extractPlacas(dsObservacaoTotal);

    // Inferência do tomador: se não houver dados em inf.toma, usar o indicador (ide.toma / ide.toma3)
    let tomaIndicator: string | undefined;
    if (ide.toma && typeof ide.toma[0] === 'string') {
      tomaIndicator = ide.toma[0];
    } else if (ide.toma && ide.toma[0]?.toma) {
      tomaIndicator = ide.toma[0].toma?.[0];
    } else if (ide.toma3 && ide.toma3[0]?.toma) {
      tomaIndicator = ide.toma3[0].toma?.[0];
    } else if (toma && toma.toma) {
      tomaIndicator = toma.toma?.[0];
    }

    // toma4 = grupo próprio do tomador no XML (inf.toma com CNPJ/CPF/xNome)
    const hasToma4Data = Boolean(toma && (toma.CNPJ?.[0] || toma.CPF?.[0] || toma.xNome?.[0]));
    let inferredTomaSrc: any = toma;
    let tp_tomador = 'OUTRO';
    let origem_tomador_xml = 'toma4';

    if (!hasToma4Data && tomaIndicator !== undefined && tomaIndicator !== null) {
      // toma3 = indicador de papel; dados vêm do participante correspondente (nunca do nó toma3)
      origem_tomador_xml = 'toma3';
      switch (String(tomaIndicator)) {
        case '0':
          inferredTomaSrc = rem;
          tp_tomador = 'REMETENTE';
          break;
        case '1':
          inferredTomaSrc = rem;
          tp_tomador = 'EXPEDIDOR';
          break;
        case '2':
          inferredTomaSrc = receb || dest || rem;
          tp_tomador = 'RECEBEDOR';
          break;
        case '3':
          inferredTomaSrc = dest;
          tp_tomador = 'DESTINATARIO';
          break;
        case '4':
        default:
          inferredTomaSrc = toma;
          tp_tomador = 'OUTRO';
          break;
      }
    }

    const tomaDoc = inferredTomaSrc?.CNPJ?.[0] || toma?.CNPJ?.[0] || inferredTomaSrc?.CPF?.[0] || toma?.CPF?.[0];
    const tomaNome = inferredTomaSrc?.xNome?.[0] || toma?.xNome?.[0];

    return {
      id: rawId,
      chave,
      js_chaves_nfe: jsChavesNfe.length ? jsChavesNfe : undefined,
      ds_uf: ide.UFIni?.[0],
      cd_ibge: ide.cUF?.[0],
      cd_cte: ide.cCT?.[0],
      ds_cfop: ide.CFOP?.[0],
      ds_natureza_operacao: ide.natOp?.[0],
      ds_modelo: ide.mod ? parseInt(ide.mod[0], 10) : undefined,
      ds_serie: ide.serie ? parseInt(ide.serie[0], 10) : undefined,
      ds_numero: ide.nCT?.[0],
      dt_emissao: ide.dhEmi?.[0],
      ds_tp_cte: ide.tpCTe ? parseInt(ide.tpCTe[0], 10) : undefined,
      ds_modal: ide.modal?.[0],
      ds_tp_serv: ide.tpServ ? parseInt(ide.tpServ[0], 10) : undefined,

      cd_mun_env: ide.cMunEnv?.[0],
      ds_nome_mun_env: ide.xMunEnv?.[0],
      ds_uf_env: ide.UFEnv?.[0],

      cd_mun_ini: ide.cMunIni?.[0],
      ds_nome_mun_ini: ide.xMunIni?.[0],
      ds_uf_ini: ide.UFIni?.[0],

      cd_mun_fim: ide.cMunFim?.[0],
      ds_nome_mun_fim: ide.xMunFim?.[0],
      ds_uf_fim: ide.UFFim?.[0],

      ds_retira: ide.retira ? parseInt(ide.retira[0], 10) : undefined,
      ds_ind_ie_toma: ide.indIEToma
        ? parseInt(ide.indIEToma[0], 10)
        : undefined,

      emit_CNPJ: emit.CNPJ?.[0],
      emit_xNome: emit.xNome?.[0],
      dest_CNPJ: dest.CNPJ?.[0],
      dest_xNome: dest.xNome?.[0],
      rem_CNPJ: rem.CNPJ?.[0],
      rem_xNome: rem.xNome?.[0],
      toma_CNPJ: inferredTomaSrc?.CNPJ?.[0] || toma?.CNPJ?.[0],
      toma_xNome: tomaNome,
      toma_CPF: inferredTomaSrc?.CPF?.[0] || toma?.CPF?.[0],
      tp_tomador,
      origem_tomador_xml,

      vl_total: vPrest.vTPrest?.[0],
      vl_rec: vPrest.vRec?.[0],
      vl_total_trib: imp.vTotTrib?.[0],

      ds_cst_tributacao: cst,
      vl_base_calculo_icms: vBC,
      vl_icms: vICMS,
      vl_porcentagem_icms: pICMS,
      cd_icms: icmsType.replace('ICMS', ''),
      ds_icms_tag: icmsType,
      cargaComponentes: comp,
      cargaItens: itens,
      ds_produto_predominante: carga.proPred?.[0],
      vl_mercadoria_carga: carga.vCarga?.[0],

      forn_documento: forn.CNPJ?.[0] || forn.CPF?.[0] || '',
      forn_nome: forn.xNome?.[0] || '',
      forn_im: forn.IM?.[0] || '',
      forn_ie: forn.IE?.[0] || '',
      forn_endereco: endForn.xLGr?.[0] || '',
      forn_complemento: endForn.xCpl?.[0] || '',
      forn_bairro: endForn.xBairro?.[0] || '',
      forn_cep: endForn.CEP?.[0] || '',
      forn_codigo_municipio: endForn.cMun?.[0] || '',
      forn_telefone: forn.fone?.[0] || '',
      forn_email: forn.email?.[0] || '',
      js_documentos_autorizados: docsAut.length ? docsAut : undefined,
      js_documentos_anteriores: docsAnteriores.length
        ? docsAnteriores
        : undefined,
      ds_observacao: dsObservacaoTotal,
      js_placas_veiculos: placas.length ? placas : undefined,
    };
  }
}

export class ImportarXmlCteService {
  private readonly PLACEHOLDER_DOC_ANTERIOR =
    '99999999999999999999999999999999999999999999';

  private sanitizeDocAnteriores(keys?: string[]): string[] {
    return (keys || []).map((k) => String(k).trim()).filter(Boolean);
  }

  private isPlaceholderDocAnterior(value: unknown): boolean {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return (
        trimmed === this.PLACEHOLDER_DOC_ANTERIOR || /^9{30,}$/i.test(trimmed)
      );
    }
    if (Array.isArray(value)) {
      return (value as unknown[]).some((v) => this.isPlaceholderDocAnterior(v));
    }
    return false;
  }

  // Atualiza registros antigos que guardaram placeholder de documentos anteriores
  private async replacePlaceholderDocAnteriores(
    dsChave: string,
    incomingKeys?: string[]
  ): Promise<void> {
    const sanitized = this.sanitizeDocAnteriores(incomingKeys);
    const hasRealKeys = sanitized.some(
      (k) => !this.isPlaceholderDocAnterior(k)
    );
    if (!dsChave || !sanitized.length || !hasRealKeys) return;

    const existing = await prisma.fis_cte.findFirst({
      where: { ds_chave: dsChave },
      select: { id: true, js_documentos_anteriores: true },
    });

    if (
      !existing ||
      !this.isPlaceholderDocAnterior(existing.js_documentos_anteriores)
    )
      return;

    await prisma.fis_cte.update({
      where: { id: existing.id },
      data: { js_documentos_anteriores: sanitized },
    });
  }
  private parsers: CteParser[] = [new StandardCteParser()];
  private readonly PLACEHOLDER_NFE_KEY =
    '99999999999999999999999999999999999999999999';

  private sanitizeNfeKeys(keys?: string[]): string[] {
    return (keys || []).map((k) => String(k).trim()).filter(Boolean);
  }

  private isPlaceholderNfeKey(value: unknown): boolean {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === this.PLACEHOLDER_NFE_KEY || /^9{30,}$/i.test(trimmed);
    }
    if (Array.isArray(value)) {
      return (value as unknown[]).some((v) => this.isPlaceholderNfeKey(v));
    }
    return false;
  }

  // Atualiza registros antigos que guardaram placeholder de chave de NFe
  private async replacePlaceholderNfeKeys(
    dsChave: string,
    incomingKeys?: string[]
  ): Promise<void> {
    const sanitized = this.sanitizeNfeKeys(incomingKeys);
    const hasRealKeys = sanitized.some((k) => !this.isPlaceholderNfeKey(k));
    if (!dsChave || !sanitized.length || !hasRealKeys) return;

    const existing = await prisma.fis_cte.findFirst({
      where: { ds_chave: dsChave },
      select: { id: true, js_chaves_nfe: true },
    });

    if (!existing || !this.isPlaceholderNfeKey(existing.js_chaves_nfe)) return;

    await prisma.fis_cte.update({
      where: { id: existing.id },
      data: { js_chaves_nfe: sanitized },
    });
  }

  private toCents(v: string = '0'): string {
    const n = parseFloat(v.replace(',', '.')) || 0;
    return Math.round(n * 100).toString();
  }

  private normalizeText(s?: string): string {
    if (!s) return '';
    return String(s)
      .normalize('NFD')
      .replace(/[ -\u007F]/g, (c) => c)
      .replace(/[ -\uFFFF]/g, (c) => c)
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(s: string): string[] {
    const stopwords = new Set([
      'e',
      'de',
      'do',
      'da',
      'dos',
      'das',
      'ltda',
      'lt',
      'me',
      'empresa',
      'transportes',
      'transportadora',
      'transportes',
    ]);
    const txt = this.normalizeText(s || '');
    if (!txt) return [];
    return txt.split(' ').filter((t) => t && !stopwords.has(t) && t.length > 1);
  }

  private tokenOverlapScore(name: string, obs: string): number {
    const nameTokens = this.tokenize(name);
    const obsTokens = new Set(this.tokenize(obs));
    if (!nameTokens.length) return 0;
    let matched = 0;
    for (const t of nameTokens) if (obsTokens.has(t)) matched++;
    return matched / nameTokens.length;
  }

  private containsSubcontractKeyword(obs?: string): boolean {
    if (!obs) return false;
    const t = this.normalizeText(obs);
    return /subcontrat|subempreit|tercei[rz]|contratado por|transportador subcontratado/.test(
      t
    );
  }

  private cleanNome(nomeRaw?: string): string | undefined {
    if (!nomeRaw) return undefined;
    // Remove números do início e fim, mantém apenas letras e espaços
    let cleaned = nomeRaw
      .replace(/^[^A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ]*/i, '')
      .trim();
    cleaned = cleaned.replace(/[^A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ\s]/gi, '').trim();
    return cleaned.length > 0 ? cleaned : undefined;
  }

  private extractMotoristaFromObs(obs?: string): {
    nome?: string;
    cpf?: string;
  } {
    if (!obs) return {};
    const texto = String(obs);

    let nome: string | undefined = undefined;
    let cpf: string | undefined = undefined;

    // Padrão 1: MOTORISTA: NOME; CPF: 00000000000
    let nomeMatch = texto.match(/MOTORISTA:\s*([^;:\n]+?)(?:\s*[;:]|\s*$)/i);
    let cpfMatch = texto.match(/CPF:\s*([0-9\.\/-]+)/i);

    if (nomeMatch) {
      nome = this.cleanNome(nomeMatch[1].trim());
    }
    if (cpfMatch) {
      cpf = cpfMatch[1].replace(/\D/g, '');
    }

    // Se encontrou dados com padrão 1, retorna
    if (nome || cpf) {
      return { nome, cpf };
    }

    // Padrão 2: Procura por "NOME, CPF" ou "NOME CPF" no texto
    const nomeCpfMatch = texto.match(
      /([A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ][A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ\s]+?),\s*(?:CPF[:\s]+)?(\d{2,})/i
    );

    if (nomeCpfMatch) {
      nome = this.cleanNome(nomeCpfMatch[1].trim());
      const potencialCpf = nomeCpfMatch[2].trim();
      // Verifica se é um CPF válido (11 dígitos)
      if (potencialCpf.replace(/\D/g, '').length === 11) {
        cpf = potencialCpf.replace(/\D/g, '');
      }
    }

    // Padrão 3: Se ainda não encontrou nome, tenta procurar apenas o nome
    if (!nome) {
      const soNomeMatch = texto.match(
        /(?:MOTORISTA|CONDUTOR|MOTORISTA PRINCIPAL)[\s:]+([A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ][A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ\s]+?)(?:\s*[;,\n]|$)/i
      );
      if (soNomeMatch) {
        nome = this.cleanNome(soNomeMatch[1].trim());
      }
    }

    // Última tentativa: procura por blocos de texto em maiúsculas
    if (!nome) {
      const ultimaTentativa = texto.match(
        /^([A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ][A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ\s]{2,}?)(?:\s*[,;]|\s*(?:CPF|CNH)|$)/m
      );
      if (ultimaTentativa) {
        nome = this.cleanNome(ultimaTentativa[1].trim());
      }
    }

    return { nome, cpf };
  }

  // Tenta encontrar empresa fiscal a partir de um funcionário (motorista) mencionado na observação
  private async findEmpresaByFuncionario(
    nome?: string,
    cpf?: string
  ): Promise<{ fisEmpresaId?: string; razao?: string; documento?: string }> {
    if (!nome && !cpf) return {};

    // Prioriza busca por CPF (mais específica)
    const whereConditions: any[] = [];

    if (cpf) {
      whereConditions.push({
        ds_documento: cpf,
      });
    }

    if (nome) {
      whereConditions.push({
        ds_nome: {
          contains: nome,
          mode: 'insensitive' as const,
        },
      });
    }

    const funcionario = await prisma.rh_funcionarios.findFirst({
      where: {
        AND: [{ OR: whereConditions }, { ds_situacao: 'Trabalhando' }],
      },
      select: {
        id_rh_empresas: true,
        ds_nome: true,
        ds_documento: true,
      },
    });

    if (!funcionario?.id_rh_empresas) {
      console.log(
        `[CTe] Funcionário não encontrado: nome="${nome}", cpf="${cpf}"`
      );
      return {};
    }

    console.log(
      `[CTe] Funcionário encontrado: ${funcionario.ds_nome} (CPF: ${funcionario.ds_documento})`
    );

    const rhEmpresa = await prisma.rh_empresas.findUnique({
      where: { id: funcionario.id_rh_empresas },
      select: { id_sis_empresas: true },
    });
    if (!rhEmpresa?.id_sis_empresas) {
      console.log(`[CTe] rh_empresas não encontrado para funcionário`);
      return {};
    }

    const sisEmpresa = await prisma.sis_empresas.findUnique({
      where: { id: rhEmpresa.id_sis_empresas },
      select: { id: true, ds_razao_social: true, ds_documento: true },
    });
    if (!sisEmpresa?.id) {
      console.log(`[CTe] sis_empresas não encontrado`);
      return {};
    }

    const fisEmpresa = await prisma.fis_empresas.findUnique({
      where: { id_sis_empresas: sisEmpresa.id },
      select: { id: true },
    });
    if (!fisEmpresa?.id) {
      console.log(
        `[CTe] fis_empresas não encontrado para: ${sisEmpresa.ds_razao_social}`
      );
      return {};
    }

    console.log(
      `[CTe] ✅ Subcontratada vinculada via funcionário: ${sisEmpresa.ds_razao_social} (${sisEmpresa.ds_documento})`
    );

    return {
      fisEmpresaId: fisEmpresa.id,
      razao: sisEmpresa.ds_razao_social || undefined,
      documento: sisEmpresa.ds_documento || undefined,
    };
  }

  // Tenta encontrar empresa fiscal a partir das placas encontradas na observação
  private async findEmpresaByPlacas(
    placas: string[]
  ): Promise<{ fisEmpresaId?: string; razao?: string; documento?: string }> {
    if (!placas.length) return {};

    for (const placa of placas) {
      const veiculo = await prisma.tms_veiculos.findFirst({
        where: { ds_placa: placa },
        select: { id_tms_empresas: true },
      });

      if (!veiculo?.id_tms_empresas) continue;

      const tmsEmpresa = await prisma.tms_empresas.findUnique({
        where: { id: veiculo.id_tms_empresas },
        select: { id_sis_empresas: true },
      });
      if (!tmsEmpresa?.id_sis_empresas) continue;

      const sisEmpresa = await prisma.sis_empresas.findUnique({
        where: { id: tmsEmpresa.id_sis_empresas },
        select: { id: true, ds_razao_social: true, ds_documento: true },
      });
      if (!sisEmpresa?.id) continue;

      const fisEmpresa = await prisma.fis_empresas.findUnique({
        where: { id_sis_empresas: sisEmpresa.id },
        select: { id: true },
      });
      if (!fisEmpresa?.id) continue;

      return {
        fisEmpresaId: fisEmpresa.id,
        razao: sisEmpresa.ds_razao_social || undefined,
        documento: sisEmpresa.ds_documento || undefined,
      };
    }

    return {};
  }

  private async fetchBrasilApiCnpj(cnpj: string): Promise<any | null> {
    try {
      const clean = String(cnpj).replace(/\D/g, '');
      if (!clean) return null;
      const url = `https://brasilapi.com.br/api/cnpj/v1/${clean}`;
      try {
      } catch (e) {}
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'esteira-contabil-back/1.0',
        },
      });
      if (!res.ok) {
        let body = null;
        try {
          body = await res.text();
        } catch (e) {
          body = '<no-body>';
        }
        let bodyTruncated: any = body;
        if (typeof body === 'string' && body.length > 500) {
          bodyTruncated = body.slice(0, 500) + '...';
        }
        let respHeaders: any = {};
        try {
          respHeaders = Object.fromEntries(res.headers.entries());
        } catch (e) {
          respHeaders = { note: 'could not read headers' };
        }
        return null;
      }
      const j = await res.json();
      return j;
    } catch (e) {
      console.warn('Erro ao consultar BrasilAPI:', e);
      return null;
    }
  }

  private async enrichDocsAut(
    docs: Array<{ tipo: string; documento: string }> | undefined,
    observacao?: string
  ): Promise<{ enriched: any[]; matchedEmpresaId?: string }> {
    const enriched: any[] = [];
    let matchedEmpresaId: string | undefined;
    if (!docs || !docs.length) return { enriched, matchedEmpresaId };

    for (const d of docs) {
      const docOnly = String(d.documento || '').replace(/\D/g, '');
      let api = null;
      if (docOnly) api = await this.fetchBrasilApiCnpj(docOnly);

      const razao = api?.razao_social ?? api?.nome ?? undefined;
      const fantasia = api?.nome_fantasia ?? api?.fantasia ?? undefined;

      let scoreRazao = 0;
      if (razao) {
        scoreRazao = this.tokenOverlapScore(razao, observacao || '');
      }
      let scoreFant = 0;
      if (fantasia) {
        scoreFant = this.tokenOverlapScore(fantasia, observacao || '');
      }
      const score = Math.max(scoreRazao, scoreFant);

      const matchedText = (() => {
        const obsNorm = this.normalizeText(observacao || '');
        const rNorm = this.normalizeText(razao || '');
        const fNorm = this.normalizeText(fantasia || '');
        if (rNorm && obsNorm.includes(rNorm)) return razao;
        if (fNorm && obsNorm.includes(fNorm)) return fantasia;
        return undefined;
      })();

      const keyword = this.containsSubcontractKeyword(observacao);
      // Lógica melhorada: considera subcontratada se:
      // 1. Contém palavra-chave "subcontratado" E score >= 0.4 (reduzido de 0.6)
      // 2. OU contém palavra-chave E há match de texto direto
      const isSub = Boolean(keyword && (score >= 0.4 || matchedText));
      if (isSub && !matchedEmpresaId) {
        try {
          const emp = await getFiscalEmpresaPorDocumento(docOnly);
          if (emp && emp.id) matchedEmpresaId = emp.id;
        } catch (e) {
          // ignore
        }
      }

      enriched.push({
        ...d,
        api_razao_social: razao ?? undefined,
        api_nome_fantasia: fantasia ?? undefined,
        match_score: Number(score.toFixed(3)),
        is_subcontratada: isSub,
        matched_text: matchedText ?? undefined,
      });
    }

    return { enriched, matchedEmpresaId };
  }

  // Preserve wall-clock: parse an ISO-like string and create a Date whose UTC fields
  // match the original local numbers. This makes the DB ISO show the same wall-clock
  // values (but changes the actual instant). Use when you want to store the local
  // date/time as-is in a DateTime column.
  private parseKeepWallClockAsUTC(iso?: string): Date | undefined {
    if (!iso) return undefined;
    const m = iso.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/
    );
    if (!m) {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? undefined : d;
    }
    const [, y, mo, d, hh, mm, ss, frac] = m;
    const ms = frac ? parseInt((frac + '000').slice(0, 3), 10) : 0;
    return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss, ms));
  }

  async processXmlData(
    xmlData: any,
    origem: string
  ): Promise<{
    cte: Prisma.fis_cteCreateInput | null;
    resposta: Error | null;
  }> {
    const parser = this.parsers.find((p) => p.supports(xmlData));
    if (!parser) {
      return {
        cte: null,
        resposta: new Error('Formato XML de CTe não suportado'),
      };
    }
    const dto = parser.extract(xmlData);

    // Atualiza js_chaves_nfe caso o registro existente esteja com placeholder e agora tenhamos chaves reais
    if (dto.chave && dto.js_chaves_nfe && dto.js_chaves_nfe.length > 0) {
      await this.replacePlaceholderNfeKeys(dto.chave, dto.js_chaves_nfe);
    }
    // Atualiza js_documentos_anteriores caso o registro existente esteja com placeholder e agora tenhamos valores reais
    if (
      dto.chave &&
      dto.js_documentos_anteriores &&
      dto.js_documentos_anteriores.length > 0
    ) {
      await this.replacePlaceholderDocAnteriores(
        dto.chave,
        dto.js_documentos_anteriores
      );
    }

    const rawData = JSON.stringify(xmlData);
    return this.saveFromDto(dto, origem, rawData);
  }

  private async saveFromDto(
    dto: CommonCteDTO,
    origem: string,
    rawData: string
  ) {
    let resposta: Error | null = null;
    // const fisEmp = await getFiscalEmpresa(empresaId);

    // helper to bind company by CNPJ
    const tryBind = async (cnpj?: string) => {
      if (!cnpj) return undefined;
      try {
        const emp = await getFiscalEmpresaPorDocumento(cnpj.replace(/\D/g, ''));
        return emp.id;
      } catch {
        return undefined;
      }
    };
    const idEmitente = await tryBind(dto.emit_CNPJ);
    const idDestinatario = await tryBind(dto.dest_CNPJ);
    const idTomador = await tryBind(dto.toma_CNPJ);
    // let empresa = isSaida ? idEmitente : idDestinatario;

    // Busca em cascata por documento com EMITIDO
    const dtEmissao = dto.dt_emissao
      ? this.parseKeepWallClockAsUTC(dto.dt_emissao)
      : undefined;
    const vlTotal = this.toCents(dto.vl_total || '0');

    // Se já existe CTe com placeholder de NFe no banco, substitui por chaves reais
    await this.replacePlaceholderNfeKeys(dto.chave, dto.js_chaves_nfe);

    // Se o XML trouxe chaves reais, verificar se já existe registro CTe com
    // campo `js_chaves_nfe` nulo ou contendo placeholder; se sim, atualizar.
    try {
      if (dto.js_chaves_nfe && dto.js_chaves_nfe.length) {
        const existingForUpdate = await prisma.fis_cte.findUnique({
          where: { ds_chave: dto.chave },
          select: { id: true, js_chaves_nfe: true },
        });

        const isPlaceholderArray = (arr: any[] | null | undefined) => {
          if (!arr || !Array.isArray(arr) || arr.length === 0) return true;
          // consider sequences like '000000...' or '999999...' or strings containing 'PLACEHOLDER' as placeholder
          const placeholderRe = /^0+$|^9+$|PLACEHOLDER/i;
          return arr.every((k) => {
            if (!k) return true;
            const s = String(k).replace(/\D/g, '');
            if (!s) return true;
            return placeholderRe.test(s) || placeholderRe.test(String(k));
          });
        };

        if (existingForUpdate) {
          const shouldUpdate =
            existingForUpdate.js_chaves_nfe == null ||
            isPlaceholderArray(existingForUpdate.js_chaves_nfe as any);

          if (shouldUpdate) {
            await prisma.fis_cte.update({
              where: { id: existingForUpdate.id },
              data: { js_chaves_nfe: dto.js_chaves_nfe },
            });
            console.log(
              `[CTe] Atualizado js_chaves_nfe para CTe (ds_chave=${dto.chave}) com ${dto.js_chaves_nfe.length} chaves reais.`
            );
          }
        }
      }
    } catch (e) {
      console.warn('[CTe] Erro ao atualizar js_chaves_nfe existente:', e);
    }

    // Enriquecer documentos autorizados (consulta BrasilAPI) e tentar detectar subcontratada
    const enrichRes = await this.enrichDocsAut(
      dto.js_documentos_autorizados,
      dto.ds_observacao
    );
    const enrichedDocsAut = enrichRes.enriched;
    const matchedSubId = enrichRes.matchedEmpresaId;
    if (enrichedDocsAut && enrichedDocsAut.length) {
      dto.js_documentos_autorizados = enrichedDocsAut as any;
    }
    const firstSub = (dto.js_documentos_autorizados || []).find(
      (x: any) => x && x.is_subcontratada
    );
    let subCnpj: string | undefined;
    let subRazao: string | undefined;
    if (firstSub) {
      subCnpj = String((firstSub as any).documento || '');
      const fsAny = firstSub as any;
      subRazao = fsAny.api_razao_social || fsAny.api_nome_fantasia;
    } else {
      subCnpj = undefined;
      subRazao = undefined;
    }

    let finalMatchedSubId = matchedSubId;

    // Fallback: extrair doc/razão direto da observação quando não veio em autXML
    if (!subCnpj && dto.ds_observacao) {
      const docMatch = dto.ds_observacao.match(
        /(?:CNPJ|CPF)\s*[:\-]?\s*([\d.\-\/]{11,18})/i
      );
      const rawDoc = docMatch ? (docMatch[1] || '').replace(/\D/g, '') : '';
      if (rawDoc) {
        subCnpj = rawDoc;
      }

      const razaoMatch = dto.ds_observacao.match(
        /subcontratad[oa]\s+com\s+([^,]+)/i
      );
      if (razaoMatch) {
        subRazao = razaoMatch[1]?.trim();
      }
    }

    // Se achar doc via observação, tenta vincular empresa fiscal
    if (!finalMatchedSubId && subCnpj) {
      try {
        const emp = await getFiscalEmpresaPorDocumento(subCnpj);
        if (emp?.id) finalMatchedSubId = emp.id;
      } catch (e) {
        // ignora lookup falho
      }
    }

    // Fallback 1: tentar identificar subcontratada via motorista mencionado na observação
    if (!finalMatchedSubId) {
      const { nome: motNome, cpf: motCpf } = this.extractMotoristaFromObs(
        dto.ds_observacao
      );
      const byFuncionario = await this.findEmpresaByFuncionario(
        motNome,
        motCpf
      );
      if (byFuncionario.fisEmpresaId) {
        finalMatchedSubId = byFuncionario.fisEmpresaId;
        subCnpj = subCnpj || byFuncionario.documento;
        subRazao = subRazao || byFuncionario.razao;
      }
    }

    // Fallback 2: tentar identificar subcontratada via placas dos veículos na observação
    if (!finalMatchedSubId && dto.js_placas_veiculos?.length) {
      const byPlaca = await this.findEmpresaByPlacas(dto.js_placas_veiculos);
      if (byPlaca.fisEmpresaId) {
        finalMatchedSubId = byPlaca.fisEmpresaId;
        subCnpj = subCnpj || byPlaca.documento;
        subRazao = subRazao || byPlaca.razao;
      }
    }

    // Fallback 3 (último): vincular diretamente empresa do funcionário encontrado na observação
    if (!finalMatchedSubId) {
      const { nome: motNome, cpf: motCpf } = this.extractMotoristaFromObs(
        dto.ds_observacao
      );
      if (motNome || motCpf) {
        const whereConditions: any[] = [];
        if (motCpf) whereConditions.push({ ds_documento: motCpf });
        if (motNome) {
          whereConditions.push({
            ds_nome: { contains: motNome, mode: 'insensitive' as const },
          });
        }

        const funcionario = await prisma.rh_funcionarios.findFirst({
          where: {
            AND: [{ OR: whereConditions }, { ds_situacao: 'Trabalhando' }],
          },
          select: { id_rh_empresas: true },
        });

        if (funcionario?.id_rh_empresas) {
          const rhEmpresa = await prisma.rh_empresas.findUnique({
            where: { id: funcionario.id_rh_empresas },
            select: { id_sis_empresas: true },
          });

          if (rhEmpresa?.id_sis_empresas) {
            const sisEmpresa = await prisma.sis_empresas.findUnique({
              where: { id: rhEmpresa.id_sis_empresas },
              select: { id: true, ds_razao_social: true, ds_documento: true },
            });

            if (sisEmpresa?.id) {
              const fisEmpresa = await prisma.fis_empresas.findUnique({
                where: { id_sis_empresas: sisEmpresa.id },
                select: { id: true },
              });

              if (fisEmpresa?.id) {
                finalMatchedSubId = fisEmpresa.id;
                subCnpj = subCnpj || sisEmpresa.ds_documento || undefined;
                subRazao = subRazao || sisEmpresa.ds_razao_social || undefined;
                console.log(
                  `[CTe] ✅ Fallback 3: Subcontratada vinculada automaticamente pela empresa do funcionário: ${sisEmpresa.ds_razao_social}`
                );
              }
            }
          }
        }
      }
    }

    // Extrair dados do motorista da observação
    const { nome: motNome, cpf: motCpf } = this.extractMotoristaFromObs(
      dto.ds_observacao
    );

    let aguardandoExtracao = null;

    // 1ª tentativa: chave + data + numero + valor
    if (dtEmissao && dto.ds_numero) {
      const startOfDay = new Date(dtEmissao);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(dtEmissao);
      endOfDay.setUTCHours(23, 59, 59, 999);

      aguardandoExtracao = await prisma.fis_cte.findFirst({
        where: {
          ds_chave: dto.chave,
          ds_numero: dto.ds_numero,
          dt_emissao: { gte: startOfDay, lte: endOfDay },
          vl_total: vlTotal,
          fis_documento: { some: { ds_status: 'EMITIDO' } },
        },
        include: { fis_documento: true },
      });
    }

    // 2ª tentativa: chave + data + numero
    if (!aguardandoExtracao && dtEmissao && dto.ds_numero) {
      const startOfDay = new Date(dtEmissao);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(dtEmissao);
      endOfDay.setUTCHours(23, 59, 59, 999);

      aguardandoExtracao = await prisma.fis_cte.findFirst({
        where: {
          ds_chave: dto.chave,
          ds_numero: dto.ds_numero,
          dt_emissao: { gte: startOfDay, lte: endOfDay },
          fis_documento: { some: { ds_status: 'EMITIDO' } },
        },
        include: { fis_documento: true },
      });
    }

    // 3ª tentativa: chave + numero
    if (!aguardandoExtracao && dto.ds_numero) {
      aguardandoExtracao = await prisma.fis_cte.findFirst({
        where: {
          ds_chave: dto.chave,
          ds_numero: dto.ds_numero,
          fis_documento: { some: { ds_status: 'EMITIDO' } },
        },
        include: { fis_documento: true },
      });
    }

    // Se encontrou documento EMITIDO, atualiza
    if (aguardandoExtracao && aguardandoExtracao.fis_documento.length > 0) {
      console.log(`[CTe] Atualizando documento EMITIDO: ${dto.chave}`);

      const docId = aguardandoExtracao.fis_documento[0].id;

      // Preserva IDs existentes
      const preservedEmitId = aguardandoExtracao.id_fis_empresa_emitente;
      const preservedDestId = aguardandoExtracao.id_fis_empresa_destinatario;
      const preservedSubId = aguardandoExtracao.id_fis_empresa_subcontratada;
      const preservedTomadorId = aguardandoExtracao.id_fis_empresa_tomador;
      const preservedEmitDoc = aguardandoExtracao.ds_documento_emitente;
      const preservedDestDoc = aguardandoExtracao.ds_documento_destinatario;

      // Prepara fornecedor se não for saída
      let fornecedorId: string | undefined;
      if (preservedDestId) {
        const cnpjFor = dto.emit_CNPJ?.replace(/\D/g, '') || '';
        if (cnpjFor) {
          const fornecedor = await getFornecedoresCached(preservedDestId);
          let f = fornecedor.find((item) => item.ds_documento === cnpjFor);
          if (f) {
            if (
              dto.forn_im !== null &&
              dto.forn_im !== undefined &&
              String(dto.forn_im).trim() !== ''
            ) {
              f = await prisma.fis_fornecedores.update({
                where: { id: f.id },
                data: { ds_inscricao_municipal: dto.forn_im },
              });
            }
            fornecedorId = f.id;
          } else {
            f = await prisma.fis_fornecedores.create({
              data: {
                id_fis_empresas: preservedDestId,
                ds_documento: cnpjFor,
                ds_nome: dto.forn_nome ?? '',
                ds_inscricao: dto.forn_ie ?? '',
                ds_inscricao_municipal: dto.forn_im ?? '',
                ds_endereco: dto.forn_endereco ?? '',
                ds_complemento: dto.forn_complemento ?? '',
                ds_bairro: dto.forn_bairro ?? '',
                ds_cep: dto.forn_cep ?? '',
                ds_codigo_municipio: Number(dto.forn_codigo_municipio) || null,
                ds_codigo_uf: Number(dto.forn_codigo_uf) || null,
                ds_telefone: dto.forn_telefone ?? '',
                ds_email: dto.forn_email ?? '',
              },
            });
            invalidateCache(`fornecedores_empresa_${preservedDestId}`);
            fornecedorId = f.id;
          }
        }
      }

      // Atualiza CTe preservando IDs existentes
      let finalSubCnpj: string | undefined;
      if (aguardandoExtracao.ds_documento_subcontratada) {
        finalSubCnpj = aguardandoExtracao.ds_documento_subcontratada;
      } else if (subCnpj) {
        finalSubCnpj = subCnpj;
      } else {
        finalSubCnpj = undefined;
      }

      let finalSubRazao: string | undefined;
      if (aguardandoExtracao.ds_razao_social_subcontratada) {
        finalSubRazao = aguardandoExtracao.ds_razao_social_subcontratada;
      } else if (subRazao) {
        finalSubRazao = subRazao;
      } else {
        finalSubRazao = undefined;
      }

      let finalSubEmpresaId: string | undefined;
      if (preservedSubId) {
        finalSubEmpresaId = preservedSubId;
      } else if (finalMatchedSubId) {
        finalSubEmpresaId = finalMatchedSubId;
      } else {
        finalSubEmpresaId = undefined;
      }

      await prisma.fis_cte.update({
        where: { id: aguardandoExtracao.id },
        data: {
          id_fis_empresa_emitente: preservedEmitId || idEmitente || undefined,
          id_fis_empresa_destinatario:
            preservedDestId || idDestinatario || undefined,
          id_fis_empresa_tomador: preservedTomadorId || idTomador || undefined,
          ds_documento_emitente: preservedEmitDoc || dto.emit_CNPJ,
          ds_documento_destinatario: preservedDestDoc || dto.dest_CNPJ,
          id_fis_fornecedor:
            fornecedorId || aguardandoExtracao.id_fis_fornecedor,

          ds_id_cte: dto.id,
          ds_chave: dto.chave,
          js_chaves_nfe: dto.js_chaves_nfe?.length
            ? dto.js_chaves_nfe
            : undefined,
          ds_uf: dto.ds_uf,
          cd_ibge: dto.cd_ibge,
          cd_cte: dto.cd_cte,
          ds_cfop: dto.ds_cfop,
          ds_natureza_operacao: dto.ds_natureza_operacao,
          ds_modelo: dto.ds_modelo,
          ds_serie: dto.ds_serie,
          ds_numero: dto.ds_numero,
          dt_emissao: dtEmissao,
          ds_tp_cte: dto.ds_tp_cte,
          ds_modal: dto.ds_modal,
          ds_tp_serv: dto.ds_tp_serv,
          ds_icms_tag: dto.ds_icms_tag,
          ds_razao_social_emitente: dto.emit_xNome,
          ds_razao_social_destinatario: dto.dest_xNome,
          ds_documento_remetente: dto.rem_CNPJ,
          ds_razao_social_remetente: dto.rem_xNome,
          ds_documento_tomador: dto.toma_CNPJ,
          ds_razao_social_tomador: dto.toma_xNome,
          cd_mun_env: dto.cd_mun_env,
          ds_nome_mun_env: dto.ds_nome_mun_env,
          ds_uf_env: dto.ds_uf_env,
          cd_mun_ini: dto.cd_mun_ini,
          ds_nome_mun_ini: dto.ds_nome_mun_ini,
          ds_uf_ini: dto.ds_uf_ini,
          cd_mun_fim: dto.cd_mun_fim,
          ds_nome_mun_fim: dto.ds_nome_mun_fim,
          ds_uf_fim: dto.ds_uf_fim,
          ds_retira: dto.ds_retira,
          ds_ind_ie_toma: dto.ds_ind_ie_toma,
          vl_total: this.toCents(dto.vl_total).toString() || undefined,
          vl_rec: this.toCents(dto.vl_rec).toString() || undefined,
          vl_total_trib:
            this.toCents(dto.vl_total_trib).toString() || undefined,
          ds_cst_tributacao: dto.ds_cst_tributacao,
          vl_base_calculo_icms:
            this.toCents(dto.vl_base_calculo_icms).toString() || undefined,
          vl_icms: this.toCents(dto.vl_icms).toString() || undefined,
          vl_porcentagem_icms:
            this.toCents(dto.vl_porcentagem_icms).toString() || undefined,
          cd_icms: dto.cd_icms,
          ds_observacao: dto.ds_observacao,
          js_documentos_autorizados: dto.js_documentos_autorizados
            ? dto.js_documentos_autorizados
            : undefined,
          js_documentos_anteriores: dto.js_documentos_anteriores
            ? dto.js_documentos_anteriores
            : undefined,
          js_placas_veiculos: dto.js_placas_veiculos
            ? dto.js_placas_veiculos
            : undefined,
          ds_documento_subcontratada: finalSubCnpj,
          ds_razao_social_subcontratada: finalSubRazao,
          id_fis_empresa_subcontratada: finalSubEmpresaId,
          ds_nome_motorista: motNome || aguardandoExtracao.ds_nome_motorista,
          ds_documento_motorista:
            motCpf || aguardandoExtracao.ds_documento_motorista,
        },
      });

      // Deleta componentes e cargas antigas
      await prisma.fis_cte_comp_carga.deleteMany({
        where: { id_fis_cte: aguardandoExtracao.id },
      });
      await prisma.fis_cte_carga.deleteMany({
        where: { id_fis_cte: aguardandoExtracao.id },
      });

      // Cria novos componentes e cargas
      if (dto.cargaComponentes?.length) {
        await prisma.fis_cte_comp_carga.createMany({
          data: dto.cargaComponentes.map((c) => ({
            id_fis_cte: aguardandoExtracao.id,
            ds_nome: c.ds_nome,
            vl_comp: this.toCents(c.vl_comp),
          })),
        });
      }

      if (dto.cargaItens?.length) {
        await prisma.fis_cte_carga.createMany({
          data: dto.cargaItens.map((i) => ({
            id_fis_cte: aguardandoExtracao.id,
            ds_und: i.ds_und,
            ds_tipo_medida: i.ds_tipo_medida,
            vl_qtd_carregada: this.toCents(i.vl_qtd_carregada),
          })),
        });
      }
      // Atualiza fis_documento para IMPORTADO
      await prisma.fis_documento.update({
        where: { id: docId },
        data: {
          ds_status: 'IMPORTADO',
          ds_origem: { sistema: origem },
        },
      });

      createDocumentoHistorico({
        justificativa: 'Documento encontrado após verificação SAT',
        id_documento: docId,
        status_novo: 'IMPORTADO',
        status_antigo: 'EMITIDO',
      });

      // Cria ou atualiza fis_documento_dfe
      const existingDfe = await prisma.fis_documento_dfe.findFirst({
        where: {
          id_cte: aguardandoExtracao.id,
        },
      });

      if (existingDfe) {
        await prisma.fis_documento_dfe.update({
          where: { id: existingDfe.id },
          data: {
            id_fis_documento: docId,
            ds_situacao_integracao: 'INTEGRADO',
            ds_documento_subcontratada: finalSubCnpj,
          },
        });
      } else {
        await prisma.fis_documento_dfe.create({
          data: {
            id_fis_documento: docId,
            id_cte: aguardandoExtracao.id,
            ds_tipo: 'CTE',
            ds_origem: origem as OrigemExtracao,
            dt_emissao: dtEmissao || new Date(),
            ds_situacao_integracao: 'INTEGRADO',
            ds_raw: rawData,
            ds_documento_subcontratada: finalSubCnpj,
          },
        });
      }

      return { cte: null, documento: null, resposta: null };
    }

    // duplicate check - documento normal (não EMITIDO)
    let exist = await prisma.fis_cte.findUnique({
      where: {
        ds_chave: dto.chave,
      },
    });
    if (exist) {
      // Se o CTe existente não tiver DFE associado, devemos reconstruir o registro completo
      const existingDfe = await prisma.fis_documento_dfe.findFirst({
        where: { id_cte: exist.id },
      });

      const shouldRebuild = !existingDfe;
      if (shouldRebuild) {
        console.log(
          `[CTe] Reconstruindo registro CTe id=${exist.id} (hasDfe=${Boolean(existingDfe)})`
        );

        // Preserva IDs existentes
        const preservedEmitId = exist.id_fis_empresa_emitente;
        const preservedDestId = exist.id_fis_empresa_destinatario;
        const preservedSubId = exist.id_fis_empresa_subcontratada;
        const preservedTomadorId = exist.id_fis_empresa_tomador;
        const preservedEmitDoc = exist.ds_documento_emitente;
        const preservedDestDoc = exist.ds_documento_destinatario;

        // Prepara fornecedor se não for saída
        let fornecedorIdRebuild: string | undefined;
        if (preservedDestId) {
          const cnpjFor = dto.emit_CNPJ?.replace(/\D/g, '') || '';
          if (cnpjFor) {
            const fornecedor = await getFornecedoresCached(preservedDestId);
            let f = fornecedor.find((item) => item.ds_documento === cnpjFor);
            if (f) {
              if (
                dto.forn_im !== null &&
                dto.forn_im !== undefined &&
                String(dto.forn_im).trim() !== ''
              ) {
                f = await prisma.fis_fornecedores.update({
                  where: { id: f.id },
                  data: { ds_inscricao_municipal: dto.forn_im },
                });
              }
              fornecedorIdRebuild = f.id;
            } else {
              f = await prisma.fis_fornecedores.create({
                data: {
                  id_fis_empresas: preservedDestId,
                  ds_documento: cnpjFor,
                  ds_nome: dto.forn_nome ?? '',
                  ds_inscricao: dto.forn_ie ?? '',
                  ds_inscricao_municipal: dto.forn_im ?? '',
                  ds_endereco: dto.forn_endereco ?? '',
                  ds_complemento: dto.forn_complemento ?? '',
                  ds_bairro: dto.forn_bairro ?? '',
                  ds_cep: dto.forn_cep ?? '',
                  ds_codigo_municipio:
                    Number(dto.forn_codigo_municipio) || null,
                  ds_codigo_uf: Number(dto.forn_codigo_uf) || null,
                  ds_telefone: dto.forn_telefone ?? '',
                  ds_email: dto.forn_email ?? '',
                },
              });
              invalidateCache(`fornecedores_empresa_${preservedDestId}`);
              fornecedorIdRebuild = f.id;
            }
          }
        }

        // Subcontratada
        let finalSubCnpj: string | undefined;
        if (exist.ds_documento_subcontratada) {
          finalSubCnpj = exist.ds_documento_subcontratada;
        } else if (subCnpj) {
          finalSubCnpj = subCnpj;
        } else {
          finalSubCnpj = undefined;
        }

        let finalSubRazao: string | undefined;
        if (exist.ds_razao_social_subcontratada) {
          finalSubRazao = exist.ds_razao_social_subcontratada;
        } else if (subRazao) {
          finalSubRazao = subRazao;
        } else {
          finalSubRazao = undefined;
        }

        let finalSubEmpresaId: string | undefined;
        if (preservedSubId) {
          finalSubEmpresaId = preservedSubId;
        } else if (finalMatchedSubId) {
          finalSubEmpresaId = finalMatchedSubId;
        } else {
          finalSubEmpresaId = undefined;
        }

        // Atualiza CTe com todos os campos
        const updatedCteRebuild = await prisma.fis_cte.update({
          where: { id: exist.id },
          data: {
            id_fis_empresa_emitente: preservedEmitId || idEmitente || undefined,
            id_fis_empresa_destinatario:
              preservedDestId || idDestinatario || undefined,
            id_fis_empresa_tomador:
              preservedTomadorId || idTomador || undefined,
            ds_documento_emitente: preservedEmitDoc || dto.emit_CNPJ,
            ds_documento_destinatario: preservedDestDoc || dto.dest_CNPJ,
            id_fis_fornecedor: fornecedorIdRebuild || exist.id_fis_fornecedor,

            ds_id_cte: dto.id,
            ds_chave: dto.chave,
            js_chaves_nfe: dto.js_chaves_nfe?.length
              ? dto.js_chaves_nfe
              : undefined,
            ds_uf: dto.ds_uf,
            cd_ibge: dto.cd_ibge,
            cd_cte: dto.cd_cte,
            ds_cfop: dto.ds_cfop,
            ds_natureza_operacao: dto.ds_natureza_operacao,
            ds_modelo: dto.ds_modelo,
            ds_serie: dto.ds_serie,
            ds_numero: dto.ds_numero,
            dt_emissao: dtEmissao,
            ds_tp_cte: dto.ds_tp_cte,
            ds_modal: dto.ds_modal,
            ds_tp_serv: dto.ds_tp_serv,
            ds_icms_tag: dto.ds_icms_tag,
            ds_razao_social_emitente: dto.emit_xNome,
            ds_razao_social_destinatario: dto.dest_xNome,
            ds_documento_remetente: dto.rem_CNPJ,
            ds_razao_social_remetente: dto.rem_xNome,
            ds_documento_tomador: dto.toma_CNPJ,
            ds_razao_social_tomador: dto.toma_xNome,
            cd_mun_env: dto.cd_mun_env,
            ds_nome_mun_env: dto.ds_nome_mun_env,
            ds_uf_env: dto.ds_uf_env,
            cd_mun_ini: dto.cd_mun_ini,
            ds_nome_mun_ini: dto.ds_nome_mun_ini,
            ds_uf_ini: dto.ds_uf_ini,
            cd_mun_fim: dto.cd_mun_fim,
            ds_nome_mun_fim: dto.ds_nome_mun_fim,
            ds_uf_fim: dto.ds_uf_fim,
            ds_retira: dto.ds_retira,
            ds_ind_ie_toma: dto.ds_ind_ie_toma,
            vl_total: this.toCents(dto.vl_total).toString() || undefined,
            vl_rec: this.toCents(dto.vl_rec).toString() || undefined,
            vl_total_trib:
              this.toCents(dto.vl_total_trib).toString() || undefined,
            ds_cst_tributacao: dto.ds_cst_tributacao,
            vl_base_calculo_icms:
              this.toCents(dto.vl_base_calculo_icms).toString() || undefined,
            vl_icms: this.toCents(dto.vl_icms).toString() || undefined,
            vl_porcentagem_icms:
              this.toCents(dto.vl_porcentagem_icms).toString() || undefined,
            cd_icms: dto.cd_icms,
            ds_observacao: dto.ds_observacao,
            js_documentos_autorizados: dto.js_documentos_autorizados
              ? dto.js_documentos_autorizados
              : undefined,
            js_documentos_anteriores: dto.js_documentos_anteriores
              ? dto.js_documentos_anteriores
              : undefined,
            js_placas_veiculos: dto.js_placas_veiculos
              ? dto.js_placas_veiculos
              : undefined,
            ds_documento_subcontratada: finalSubCnpj,
            ds_razao_social_subcontratada: finalSubRazao,
            id_fis_empresa_subcontratada: finalSubEmpresaId,
            ds_nome_motorista: motNome || exist.ds_nome_motorista,
            ds_documento_motorista: motCpf || exist.ds_documento_motorista,
          },
        });

        // Deleta componentes e cargas antigas e recria
        await prisma.fis_cte_comp_carga.deleteMany({
          where: { id_fis_cte: exist.id },
        });
        await prisma.fis_cte_carga.deleteMany({
          where: { id_fis_cte: exist.id },
        });

        if (dto.cargaComponentes?.length) {
          await prisma.fis_cte_comp_carga.createMany({
            data: dto.cargaComponentes.map((c) => ({
              id_fis_cte: exist.id,
              ds_nome: c.ds_nome,
              vl_comp: this.toCents(c.vl_comp),
            })),
          });
        }

        if (dto.cargaItens?.length) {
          await prisma.fis_cte_carga.createMany({
            data: dto.cargaItens.map((i) => ({
              id_fis_cte: exist.id,
              ds_und: i.ds_und,
              ds_tipo_medida: i.ds_tipo_medida,
              vl_qtd_carregada: this.toCents(i.vl_qtd_carregada),
            })),
          });
        }

        // Verificar se atualização foi bem-sucedida
        if (!updatedCteRebuild || !updatedCteRebuild.id) {
          throw new Error(
            'Erro ao atualizar CTe - registro não foi salvo corretamente'
          );
        }

        return { cte: updatedCteRebuild, resposta: null };
      }

      // Caso já exista DFE, ainda assim preencher subcontratada se estiver vazia
      try {
        const cteSubData: Prisma.fis_cteUpdateInput = {};
        if (!exist.ds_documento_subcontratada && subCnpj) {
          cteSubData.ds_documento_subcontratada = subCnpj;
        }
        if (!exist.ds_razao_social_subcontratada && subRazao) {
          cteSubData.ds_razao_social_subcontratada = subRazao;
        }
        if (!exist.id_fis_empresa_subcontratada && finalMatchedSubId) {
          cteSubData.fis_empresa_subcontratada = {
            connect: { id: finalMatchedSubId },
          };
        }

        if (Object.keys(cteSubData).length > 0) {
          const updated = await prisma.fis_cte.update({
            where: { id: exist.id },
            data: cteSubData,
          });
          // mantém snapshot atualizado para retorno
          exist = { ...exist, ...updated };
        }

        if (existingDfe && !existingDfe.ds_documento_subcontratada && subCnpj) {
          await prisma.fis_documento_dfe.update({
            where: { id: existingDfe.id },
            data: { ds_documento_subcontratada: subCnpj },
          });
        }
      } catch (e) {
        console.warn(
          '[CTe] Erro ao preencher subcontratada em CTe já importado:',
          e
        );
      }

      resposta = new Error(`CTe ${exist.ds_numero} já importado.`);
      const doc = await prisma.fis_documento.findFirst({
        where: { id_cte: exist.id },
      });

      // Retornar com verificação de null
      if (!exist || !exist.id) {
        throw new Error('Erro: CTe não encontrado após busca');
      }

      return { cte: exist as any, documento: doc as any, resposta };
    }

    // maybe create supplier
    let fornecedorId: string | undefined;
    if (idDestinatario) {
      const cnpjFor = dto.emit_CNPJ.replace(/\D/g, '');
      const fornecedor = await getFornecedoresCached(idDestinatario);
      let f = fornecedor.find((item) => item.ds_documento === cnpjFor);
      if (f) {
        // atualiza inscrição municipal somente quando informada e não vazia
        if (
          dto.forn_im !== null &&
          dto.forn_im !== undefined &&
          String(dto.forn_im).trim() !== ''
        ) {
          f = await prisma.fis_fornecedores.update({
            where: { id: f.id },
            data: { ds_inscricao_municipal: dto.forn_im },
          });
        }
        fornecedorId = f.id;
      } else {
        f = await prisma.fis_fornecedores.create({
          data: {
            id_fis_empresas: idDestinatario,
            ds_documento: cnpjFor,
            ds_nome: dto.forn_nome ?? '',
            ds_inscricao: dto.forn_ie ?? '',
            ds_inscricao_municipal: dto.forn_im ?? '',
            ds_endereco: dto.forn_endereco ?? '',
            ds_complemento: dto.forn_complemento ?? '',
            ds_bairro: dto.forn_bairro ?? '',
            ds_cep: dto.forn_cep ?? '',
            ds_codigo_municipio: Number(dto.forn_codigo_municipio) || null,
            ds_codigo_uf: Number(dto.forn_codigo_uf) || null,
            ds_telefone: dto.forn_telefone ?? '',
            ds_email: dto.forn_email ?? '',
          },
        });
        invalidateCache(`fornecedores_empresa_${idDestinatario}`);
      }
      fornecedorId = f.id;
    }

    // build payload
    const cteData: Prisma.fis_cteCreateInput = {
      ...(idEmitente
        ? {
            fis_empresa_emitente: { connect: { id: idEmitente } },
            ...(idDestinatario
              ? {
                  fis_empresa_destinatario: { connect: { id: idDestinatario } },
                }
              : {}),
          }
        : {}),
      ...(idDestinatario
        ? {
            fis_empresa_destinatario: { connect: { id: idDestinatario } },
            ...(idEmitente
              ? { fis_empresa_emitente: { connect: { id: idEmitente } } }
              : {}),
          }
        : {}),

      ...(fornecedorId
        ? { fis_fornecedor: { connect: { id: fornecedorId } } }
        : {}),
      ...(idTomador
        ? { fis_empresa_tomador: { connect: { id: idTomador } } }
        : {}),
      ds_id_cte: dto.id,
      ds_chave: dto.chave,
      js_chaves_nfe: dto.js_chaves_nfe?.length ? dto.js_chaves_nfe : undefined,

      ds_uf: dto.ds_uf,
      cd_ibge: dto.cd_ibge,
      cd_cte: dto.cd_cte,
      ds_cfop: dto.ds_cfop,
      ds_natureza_operacao: dto.ds_natureza_operacao,
      ds_modelo: dto.ds_modelo,
      ds_serie: dto.ds_serie,
      ds_numero: dto.ds_numero,
      dt_emissao: dto.dt_emissao
        ? this.parseKeepWallClockAsUTC(dto.dt_emissao)
        : undefined,
      ds_tp_cte: dto.ds_tp_cte,
      ds_modal: dto.ds_modal,
      ds_tp_serv: dto.ds_tp_serv,
      ds_icms_tag: dto.ds_icms_tag,

      ds_documento_emitente: dto.emit_CNPJ,
      ds_razao_social_emitente: dto.emit_xNome,
      ds_documento_destinatario: dto.dest_CNPJ,
      ds_razao_social_destinatario: dto.dest_xNome,
      ds_documento_remetente: dto.rem_CNPJ,
      ds_razao_social_remetente: dto.rem_xNome,
      ds_documento_tomador: dto.toma_CNPJ,
      ds_razao_social_tomador: dto.toma_xNome,

      cd_mun_env: dto.cd_mun_env,
      ds_nome_mun_env: dto.ds_nome_mun_env,
      ds_uf_env: dto.ds_uf_env,
      cd_mun_ini: dto.cd_mun_ini,
      ds_nome_mun_ini: dto.ds_nome_mun_ini,
      ds_uf_ini: dto.ds_uf_ini,
      cd_mun_fim: dto.cd_mun_fim,
      ds_nome_mun_fim: dto.ds_nome_mun_fim,
      ds_uf_fim: dto.ds_uf_fim,
      ds_retira: dto.ds_retira,
      ds_ind_ie_toma: dto.ds_ind_ie_toma,

      vl_total: this.toCents(dto.vl_total).toString() || undefined,
      vl_rec: this.toCents(dto.vl_rec).toString() || undefined,
      vl_total_trib: this.toCents(dto.vl_total_trib).toString() || undefined,

      ds_cst_tributacao: dto.ds_cst_tributacao,
      vl_base_calculo_icms:
        this.toCents(dto.vl_base_calculo_icms).toString() || undefined,
      vl_icms: this.toCents(dto.vl_icms).toString() || undefined,
      vl_porcentagem_icms:
        this.toCents(dto.vl_porcentagem_icms).toString() || undefined,
      cd_icms: dto.cd_icms,

      fis_cte_comp_carga: dto.cargaComponentes?.length
        ? {
            create: dto.cargaComponentes.map((c) => ({
              ds_nome: c.ds_nome,
              vl_comp: this.toCents(c.vl_comp),
            })),
          }
        : undefined,

      fis_cte_carga: dto.cargaItens?.length
        ? {
            create: dto.cargaItens.map((i) => ({
              ds_und: i.ds_und,
              ds_tipo_medida: i.ds_tipo_medida,
              vl_qtd_carregada: this.toCents(i.vl_qtd_carregada),
            })),
          }
        : undefined,
      ...(finalMatchedSubId
        ? { fis_empresa_subcontratada: { connect: { id: finalMatchedSubId } } }
        : {}),
      ds_documento_subcontratada: subCnpj ? subCnpj : undefined,
      ds_razao_social_subcontratada: subRazao ? subRazao : undefined,
      ds_observacao: dto.ds_observacao,
      ds_nome_motorista: motNome,
      ds_documento_motorista: motCpf,
      js_documentos_autorizados: dto.js_documentos_autorizados
        ? dto.js_documentos_autorizados
        : undefined,
      js_documentos_anteriores: dto.js_documentos_anteriores
        ? dto.js_documentos_anteriores
        : undefined,
      js_placas_veiculos: dto.js_placas_veiculos
        ? dto.js_placas_veiculos
        : undefined,
    };

    return { cte: cteData, resposta };
  }

  async importarXml(filePath: string): Promise<{
    cte: Prisma.fis_cteCreateInput | null;
    resposta: Error | null;
  }> {
    const xml = fs.readFileSync(filePath, 'utf-8');
    return new Promise((resolve, reject) => {
      parseString(xml, async (err, result) => {
        if (err) return reject(new Error('XML mal formatado'));
        try {
          const out = await this.processXmlData(result, 'upload_xml');
          resolve(out);
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}
