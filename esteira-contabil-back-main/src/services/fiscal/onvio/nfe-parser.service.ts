import { Prisma, OrigemExtracao } from '@prisma/client';
import {
  getFiscalEmpresa,
  getFiscalEmpresaPorDocumento,
} from '../fiscal-empresa.service';
import { prisma } from '../../prisma';
import { createDocumentoHistorico } from '../documento.service';
// import { PerformanceTimer } from '@/utils/performance-timer';

export interface NfeItemDTO {
  nItem: string;
  cProd: string;
  xProd: string;
  cProdANP?: string;
  descANP?: string;
  cEan?: string;
  NCM?: string;
  CEST?: string;
  uTrib?: string;
  qTrib?: string;
  vPIS?: string;
  pPIS?: string;
  vBC_Pis?: string;
  CST_Pis?: string;
  vCOFINS?: string;
  pCOFINS?: string;
  vBC_Cofins?: string;
  CST_Cofins?: string;
  vTotTrib?: string;
  vUnTrib?: string;
  CFOP: string;
  uCom: string;
  qCom: string;
  vUnCom: string;
  vProd: string;
  CST: string;
  ds_origem?: string;
  vBC: string;
  pICMS: string;
  vICMS: string;
  ds_icms_tag?: string;
  vl_desconto: string;
}

export interface CommonNfeDTO {
  id: string; // infNFe.$.Id
  chave: string; // sem "NFe"
  nfes_relacionadas?: string[]; // chaves de NFes referenciadas
  ds_serie?: string;
  ds_numero?: string;
  ds_modelo?: string;
  ds_uf?: string;
  cd_nf?: string;
  ds_natureza_operacao?: string;
  tp_nf?: string;
  cd_tipo_operacao?: string;
  cd_municipio?: string;
  ds_fin_nfe?: string;
  dataEmissao?: string;
  dhSaiEnt?: string;

  emit_CNPJ?: string;
  emit_CPF?: string;
  emit_xNome?: string;
  emit_UF?: string;
  emit_xMun?: string;
  emit_CRT?: string;
  dest_CNPJ?: string;
  dest_CPF?: string;
  dest_xNome?: string;

  vBC?: string;
  vICMS?: string;
  vProd?: string;
  vNF?: string;
  vFrete?: string;
  vSeg?: string;
  vDesc?: string;
  vII?: string;
  vIPI?: string;
  vIPIDevol?: string;
  vPIS?: string;
  vCOFINS?: string;
  vOutro?: string;
  vICMSDeson?: string;
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
  // transportadora
  transport_CNPJ?: string;
  transport_CPF?: string;
  transport_xNome?: string;
  veic_placa?: string;
  veic_uf?: string;
  vol_qVol?: string;
  vol_esp?: string;
  vol_pesoL?: string;
  vol_pesoB?: string;
  items: NfeItemDTO[];
}

export interface NfeParser {
  supports(xml: any): boolean;
  extract(xml: any): CommonNfeDTO;
}

export class StandardNfeParser implements NfeParser {
  supports(xml: any): boolean {
    if (!xml || typeof xml !== 'object') {
      return false;
    }

    try {
      const root = Array.isArray(xml.NFe) ? xml.NFe[0] : xml.NFe;
      if (root?.infNFe) return true;
      const proc = Array.isArray(xml.nfeProc) ? xml.nfeProc[0] : xml.nfeProc;
      if (proc?.NFe?.[0]?.infNFe) return true;
      const alt = Array.isArray(xml.procNFe) ? xml.procNFe[0] : xml.procNFe;
      if (alt?.infNFe) return true;
      return false;
    } catch (error) {
      console.warn('Erro ao verificar suporte para XML NFe:', error);
      return false;
    }
  }
  extract(xml: any): CommonNfeDTO {
    let inf: any;
    const root = Array.isArray(xml.NFe) ? xml.NFe[0] : xml.NFe;
    if (root?.infNFe) {
      inf = Array.isArray(root.infNFe) ? root.infNFe[0] : root.infNFe;
    } else if (xml.nfeProc) {
      const p = Array.isArray(xml.nfeProc) ? xml.nfeProc[0] : xml.nfeProc;
      const nfe = Array.isArray(p.NFe) ? p.NFe[0] : p.NFe;
      inf = Array.isArray(nfe.infNFe) ? nfe.infNFe[0] : nfe.infNFe;
    } else {
      const p = Array.isArray(xml.procNFe) ? xml.procNFe[0] : xml.procNFe;
      inf = Array.isArray(p.infNFe) ? p.infNFe[0] : p.infNFe;
    }
    if (!inf) throw new Error('infNFe não encontrado');

    const ide = inf.ide[0];
    const emit = inf.emit[0];
    const dest = inf.dest?.[0] ?? {};
    const tot = inf.total?.[0]?.ICMSTot?.[0] ?? {};
    const dets = Array.isArray(inf.det) ? inf.det : [];
    const forn = inf.emit?.[0];
    const endForn = forn.enderEmit?.[0];
    const transp = inf.transp?.[0] ?? {};
    const transporta = transp.transporta?.[0] ?? {};
    const veic = transp.veicTransp?.[0] ?? {};
    const vol = Array.isArray(transp.vol) ? transp.vol[0] : (transp.vol ?? {});

    const items: NfeItemDTO[] = dets.map((d: any) => {
      const prod = d.prod[0];
      const imp = d.imposto?.[0] ?? {};
      const icms = imp.ICMS?.[0] ?? {};
      const descontoProd = prod.vDesc?.[0] ?? '0';
      // identificar qual tipo de ICMS está presente usando filtro
      const icmsKeys = Object.keys(icms).filter((key) =>
        key.startsWith('ICMS')
      );
      const icmsType = icmsKeys.length > 0 ? icmsKeys[0] : '';
      const icmsData = icmsType ? (icms[icmsType]?.[0] ?? {}) : {};

      // valores padrão
      let cst = '';
      let vBC = '';
      let pICMS = '';
      let vICMS = '';
      let orig = '';

      // extrair valores comuns a todos os tipos
      cst = icmsData.CST?.[0] ?? icmsData.CSOSN?.[0] ?? '';
      orig = icmsData.orig?.[0] ?? '';

      // extrair valores por tipo de ICMS
      if (
        icmsType === 'ICMS00' ||
        icmsType === 'ICMS10' ||
        icmsType === 'ICMS20'
      ) {
        vBC = icmsData.vBC?.[0] ?? '';
        pICMS = icmsData.pICMS?.[0] ?? '';
        vICMS = icmsData.vICMS?.[0] ?? '';
      } else if (icmsType === 'ICMS60') {
        vBC = icmsData.vBCSTRet?.[0] ?? '';
        pICMS = icmsData.pST?.[0] ?? '';
        vICMS = icmsData.vICMSSTRet?.[0] ?? '';
      } else if (icmsType === 'ICMS30' || icmsType === 'ICMS70') {
        vBC = icmsData.vBC?.[0] ?? '';
        pICMS = icmsData.pICMS?.[0] ?? '';
        vICMS = icmsData.vICMS?.[0] ?? '';
      } else if (
        icmsType === 'ICMS40' ||
        icmsType === 'ICMS41' ||
        icmsType === 'ICMS50'
      ) {
        vBC = '';
        pICMS = '';
        vICMS = icmsData.vICMSDeson?.[0] ?? '';
      } else if (icmsType === 'ICMS90') {
        // ICMS90 pode ter diversos formatos
        vBC = icmsData.vBC?.[0] ?? '';
        pICMS = icmsData.pICMS?.[0] ?? '';
        vICMS = icmsData.vICMS?.[0] ?? '';
      } else if (icmsType === 'ICMSSN101') {
        // Simples Nacional - ICMSSN101
        vBC = '';
        pICMS = icmsData.pCredSN?.[0] ?? '';
        vICMS = icmsData.vCredICMSSN?.[0] ?? '';
      } else if (
        icmsType === 'ICMSSN102' ||
        icmsType === 'ICMSSN103' ||
        icmsType === 'ICMSSN300' ||
        icmsType === 'ICMSSN400'
      ) {
        // Simples Nacional - CSTs isentos/não tributados
        vBC = '';
        pICMS = '';
        vICMS = '';
      } else if (icmsType.startsWith('ICMSSN')) {
        // Outros tipos de Simples Nacional
        vBC = icmsData.vBC?.[0] ?? '';
        pICMS = icmsData.pCredSN?.[0] ?? icmsData.pICMS?.[0] ?? '';
        vICMS = icmsData.vCredICMSSN?.[0] ?? icmsData.vICMS?.[0] ?? '';
      } else if (icmsKeys.length > 0) {
        // tipos não mapeados, pegar valores genéricos
        vBC = icmsData.vBC?.[0] ?? '';
        pICMS = icmsData.pICMS?.[0] ?? '';
        vICMS = icmsData.vICMS?.[0] ?? '';
      }

      const cProdANP =
        prod.comb?.[0]?.cProdANP?.[0] ?? prod.cProdANP?.[0] ?? '';
      const descANP = prod.comb?.[0]?.descANP?.[0] ?? prod.descANP?.[0] ?? '';

      // tratamento para PIS
      const pisType = imp.PIS?.[0] ? Object.keys(imp.PIS[0])[0] : '';
      const pisData = pisType ? (imp.PIS[0][pisType]?.[0] ?? {}) : {};

      // tratamento para COFINS
      const cofinsType = imp.COFINS?.[0] ? Object.keys(imp.COFINS[0])[0] : '';
      const cofinsData = cofinsType
        ? (imp.COFINS[0][cofinsType]?.[0] ?? {})
        : {};

      return {
        nItem: d.$.nItem,
        cProd: prod.cProd?.[0] ?? '',
        xProd: prod.xProd?.[0] ?? '',
        cProdANP: cProdANP,
        descANP: descANP,
        cEan: prod.cEAN?.[0] ?? '',
        NCM: prod.NCM?.[0] ?? '',
        CEST: prod.CEST?.[0] ?? '',
        CFOP: prod.CFOP?.[0] ?? '',
        uCom: prod.uCom?.[0] ?? '',
        qCom: prod.qCom?.[0] ?? '',
        vUnCom: prod.vUnCom?.[0] ?? '',
        vProd: prod.vProd?.[0] ?? '',
        uTrib: prod.uTrib?.[0] ?? '',
        qTrib: prod.qTrib?.[0] ?? '',
        vPIS: imp.PIS?.[0]?.PISAliq?.[0]?.vPIS?.[0] ?? '',
        pPIS: imp.PIS?.[0]?.PISAliq?.[0]?.pPIS?.[0] ?? '',
        vBC_Pis: imp.PIS?.[0]?.PISAliq?.[0]?.vBC?.[0] ?? '',
        CST_Pis: pisData.CST?.[0] ?? '', // tipo específico de PIS
        vCOFINS: imp.COFINS?.[0]?.COFINSAliq?.[0]?.vCOFINS?.[0] ?? '',
        pCOFINS: imp.COFINS?.[0]?.COFINSAliq?.[0]?.pCOFINS?.[0] ?? '',
        vBC_Cofins: imp.COFINS?.[0]?.COFINSAliq?.[0]?.vBC?.[0] ?? '',
        CST_Cofins: cofinsData.CST?.[0] ?? '', // tipo específico de COFINS
        vTotTrib: imp.vTotTrib?.[0] ?? '',
        vUnTrib: prod.vUnTrib?.[0] ?? '',
        ds_icms_tag: icmsType, // tipo de ICMS
        CST: cst,
        vBC: vBC,
        pICMS: pICMS,
        vICMS: vICMS,
        ds_origem: orig,
        vl_desconto: descontoProd,
      };
    });
    const nfeKeysRaw = Array.isArray(ide.NFref?.[0]?.refNFe)
      ? ide.NFref[0].refNFe
      : [];
    const jsChavesNFeRelacionadas: string[] = Array.from(
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
    const rawId: string = inf.$.Id;
    const chave = rawId.replace(/^NFe/, '');

    return {
      id: rawId,
      chave,
      nfes_relacionadas: jsChavesNFeRelacionadas.length
        ? jsChavesNFeRelacionadas
        : undefined,
      ds_serie: ide.serie?.[0],
      ds_numero: ide.nNF?.[0],
      ds_modelo: ide.mod?.[0],
      ds_uf: ide.cUF?.[0],
      cd_nf: ide.cNF?.[0],
      ds_natureza_operacao: ide.natOp?.[0],
      tp_nf: ide.tpNF?.[0],
      cd_tipo_operacao: ide.idDest?.[0],
      cd_municipio: ide.cMunFG?.[0],
      ds_fin_nfe: ide.finNFe?.[0],
      dataEmissao: ide.dhEmi?.[0],
      dhSaiEnt: ide.dhSaiEnt?.[0],

      emit_CNPJ: emit.CNPJ?.[0],
      emit_CPF: emit.CPF?.[0],
      emit_xNome: emit.xNome?.[0],
      emit_UF: endForn?.UF?.[0] || undefined,
      emit_xMun: endForn?.xMun?.[0] || undefined,
      emit_CRT: emit.CRT?.[0],
      dest_CNPJ: dest.CNPJ?.[0],
      dest_CPF: dest.CPF?.[0],
      dest_xNome: dest.xNome?.[0],

      vBC: tot.vBC?.[0],
      vICMS: tot.vICMS?.[0],
      vProd: tot.vProd?.[0],
      vNF: tot.vNF?.[0],
      vFrete: tot.vFrete?.[0],
      vSeg: tot.vSeg?.[0],
      vDesc: tot.vDesc?.[0],
      vII: tot.vII?.[0],
      vIPI: tot.vIPI?.[0],
      vIPIDevol: tot.vIPIDevol?.[0],
      vPIS: tot.vPIS?.[0],
      vCOFINS: tot.vCOFINS?.[0],
      vOutro: tot.vOutro?.[0],
      vICMSDeson: tot.vICMSDeson?.[0],
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
      // transportadora
      transport_CNPJ: transporta.CNPJ?.[0] || transporta.CPF?.[0] || '',
      transport_CPF: transporta.CPF?.[0] || transporta.CNPJ?.[0] || '',
      transport_xNome: transporta.xNome?.[0] || '',
      veic_placa: veic.placa?.[0] || '',
      veic_uf: veic.UF?.[0] || '',
      vol_qVol: vol?.qVol || vol?.qVol?.[0] || '',
      vol_esp: vol?.esp || vol?.esp?.[0] || '',
      vol_pesoL: vol?.pesoL || vol?.pesoL?.[0] || '',
      vol_pesoB: vol?.pesoB || vol?.pesoB?.[0] || '',
      items,
    };
  }
}

export class ImportarXmlNfeService {
  private parsers: NfeParser[] = [new StandardNfeParser()];

  private toCents(v: string = '0'): string {
    const n = parseFloat(v.replace(',', '.')) || 0;
    return Math.round(n * 100).toString();
  }

  /**
   * Converte quantidade para unidade padrão com 4 casas decimais (x10000).
   * Sempre normaliza a precisão original para 4 casas, independente do input.
   * Exemplos:
   * "75.86" (2 casas) → "758600"
   * "12.0000" (4 casas) → "120000"
   * "5" (0 casas) → "50000"
   */
  private toCentsSafe(v: string = '0'): string {
    const normalized = v.replace(',', '.');
    const n = parseFloat(normalized) || 0;
    // sempre multiplicar por 10000 (4 casas decimais padrão)
    return Math.round(n * 10000).toString();
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
    nfe: Prisma.fis_nfeCreateInput | null;
    resposta: Error | null;
  }> {
    // const timer = new PerformanceTimer();
    // timer.start('processXmlData-NFe');

    // timer.mark('find-parser');
    const parser = this.parsers.find((p) => p.supports(xmlData));
    if (!parser) {
      return {
        nfe: null,
        resposta: new Error('Formato XML de NFe não suportado'),
      };
    }

    // timer.lap('extract-dto');
    const dto = parser.extract(xmlData);
    const rawData = JSON.stringify(xmlData);
    return this.saveFromDto(dto, origem, rawData);
  }

  private async saveFromDto(
    dto: CommonNfeDTO,
    origem: string,
    rawData: string
  ): Promise<{
    nfe: Prisma.fis_nfeCreateInput | null;
    resposta: Error | null;
  }> {
    // const timer = new PerformanceTimer();
    // timer.start('saveFromDto-NFe');

    let resposta: Error | null = null;

    // timer.mark('get-fiscal-empresa');
    // const callingFis = await getFiscalEmpresa(empresaId);

    // timer.lap('bind-empresas');
    // helper para tentar achar empresa pelo CNPJ
    const tryBind = async (cnpj?: string) => {
      if (!cnpj) return undefined;
      try {
        const emp = await getFiscalEmpresaPorDocumento(cnpj.replace(/\D/g, ''));
        return emp.id;
      } catch {
        return undefined;
      }
    };

    const emitId = await tryBind(dto.emit_CNPJ);
    const destId = await tryBind(dto.dest_CNPJ);
    const transportId = await tryBind(dto.transport_CNPJ);
    // let empresa = callingFis.id;

    // timer.lap('check-existing-nfe');
    // se já existe, apenas atualiza vínculo faltante e verifica/inserir itens faltantes
    // Busca em cascata por documento com EMITIDO
    const dtEmissao = dto.dataEmissao
      ? this.parseKeepWallClockAsUTC(dto.dataEmissao)
      : undefined;
    const vlNf = this.toCents(dto.vNF);

    let aguardandoExtracao = null;

    try {
      if (dto.nfes_relacionadas && dto.nfes_relacionadas.length) {
        const existingForUpdate = await prisma.fis_nfe.findUnique({
          where: { ds_chave: dto.chave },
          select: { id: true, js_nfes_referenciadas: true },
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
            existingForUpdate.js_nfes_referenciadas == null ||
            isPlaceholderArray(existingForUpdate.js_nfes_referenciadas as any);

          if (shouldUpdate) {
            await prisma.fis_nfe.update({
              where: { id: existingForUpdate.id },
              data: { js_nfes_referenciadas: dto.nfes_relacionadas },
            });
            console.log(
              `[NFe] Atualizado js_nfes_referenciadas para NFe (ds_chave=${dto.chave}) com ${dto.nfes_relacionadas.length} chaves reais.`
            );
          }
        }
      }
    } catch (e) {
      console.warn(
        '[NFe] Erro ao atualizar js_nfes_referenciadas existente:',
        e
      );
    }

    // 1ª tentativa: chave + data + numero + valor
    if (dtEmissao && dto.ds_numero) {
      const startOfDay = new Date(dtEmissao);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(dtEmissao);
      endOfDay.setUTCHours(23, 59, 59, 999);

      aguardandoExtracao = await prisma.fis_nfe.findFirst({
        where: {
          ds_chave: dto.chave,
          ds_numero: dto.ds_numero,
          dt_emissao: { gte: startOfDay, lte: endOfDay },
          vl_nf: vlNf,
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

      aguardandoExtracao = await prisma.fis_nfe.findFirst({
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
      aguardandoExtracao = await prisma.fis_nfe.findFirst({
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
      console.log(`[NFe] Atualizando documento EMITIDO: ${dto.chave}`);

      const docId = aguardandoExtracao.fis_documento[0].id;

      // Preserva IDs existentes de emitente/destinatario
      const preservedEmitId = aguardandoExtracao.id_fis_empresa_emitente;
      const preservedDestId = aguardandoExtracao.id_fis_empresa_destinatario;
      const preservedEmitDoc = aguardandoExtracao.ds_documento_emitente;
      const preservedDestDoc = aguardandoExtracao.ds_documento_destinatario;
      const preservedEmitUf = aguardandoExtracao.ds_uf_emitente;
      const preservedEmitMunicipio = aguardandoExtracao.ds_municipio_emitente;

      // Prepara fornecedor se não for saída
      let fornecedorId: string | undefined;
      if (preservedDestId !== null && preservedDestId !== undefined) {
        const documentoRaw = dto.emit_CNPJ || dto.emit_CPF || '';
        const cnpjFor = String(documentoRaw).replace(/\D/g, '');

        if (cnpjFor) {
          const f = await prisma.fis_fornecedores.upsert({
            where: {
              id_fis_empresas_ds_documento: {
                id_fis_empresas: preservedDestId,
                ds_documento: cnpjFor,
              },
            },
            create: {
              id_fis_empresas: preservedDestId,
              ds_documento: cnpjFor,
              ds_nome: dto.forn_nome || dto.emit_xNome || '',
              ds_inscricao_municipal: dto.forn_im || '',
              ds_inscricao: dto.forn_ie || '',
              ds_endereco: dto.forn_endereco || '',
              ds_complemento: dto.forn_complemento || '',
              ds_bairro: dto.forn_bairro || '',
              ds_cep: dto.forn_cep || '',
              ds_codigo_municipio: dto.forn_codigo_municipio
                ? Number(dto.forn_codigo_municipio)
                : undefined,
              ds_codigo_uf: dto.forn_codigo_uf
                ? Number(dto.forn_codigo_uf)
                : undefined,
              ds_telefone: dto.forn_telefone || '',
              ds_email: dto.forn_email || '',
            },
            update: {
              ds_nome: dto.forn_nome || dto.emit_xNome || '',
              ds_inscricao_municipal: dto.forn_im || '',
              ds_inscricao: dto.forn_ie || '',
              ds_endereco: dto.forn_endereco || '',
              ds_complemento: dto.forn_complemento || '',
              ds_bairro: dto.forn_bairro || '',
              ds_cep: dto.forn_cep || '',
              ds_codigo_municipio: dto.forn_codigo_municipio
                ? Number(dto.forn_codigo_municipio)
                : undefined,
              ds_codigo_uf: dto.forn_codigo_uf
                ? Number(dto.forn_codigo_uf)
                : undefined,
              ds_telefone: dto.forn_telefone || '',
              ds_email: dto.forn_email || '',
            },
          });
          fornecedorId = f?.id;
        }
      }

      // Atualiza NFe preservando IDs existentes
      const updatedNfe = await prisma.fis_nfe.update({
        where: {
          id: aguardandoExtracao.id,
        },
        data: {
          // Preserva emitente/destinatario se já existiam, senão usa novos
          id_fis_empresa_emitente:
            preservedEmitId ||
            emitId ||
            (preservedEmitId !== null && preservedEmitId !== undefined
              ? preservedEmitId
              : undefined),
          id_fis_empresa_destinatario:
            preservedDestId ||
            destId ||
            (preservedDestId !== null && preservedDestId !== undefined
              ? preservedDestId
              : undefined),
          ds_documento_emitente:
            preservedEmitDoc || dto.emit_CNPJ || dto.emit_CPF,
          ds_documento_destinatario:
            preservedDestDoc || dto.dest_CNPJ || dto.dest_CPF,
          ds_uf_emitente: preservedEmitUf || dto.emit_UF || undefined,
          ds_municipio_emitente:
            preservedEmitMunicipio || dto.emit_xMun || undefined,

          // Adiciona fornecedor se não for saída
          id_fis_fornecedor:
            fornecedorId || aguardandoExtracao.id_fis_fornecedor,

          // Atualiza todos os demais campos
          ds_id_nfe: dto.id,
          ds_chave: dto.chave,
          ds_uf: dto.ds_uf,
          cd_nf: dto.cd_nf,
          ds_natureza_operacao: dto.ds_natureza_operacao,
          ds_modelo: dto.ds_modelo,
          ds_serie: dto.ds_serie,
          ds_numero: dto.ds_numero,
          dt_emissao: dtEmissao,
          dt_saida_entrega: dto.dhSaiEnt
            ? this.parseKeepWallClockAsUTC(dto.dhSaiEnt)
            : undefined,
          cd_tipo_operacao: dto.tp_nf,
          cd_municipio: dto.cd_municipio,
          ds_fin_nfe: dto.ds_fin_nfe,
          vl_base_calculo: this.toCents(dto.vBC),
          vl_icms: this.toCents(dto.vICMS),
          vl_produto: this.toCents(dto.vProd),
          vl_nf: vlNf,
          vl_frete: this.toCents(dto.vFrete),
          vl_seg: this.toCents(dto.vSeg),
          vl_desc: this.toCents(dto.vDesc),
          vl_ii: this.toCents(dto.vII),
          vl_ipi: this.toCents(dto.vIPI),
          vl_ipidevol: this.toCents(dto.vIPIDevol),
          vl_pis: this.toCents(dto.vPIS),
          vl_cofins: this.toCents(dto.vCOFINS),
          vl_outros: this.toCents(dto.vOutro),
          vl_bc: this.toCents(dto.vBC),
          vl_icms_desoner: this.toCents(dto.vICMSDeson),
          ds_razao_social_emitente: dto.emit_xNome,
          ds_razao_social_destinatario: dto.dest_xNome,
          cd_crt_emitente: dto.emit_CRT ?? undefined,
          // transportadora
          ds_documento_transportador:
            dto.transport_CNPJ || aguardandoExtracao.ds_documento_transportador,
          ds_razao_social_transportador:
            dto.transport_xNome ||
            aguardandoExtracao.ds_razao_social_transportador,
        } as any,
        include: { fis_documento: true },
      });

      // Deleta itens antigos que NÃO possuem alteração de entrada; preserva itens com alter_entrada
      const protectedItems = await prisma.fis_nfe_itens.findMany({
        where: {
          id_fis_nfe: updatedNfe.id,
          fis_nfe_itens_alter_entrada: { some: {} },
        },
        select: { ds_ordem: true },
      });

      const protectedOrdens = new Set(
        protectedItems
          .map((it) =>
            typeof it.ds_ordem === 'number' ? it.ds_ordem : Number(it.ds_ordem)
          )
          .filter((n) => !isNaN(n))
      );

      await prisma.fis_nfe_itens.deleteMany({
        where: {
          id_fis_nfe: updatedNfe.id,
          fis_nfe_itens_alter_entrada: { none: {} },
        },
      });

      // Cria novos itens com produtos e vinculação produto-fornecedor
      for (const it of dto.items) {
        const ordem = it.nItem ? parseInt(it.nItem, 10) : undefined;
        // Se o item possui registro em alter_entrada, não recriar (preserva)
        if (ordem !== undefined && protectedOrdens.has(ordem)) {
          continue;
        }
        let produtoId: string | undefined;
        const ncmClean = it.NCM?.replace(/\D/g, '');

        await prisma.fis_nfe_itens.create({
          data: {
            fis_nfe: { connect: { id: aguardandoExtracao.id } },
            ds_ordem: ordem,
            ds_codigo: it.cProd,
            ds_produto: it.xProd,
            cd_ncm: ncmClean,
            cd_cest: it.CEST,
            cd_barras: it.cEan,
            cd_cfop: it.CFOP,
            ds_unidade: it.uCom,
            vl_quantidade: this.toCents(it.qCom),
            vl_unitario: this.toCents(it.vUnCom),
            vl_total: this.toCents(it.vProd),
            ds_unidade_tributavel: it.uTrib,
            vl_quantidade_tributavel: this.toCents(it.qTrib),
            vl_unitario_tributavel: this.toCents(it.vUnTrib),
            ds_cst: it.CST,
            ds_origem: it.ds_origem,
            vl_base_calculo_icms: this.toCents(it.vBC),
            vl_icms: this.toCents(it.vICMS),
            ds_porcentagem_icms: this.toCents(it.pICMS),
            ds_icms_tag: it.ds_icms_tag,
            cd_cst_pis: it.CST_Pis,
            vl_base_calculo_pis: this.toCents(it.vBC_Pis),
            vl_porcentagem_pis: this.toCents(it.pPIS),
            vl_pis: this.toCents(it.vPIS),
            cd_cst_cofins: it.CST_Cofins,
            vl_base_calculo_cofins: this.toCents(it.vBC_Cofins),
            vl_porcentagem_cofins: this.toCents(it.pCOFINS),
            vl_cofins: this.toCents(it.vCOFINS),
            vl_total_tributavel: this.toCents(it.vTotTrib),
            cd_produto_anp: it.cProdANP,
            ds_produto_anp_descricao: it.descANP,
          },
        });
      }

      // Atualiza fis_documento para AGUARDANDO_VALIDACAO
      await prisma.fis_documento.update({
        where: {
          id: docId,
        },
        data: {
          ds_status: 'AGUARDANDO_VALIDACAO',
          ds_origem: { sistema: origem },
        },
      });
      const documento = await prisma.fis_documento.findUnique({
        where: {
          id: docId,
        },
        select: {
          id: true,
          ds_status: true,
        },
      });
      createDocumentoHistorico({
        justificativa: 'Documento encontrado após verificação SAT',
        id_documento: documento.id,
        status_novo: 'INTEGRACAO_ESCRITA',
        status_antigo: documento.ds_status,
      });

      // Cria ou atualiza fis_documento_dfe
      const existingDfe = await prisma.fis_documento_dfe.findFirst({
        where: {
          id_nfe: aguardandoExtracao.id,
        },
      });

      if (existingDfe) {
        await prisma.fis_documento_dfe.update({
          where: {
            id: existingDfe.id,
          },
          data: {
            id_fis_documento: docId,
            ds_situacao_integracao: 'INTEGRADO',
          },
        });
      } else {
        await prisma.fis_documento_dfe.create({
          data: {
            id_fis_documento: docId,
            id_nfe: aguardandoExtracao.id,
            ds_tipo: 'NFE',
            ds_origem: origem as OrigemExtracao,
            dt_emissao: dtEmissao || new Date(),
            ds_situacao_integracao: 'INTEGRADO',
            ds_raw: rawData,
          },
        });
      }

      console.log(`[NFe] Documento atualizado com sucesso: ${dto.chave}`);
      return { nfe: null, resposta: null };
    }

    // se já existe documento normal (não EMITIDO), apenas atualiza vínculo faltante
    const existing = await prisma.fis_nfe.findFirst({
      where: {
        ds_chave: dto.chave,
        OR: [
          { id_fis_empresa_destinatario: destId },
          { id_fis_empresa_emitente: emitId },
        ],
      },
    });
    if (existing) {
      // console.log(
      //   `[NFe] NFe já existente id=${existing.id} numero=${existing.ds_numero}, atualizando vínculos se necessário`
      // );
      const upd: any = {};
      if (emitId === existing.id_fis_empresa_emitente) {
        if (destId && !existing.id_fis_empresa_destinatario)
          upd.id_fis_empresa_destinatario = destId;
      } else {
        if (emitId && !existing.id_fis_empresa_emitente)
          upd.id_fis_empresa_emitente = emitId;
      }
      if (Object.keys(upd).length) {
        await prisma.fis_nfe.update({
          where: {
            id: existing.id,
          },
          data: upd,
        });
        return {
          nfe: null,
          resposta: new Error('NFe existente teve vínculo atualizado'),
        };
      }

      // Se o NFe existente não tiver DFE associado, devemos reconstruir o registro completo
      // (itens + campos principais) para garantir que os dados estejam completos.
      const existingDfe = await prisma.fis_documento_dfe.findFirst({
        where: {
          id_nfe: existing.id,
        },
      });

      const shouldRebuild = !existingDfe;
      if (shouldRebuild) {
        // console.log(
        //   `[NFe] Reconstruindo registro NFe id=${existing.id} (hasDfe=${Boolean(existingDfe)})`
        // );

        // Preserva IDs existentes quando disponíveis
        const preservedEmitId = existing.id_fis_empresa_emitente;
        const preservedDestId = existing.id_fis_empresa_destinatario;
        const preservedEmitDoc = existing.ds_documento_emitente;
        const preservedDestDoc = existing.ds_documento_destinatario;
        const preservedEmitUf = existing.ds_uf_emitente;
        const preservedEmitMunicipio = existing.ds_municipio_emitente;

        // prepara fornecedor se for case não saída
        let fornecedorId: string | undefined;
        if (preservedDestId) {
          const documentoRaw = dto.emit_CNPJ || dto.emit_CPF || '';
          const cnpjFor = String(documentoRaw).replace(/\D/g, '');
          if (cnpjFor) {
            const f = await prisma.fis_fornecedores.upsert({
              where: {
                id_fis_empresas_ds_documento: {
                  id_fis_empresas: preservedDestId,
                  ds_documento: cnpjFor,
                },
              },
              create: {
                id_fis_empresas: preservedDestId,
                ds_documento: cnpjFor,
                ds_nome: dto.forn_nome || dto.emit_xNome || '',
                ds_inscricao_municipal: dto.forn_im || '',
                ds_inscricao: dto.forn_ie || '',
                ds_endereco: dto.forn_endereco || '',
                ds_complemento: dto.forn_complemento || '',
                ds_bairro: dto.forn_bairro || '',
                ds_cep: dto.forn_cep || '',
                ds_codigo_municipio: dto.forn_codigo_municipio
                  ? Number(dto.forn_codigo_municipio)
                  : undefined,
                ds_codigo_uf: dto.forn_codigo_uf
                  ? Number(dto.forn_codigo_uf)
                  : undefined,
                ds_telefone: dto.forn_telefone || '',
                ds_email: dto.forn_email || '',
              },
              update: {
                ds_nome: dto.forn_nome || dto.emit_xNome || '',
                ds_inscricao_municipal: dto.forn_im || '',
                ds_inscricao: dto.forn_ie || '',
                ds_endereco: dto.forn_endereco || '',
                ds_complemento: dto.forn_complemento || '',
                ds_bairro: dto.forn_bairro || '',
                ds_cep: dto.forn_cep || '',
                ds_codigo_municipio: dto.forn_codigo_municipio
                  ? Number(dto.forn_codigo_municipio)
                  : undefined,
                ds_codigo_uf: dto.forn_codigo_uf
                  ? Number(dto.forn_codigo_uf)
                  : undefined,
                ds_telefone: dto.forn_telefone || '',
                ds_email: dto.forn_email || '',
              },
            });
            fornecedorId = f?.id;
          }
        }

        // Atualiza a NFe com todos os campos do DTO
        const dtEm = dto.dataEmissao
          ? this.parseKeepWallClockAsUTC(dto.dataEmissao)
          : undefined;
        const vlNfLocal = this.toCents(dto.vNF);

        const updatedNfeRebuild = await prisma.fis_nfe.update({
          where: {
            id: existing.id,
          },
          data: {
            id_fis_empresa_emitente: preservedEmitId || emitId || undefined,
            id_fis_empresa_destinatario: preservedDestId || destId || undefined,
            ds_documento_emitente:
              preservedEmitDoc || dto.emit_CNPJ || dto.emit_CPF,
            ds_documento_destinatario:
              preservedDestDoc || dto.dest_CNPJ || dto.dest_CPF,
            ds_uf_emitente: preservedEmitUf || dto.emit_UF || undefined,
            ds_municipio_emitente:
              preservedEmitMunicipio || dto.emit_xMun || undefined,
            id_fis_fornecedor: fornecedorId || existing.id_fis_fornecedor,
            ds_id_nfe: dto.id,
            ds_chave: dto.chave,
            ds_uf: dto.ds_uf,
            cd_nf: dto.cd_nf,
            ds_natureza_operacao: dto.ds_natureza_operacao,
            ds_modelo: dto.ds_modelo,
            ds_serie: dto.ds_serie,
            ds_numero: dto.ds_numero,
            dt_emissao: dtEm,
            dt_saida_entrega: dto.dhSaiEnt
              ? this.parseKeepWallClockAsUTC(dto.dhSaiEnt)
              : undefined,
            cd_tipo_operacao: dto.tp_nf,
            cd_municipio: dto.cd_municipio,
            ds_fin_nfe: dto.ds_fin_nfe,
            vl_base_calculo: this.toCents(dto.vBC),
            vl_icms: this.toCents(dto.vICMS),
            vl_produto: this.toCents(dto.vProd),
            vl_nf: vlNfLocal,
            vl_frete: this.toCents(dto.vFrete),
            vl_seg: this.toCents(dto.vSeg),
            vl_desc: this.toCents(dto.vDesc),
            vl_ii: this.toCents(dto.vII),
            vl_ipi: this.toCents(dto.vIPI),
            vl_ipidevol: this.toCents(dto.vIPIDevol),
            vl_pis: this.toCents(dto.vPIS),
            vl_cofins: this.toCents(dto.vCOFINS),
            vl_outros: this.toCents(dto.vOutro),
            vl_bc: this.toCents(dto.vBC),
            vl_icms_desoner: this.toCents(dto.vICMSDeson),
            ds_razao_social_emitente: dto.emit_xNome,
            ds_razao_social_destinatario: dto.dest_xNome,
            cd_crt_emitente: dto.emit_CRT ?? undefined,
            ds_documento_transportador: dto.transport_CNPJ || undefined,
            ds_razao_social_transportador: dto.transport_xNome || undefined,
          } as any,
        });

        // Reconstrói itens: apaga SOMENTE os que NÃO possuem alteração de entrada
        const protectedItemsRebuild = await prisma.fis_nfe_itens.findMany({
          where: {
            id_fis_nfe: existing.id,
            fis_nfe_itens_alter_entrada: { some: {} },
          },
          select: { ds_ordem: true },
        });

        const protectedOrdensRebuild = new Set(
          protectedItemsRebuild
            .map((it) =>
              typeof it.ds_ordem === 'number'
                ? it.ds_ordem
                : Number(it.ds_ordem)
            )
            .filter((n) => !isNaN(n))
        );

        await prisma.fis_nfe_itens.deleteMany({
          where: {
            id_fis_nfe: existing.id,
            fis_nfe_itens_alter_entrada: { none: {} },
          },
        });

        for (const it of dto.items) {
          // Se o item possui registro em alter_entrada, não recriar (preserva)
          const ordemRebuild = it.nItem ? parseInt(it.nItem, 10) : undefined;
          if (
            ordemRebuild !== undefined &&
            protectedOrdensRebuild.has(ordemRebuild)
          ) {
            continue;
          }

          await prisma.fis_nfe_itens.create({
            data: {
              id_fis_nfe: existing.id,
              ds_ordem: ordemRebuild,
              ds_codigo: it.cProd,
              ds_produto: it.xProd,
              cd_ncm: it.NCM,
              cd_cest: it.CEST,
              cd_barras: it.cEan,
              cd_cfop: it.CFOP,
              ds_unidade: it.uCom,
              vl_quantidade: this.toCentsSafe(it.qCom),
              vl_unitario: this.toCents(it.vUnCom),
              vl_total: this.toCents(it.vProd),
              ds_unidade_tributavel: it.uTrib,
              vl_quantidade_tributavel: this.toCentsSafe(it.qTrib),
              vl_unitario_tributavel: this.toCents(it.vUnTrib),
              ds_cst: it.CST,
              ds_origem: it.ds_origem,
              vl_base_calculo_icms: this.toCents(it.vBC),
              vl_icms: this.toCents(it.vICMS),
              ds_porcentagem_icms: this.toCents(it.pICMS),
              ds_icms_tag: it.ds_icms_tag,
              cd_cst_pis: it.CST_Pis,
              vl_base_calculo_pis: this.toCents(it.vBC_Pis),
              vl_porcentagem_pis: this.toCents(it.pPIS),
              vl_pis: this.toCents(it.vPIS),
              cd_cst_cofins: it.CST_Cofins,
              vl_base_calculo_cofins: this.toCents(it.vBC_Cofins),
              vl_porcentagem_cofins: this.toCents(it.pCOFINS),
              vl_cofins: this.toCents(it.vCOFINS),
              vl_total_tributavel: this.toCents(it.vTotTrib),
              cd_produto_anp: it.cProdANP,
              ds_produto_anp_descricao: it.descANP,
            },
          });
        }

        return { nfe: updatedNfeRebuild, resposta: null };
      }

      // Verificar itens já presentes e inserir os que estiverem faltando
      try {
        const existingItems = await prisma.fis_nfe_itens.findMany({
          where: {
            id_fis_nfe: existing.id,
          },
          select: {
            ds_ordem: true,
          },
        });
        const existingFornecedor = existing.id_fis_fornecedor;
        if (existingFornecedor === null) {
          if (existing.id_fis_empresa_destinatario) {
            const destFornecedor = await prisma.fis_fornecedores.findUnique({
              where: {
                id_fis_empresas_ds_documento: {
                  id_fis_empresas: existing.id_fis_empresa_destinatario,
                  ds_documento: existing.ds_documento_emitente,
                },
              },
            });
            await prisma.fis_nfe.update({
              where: {
                id: existing.id,
              },
              data: {
                id_fis_fornecedor: destFornecedor?.id,
              },
            });
          }
        }
        const present = new Set<number>(
          existingItems.map((it) => Number(it.ds_ordem))
        );

        const missing = dto.items.filter((it) => {
          if (!it.nItem) return false;
          const ordem = parseInt(it.nItem, 10);
          return !present.has(ordem);
        });
        if (missing.length > 0) {
          // preparar dados para inserir
          const toCreate = missing
            .filter((it) => it.nItem)
            .map((it) => ({
              id_fis_nfe: existing.id,
              ds_ordem: parseInt(it.nItem!, 10),
              ds_codigo: it.cProd,
              ds_produto: it.xProd,
              ds_unidade_tributavel: it.uTrib,
              vl_quantidade_tributavel: this.toCentsSafe(it.qTrib),
              vl_unitario_tributavel: this.toCents(it.vUnTrib),
              vl_total_tributavel: this.toCents(it.vTotTrib),
              vl_pis: this.toCents(it.vPIS),
              vl_porcentagem_pis: this.toCents(it.pPIS),
              vl_base_calculo_pis: this.toCents(it.vBC_Pis),
              cd_cst_pis: it.CST_Pis,
              vl_cofins: this.toCents(it.vCOFINS),
              vl_porcentagem_cofins: this.toCents(it.pCOFINS),
              vl_base_calculo_cofins: this.toCents(it.vBC_Cofins),
              cd_cst_cofins: it.CST_Cofins,
              cd_ncm: it.NCM,
              cd_cest: it.CEST,
              cd_cfop: it.CFOP,
              ds_unidade: it.uCom,
              vl_quantidade: this.toCentsSafe(it.qCom),
              vl_unitario: this.toCents(it.vUnCom),
              vl_total: this.toCents(it.vProd),
              ds_cst: it.CST,
              ds_porcentagem_icms: this.toCents(it.pICMS),
              vl_icms: this.toCents(it.vICMS),
              vl_base_calculo_icms: this.toCents(it.vBC),
              ds_origem: it.ds_origem,
              cd_barras: it.cEan,
              ds_icms_tag: it.ds_icms_tag,
            }));

          try {
            // createMany com skipDuplicates para segurança contra concorrência
            await prisma.fis_nfe_itens.createMany({
              data: toCreate,
              skipDuplicates: true,
            });
          } catch (err) {
            console.error(
              `[NFe] falha ao inserir itens faltantes para NFe id=${existing.id}:`,
              err
            );
          }
        }
      } catch (err) {
        console.error('[NFe] erro ao verificar/inserir itens existentes:', err);
      }

      return {
        nfe: existing,
        resposta: new Error('NFe já importada'),
      };
    }

    // fornecedor temporário, se não achar empresa
    let fornecedorId: string | undefined;

    // timer.lap('process-fornecedor');
    // se não for saída
    if (destId) {
      const documentoRaw = dto.emit_CNPJ || dto.emit_CPF || '';
      const cnpjFor = String(documentoRaw).replace(/\D/g, '');

      // Se não houver documento (CNPJ/CPF) válido, não tentamos upsert
      if (cnpjFor) {
        const f = await prisma.fis_fornecedores.upsert({
          where: {
            id_fis_empresas_ds_documento: {
              id_fis_empresas: destId,
              ds_documento: cnpjFor,
            },
          },
          create: {
            id_fis_empresas: destId,
            ds_documento: cnpjFor,
            ds_nome: dto.emit_xNome ?? '',
            ds_inscricao_municipal: dto.forn_im ?? '',
            ds_inscricao: dto.forn_ie ?? '',
            ds_endereco: dto.forn_endereco ?? '',
            ds_complemento: dto.forn_complemento ?? '',
            ds_bairro: dto.forn_bairro ?? '',
            ds_cep: dto.forn_cep ?? '',
            ds_codigo_municipio: Number(dto.forn_codigo_municipio) ?? undefined,
            ds_codigo_uf: Number(dto.forn_codigo_uf) ?? undefined,
            ds_telefone: dto.forn_telefone ?? '',
            ds_email: dto.forn_email ?? '',
          },
          update: {
            ...(dto.forn_im !== null &&
            dto.forn_im !== undefined &&
            String(dto.forn_im).trim() !== ''
              ? { ds_inscricao_municipal: dto.forn_im }
              : {}),
          },
        });
        fornecedorId = f.id;
      }
    }

    // timer.lap('build-nfe-data');
    const nfeData: any = {
      // quem chama vira emitente ou destinatário conforme isSaida
      ...(emitId ? { fis_empresa_emitente: { connect: { id: emitId } } } : {}),

      // conecta o outro lado, empresa ou fornecedor
      ...(destId
        ? { fis_empresa_destinatario: { connect: { id: destId } } }
        : {}),
      ...(emitId ? { fis_empresa_emitente: { connect: { id: emitId } } } : {}),

      ...(destId ? { fis_fornecedor: { connect: { id: fornecedorId } } } : {}),

      ...(transportId
        ? { fis_empresa_transportadora: { connect: { id: transportId } } }
        : {}),
      ds_id_nfe: dto.id,
      ds_chave: dto.chave,
      js_nfes_referenciadas: dto.nfes_relacionadas
        ? dto.nfes_relacionadas
        : null,
      ds_uf: dto.ds_uf,
      cd_nf: dto.cd_nf,
      ds_natureza_operacao: dto.ds_natureza_operacao,
      ds_modelo: dto.ds_modelo,
      ds_serie: dto.ds_serie,
      ds_numero: dto.ds_numero,
      // preserve wall-clock as requested: create a UTC Date with the same Y-M-D H:m:s numbers
      dt_emissao: dto.dataEmissao
        ? this.parseKeepWallClockAsUTC(dto.dataEmissao)
        : undefined,
      dt_saida_entrega: dto.dhSaiEnt
        ? this.parseKeepWallClockAsUTC(dto.dhSaiEnt)
        : undefined,
      cd_tipo_operacao: dto.tp_nf,
      cd_municipio: dto.cd_municipio,
      ds_fin_nfe: dto.ds_fin_nfe,

      vl_base_calculo: this.toCents(dto.vBC),
      vl_icms: this.toCents(dto.vICMS),
      vl_produto: this.toCents(dto.vProd),
      vl_nf: this.toCents(dto.vNF),
      vl_frete: this.toCents(dto.vFrete),
      vl_seg: this.toCents(dto.vSeg),
      vl_desc: this.toCents(dto.vDesc),
      vl_ii: this.toCents(dto.vII),
      vl_ipi: this.toCents(dto.vIPI),
      vl_ipidevol: this.toCents(dto.vIPIDevol),
      vl_pis: this.toCents(dto.vPIS),
      vl_cofins: this.toCents(dto.vCOFINS),
      vl_outros: this.toCents(dto.vOutro),
      vl_bc: this.toCents(dto.vBC),
      vl_icms_desoner: this.toCents(dto.vICMSDeson),

      ds_documento_emitente: dto.emit_CNPJ || dto.emit_CPF,
      ds_razao_social_emitente: dto.emit_xNome,
      ds_uf_emitente: dto.emit_UF || undefined,
      ds_municipio_emitente: dto.emit_xMun || undefined,
      ds_documento_destinatario: dto.dest_CNPJ || dto.dest_CPF,
      ds_razao_social_destinatario: dto.dest_xNome,
      cd_crt_emitente: dto.emit_CRT ?? undefined,
      // transportadora
      ds_documento_transportador: dto.transport_CNPJ || undefined,
      ds_razao_social_transportador: dto.transport_xNome || undefined,

      fis_nfe_itens: {
        create: await Promise.all(
          dto.items
            .filter((it) => it.nItem)
            .map(async (it) => {
              // procura relação produto-fornecedor mais específica quando possível
              let rel = null as any;
              if (fornecedorId) {
                let verfProdAtivo = false;
                do {
                  try {
                    rel = await prisma.fis_nfe_produto_fornecedor.findFirst({
                      where: {
                        id_fis_empresas: destId,
                        ds_codigo_produto: it.cProd,
                        id_fis_fornecedor: fornecedorId,
                        fis_produtos: {
                          OR: [{ ds_status: 'ATIVO' }, { ds_status: 'NOVO' }],
                        },
                      },
                      include: {
                        fis_produtos: { select: { id_externo: true } },
                      },
                    });
                  } catch (err) {
                    console.warn(
                      'Erro ao buscar relacao fis_nfe_produto_fornecedor',
                      err?.message || err
                    );
                    rel = null;
                  }
                  if (!rel) break;
                  if (
                    await prisma.fis_produtos.findFirst({
                      where: {
                        id: rel.id_fis_produto,
                        ds_status: 'INATIVO',
                      },
                    })
                  ) {
                    verfProdAtivo = true;
                    await prisma.fis_nfe_produto_fornecedor.delete({
                      where: {
                        id: rel.id,
                      },
                    });
                  } else {
                    verfProdAtivo = false;
                  }
                } while (verfProdAtivo);
              }

              const itemCreate: any = {
                ds_ordem: parseInt(it.nItem!, 10),
                ds_codigo: it.cProd,
                ds_produto: it.xProd,
                ds_unidade_tributavel: it.uTrib,
                vl_quantidade_tributavel: this.toCentsSafe(it.qTrib),
                vl_unitario_tributavel: this.toCents(it.vUnTrib),
                vl_total_tributavel: this.toCents(it.vTotTrib),
                vl_pis: this.toCents(it.vPIS),
                vl_porcentagem_pis: this.toCents(it.pPIS),
                vl_base_calculo_pis: this.toCents(it.vBC_Pis),
                cd_cst_pis: it.CST_Pis,
                vl_cofins: this.toCents(it.vCOFINS),
                vl_porcentagem_cofins: this.toCents(it.pCOFINS),
                vl_base_calculo_cofins: this.toCents(it.vBC_Cofins),
                cd_cst_cofins: it.CST_Cofins,
                cd_ncm: it.NCM,
                cd_cest: it.CEST,
                cd_cfop: it.CFOP,
                ds_unidade: it.uCom,
                vl_quantidade: this.toCentsSafe(it.qCom),
                vl_unitario: this.toCents(it.vUnCom),
                vl_total: this.toCents(it.vProd),
                ds_cst: it.CST,
                ds_porcentagem_icms: it.pICMS,
                vl_icms: this.toCents(it.vICMS),
                vl_base_calculo_icms: this.toCents(it.vBC),
                ds_origem: it.ds_origem,
                cd_barras: it.cEan,
                ds_icms_tag: it.ds_icms_tag,
              };

              if (rel) {
                // transfere dados de conversão e produto para a alteração de entrada
                itemCreate.fis_nfe_itens_alter_entrada = {
                  create: {
                    id_produto_alterado: rel.id_fis_produto || null,
                    cd_produto_alterado: rel.fis_produtos.id_externo || null,
                    fl_conversao: rel.fl_conversao ?? false,
                    ds_conversao: rel.ds_conversao || null,
                  },
                };
              }

              return itemCreate;
            })
        ),
      },
    };

    return { nfe: nfeData, resposta };
  }
}
