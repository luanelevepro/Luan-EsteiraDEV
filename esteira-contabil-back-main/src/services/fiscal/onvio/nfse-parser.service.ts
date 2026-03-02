import {
  Prisma,
  NfseOrigem,
  StatusDocumento,
  TipoEf,
  OrigemExtracao,
} from '@prisma/client';
import { parseString } from 'xml2js';
import fs from 'fs';
import { randomUUID } from 'crypto';
import {
  getFiscalEmpresa,
  getFiscalEmpresaPorDocumento,
} from '../fiscal-empresa.service';
import { prisma } from '../../prisma';
import { createDocumentoHistorico } from '../documento.service';

export interface ListaServicos {
  id_tipo_servico?: string;
  ds_valor_unitario?: string;
  ds_valor_total?: string;
  ds_base_calculo?: string;
  ds_valor_iss?: string;
  ds_valor_pis?: string;
  ds_valor_cofins?: string;
  ds_valor_inss?: string;
  ds_valor_ir?: string;
  ds_valor_csll?: string;
  ds_valor_deducoes?: string;
  ds_valor_descontos?: string;
  ds_outras_retencoes?: string;
  is_iss_retido?: boolean;
  ds_item_lista_servico?: string;
  ds_municipio_incidencia?: string;
  ds_exigibilidade_iss?: string;
  id_servico?: string;
  id_item_padrao?: string;
  use_item_padrao?: boolean;
  ds_aliqota?: string;
  ds_discriminacao?: string;
}
/* utilidades */
const cleanCnpj = (cnpj: string): string =>
  cnpj ? cnpj.replace(/[^\d]/g, '') : cnpj;

const normalizeNotaFiscalNumber = (numero: string): string =>
  !numero
    ? numero
    : /^\d+$/.test(numero)
      ? String(parseInt(numero, 10))
      : numero;

const itemListaToDsCodigo = (item: string): string => {
  if (!item) return item;
  // remove quaisquer caracteres não numéricos (p.ex. ponto)
  const digits = String(item).replace(/\D/g, '');
  if (!digits) return item;
  // se tiver 2 ou menos dígitos, retorna como está (sem ponto)
  if (digits.length <= 2) return digits;
  // insere ponto depois dos dois primeiros dígitos, mantendo o comportamento original
  return `${parseInt(digits.slice(0, 2), 10)}.${digits.slice(2)}`;
};

// cache de tipos de serviço
const tipoCache = new Map<string, string>(); // ds_codigo ➜ id
async function getTipoServicoId(dsCodigo: string) {
  if (!tipoCache.has(dsCodigo)) {
    const tipo = await prisma.sis_tipos_servicos.findFirst({
      where: { ds_codigo: dsCodigo },
      select: { id: true },
    });
    if (tipo) tipoCache.set(dsCodigo, tipo.id);
  }
  return tipoCache.get(dsCodigo);
}

export interface NfseParser {
  supports(xmlData: any): boolean;
  extract(xmlData: any): CommonNfseDTO;
}

export type CommonNfseDTO = {
  numero: string;
  codigoVerificacao?: string;
  dataEmissao: string;
  competencia?: string;
  baseCalculo: string;
  aliquota?: string;
  valorLiquido: string;
  valorServicos?: string;
  valorDeducoes?: string;
  valorPis?: string;
  valorCofins?: string;
  valorInss?: string;
  valorIr?: string;
  valorCsll?: string;
  outrasRetencoes?: string;
  valorIss: string;
  descontoIncondicionado?: string;
  descontoCondicionado?: string;
  isIssRetido: boolean;
  itemListaServico?: ListaServicos[];
  codigoCnae?: string;
  codigoTributacaoMunicipio?: string;
  discriminacao?: string;
  codigoMunicipio?: string;
  exigibilidadeIss?: string;
  municipioIncidencia?: string;
  optanteSimplesNacional: boolean;
  incentivoFiscal: boolean;
  cnpjPrestador: string;
  cnpjTomador: string;
  tomadorRazaoSocial?: string;
  prestadorRazaoSocial?: string;
  prestadorInscrMunicipal?: string;
  prestadorEnderecoLogradouro?: string;
  prestadorEnderecoNumero?: string;
  prestadorEnderecoComplemento?: string;
  prestadorEnderecoBairro?: string;
  prestadorEnderecoCep?: string;
  prestadorEnderecoCodigoMunicipio?: string;
  prestadorEnderecoUf?: string;
  prestadorTelefone?: string;
  prestadorEmail?: string;
};

/*
 parser ABRASF - CompNfse / ComplNfse
*/
export class CompNfseParser implements NfseParser {
  supports(xml: any): boolean {
    const raw = xml.CompNfse ?? xml.ComplNfse;
    const base = Array.isArray(raw) ? raw[0] : raw;
    return !!base && Array.isArray(base.Nfse);
  }

  extract(xml: any): CommonNfseDTO {
    const raw = xml.CompNfse ?? xml.ComplNfse;
    const root = Array.isArray(raw) ? raw[0] : raw;
    const nfse = root.Nfse?.[0]?.InfNfse?.[0];
    if (!nfse) {
      throw new Error('Estrutura InfNfse não localizada no XML');
    }
    const vals = nfse.ValoresNfse?.[0] ?? {};
    const dps =
      nfse.DeclaracaoPrestacaoServico?.[0]
        ?.InfDeclaracaoPrestacaoServico?.[0] ?? nfse;
    const serv = dps.Servico?.[0] ?? {};
    const tom = dps.Tomador?.[0] ?? dps.TomadorServico?.[0] ?? {};
    const prest = nfse.PrestadorServico?.[0] ?? {};

    return {
      numero: nfse.Numero?.[0] ?? '',
      codigoVerificacao: nfse.CodigoVerificacao?.[0],
      dataEmissao: nfse.DataEmissao?.[0] ?? '',
      competencia: dps?.Competencia?.[0],
      baseCalculo: vals.BaseCalculo?.[0] ?? '0',
      aliquota: vals.Aliquota?.[0] ?? '',
      valorLiquido: vals.ValorLiquidoNfse?.[0] ?? '0',
      valorServicos:
        serv.Valores?.[0]?.ValorServicos?.[0] ??
        vals.ValorLiquidoNfse?.[0] ??
        '0',
      valorDeducoes: serv.Valores?.[0]?.ValorDeducoes?.[0] ?? '0',
      valorPis: serv.Valores?.[0]?.ValorPis?.[0] ?? '0',
      valorCofins: serv.Valores?.[0]?.ValorCofins?.[0] ?? '0',
      valorInss: serv.Valores?.[0]?.ValorInss?.[0] ?? '0',
      valorIr: serv.Valores?.[0]?.ValorIr?.[0] ?? '0',
      valorCsll: serv.Valores?.[0]?.ValorCsll?.[0] ?? '0',
      outrasRetencoes: serv.Valores?.[0]?.OutrasRetencoes?.[0] ?? '0',
      valorIss: serv.Valores?.[0]?.ValorIss?.[0] ?? vals.ValorIss?.[0] ?? '0',
      descontoIncondicionado:
        serv.Valores?.[0]?.DescontoIncondicionado?.[0] ?? '0',
      descontoCondicionado: serv.Valores?.[0]?.DescontoCondicionado?.[0] ?? '0',
      isIssRetido: ['1', '2'].includes(serv.IssRetido?.[0] ?? ''),
      itemListaServico: serv.ItemListaServico?.[0] ?? '',
      codigoCnae: serv.CodigoCnae?.[0] ?? '',
      codigoTributacaoMunicipio: serv.CodigoTributacaoMunicipio?.[0] ?? '',
      discriminacao: serv.Discriminacao?.[0] ?? '',
      codigoMunicipio: serv.CodigoMunicipio?.[0] ?? '',
      exigibilidadeIss: serv.ExigibilidadeISS?.[0] ?? '',
      municipioIncidencia: serv.MunicipioIncidencia?.[0] ?? '',
      optanteSimplesNacional: dps?.OptanteSimplesNacional?.[0] === '1',
      incentivoFiscal: dps?.IncentivoFiscal?.[0] === '1',
      cnpjPrestador: prest.IdentificacaoPrestador?.[0]?.Cnpj?.[0] ?? '',
      cnpjTomador:
        tom.IdentificacaoTomador?.[0]?.CpfCnpj?.[0]?.Cnpj?.[0] ??
        tom.IdentificacaoTomador?.[0]?.CpfCnpj?.[0]?.Cpf?.[0] ??
        '',
      prestadorRazaoSocial: prest.RazaoSocial?.[0] ?? '',
      prestadorInscrMunicipal:
        prest.IdentificacaoPrestador?.[0]?.InscricaoMunicipal?.[0] ?? '',
      prestadorEnderecoLogradouro: prest.Endereco?.[0]?.Endereco?.[0] ?? '',
      prestadorEnderecoNumero: prest.Endereco?.[0]?.Numero?.[0] ?? '',
      prestadorEnderecoComplemento: prest.Endereco?.[0]?.Complemento?.[0] ?? '',
      prestadorEnderecoBairro: prest.Endereco?.[0]?.Bairro?.[0] ?? '',
      prestadorEnderecoCep: prest.Endereco?.[0]?.Cep?.[0] ?? '',
      prestadorEnderecoCodigoMunicipio:
        prest.Endereco?.[0]?.CodigoMunicipio?.[0] ?? '',
      prestadorEnderecoUf: prest.Endereco?.[0]?.Uf?.[0] ?? '',
      prestadorTelefone: prest.Contato?.[0]?.Telefone?.[0] ?? '',
      prestadorEmail: prest.Contato?.[0]?.Email?.[0] ?? '',
    };
  }
}

/*
 parser para API SIEG (CompNfse isolado)
*/
export class SiegApiParser implements NfseParser {
  supports(xml: any): boolean {
    return Array.isArray(xml.Nfse) && Array.isArray(xml.Nfse[0].InfNfse);
  }
  extract(xml: any): CommonNfseDTO {
    const infNfse = xml.Nfse[0].InfNfse[0];
    const vals = infNfse.ValoresNfse[0];
    const dps =
      infNfse.DeclaracaoPrestacaoServico?.[0]
        ?.InfDeclaracaoPrestacaoServico?.[0];
    const serv = dps.Servico[0];
    const tom = dps.Tomador[0];
    const prest = infNfse.PrestadorServico[0];
    const comp = dps.Competencia?.[0];
    const servVals = serv.Valores?.[0] ?? {};
    const servLista = dps.Servico;

    let itemListaServico: ListaServicos[] = [];
    if (servLista && servLista.length > 0) {
      itemListaServico = servLista.map((s) => {
        const discrimRaw = s.Discriminacao?.[0] ?? '';
        const matches = Array.from(
          discrimRaw.matchAll(/\[Descricao=([^\]]+)\]/g)
        );
        const descricaoExtraida = matches.length
          ? matches.map((m) => m[1]).join('\n')
          : discrimRaw;
        const rawIncond = Array.isArray(s.Valores.DescontoIncondicionado)
          ? s.Valores?.[0].DescontoIncondicionado[0]
          : s.Valores?.[0].DescontoIncondicionado;
        const rawCond = Array.isArray(s.Valores.DescontoCondicionado)
          ? s.Valores?.[0].DescontoCondicionado[0]
          : s.Valores?.[0].DescontoCondicionado;
        const descontoIncond = parseFloat(rawIncond ?? '0') || 0;
        const descontoCond = parseFloat(rawCond ?? '0') || 0;
        const totalDescontos = (descontoIncond + descontoCond).toFixed(2);

        return {
          id_tipo_servico: s.ItemListaServico?.[0] ?? '',
          ds_discriminacao: descricaoExtraida ?? s.Discriminacao?.[0] ?? '',
          ds_valor_unitario:
            s.Valores?.[0].ValorServicos?.[0] ??
            s.Valores?.[0].ValorLiquidoNfse?.[0],
          ds_valor_total:
            s.Valores?.[0].ValorServicos?.[0] ??
            s.Valores?.[0].ValorLiquidoNfse?.[0],
          ds_base_calculo: vals.BaseCalculo[0],
          ds_valor_iss: s.Valores?.[0].ValorIss?.[0],
          ds_valor_pis: s.Valores?.[0].ValorPis?.[0] ?? '0',
          ds_valor_cofins: s.Valores?.[0].ValorCofins?.[0] ?? '0',
          ds_valor_inss: s.Valores?.[0].ValorInss?.[0] ?? '0',
          ds_valor_ir: s.Valores?.[0].ValorIr?.[0] ?? '0',
          ds_valor_csll: s.Valores?.[0].ValorCsll?.[0] ?? '0',
          ds_valor_deducoes: s.Valores?.[0].ValorDeducoes?.[0] ?? '0',
          ds_valor_descontos: totalDescontos,
          ds_outras_retencoes: s.Valores?.[0].OutrasRetencoes?.[0] ?? '0',
          is_iss_retido: s.IssRetido?.[0] === 1,
          ds_item_lista_servico: s.ItemListaServico?.[0] ?? '',
          ds_municipio_incidencia: s.MunicipioIncidencia?.[0] ?? '',
          ds_exigibilidade_iss: s.ExigibilidadeISS?.[0] ?? '',
          id_servico: '',
          id_item_padrao: '',
          use_item_padrao: false,
          ds_aliquota: s.Valores?.[0].Aliquota?.[0] ?? '',
        };
      });
    }

    // soma dos campos gerais
    const totals = servLista.reduce(
      (acc, s) => {
        const v = s.Valores?.[0] ?? {};

        // helper para ler e parsear cada campo
        const parseField = (field?: string[]) =>
          parseFloat((field?.[0] ?? '0').replace(',', '.')) || 0;

        acc.ValorServicos += parseField(v.ValorServicos);
        acc.ValorLiquidoNfse += parseField(v.ValorLiquidoNfse);
        acc.ValorDeducoes += parseField(v.ValorDeducoes);
        acc.ValorPis += parseField(v.ValorPis);
        acc.ValorCofins += parseField(v.ValorCofins);
        acc.ValorInss += parseField(v.ValorInss);
        acc.ValorIr += parseField(v.ValorIr);
        acc.ValorCsll += parseField(v.ValorCsll);
        acc.OutrasRetencoes += parseField(v.OutrasRetencoes);
        acc.DescontoIncond += parseField(v.DescontoIncondicionado);
        acc.DescontoCond += parseField(v.DescontoCondicionado);
        return acc;
      },
      {
        ValorServicos: 0,
        ValorLiquidoNfse: 0,
        ValorDeducoes: 0,
        ValorPis: 0,
        ValorCofins: 0,
        ValorInss: 0,
        ValorIr: 0,
        ValorCsll: 0,
        OutrasRetencoes: 0,
        DescontoIncond: 0,
        DescontoCond: 0,
      }
    );

    const fmt = (n: number) => n.toFixed(2);

    return {
      numero: infNfse.Numero[0],
      codigoVerificacao: infNfse.CodigoVerificacao?.[0],
      dataEmissao: infNfse.DataEmissao[0],
      competencia: comp,
      baseCalculo: vals.BaseCalculo[0],
      aliquota: vals.Aliquota[0],
      valorLiquido: vals.ValorLiquidoNfse[0],
      valorServicos: fmt(totals.ValorServicos),
      valorDeducoes: fmt(totals.ValorDeducoes),
      valorPis: fmt(totals.ValorPis),
      valorCofins: fmt(totals.ValorCofins),
      valorInss: fmt(totals.ValorInss),
      valorIr: fmt(totals.ValorIr),
      valorCsll: fmt(totals.ValorCsll),
      outrasRetencoes: fmt(totals.OutrasRetencoes),
      valorIss: vals.ValorIss[0],
      descontoIncondicionado: fmt(totals.DescontoIncond),
      descontoCondicionado: servVals.DescontoCondicionado?.[0] ?? '0',
      isIssRetido: ['1', '2'].includes(serv.IssRetido?.[0] ?? ''),
      itemListaServico: itemListaServico,
      codigoCnae: serv.CodigoCnae?.[0] ?? '',
      codigoTributacaoMunicipio: serv.CodigoMunicipio?.[0] ?? '',
      discriminacao: serv.Discriminacao?.[0] ?? '',
      codigoMunicipio: prest.Endereco?.[0]?.CodigoMunicipio?.[0] ?? '',
      exigibilidadeIss: serv.ExigibilidadeISS?.[0] ?? '',
      municipioIncidencia: serv.MunicipioIncidencia?.[0] ?? '',
      optanteSimplesNacional: dps.OptanteSimplesNacional?.[0] === '1',
      incentivoFiscal: dps.IncentivoFiscal?.[0] === '1',
      cnpjPrestador: prest.IdentificacaoPrestador[0].CpfCnpj[0].Cnpj[0],
      cnpjTomador: tom.IdentificacaoTomador[0].CpfCnpj[0].Cnpj[0],
      prestadorRazaoSocial: prest.RazaoSocial?.[0] ?? '',
      prestadorInscrMunicipal:
        prest.IdentificacaoPrestador?.[0]?.InscricaoMunicipal?.[0] ?? '',
      prestadorEnderecoLogradouro: prest.Endereco?.[0]?.Endereco?.[0] ?? '',
      prestadorEnderecoNumero: prest.Endereco?.[0]?.Numero?.[0] ?? '',
      prestadorEnderecoComplemento: prest.Endereco?.[0]?.Complemento?.[0] ?? '',
      prestadorEnderecoBairro: prest.Endereco?.[0]?.Bairro?.[0] ?? '',
      prestadorEnderecoCep: prest.Endereco?.[0]?.Cep?.[0] ?? '',
      prestadorEnderecoCodigoMunicipio:
        prest.Endereco?.[0]?.CodigoMunicipio?.[0] ?? '',
      prestadorEnderecoUf: prest.Endereco?.[0]?.Uf?.[0] ?? '',
      prestadorTelefone: prest.Contato?.[0]?.Telefone?.[0] ?? '',
      prestadorEmail: prest.Contato?.[0]?.Email?.[0] ?? '',
    };
  }
}

export class SiegApiParser2 implements NfseParser {
  supports(xml: any): boolean {
    return !!xml.NFSe && Array.isArray(xml.NFSe.infNFSe);
  }

  extract(xml: any): CommonNfseDTO {
    const inf = xml.NFSe.infNFSe[0];
    const dps = inf.DPS?.[0]?.infDPS?.[0];
    const rawId = inf.$?.Id;
    const cleanId = rawId.replace(/^NFS/, '');
    if (!dps) throw new Error('infDPS não localizado no XML');

    const emit = inf.emit?.[0] ?? {};
    const toma = dps.toma?.[0] ?? {};
    const valsInf = inf.valores?.[0] || {};
    const valsDPS = dps.valores?.[0] || {};
    const servDPS = dps.serv?.[0] || {};
    const tribMun = valsDPS.trib?.[0]?.tribMun?.[0] || {};
    const rawCodigo = servDPS.cServ?.[0]?.cTribNac?.[0] ?? '';
    const codigoRaiz =
      rawCodigo.length > 2
        ? rawCodigo.slice(0, rawCodigo.length - 2)
        : rawCodigo;

    // verifica em caso onde o xml vem com o codigo do municipio de incidência com algum tipo de problema, ex: <cLocIncid p3:nil="true"/>
    const dsCodigoMunicipio = (() => {
      const node = inf.cLocIncid?.[0];
      if (!node) {
        return null;
      }
      // se for um objeto e tiver o atributo p3:nil="true", tratamos como nulo ou podemos até mesmo selecionar outro campo com o numero de municipio, podendo ser o de fornecedor, porém, não utilizarei
      if (typeof node === 'object' && node.$ && node.$['p3:nil'] === 'true') {
        return null;
      }
      // se for string puro
      if (typeof node === 'string') {
        return node;
      }
      // se for objeto com texto no "_" (default do xml2js)
      if (typeof node._ === 'string') {
        return node._;
      }
      // fallback
      return null;
    })();

    const servLista = dps.serv;
    let itemListaServico: ListaServicos[] = [];

    if (servLista && servLista.length > 0) {
      itemListaServico = servLista.map((s) => {
        const codigoServico = s.cServ?.[0]?.cTribNac?.[0] ?? '';
        const codigoServicoTratado =
          codigoServico.length > 2
            ? codigoServico.slice(0, codigoServico.length - 2)
            : codigoServico;
        return {
          id_tipo_servico: codigoServicoTratado,
          ds_discriminacao: s.cServ?.[0]?.xDescServ?.[0] ?? '',
          ds_valor_unitario: s.valores?.[0]?.vServPrest?.[0]?.vServ?.[0] ?? '',
          ds_valor_total: s.valores?.[0]?.vServPrest?.[0]?.vServ?.[0] ?? '',
          ds_base_calculo: s.valores?.[0]?.vServPrest?.[0]?.vServ?.[0] ?? '',
          ds_valor_iss: '0',
          ds_valor_pis: '0',
          ds_valor_cofins: '0',
          ds_valor_inss: '0',
          ds_valor_ir: '0',
          ds_valor_csll: '0',
          ds_valor_deducoes: '0',
          ds_valor_descontos: '0',
          ds_outras_retencoes: '0',
          is_iss_retido: tribMun.tpRetISSQN?.[0] === '1',
          ds_item_lista_servico: codigoServicoTratado,
          ds_municipio_incidencia: inf.xLocIncid?.[0] ?? '',
          ds_exigibilidade_iss: tribMun.tpRetISSQN?.[0] ?? '',
          id_servico: '',
          id_item_padrao: '',
          use_item_padrao: false,
          ds_aliquota: '',
        };
      });
    }

    return {
      numero: inf.nNFSe?.[0] ?? '',
      codigoVerificacao: cleanId,
      dataEmissao: dps.dhEmi?.[0] ?? inf.dhProc?.[0] ?? '',
      competencia: dps.dCompet?.[0] ?? '',
      baseCalculo: valsInf.vLiq?.[0] ?? '0',
      aliquota: '',
      valorLiquido: valsInf.vLiq?.[0] ?? '0',
      valorServicos:
        valsDPS.vServPrest?.[0]?.vServ?.[0] ?? valsInf.vLiq?.[0] ?? '0',
      valorDeducoes: '0',
      valorPis: '0',
      valorCofins: '0',
      valorInss: '0',
      valorIr: '0',
      valorCsll: '0',
      outrasRetencoes: valsInf.vTotalRet?.[0] ?? '0',
      valorIss: '0',
      descontoIncondicionado: '0',
      descontoCondicionado: '0',
      isIssRetido: tribMun.tpRetISSQN?.[0] === '1',
      itemListaServico: itemListaServico,
      codigoCnae: '',
      codigoTributacaoMunicipio:
        servDPS.locPrest?.[0]?.cLocPrestacao?.[0] ?? '',
      discriminacao: servDPS.cServ?.[0]?.xDescServ?.[0] ?? '',
      codigoMunicipio: dsCodigoMunicipio ?? '',
      exigibilidadeIss: tribMun.tpRetISSQN?.[0] ?? '',
      municipioIncidencia: inf.xLocIncid?.[0] ?? '',
      optanteSimplesNacional:
        dps.prest?.[0]?.regTrib?.[0]?.opSimpNac?.[0] === '1',
      incentivoFiscal: dps.prest?.[0]?.regTrib?.[0]?.regEspTrib?.[0] === '1',
      cnpjPrestador: emit.CNPJ?.[0] ?? '',
      cnpjTomador: toma.CNPJ?.[0] ?? '',
      tomadorRazaoSocial: toma.xNome?.[0] ?? '',
      prestadorRazaoSocial: emit.xNome?.[0] ?? '',
      prestadorInscrMunicipal: emit.InscricaoMunicipal?.[0] ?? '',
      prestadorEnderecoLogradouro: emit.enderNac?.[0]?.xLgr?.[0] ?? '',
      prestadorEnderecoNumero: emit.enderNac?.[0]?.nro?.[0] ?? '',
      prestadorEnderecoComplemento: '',
      prestadorEnderecoBairro: emit.enderNac?.[0]?.xBairro?.[0] ?? '',
      prestadorEnderecoCep: emit.enderNac?.[0]?.CEP?.[0] ?? '',
      prestadorEnderecoCodigoMunicipio:
        String(emit.enderNac?.[0]?.cMun?.[0]) ?? '',
      prestadorEnderecoUf: emit.enderNac?.[0]?.UF?.[0] ?? '',
      prestadorTelefone: emit.fone?.[0] ?? '',
      prestadorEmail: emit.email?.[0] ?? '',
    };
  }
}
/*
 parser SIEG
*/
export class SiegParser implements NfseParser {
  supports(xml: any): boolean {
    return !!xml.NFSe && Array.isArray(xml.NFSe.infNFSe);
  }

  extract(xml: any): CommonNfseDTO {
    const inf = xml.NFSe.infNFSe[0];
    const vals = inf.valores[0];
    const dps = inf.DPS[0].infDPS[0];
    const toma = dps.toma[0];
    const emit = inf.emit[0];
    const comp = dps.Competencia?.[0];

    return {
      numero: inf.nNFSe[0],
      codigoVerificacao: undefined,
      dataEmissao: dps.dhEmi?.[0] ?? inf.dhProc[0],
      competencia: comp,
      baseCalculo: vals.vBC[0],
      aliquota: vals.pAliqAplic?.[0] ?? '',
      valorLiquido: vals.vLiq[0],
      valorServicos: vals.vServPrest?.[0]?.vServ?.[0] ?? vals.vLiq[0],
      valorDeducoes: vals.vDR?.[0] ?? '0',
      valorPis: vals.trib?.tribFed?.[0]?.piscofins?.[0]?.vPis?.[0] ?? '0',
      valorCofins: vals.trib?.tribFed?.[0]?.piscofins?.[0]?.vCofins?.[0] ?? '0',
      valorInss: undefined,
      valorIr: undefined,
      valorCsll: undefined,
      outrasRetencoes: vals.vTotalRet?.[0] ?? '0',
      valorIss: vals.vISSQN[0],
      descontoIncondicionado: vals.vDescIncond?.[0] ?? '0',
      descontoCondicionado: undefined,
      isIssRetido: vals.trib?.tribMun?.[0]?.tpRetISSQN?.[0] === '1',
      itemListaServico: undefined,
      codigoCnae: undefined,
      codigoTributacaoMunicipio: undefined,
      discriminacao: inf.xOutInf?.[0] ?? '',
      codigoMunicipio: undefined,
      exigibilidadeIss: undefined,
      municipioIncidencia: undefined,
      optanteSimplesNacional: dps.prest[0].regTrib[0].opSimpNac[0] === '1',
      incentivoFiscal: dps.prest[0].regTrib[0].regEspTrib[0] === '1',
      cnpjPrestador: emit.CNPJ[0],
      cnpjTomador: toma.CNPJ[0],
      tomadorRazaoSocial: toma.xNome?.[0] ?? '',
      prestadorRazaoSocial: emit.xNome?.[0] ?? '',
      prestadorInscrMunicipal: emit.InscricaoMunicipal?.[0] ?? '',
      prestadorEnderecoLogradouro: emit.Endereco?.[0]?.xLgr?.[0] ?? '',
      prestadorEnderecoNumero: emit.Endereco?.[0]?.nro?.[0] ?? '',
      prestadorEnderecoComplemento: emit.Endereco?.[0]?.xCpl?.[0] ?? '',
      prestadorEnderecoBairro: emit.Endereco?.[0]?.xBairro?.[0] ?? '',
      prestadorEnderecoCep: emit.Endereco?.[0]?.CEP?.[0] ?? '',
      prestadorEnderecoCodigoMunicipio: emit.Endereco?.[0]?.cMun?.[0] ?? '',
      prestadorEnderecoUf: emit.Endereco?.[0]?.UF?.[0] ?? '',
      prestadorTelefone: emit.Contato?.[0]?.fone?.[0] ?? '',
      prestadorEmail: emit.Contato?.[0]?.email?.[0] ?? '',
    };
  }
}

export class TecnoSpeedJsonParser implements NfseParser {
  supports(raw: any): boolean {
    // verifique se é um objeto e possui pelo menos:
    //  • raw.id (string)
    //  • raw.servicos (array de serviços)
    return (
      raw &&
      typeof raw === 'object' &&
      typeof raw.id === 'string' &&
      Array.isArray(raw.servicos)
    );
  }

  extract(raw: any): CommonNfseDTO {
    const notaObj = raw;
    const serv = notaObj.servicos[0];
    const prest = notaObj.prestador;
    const tom = notaObj.tomador;
    // coleta apenas descicao
    const discrimRaw = serv.discriminacaoServico ?? '';
    const matches = Array.from(discrimRaw.matchAll(/\[Descricao=([^\]]+)\]/g));
    const descricaoExtraida = matches.length
      ? matches.map((m) => m[1]).join('\n')
      : discrimRaw;
    const servLista = notaObj.servicos;
    let itemListaServico: ListaServicos[] = [];

    if (servLista && servLista.length > 0) {
      itemListaServico = servLista.map((s) => {
        const discrimRaw = s.discriminacaoServico ?? '';
        const matches = Array.from(
          discrimRaw.matchAll(/\[Descricao=([^\]]+)\]/g)
        );
        const descricaoExtraida = matches.length
          ? matches.map((m) => m[1]).join('\n')
          : discrimRaw;
        return {
          id_tipo_servico: s.itemListaServico,
          ds_discriminacao: descricaoExtraida,
          ds_valor_unitario: String(notaObj.valorServicos),
          ds_valor_total: String(notaObj.valorServicos),
          ds_base_calculo: s.iss.valor,
          ds_valor_iss: s.iss.valor,
          ds_valor_pis: String(notaObj.retencao.pis) ?? '0',
          ds_valor_cofins: String(notaObj.retencao.cofins) ?? '0',
          ds_valor_inss: String(notaObj.retencao.inss) ?? '0',
          ds_valor_ir: String(notaObj.retencao.ir) ?? '0',
          ds_valor_csll: String(notaObj.retencao.csll) ?? '0',
          ds_valor_deducoes: String(notaObj.valorDeducoes) ?? '0',
          ds_valor_descontos: '0',
          ds_outras_retencoes: '0',
          is_iss_retido: s.iss.retido === 1,
          ds_item_lista_servico: s.itemListaServico,
          ds_municipio_incidencia: undefined,
          ds_exigibilidade_iss: undefined,
          id_servico: '',
          id_item_padrao: '',
          use_item_padrao: false,
          ds_aliquota: String(s.iss.aliquota) ?? '',
        };
      });
    }

    return {
      numero: serv.nfse.numero, // ex.: "2567001"
      codigoVerificacao: serv.nfse.codigoVerificacao, // ex.: "IH4VRNHH"
      dataEmissao: serv.rps.dataEmissao || serv.nfse.dataAutorizacao, // ex.: "2025-02-28T00:00:00.000Z"
      // TecnoSpeed não devolve campo “competencia” separado, usamos data de emissão:
      competencia: serv.rps.dataEmissao,
      baseCalculo: String(serv.iss.valor), // Não há base explícita; usamos valor ISS
      aliquota: String(serv.iss.aliquota), // ex.: "0.029"
      valorLiquido: String(notaObj.valorServicos),
      valorServicos: String(notaObj.valorServicos),
      valorDeducoes:
        notaObj.valorDeducoes != null ? String(notaObj.valorDeducoes) : '0',
      valorPis:
        notaObj.retencao.pis != null ? String(notaObj.retencao.pis) : '0',
      valorCofins:
        notaObj.retencao.cofins != null ? String(notaObj.retencao.cofins) : '0',
      valorInss:
        notaObj.retencao.inss != null ? String(notaObj.retencao.inss) : '0',
      valorIr: notaObj.retencao.ir != null ? String(notaObj.retencao.ir) : '0',
      valorCsll:
        notaObj.retencao.csll != null ? String(notaObj.retencao.csll) : '0',
      outrasRetencoes: '0',
      valorIss: String(serv.iss.valor), // ex.: "1.27"
      descontoIncondicionado: '0',
      descontoCondicionado: '0',
      isIssRetido: serv.iss.retido === 1,
      itemListaServico: itemListaServico,
      codigoCnae: undefined,
      codigoTributacaoMunicipio: serv.codigoTributacaoMunicipio ?? '',
      discriminacao: descricaoExtraida ?? '',
      codigoMunicipio: prest.endereco.codigoCidade ?? '',
      exigibilidadeIss: undefined,
      municipioIncidencia: undefined,
      optanteSimplesNacional: false,
      incentivoFiscal: false,
      cnpjPrestador: cleanCnpj(prest.cpfCnpj),
      cnpjTomador: cleanCnpj(tom.cpfCnpj),
      tomadorRazaoSocial: tom.razaoSocial ?? '',
      prestadorRazaoSocial: prest.razaoSocial ?? '',
      prestadorInscrMunicipal: prest.inscricaoMunicipal ?? '',
      prestadorEnderecoLogradouro: prest.endereco.endereco ?? '',
      prestadorEnderecoNumero: prest.endereco.numero ?? '',
      prestadorEnderecoComplemento: prest.endereco.complemento ?? '',
      prestadorEnderecoBairro: prest.endereco.bairro ?? '',
      prestadorEnderecoCep: prest.endereco.cep ?? '',
      prestadorEnderecoCodigoMunicipio: prest.endereco.codigoCidade ?? '',
      prestadorEnderecoUf: undefined,
      prestadorTelefone: undefined,
      prestadorEmail: undefined,
    };
  }
}
export class ImportarXmlNfseService {
  private parsers = [
    new CompNfseParser(),
    new SiegApiParser(),
    new SiegApiParser2(),
    new SiegParser(),
    new TecnoSpeedJsonParser(),
  ];

  private convertToCents(value: string): string {
    if (!value) return '0';
    const strValue = String(value);
    const num = parseFloat(strValue.replace(',', '.'));
    return Math.round(num * 100).toString();
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
    empresaId: string,
    origem: string,
    ds_status: StatusDocumento,
    isSaida: boolean
  ): Promise<{
    nfse: Prisma.fis_nfseCreateInput | null;
    documento: Prisma.fis_documentoCreateInput | null;
    resposta: Error | null;
  }> {
    const parser = this.parsers.find((p) => p.supports(xmlData));
    if (!parser) {
      return {
        nfse: null,
        documento: null,
        resposta: new Error(
          'Formato XML não suportado (abrasf/siegAPI/sieg/tecnoSpeed).'
        ),
      };
    }
    const dto = parser.extract(xmlData);
    const rawData = JSON.stringify(xmlData);
    return this.saveFromDto(
      dto,
      empresaId,
      origem,
      ds_status,
      isSaida,
      rawData
    );
  }

  private async saveFromDto(
    dto: CommonNfseDTO,
    empresaId: string,
    origem: string,
    ds_status: StatusDocumento,
    isSaida: boolean,
    rawData: string
  ): Promise<{
    nfse: Prisma.fis_nfseCreateInput | null;
    documento: Prisma.fis_documentoCreateInput | null;
    resposta: Error | null;
  }> {
    let resposta: Error | null = null;

    const fisEmpresaCaller = await getFiscalEmpresa(empresaId);
    const empresaCaller = await prisma.sis_empresas.findUnique({
      where: { id: fisEmpresaCaller.id_sis_empresas },
      select: { ds_documento: true },
    });
    if (!empresaCaller) throw new Error('Empresa não encontrada');

    /* checagem de coerência com o flag isSaida */
    const docEmpresa = cleanCnpj(empresaCaller.ds_documento);
    if (
      (isSaida && docEmpresa !== cleanCnpj(dto.cnpjPrestador)) ||
      (!isSaida && docEmpresa !== cleanCnpj(dto.cnpjTomador))
    ) {
      throw new Error(
        `Documento do ${
          isSaida ? 'prestador (emitente)' : 'tomador (destinatário)'
        } difere do da empresa.`
      );
    }

    /* tenta localizar outras empresas pelo CNPJ */
    const tryBind = async (cnpj?: string) => {
      if (!cnpj) return undefined;
      try {
        const emp = await getFiscalEmpresaPorDocumento(cleanCnpj(cnpj));
        return emp.id;
      } catch {
        return undefined;
      }
    };
    const idEmitente = await tryBind(dto.cnpjPrestador);
    const idDestinatario = await tryBind(dto.cnpjTomador);
    let empresa = isSaida ? idEmitente : idDestinatario;

    // Busca em cascata por documento com EMITIDO
    const dtEmissao = dto.dataEmissao
      ? this.parseKeepWallClockAsUTC(dto.dataEmissao)
      : undefined;
    const vlNfse = this.convertToCents(dto.valorLiquido);

    let aguardandoExtracao = null;

    // 1ª tentativa: numero + data + valor (NFSe não tem chave)
    if (dtEmissao && dto.numero) {
      const startOfDay = new Date(dtEmissao);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(dtEmissao);
      endOfDay.setUTCHours(23, 59, 59, 999);

      aguardandoExtracao = await prisma.fis_nfse.findFirst({
        where: {
          ds_numero: dto.numero,
          dt_emissao: { gte: startOfDay, lte: endOfDay },
          ds_valor_liquido_nfse: vlNfse,
          fis_documento: { some: { ds_status: 'EMITIDO' } },
        },
        include: { fis_documento: true },
      });
    }

    // 2ª tentativa: numero + data
    if (!aguardandoExtracao && dtEmissao && dto.numero) {
      const startOfDay = new Date(dtEmissao);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(dtEmissao);
      endOfDay.setUTCHours(23, 59, 59, 999);

      aguardandoExtracao = await prisma.fis_nfse.findFirst({
        where: {
          ds_numero: dto.numero,
          dt_emissao: { gte: startOfDay, lte: endOfDay },
          fis_documento: { some: { ds_status: 'EMITIDO' } },
        },
        include: { fis_documento: true },
      });
    }

    // Se encontrou documento EMITIDO, atualiza
    if (aguardandoExtracao && aguardandoExtracao.fis_documento.length > 0) {
      console.log(`[NFSe] Atualizando documento EMITIDO: ${dto.numero}`);

      const docId = aguardandoExtracao.fis_documento[0].id;

      // Preserva IDs existentes
      const preservedEmitId = aguardandoExtracao.id_fis_empresa_emitente;
      const preservedDestId = aguardandoExtracao.id_fis_empresas;
      const preservedEmitDoc = aguardandoExtracao.ds_cnpj_prestador;
      const preservedDestDoc = aguardandoExtracao.ds_cnpj_tomador;

      // Prepara fornecedor se não for saída
      let fornecedorId: string | undefined;
      if (!isSaida) {
        const cnpjFor = cleanCnpj(dto.cnpjPrestador);
        const found = await prisma.fis_fornecedores.findFirst({
          where: {
            ds_documento: cnpjFor,
            id_fis_empresas: fisEmpresaCaller.id,
          },
          select: { id: true },
        });

        if (found) {
          if (
            dto.prestadorInscrMunicipal !== null &&
            dto.prestadorInscrMunicipal !== undefined &&
            String(dto.prestadorInscrMunicipal).trim() !== ''
          ) {
            await prisma.fis_fornecedores.update({
              where: { id: found.id },
              data: { ds_inscricao_municipal: dto.prestadorInscrMunicipal },
            });
          }
          fornecedorId = found.id;
        } else {
          const newFornecedor = await prisma.fis_fornecedores.create({
            data: {
              id_fis_empresas: fisEmpresaCaller.id,
              ds_documento: cnpjFor,
              ds_nome: dto.prestadorRazaoSocial ?? '',
              ds_inscricao_municipal: dto.prestadorInscrMunicipal ?? '',
              ds_endereco: dto.prestadorEnderecoLogradouro ?? '',
              ds_complemento: dto.prestadorEnderecoComplemento ?? '',
              ds_bairro: dto.prestadorEnderecoBairro ?? '',
              ds_cep: dto.prestadorEnderecoCep ?? '',
              ds_codigo_municipio:
                Number(dto.prestadorEnderecoCodigoMunicipio) || undefined,
              ds_codigo_uf: Number(dto.prestadorEnderecoUf) || undefined,
              ds_telefone: dto.prestadorTelefone ?? '',
              ds_email: dto.prestadorEmail ?? '',
            },
          });
          fornecedorId = newFornecedor.id;
        }
      }

      // Monta js_servicos
      let js_servicos: any[] = [];
      if (dto.itemListaServico) {
        for (const item of dto.itemListaServico) {
          const dsCodigo = itemListaToDsCodigo(item.ds_item_lista_servico);
          const tipoId = await getTipoServicoId(dsCodigo);
          if (tipoId) {
            js_servicos.push({
              id: randomUUID(),
              id_tipo_servico: tipoId,
              ds_quantidade: '1',
              ds_discriminacao: item.ds_discriminacao ?? '',
              ds_valor_unitario: this.convertToCents(
                item.ds_valor_unitario ?? dto.valorServicos ?? dto.valorLiquido
              ),
              ds_valor_total: this.convertToCents(
                item.ds_valor_total ?? dto.valorServicos ?? dto.valorLiquido
              ),
              ds_base_calculo: this.convertToCents(
                item.ds_base_calculo ?? dto.baseCalculo
              ),
              ds_valor_iss: this.convertToCents(
                item.ds_valor_iss ?? dto.valorIss
              ),
              ds_valor_pis: this.convertToCents(
                item.ds_valor_pis ?? dto.valorPis ?? '0'
              ),
              ds_valor_cofins: this.convertToCents(
                item.ds_valor_cofins ?? dto.valorCofins ?? '0'
              ),
              ds_valor_inss: this.convertToCents(
                item.ds_valor_inss ?? dto.valorInss ?? '0'
              ),
              ds_valor_ir: this.convertToCents(
                item.ds_valor_ir ?? dto.valorIr ?? '0'
              ),
              ds_valor_csll: this.convertToCents(
                item.ds_valor_csll ?? dto.valorCsll ?? '0'
              ),
              ds_valor_deducoes: this.convertToCents(
                item.ds_valor_deducoes ?? dto.valorDeducoes ?? '0'
              ),
              ds_valor_descontos: this.convertToCents(
                dto.descontoIncondicionado ?? '0'
              ),
              ds_outras_retencoes: this.convertToCents(
                item.ds_outras_retencoes ?? dto.outrasRetencoes ?? '0'
              ),
              is_iss_retido: item.is_iss_retido ?? dto.isIssRetido,
              ds_item_lista_servico:
                item.ds_item_lista_servico ?? dto.itemListaServico,
              ds_municipio_incidencia:
                item.ds_municipio_incidencia ?? dto.municipioIncidencia ?? '',
              ds_exigibilidade_iss:
                item.ds_exigibilidade_iss ?? dto.exigibilidadeIss ?? '',
              id_servico: item.id_servico ?? '',
              id_item_padrao: '',
              use_item_padrao: false,
              ds_aliquota: item.ds_aliqota ?? dto.aliquota ?? '',
            });
          }
        }
      }

      const competenciaDate = dto.competencia
        ? this.parseKeepWallClockAsUTC(dto.competencia)
        : this.parseKeepWallClockAsUTC(dto.dataEmissao);

      // Atualiza NFSe preservando IDs existentes
      await prisma.fis_nfse.update({
        where: { id: aguardandoExtracao.id },
        data: {
          id_fis_empresa_emitente:
            preservedEmitId ||
            idEmitente ||
            (isSaida ? fisEmpresaCaller.id : undefined),
          id_fis_empresas:
            preservedDestId ||
            idDestinatario ||
            (!isSaida ? fisEmpresaCaller.id : undefined),
          id_fis_fornecedor:
            fornecedorId || aguardandoExtracao.id_fis_fornecedor,

          ds_origem: NfseOrigem.XML,
          ds_numero: dto.numero,
          ds_codigo_verificacao: dto.codigoVerificacao,
          dt_emissao: this.parseKeepWallClockAsUTC(dto.dataEmissao),
          dt_competencia: competenciaDate,

          ds_base_calculo: this.convertToCents(dto.baseCalculo),
          ds_aliquota: dto.aliquota ?? '',
          ds_valor_liquido_nfse: this.convertToCents(dto.valorLiquido),
          ds_valor_servicos: this.convertToCents(
            dto.valorServicos ?? dto.valorLiquido
          ),
          ds_valor_deducoes: this.convertToCents(dto.valorDeducoes ?? '0'),
          ds_valor_pis: this.convertToCents(dto.valorPis ?? '0'),
          ds_valor_cofins: this.convertToCents(dto.valorCofins ?? '0'),
          ds_valor_inss: this.convertToCents(dto.valorInss ?? '0'),
          ds_valor_ir: this.convertToCents(dto.valorIr ?? '0'),
          ds_valor_csll: this.convertToCents(dto.valorCsll ?? '0'),
          ds_outras_retencoes: this.convertToCents(dto.outrasRetencoes ?? '0'),
          ds_valor_iss: this.convertToCents(dto.valorIss ?? '0'),
          ds_desconto_incondicionado: this.convertToCents(
            dto.descontoIncondicionado ?? '0'
          ),
          ds_desconto_condicionado: this.convertToCents(
            dto.descontoCondicionado ?? '0'
          ),
          is_iss_retido: dto.isIssRetido,
          ds_item_lista_servico:
            String(dto.itemListaServico[0].id_tipo_servico) ?? '',
          ds_codigo_cnae: dto.codigoCnae ?? '',
          ds_codigo_tributacao_municipio: dto.codigoTributacaoMunicipio ?? '',
          ds_discriminacao: dto.discriminacao ?? '',
          ds_codigo_municipio: dto.codigoMunicipio ?? '',
          ds_exigibilidade_iss: dto.exigibilidadeIss ?? '',
          ds_municipio_incidencia: dto.municipioIncidencia ?? '',
          is_optante_simples_nacional: dto.optanteSimplesNacional,
          is_incentivo_fiscal: dto.incentivoFiscal,
          ds_razao_social_tomador: dto.tomadorRazaoSocial ?? '',
          js_servicos: js_servicos.length ? js_servicos : undefined,
        },
      });

      // Atualiza fis_documento para IMPORTADO
      await prisma.fis_documento.update({
        where: { id: docId },
        data: {
          ds_status: 'IMPORTADO',
          ds_origem: { sistema: origem },
        },
      });
      const documento = await prisma.fis_documento.findUnique({
        where: {
          id: docId,
        },
        select: { id: true, ds_status: true },
      });
      createDocumentoHistorico({
        justificativa: 'Documento encontrado após verificação SAT',
        id_documento: documento.id,
        status_novo: 'IMPORTADO',
        status_antigo: documento.ds_status,
      });

      // Cria ou atualiza fis_documento_dfe
      const existingDfe = await prisma.fis_documento_dfe.findFirst({
        where: {
          id_nfse: aguardandoExtracao.id,
        },
      });

      if (existingDfe) {
        await prisma.fis_documento_dfe.update({
          where: { id: existingDfe.id },
          data: {
            id_fis_documento: docId,
            ds_situacao_integracao: 'INTEGRADO',
          },
        });
      } else {
        await prisma.fis_documento_dfe.create({
          data: {
            id_fis_documento: docId,
            id_nfse: aguardandoExtracao.id,
            ds_tipo: 'NFSE',
            ds_origem: origem as OrigemExtracao,
            dt_emissao: dtEmissao || new Date(),
            ds_situacao_integracao: 'INTEGRADO',
            ds_raw: rawData,
          },
        });
      }

      console.log(`[NFSe] Documento atualizado com sucesso: ${dto.numero}`);
      return { nfse: null, documento: null, resposta: null };
    }

    /* duplicidade - documento normal (não EMITIDO) */
    const exists = await prisma.fis_nfse.findFirst({
      where: {
        id_fis_empresas: fisEmpresaCaller.id,
        ds_codigo_verificacao: dto.codigoVerificacao,
        dt_emissao: this.parseKeepWallClockAsUTC(dto.dataEmissao),
        OR: [
          { id_fis_empresas: empresa },
          { id_fis_empresa_emitente: empresa },
        ],
      },
    });
    if (exists && ds_status !== 'CANCELADO') {
      // Se o NFSe existente não tiver DFE associado, devemos reconstruir o registro completo
      const existingDfeNfse = await prisma.fis_documento_dfe.findFirst({
        where: { id_nfse: exists.id },
      });

      const shouldRebuild = !existingDfeNfse;
      if (shouldRebuild) {
        console.log(
          `[NFSe] Reconstruindo registro NFSe id=${exists.id} (hasDfe=${Boolean(existingDfeNfse)})`
        );

        // Preserva IDs existentes
        const preservedEmitId = exists.id_fis_empresa_emitente;
        const preservedDestId = exists.id_fis_empresas;

        // Prepara fornecedor se não for saída
        let fornecedorIdRebuild: string | undefined;
        if (!isSaida && preservedDestId) {
          const cnpjFor = cleanCnpj(dto.cnpjPrestador);
          const found = await prisma.fis_fornecedores.findFirst({
            where: { ds_documento: cnpjFor, id_fis_empresas: preservedDestId },
            select: { id: true },
          });

          if (found) {
            if (
              dto.prestadorInscrMunicipal !== null &&
              dto.prestadorInscrMunicipal !== undefined &&
              String(dto.prestadorInscrMunicipal).trim() !== ''
            ) {
              await prisma.fis_fornecedores.update({
                where: { id: found.id },
                data: { ds_inscricao_municipal: dto.prestadorInscrMunicipal },
              });
            }
            fornecedorIdRebuild = found.id;
          } else {
            const newFornecedor = await prisma.fis_fornecedores.create({
              data: {
                id_fis_empresas: preservedDestId,
                ds_documento: cnpjFor,
                ds_nome: dto.prestadorRazaoSocial ?? '',
                ds_inscricao_municipal: dto.prestadorInscrMunicipal ?? '',
                ds_endereco: dto.prestadorEnderecoLogradouro ?? '',
                ds_complemento: dto.prestadorEnderecoComplemento ?? '',
                ds_bairro: dto.prestadorEnderecoBairro ?? '',
                ds_cep: dto.prestadorEnderecoCep ?? '',
                ds_codigo_municipio:
                  Number(dto.prestadorEnderecoCodigoMunicipio) || undefined,
                ds_codigo_uf: Number(dto.prestadorEnderecoUf) || undefined,
                ds_telefone: dto.prestadorTelefone ?? '',
                ds_email: dto.prestadorEmail ?? '',
              },
            });
            fornecedorIdRebuild = newFornecedor.id;
          }
        }

        // Monta js_servicos
        let js_servicosRebuild: any[] = [];
        if (dto.itemListaServico) {
          for (const item of dto.itemListaServico) {
            const dsCodigo = itemListaToDsCodigo(item.ds_item_lista_servico);
            const tipoId = await getTipoServicoId(dsCodigo);
            if (tipoId) {
              js_servicosRebuild.push({
                id: randomUUID(),
                id_tipo_servico: tipoId,
                ds_quantidade: '1',
                ds_discriminacao: item.ds_discriminacao ?? '',
                ds_valor_unitario: this.convertToCents(
                  item.ds_valor_unitario ??
                    dto.valorServicos ??
                    dto.valorLiquido
                ),
                ds_valor_total: this.convertToCents(
                  item.ds_valor_total ?? dto.valorServicos ?? dto.valorLiquido
                ),
                ds_base_calculo: this.convertToCents(
                  item.ds_base_calculo ?? dto.baseCalculo
                ),
                ds_valor_iss: this.convertToCents(
                  item.ds_valor_iss ?? dto.valorIss
                ),
                ds_valor_pis: this.convertToCents(
                  item.ds_valor_pis ?? dto.valorPis ?? '0'
                ),
                ds_valor_cofins: this.convertToCents(
                  item.ds_valor_cofins ?? dto.valorCofins ?? '0'
                ),
                ds_valor_inss: this.convertToCents(
                  item.ds_valor_inss ?? dto.valorInss ?? '0'
                ),
                ds_valor_ir: this.convertToCents(
                  item.ds_valor_ir ?? dto.valorIr ?? '0'
                ),
                ds_valor_csll: this.convertToCents(
                  item.ds_valor_csll ?? dto.valorCsll ?? '0'
                ),
                ds_valor_deducoes: this.convertToCents(
                  item.ds_valor_deducoes ?? dto.valorDeducoes ?? '0'
                ),
                ds_valor_descontos: this.convertToCents(
                  dto.descontoIncondicionado ?? '0'
                ),
                ds_outras_retencoes: this.convertToCents(
                  item.ds_outras_retencoes ?? dto.outrasRetencoes ?? '0'
                ),
                is_iss_retido: item.is_iss_retido ?? dto.isIssRetido,
                ds_item_lista_servico:
                  item.ds_item_lista_servico ?? dto.itemListaServico,
                ds_municipio_incidencia:
                  item.ds_municipio_incidencia ?? dto.municipioIncidencia ?? '',
                ds_exigibilidade_iss:
                  item.ds_exigibilidade_iss ?? dto.exigibilidadeIss ?? '',
                id_servico: item.id_servico ?? '',
                id_item_padrao: '',
                use_item_padrao: false,
                ds_aliquota: item.ds_aliqota ?? dto.aliquota ?? '',
              });
            }
          }
        }

        const competenciaDateRebuild = dto.competencia
          ? this.parseKeepWallClockAsUTC(dto.competencia)
          : this.parseKeepWallClockAsUTC(dto.dataEmissao);

        // Atualiza NFSe com todos os campos
        const updatedNfseRebuild = await prisma.fis_nfse.update({
          where: { id: exists.id },
          data: {
            id_fis_empresa_emitente:
              preservedEmitId ||
              idEmitente ||
              (isSaida ? fisEmpresaCaller.id : undefined),
            id_fis_empresas:
              preservedDestId ||
              idDestinatario ||
              (!isSaida ? fisEmpresaCaller.id : undefined),
            id_fis_fornecedor: fornecedorIdRebuild || exists.id_fis_fornecedor,

            ds_origem: NfseOrigem.XML,
            ds_numero: dto.numero,
            ds_codigo_verificacao: dto.codigoVerificacao,
            dt_emissao: this.parseKeepWallClockAsUTC(dto.dataEmissao),
            dt_competencia: competenciaDateRebuild,

            ds_base_calculo: this.convertToCents(dto.baseCalculo),
            ds_aliquota: dto.aliquota ?? '',
            ds_valor_liquido_nfse: this.convertToCents(dto.valorLiquido),
            ds_valor_servicos: this.convertToCents(
              dto.valorServicos ?? dto.valorLiquido
            ),
            ds_valor_deducoes: this.convertToCents(dto.valorDeducoes ?? '0'),
            ds_valor_pis: this.convertToCents(dto.valorPis ?? '0'),
            ds_valor_cofins: this.convertToCents(dto.valorCofins ?? '0'),
            ds_valor_inss: this.convertToCents(dto.valorInss ?? '0'),
            ds_valor_ir: this.convertToCents(dto.valorIr ?? '0'),
            ds_valor_csll: this.convertToCents(dto.valorCsll ?? '0'),
            ds_outras_retencoes: this.convertToCents(
              dto.outrasRetencoes ?? '0'
            ),
            ds_valor_iss: this.convertToCents(dto.valorIss ?? '0'),
            ds_desconto_incondicionado: this.convertToCents(
              dto.descontoIncondicionado ?? '0'
            ),
            ds_desconto_condicionado: this.convertToCents(
              dto.descontoCondicionado ?? '0'
            ),
            is_iss_retido: dto.isIssRetido,
            ds_item_lista_servico:
              String(dto.itemListaServico[0]?.id_tipo_servico) ?? '',
            ds_codigo_cnae: dto.codigoCnae ?? '',
            ds_codigo_tributacao_municipio: dto.codigoTributacaoMunicipio ?? '',
            ds_discriminacao: dto.discriminacao ?? '',
            ds_codigo_municipio: dto.codigoMunicipio ?? '',
            ds_exigibilidade_iss: dto.exigibilidadeIss ?? '',
            ds_municipio_incidencia: dto.municipioIncidencia ?? '',
            is_optante_simples_nacional: dto.optanteSimplesNacional,
            is_incentivo_fiscal: dto.incentivoFiscal,
            ds_razao_social_tomador: dto.tomadorRazaoSocial ?? '',
            js_servicos: js_servicosRebuild.length
              ? js_servicosRebuild
              : undefined,
          },
        });

        return {
          nfse: updatedNfseRebuild as any,
          documento: null,
          resposta: null,
        };
      }

      resposta = new Error(`Nota ${dto.numero} já existe para esta empresa.`);
      const doc = await prisma.fis_documento.findFirst({
        where: { id_nfse: exists.id },
      });
      return { nfse: exists as any, documento: doc as any, resposta };
    }

    /* monta (ou não) fornecedor – somente ENTRADA */
    let fornecedor: { id: string } | null = null;
    if (!isSaida) {
      const cnpjFor = cleanCnpj(dto.cnpjPrestador);
      const found = await prisma.fis_fornecedores.findFirst({
        where: { ds_documento: cnpjFor, id_fis_empresas: fisEmpresaCaller.id },
        select: { id: true },
      });

      if (found) {
        // atualiza inscrição municipal somente quando informada e não vazia
        if (
          dto.prestadorInscrMunicipal !== null &&
          dto.prestadorInscrMunicipal !== undefined &&
          String(dto.prestadorInscrMunicipal).trim() !== ''
        ) {
          await prisma.fis_fornecedores.update({
            where: { id: found.id },
            data: { ds_inscricao_municipal: dto.prestadorInscrMunicipal },
          });
        }
        fornecedor = { id: found.id };
      } else {
        fornecedor = await prisma.fis_fornecedores.create({
          data: {
            id_fis_empresas: fisEmpresaCaller.id,
            ds_documento: cnpjFor,
            ds_nome: dto.prestadorRazaoSocial ?? '',
            ds_inscricao_municipal: dto.prestadorInscrMunicipal ?? '',
            ds_endereco: dto.prestadorEnderecoLogradouro ?? '',
            ds_complemento: dto.prestadorEnderecoComplemento ?? '',
            ds_bairro: dto.prestadorEnderecoBairro ?? '',
            ds_cep: dto.prestadorEnderecoCep ?? '',
            ds_codigo_municipio:
              Number(dto.prestadorEnderecoCodigoMunicipio) || undefined,
            ds_codigo_uf: Number(dto.prestadorEnderecoUf) || undefined,
            ds_telefone: dto.prestadorTelefone ?? '',
            ds_email: dto.prestadorEmail ?? '',
          },
        });
      }
    }

    let js_servicos: any[] = [];
    if (dto.itemListaServico) {
      for (const item of dto.itemListaServico) {
        const dsCodigo = itemListaToDsCodigo(item.ds_item_lista_servico);
        const tipoId = await getTipoServicoId(dsCodigo);
        if (tipoId) {
          js_servicos.push({
            id: randomUUID(),
            id_tipo_servico: tipoId,
            ds_quantidade: '1',
            ds_discriminacao: item.ds_discriminacao ?? '',
            ds_valor_unitario: this.convertToCents(
              item.ds_valor_unitario ?? dto.valorServicos ?? dto.valorLiquido
            ),
            ds_valor_total: this.convertToCents(
              item.ds_valor_total ?? dto.valorServicos ?? dto.valorLiquido
            ),
            ds_base_calculo: this.convertToCents(
              item.ds_base_calculo ?? dto.baseCalculo
            ),
            ds_valor_iss: this.convertToCents(
              item.ds_valor_iss ?? dto.valorIss
            ),
            ds_valor_pis: this.convertToCents(
              item.ds_valor_pis ?? dto.valorPis ?? '0'
            ),
            ds_valor_cofins: this.convertToCents(
              item.ds_valor_cofins ?? dto.valorCofins ?? '0'
            ),
            ds_valor_inss: this.convertToCents(
              item.ds_valor_inss ?? dto.valorInss ?? '0'
            ),
            ds_valor_ir: this.convertToCents(
              item.ds_valor_ir ?? dto.valorIr ?? '0'
            ),
            ds_valor_csll: this.convertToCents(
              item.ds_valor_csll ?? dto.valorCsll ?? '0'
            ),
            ds_valor_deducoes: this.convertToCents(
              item.ds_valor_deducoes ?? dto.valorDeducoes ?? '0'
            ),
            ds_valor_descontos: this.convertToCents(
              dto.descontoIncondicionado ?? '0'
            ),
            ds_outras_retencoes: this.convertToCents(
              item.ds_outras_retencoes ?? dto.outrasRetencoes ?? '0'
            ),
            is_iss_retido: item.is_iss_retido ?? dto.isIssRetido,
            ds_item_lista_servico:
              item.ds_item_lista_servico ?? dto.itemListaServico,
            ds_municipio_incidencia:
              item.ds_municipio_incidencia ?? dto.municipioIncidencia ?? '',
            ds_exigibilidade_iss:
              item.ds_exigibilidade_iss ?? dto.exigibilidadeIss ?? '',
            id_servico: item.id_servico ?? '',
            id_item_padrao: '',
            use_item_padrao: false,
            ds_aliquota: item.ds_aliqota ?? dto.aliquota ?? '',
          });
        }
      }
    }

    /* ------------------- monta payload NFSe ---------------------- */
    const competenciaDate = dto.competencia
      ? this.parseKeepWallClockAsUTC(dto.competencia)
      : this.parseKeepWallClockAsUTC(dto.dataEmissao);

    const nfseData: Prisma.fis_nfseCreateInput = {
      /* quem importa → emitente (SAÍDA) | destinatário (ENTRADA) */
      ...(isSaida
        ? { fis_empresa_emitente: { connect: { id: fisEmpresaCaller.id } } }
        : { fis_empresas: { connect: { id: fisEmpresaCaller.id } } }),
      /* vincula o “outro lado” se achado */
      ...(isSaida
        ? idDestinatario && {
            fis_empresas: { connect: { id: idDestinatario } },
          }
        : idEmitente && {
            fis_empresa_emitente: { connect: { id: idEmitente } },
          }),

      ds_origem: NfseOrigem.XML,
      ds_numero: dto.numero,
      ds_codigo_verificacao: dto.codigoVerificacao,
      dt_emissao: this.parseKeepWallClockAsUTC(dto.dataEmissao),
      dt_competencia: competenciaDate,

      ds_base_calculo: this.convertToCents(dto.baseCalculo),
      ds_aliquota: dto.aliquota ?? '',
      ds_valor_liquido_nfse: this.convertToCents(dto.valorLiquido),
      ds_valor_servicos: this.convertToCents(
        dto.valorServicos ?? dto.valorLiquido
      ),
      ds_valor_deducoes: this.convertToCents(dto.valorDeducoes ?? '0'),
      ds_valor_pis: this.convertToCents(dto.valorPis ?? '0'),
      ds_valor_cofins: this.convertToCents(dto.valorCofins ?? '0'),
      ds_valor_inss: this.convertToCents(dto.valorInss ?? '0'),
      ds_valor_ir: this.convertToCents(dto.valorIr ?? '0'),
      ds_valor_csll: this.convertToCents(dto.valorCsll ?? '0'),
      ds_outras_retencoes: this.convertToCents(dto.outrasRetencoes ?? '0'),
      ds_valor_iss: this.convertToCents(dto.valorIss ?? '0'),
      ds_desconto_incondicionado: this.convertToCents(
        dto.descontoIncondicionado ?? '0'
      ),
      ds_desconto_condicionado: this.convertToCents(
        dto.descontoCondicionado ?? '0'
      ),
      is_iss_retido: dto.isIssRetido,
      ds_item_lista_servico:
        String(dto.itemListaServico[0].id_tipo_servico) ?? '',
      ds_codigo_cnae: dto.codigoCnae ?? '',
      ds_codigo_tributacao_municipio: dto.codigoTributacaoMunicipio ?? '',
      ds_discriminacao: dto.discriminacao ?? '',
      ds_codigo_municipio: dto.codigoMunicipio ?? '',
      ds_exigibilidade_iss: dto.exigibilidadeIss ?? '',
      ds_municipio_incidencia: dto.municipioIncidencia ?? '',
      is_optante_simples_nacional: dto.optanteSimplesNacional,
      is_incentivo_fiscal: dto.incentivoFiscal,
      js_servicos: js_servicos.length ? js_servicos : undefined,
      /* fornecedor só para entrada */
      ...(isSaida
        ? {}
        : fornecedor && { fis_fornecedor: { connect: { id: fornecedor.id } } }),
    };

    /* --------------- payload do fis_documento ------------------- */
    const documentoData: Prisma.fis_documentoCreateInput = {
      fis_empresas: { connect: { id: fisEmpresaCaller.id } },
      ds_tipo: 'NFSE',
      ds_status,
      ds_origem: { sistema: origem },
      ds_tipo_ef: isSaida ? TipoEf.SAIDA : TipoEf.ENTRADA,
    };

    return { nfse: nfseData, documento: documentoData, resposta };
  }

  /* ----------------------- entrada principal --------------------- */
  async importarXml(
    filePath: string,
    empresaId: string,
    isSaida: boolean,
    usuarioId?: string
  ) {
    const xmlContent = fs.readFileSync(filePath, 'utf-8');
    return new Promise((resolve, reject) => {
      parseString(xmlContent, async (err, result) => {
        if (err) return reject(new Error('XML mal formatado ou inválido'));
        try {
          const saved = await this.processXmlData(
            result,
            empresaId,
            'upload_xml',
            'IMPORTADO',
            isSaida
          );
          const fisEmp = await getFiscalEmpresa(empresaId);
          if (
            saved.resposta
              ?.toString()
              .includes(
                `Nota ${saved.nfse.ds_numero} já existe para esta empresa.`
              ) ||
            saved.resposta
              ?.toString()
              .includes(
                'Formato XML não suportado (abrasf/siegAPI/sieg/tecnoSpeed).'
              )
          ) {
            resolve(saved.resposta);
          } else {
            const nfse = await prisma.fis_nfse.create({
              data: {
                ...saved.nfse,
              },
            });
            const documento = await prisma.fis_documento.create({
              data: {
                id_nfse: nfse.id,
                ds_status: 'IMPORTADO',
                ds_tipo: 'NFSE',
                ds_origem: { sistema: 'upload_xml' },
                id_fis_empresas: fisEmp.id,
              },
            });
            await createDocumentoHistorico({
              justificativa: 'Importação manual via XML pelo usuário.',
              id_documento: documento.id,
              id_usuario: usuarioId ? usuarioId : null,
              status_novo: documento.ds_status,
            });
          }
          resolve(saved);
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}
