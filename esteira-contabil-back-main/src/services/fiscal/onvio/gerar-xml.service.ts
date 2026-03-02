import { prisma } from '@/services/prisma';
import { getFiscalEmpresa } from '../fiscal-empresa.service';
import { getNotaFiscalById } from '../nota-fiscal.service';
import { Builder } from 'xml2js';
import { classifyExistingProductsIds } from '../produto.service';

type SisEmpresaWithAddress = {
  id: string;
  ds_razao_social?: string | null;
  ds_fantasia?: string | null;
  ds_documento: string;
  ds_inscricao_municipal?: string | null;
  ds_uf?: string | null;
  ds_endereco?: string | null;
  ds_numero?: string | null;
  ds_complemento?: string | null;
  ds_bairro?: string | null;
  ds_codigo_municipio?: string | null;
  ds_cep?: string | null;
  ds_telefone?: string | null;
  ds_email?: string | null;
};

type Servico = {
  ds_valor_total?: string | number | null;
  ds_valor_deducoes?: string | number | null;
  ds_valor_pis?: string | number | null;
  ds_valor_cofins?: string | number | null;
  ds_valor_inss?: string | number | null;
  ds_valor_ir?: string | number | null;
  ds_valor_csll?: string | number | null;
  ds_outras_retencoes?: string | number | null;
  ds_valor_iss?: string | number | null;
  ds_aliquota?: string | number | null;
  is_iss_retido?: boolean | null;
  ds_item_lista_servico?: string | null;
  ds_municipio_incidencia?: string | null;
  ds_exigibilidade_iss?: string | number | null;
  ds_desconto_incondicionado?: string | number | null;
  ds_desconto_condicionado?: string | number | null;
  ds_codigo_cnae?: string | null;
  ds_codigo_tributacao_municipio?: string | null;
  id_tipo_servico?: string | null;
};

const buscaUF = async (ibge: string): Promise<string> => {
  try {
    const ibgeNumber = Number(ibge);
    if (isNaN(ibgeNumber)) {
      console.error(`Código IBGE inválido para busca: ${ibge}`);
      return '';
    }
    const city = await prisma.sis_igbe_city.findUnique({
      where: { id: ibgeNumber },
      include: { js_uf: true },
    });
    return city?.js_uf?.ds_uf ?? '';
  } catch (error) {
    console.error(`Erro ao buscar UF para o IBGE ${ibge}:`, error);
    return '';
  }
};

function formatarValor(
  valor?: string | number | null,
  isAliquota: boolean = false
): string {
  if (valor === null || valor === undefined) return '0.00';
  // Normalização e heurística consistente:
  // - Se for number: é tratado como centavos (ex: 226650 -> 2266.50), salvo quando for aliquota.
  // - Se for string contendo '.' ou ',' assume-se que já representa reais/decimal (ex: "2266.50" ou "2.266,50").
  // - Se for string apenas dígitos (ex: "226650") assume-se centavos e divide-se por 100.
  if (typeof valor === 'string') {
    const sRaw = valor.trim();
    if (sRaw === '') return '0.00';

    // se contém separador decimal, parse como reais (aceita ',' ou '.')
    if (sRaw.includes('.') || sRaw.includes(',')) {
      const normalized = sRaw.replace(/,/g, '.');
      const n = Number(normalized);
      if (isNaN(n)) return '0.00';
      return (isAliquota ? n : n).toFixed(2);
    }

    // caso seja uma string apenas com dígitos, tratar como centavos
    const nInt = Number(sRaw);
    if (isNaN(nInt)) return '0.00';
    const numero = isAliquota ? nInt : nInt / 100;
    return numero.toFixed(2);
  }

  const num = Number(valor);
  if (isNaN(num)) return '0.00';
  const numero = isAliquota ? num : num / 100;
  return numero.toFixed(2);
}

function escapeXml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  return stringValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatarDataISO(data: string | Date | null | undefined): string {
  if (!data) return '';
  try {
    const dateObj = typeof data === 'string' ? new Date(data) : data;
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().substring(0, 19);
  } catch (error) {
    console.error('Erro ao formatar data ISO:', error);
    return '';
  }
}

function formatarDataYMD(data: string | Date | null | undefined): string {
  if (!data) return '';
  try {
    const dateObj = typeof data === 'string' ? new Date(data) : data;
    if (isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Erro ao formatar data YYYY-MM-DD:', error);
    return '';
  }
}

function formatarDataCompetenciaOriginal(
  data: string | Date | null | undefined
): string {
  if (!data) return '';
  try {
    const dateObj = typeof data === 'string' ? new Date(data) : data;
    if (isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  } catch (error) {
    return '';
  }
}

function generateCpfCnpjXml(documento?: string | null): string {
  const cleanedDoc = documento?.replace(/\D/g, '') || '';
  if (cleanedDoc.length === 14) {
    return `<CpfCnpj><Cnpj>${cleanedDoc}</Cnpj></CpfCnpj>`;
  } else if (cleanedDoc.length === 11) {
    return `<CpfCnpj><Cpf>${cleanedDoc}</Cpf></CpfCnpj>`;
  }
  return '';
}

function calcularValoresTotais(servicos: Servico[]) {
  return servicos.reduce(
    (acc, servico) => {
      const valorTotal = Number(servico.ds_valor_total || 0);
      const valorDeducoes = Number(servico.ds_valor_deducoes || 0);
      const valorIss = Number(servico.ds_valor_iss || 0);
      const aliquota = Number(servico.ds_aliquota || 0);

      acc.baseCalculo += valorTotal;
      acc.valorDeducoes += valorDeducoes;
      acc.valorIss += valorIss;
      acc.aliquota = aliquota > acc.aliquota ? aliquota : acc.aliquota;
      acc.valorLiquido += valorTotal - valorDeducoes;

      return acc;
    },
    {
      baseCalculo: 0,
      valorDeducoes: 0,
      valorIss: 0,
      aliquota: 0,
      valorLiquido: 0,
    }
  );
}

const buscaFornecedor = async (cnpj: string): Promise<any> => {
  try {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    return await prisma.fis_fornecedores.findFirst({
      where: { ds_documento: cnpjLimpo },
    });
  } catch (error) {
    console.error(`Erro ao buscar fornecedor com CNPJ ${cnpj}:`, error);
    return null;
  }
};

const buscaCodigoServico = async (idTipoServico: string): Promise<string> => {
  try {
    const tipoServico = await prisma.sis_tipos_servicos.findUnique({
      where: { id: idTipoServico },
      select: { ds_codigo: true },
    });
    const codigo = tipoServico?.ds_codigo?.replace('.', '') || '';
    return codigo.padStart(4, '0');
  } catch (error) {
    console.error(
      `Erro ao buscar código do serviço com ID ${idTipoServico}:`,
      error
    );
    return '';
  }
};

export const xmlNotaFiscalServico = async (
  empresaId: string,
  notaFiscalID: string
): Promise<string | null> => {
  const notaFiscal = await getNotaFiscalById(empresaId, notaFiscalID);
  if (!notaFiscal) {
    console.error(`Nota fiscal não encontrada com ID: ${notaFiscalID}`);
    return null;
  }

  const fiscalEmpresa = await getFiscalEmpresa(empresaId);
  if (!fiscalEmpresa || !fiscalEmpresa.id_sis_empresas) {
    console.error(
      `Detalhes fiscais não encontrados ou sem ID de sistema para empresaId: ${empresaId}`
    );
    return null;
  }

  const tomadorEmpresa = (await prisma.sis_empresas.findUnique({
    where: { id: fiscalEmpresa.id_sis_empresas },
  })) as SisEmpresaWithAddress | null;

  if (!tomadorEmpresa) {
    console.error(
      `Empresa (Tomador) não encontrada com id_sis_empresas: ${fiscalEmpresa.id_sis_empresas}`
    );
  }

  // Se a NFS-e possui cancelamento e já temos o XML completo com o bloco <NfseCancelamento>
  // (coletado e salvo via TecnoSpeed), retornar esse XML diretamente para manter o padrão
  // e detalhes do provedor (Betha/Abrasf) conforme a origem.
  if (
    (notaFiscal as any)?.dt_cancelamento &&
    typeof (notaFiscal as any)?.ds_xml_cancelamento === 'string' &&
    ((notaFiscal as any)?.ds_xml_cancelamento as string).includes(
      'NfseCancelamento'
    )
  ) {
    return (notaFiscal as any).ds_xml_cancelamento as string;
  }

  const {
    js_servicos,
    ds_numero,
    ds_codigo_verificacao,
    dt_emissao,
    ds_base_calculo,
    ds_aliquota,
    ds_valor_iss,
    ds_valor_liquido_nfse,
    ds_valor_credito,
    ds_orgao_gerador_codigo_municipio,
    ds_codigo_municipio,
    ds_orgao_gerador_uf,
    dt_competencia,
    is_optante_simples_nacional,
    is_incentivo_fiscal,
    ds_discriminacao,
    ds_rps_numero,
    ds_rps_serie,
    ds_rps_tipo,
    dt_rps_emissao,
    ds_rps_status,
    ds_item_lista_servico,
    ds_exigibilidade_iss,
    ds_municipio_incidencia,
    is_iss_retido,
    ds_valor_deducoes,
    ds_valor_pis,
    ds_valor_cofins,
    ds_valor_inss,
    ds_valor_ir,
    ds_valor_csll,
    ds_outras_retencoes,
    ds_desconto_incondicionado,
    ds_desconto_condicionado,
    ds_codigo_cnae,
    ds_codigo_tributacao_municipio,
    fis_fornecedor,
  } = notaFiscal;

  let ufFinalOrgaoGerador = ds_orgao_gerador_uf;
  if (!ufFinalOrgaoGerador) {
    const codigoIbgeParaBusca =
      ds_orgao_gerador_codigo_municipio || ds_codigo_municipio;
    if (codigoIbgeParaBusca) {
      ufFinalOrgaoGerador = await buscaUF(codigoIbgeParaBusca);
    }
  }

  const servicos = (
    Array.isArray(js_servicos) && js_servicos.length > 0
      ? js_servicos
      : [
          {
            ds_valor_total: ds_base_calculo,
            ds_valor_deducoes: ds_valor_deducoes,
            ds_valor_pis: ds_valor_pis,
            ds_valor_cofins: ds_valor_cofins,
            ds_valor_inss: ds_valor_inss,
            ds_valor_ir: ds_valor_ir,
            ds_valor_csll: ds_valor_csll,
            ds_outras_retencoes: ds_outras_retencoes,
            ds_valor_iss: ds_valor_iss,
            ds_aliquota: ds_aliquota,
            is_iss_retido: is_iss_retido,
            ds_item_lista_servico: ds_item_lista_servico,
            ds_municipio_incidencia: ds_municipio_incidencia,
            ds_exigibilidade_iss: ds_exigibilidade_iss,
            ds_desconto_incondicionado: ds_desconto_incondicionado,
            ds_desconto_condicionado: ds_desconto_condicionado,
            ds_codigo_cnae: ds_codigo_cnae,
            ds_codigo_tributacao_municipio: ds_codigo_tributacao_municipio,
          },
        ]
  ) as Servico[];

  // Buscar códigos de serviço para todos os serviços
  const servicosComCodigo = await Promise.all(
    servicos.map(async (servico) => {
      const codigoServico = servico.id_tipo_servico
        ? await buscaCodigoServico(servico.id_tipo_servico)
        : '';
      return { ...servico, ds_codigo_servico: codigoServico };
    })
  );

  const valoresCalculados = calcularValoresTotais(servicosComCodigo);

  const baseCalculoFinal = ds_base_calculo || valoresCalculados.baseCalculo;
  const aliquotaFinal = ds_aliquota || valoresCalculados.aliquota;
  const valorIssFinal = ds_valor_iss || valoresCalculados.valorIss;
  const valorLiquidoFinal =
    ds_valor_liquido_nfse || valoresCalculados.valorLiquido;

  const servicosXml = servicosComCodigo
    .map(
      (servico) => `
            <Servico>
              <Valores>
                <ValorServicos>${formatarValor(servico.ds_valor_total)}</ValorServicos>
                <ValorDeducoes>${formatarValor(servico.ds_valor_deducoes)}</ValorDeducoes>
                <ValorPis>${formatarValor(servico.ds_valor_pis)}</ValorPis>
                <ValorCofins>${formatarValor(servico.ds_valor_cofins)}</ValorCofins>
                <ValorInss>${formatarValor(servico.ds_valor_inss)}</ValorInss>
                <ValorIr>${formatarValor(servico.ds_valor_ir)}</ValorIr>
                <ValorCsll>${formatarValor(servico.ds_valor_csll)}</ValorCsll>
                <OutrasRetencoes>${formatarValor(servico.ds_outras_retencoes)}</OutrasRetencoes>
                <ValorIss>${formatarValor(servico.ds_valor_iss)}</ValorIss>
                <Aliquota>${formatarValor(servico.ds_aliquota, true)}</Aliquota>
              </Valores>
              <IssRetido>${(servico.is_iss_retido ?? is_iss_retido) ? 1 : 2}</IssRetido>
              <ItemListaServico>${escapeXml((servico.ds_codigo_servico || servico.ds_item_lista_servico) ?? ds_item_lista_servico)?.replace(/(\d{2})(\d{2})/, '$1.$2')}</ItemListaServico>
              <Discriminacao>${escapeXml(ds_discriminacao)}</Discriminacao>
              <CodigoMunicipio>${escapeXml(ds_codigo_municipio)}</CodigoMunicipio>
              <CodigoPais />
              <ExigibilidadeISS>${escapeXml(String(servico.ds_exigibilidade_iss ?? ds_exigibilidade_iss ?? '1'))}</ExigibilidadeISS>
              ${(servico.ds_municipio_incidencia ?? ds_municipio_incidencia) ? `<MunicipioIncidencia>${escapeXml(servico.ds_municipio_incidencia ?? ds_municipio_incidencia)}</MunicipioIncidencia>` : ''}
            </Servico>`
    )
    .join('');

  const prestadorXml = `
        <PrestadorServico>
          <IdentificacaoPrestador>
            ${generateCpfCnpjXml(fis_fornecedor?.ds_documento)}
            ${fis_fornecedor?.ds_inscricao_municipal ? `<InscricaoMunicipal>${escapeXml(fis_fornecedor.ds_inscricao_municipal)}</InscricaoMunicipal>` : ''}
          </IdentificacaoPrestador>
          ${fis_fornecedor?.ds_nome ? `<RazaoSocial>${escapeXml(fis_fornecedor.ds_nome)}</RazaoSocial>` : ''}
          ${fis_fornecedor?.ds_nome ? `<NomeFantasia>${escapeXml(fis_fornecedor.ds_nome)}</NomeFantasia>` : ''}
          ${
            fis_fornecedor?.ds_endereco
              ? `
          <Endereco>
            <Endereco>${escapeXml(fis_fornecedor.ds_endereco)}</Endereco>
            ${fis_fornecedor?.ds_complemento ? `<Complemento>${escapeXml(fis_fornecedor.ds_complemento)}</Complemento>` : ''}
            ${fis_fornecedor?.ds_bairro ? `<Bairro>${escapeXml(fis_fornecedor.ds_bairro)}</Bairro>` : ''}
            ${fis_fornecedor?.ds_ibge ? `<CodigoMunicipio>${escapeXml(fis_fornecedor.ds_ibge)}</CodigoMunicipio>` : ''}
            <CodigoPais>1058</CodigoPais>
            ${fis_fornecedor?.ds_cep ? `<Cep>${escapeXml(fis_fornecedor.ds_cep?.replace(/\D/g, ''))}</Cep>` : ''}
          </Endereco>`
              : ''
          }
          ${
            fis_fornecedor?.ds_telefone || fis_fornecedor?.ds_email
              ? `
          <Contato>
            ${fis_fornecedor?.ds_telefone ? `<Telefone>${escapeXml(fis_fornecedor.ds_telefone?.replace(/\D/g, ''))}</Telefone>` : ''}
            ${fis_fornecedor?.ds_email ? `<Email>${escapeXml(fis_fornecedor.ds_email)}</Email>` : ''}
          </Contato>`
              : '<Contato />'
          }
        </PrestadorServico>`;

  const tomadorXml = tomadorEmpresa
    ? `
          <Tomador>
            <IdentificacaoTomador>
              ${generateCpfCnpjXml(tomadorEmpresa.ds_documento)}
              ${tomadorEmpresa.ds_inscricao_municipal ? `<InscricaoMunicipal>${escapeXml(tomadorEmpresa.ds_inscricao_municipal)}</InscricaoMunicipal>` : ''}
            </IdentificacaoTomador>
            ${tomadorEmpresa.ds_razao_social ? `<RazaoSocial>${escapeXml(tomadorEmpresa.ds_razao_social)}</RazaoSocial>` : ''}
            ${
              tomadorEmpresa.ds_endereco
                ? `
            <Endereco>
              <Endereco>${escapeXml(tomadorEmpresa.ds_endereco)}</Endereco>
              ${tomadorEmpresa.ds_numero ? `<Numero>${escapeXml(tomadorEmpresa.ds_numero)}</Numero>` : ''}
              ${tomadorEmpresa.ds_complemento ? `<Complemento>${escapeXml(tomadorEmpresa.ds_complemento)}</Complemento>` : ''}
              ${tomadorEmpresa.ds_bairro ? `<Bairro>${escapeXml(tomadorEmpresa.ds_bairro)}</Bairro>` : ''}
              ${tomadorEmpresa.ds_codigo_municipio ? `<CodigoMunicipio>${escapeXml(tomadorEmpresa.ds_codigo_municipio)}</CodigoMunicipio>` : ''}
              <CodigoPais>1058</CodigoPais>
              ${tomadorEmpresa.ds_cep ? `<Cep>${escapeXml(tomadorEmpresa.ds_cep?.replace(/\D/g, ''))}</Cep>` : ''}
            </Endereco>`
                : ''
            }
            ${
              tomadorEmpresa.ds_telefone || tomadorEmpresa.ds_email
                ? `
            <Contato>
              ${tomadorEmpresa.ds_telefone ? `<Telefone>${escapeXml(tomadorEmpresa.ds_telefone?.replace(/\D/g, ''))}</Telefone>` : ''}
              ${tomadorEmpresa.ds_email ? `<Email>${escapeXml(tomadorEmpresa.ds_email)}</Email>` : ''}
            </Contato>`
                : '<Contato />'
            }
          </Tomador>`
    : '';

  const rpsXml = ds_rps_numero
    ? `
          <Rps>
            <IdentificacaoRps>
              <Numero>${escapeXml(ds_rps_numero)}</Numero>
              ${ds_rps_serie ? `<Serie>${escapeXml(ds_rps_serie)}</Serie>` : ''}
              ${ds_rps_tipo ? `<Tipo>${escapeXml(String(ds_rps_tipo))}</Tipo>` : ''}
            </IdentificacaoRps>
            <DataEmissao>${formatarDataYMD(dt_rps_emissao)}</DataEmissao>
            ${ds_rps_status ? `<Status>${escapeXml(String(ds_rps_status))}</Status>` : ''}
          </Rps>`
    : '';

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<CompNfse xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns:xsd="http://www.w3.org/2001/XMLSchema"
xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse versao="1.00">
    <InfNfse>
      <Numero>${escapeXml(ds_numero)}</Numero>
      <CodigoVerificacao>${escapeXml(ds_codigo_verificacao)}</CodigoVerificacao>
      <DataEmissao>${formatarDataISO(dt_emissao)}</DataEmissao>
      <ValoresNfse>
        <BaseCalculo>${formatarValor(baseCalculoFinal)}</BaseCalculo>
        <Aliquota>${formatarValor(aliquotaFinal, true)}</Aliquota>
        <ValorIss>${formatarValor(valorIssFinal)}</ValorIss>
        <ValorLiquidoNfse>${formatarValor(valorLiquidoFinal)}</ValorLiquidoNfse>
      </ValoresNfse>
      ${prestadorXml}
      <OrgaoGerador>
        <CodigoMunicipio>${escapeXml(ds_orgao_gerador_codigo_municipio || ds_codigo_municipio)}</CodigoMunicipio>
        <Uf>${escapeXml(ufFinalOrgaoGerador)}</Uf>
      </OrgaoGerador>
      <DeclaracaoPrestacaoServico>
        <InfDeclaracaoPrestacaoServico>
          <Competencia>${formatarDataYMD(dt_competencia)}</Competencia>
          ${servicosXml}
          <Prestador>
             ${generateCpfCnpjXml(fis_fornecedor?.ds_documento)}
             ${fis_fornecedor?.ds_inscricao_municipal ? `<InscricaoMunicipal>${escapeXml(fis_fornecedor.ds_inscricao_municipal)}</InscricaoMunicipal>` : ''}
          </Prestador>
          ${tomadorXml}
          <OptanteSimplesNacional>${is_optante_simples_nacional ? 1 : 2}</OptanteSimplesNacional>
          <IncentivoFiscal>${is_incentivo_fiscal ? 1 : 2}</IncentivoFiscal>
        </InfDeclaracaoPrestacaoServico>
      </DeclaracaoPrestacaoServico>
    </InfNfse>
  </Nfse>
</CompNfse>`;
  return xml;
};

/*
 * Converte um valor em string para centavos, retornando o valor numérico e a quantidade de casas decimais.
 * Exemplo: "2266.50" -> { valor: 226650, decimalPlaces: 2 }
 * @param valor - O valor em string a ser convertido.
 * @returns Um objeto contendo o valor em centavos e a quantidade de casas decimais.
 */
export async function alwaysToCents(valor: string) {
  try {
    const indexFloat = valor.indexOf('.');
    if (indexFloat >= 0) {
      const tamanho = valor.length - 1;
      const decimalPlaces = tamanho - indexFloat;
      const valorNumber = Number(valor.replace('.', ''));
      return { valor: valorNumber, decimalPlaces: decimalPlaces };
    } else {
      return { valor: Number(valor), decimalPlaces: 0 };
    }
  } catch (error) {
    console.error('Erro em alwaysToCents:', error);
  }
}

export const xmlNFe = async (notaFiscalID: string): Promise<string | null> => {
  const notaFiscal = await prisma.fis_nfe.findUnique({
    where: { id: notaFiscalID },
    include: {
      fis_nfe_itens: {
        include: { fis_nfe_itens_alter_entrada: true },
      },
    },
  });
  if (!notaFiscal) return null;

  let rawDfe: any = null;
  if (notaFiscal.id) {
    const dfe = await prisma.fis_documento_dfe.findFirst({
      where: { id_nfe: notaFiscal.id },
      select: { ds_raw: true },
    });
    if (dfe?.ds_raw) {
      try {
        rawDfe =
          typeof dfe.ds_raw === 'string' ? JSON.parse(dfe.ds_raw) : dfe.ds_raw;
      } catch (e) {
        console.error('Falha ao parsear ds_raw do DFE como JSON', e);
      }
    }
  }

  if (!rawDfe) {
    console.warn(
      `Documento DFE bruto não encontrado para nfe: ${notaFiscalID}; não é possível gerar XML ajustado.`
    );
    return null;
  }

  const detPath = rawDfe?.nfeProc?.NFe?.[0]?.infNFe?.[0]?.det;
  if (!Array.isArray(detPath)) {
    console.warn(
      'Estrutura de itens (det) não localizada no JSON bruto da NFe.'
    );
  }

  // Normalizar possíveis valores de <orig> nos blocos de ICMS/ICMSSN.
  // Regras: quando orig == '1' => '2'; quando orig == '6' => '7'.
  // As tags podem aparecer em vários formatos de ICMS (ICMS00, ICMS20, ICMSSN500, etc.).
  if (Array.isArray(detPath)) {
    for (const detEntry of detPath) {
      const impostoArray = detEntry?.imposto;
      if (!Array.isArray(impostoArray)) continue;
      for (const impostoObj of impostoArray) {
        const icmsArray = impostoObj?.ICMS;
        if (!Array.isArray(icmsArray)) continue;
        for (const icmsVariant of icmsArray) {
          for (const key of Object.keys(icmsVariant || {})) {
            const entries = icmsVariant[key];
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
              // orig can be array or string
              const origRaw = Array.isArray(entry?.orig)
                ? entry?.orig?.[0]
                : entry?.orig;
              if (origRaw === undefined || origRaw === null) continue;
              const origStr = String(origRaw);
              if (origStr === '1') {
                entry.orig = ['2'];
              } else if (origStr === '6') {
                entry.orig = ['7'];
              }
            }
          }
        }
      }
    }
  }

  const itensBanco = notaFiscal.fis_nfe_itens;
  const alteracoesAplicadas: Array<{
    idItem: string;
    changes: Record<string, any>;
  }> = [];
  const sisEmpresa = await prisma.sis_empresas.findFirst({
    where: { fis_empresas: { id: notaFiscal.id_fis_empresa_destinatario } },
    select: { id_escritorio: true, id_externo: true, id: true },
  });
  const fisEmpresa = await getFiscalEmpresa(sisEmpresa.id);
  const produtosNovos = await prisma.fis_produtos.count({
    where: {
      id_fis_empresas: fisEmpresa.id,
      ds_status: 'NOVO',
    },
  });
  const escritorio = await prisma.sis_empresas.findUnique({
    where: { id: sisEmpresa?.id_escritorio },
    select: { ds_url: true },
  });
  const url = `${escritorio.ds_url}/dados/produtos/codigos-disponiveis`;
  let listaIdProdutos: any = [];
  let isAptoProds = false;
  let multiplicadorProdutos = 2.0;
  const MAX_TENTATIVAS = 3;
  let tentativas = 0;
  do {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantidade:
            (itensBanco.length + produtosNovos + 20) * multiplicadorProdutos,
          empresaId: sisEmpresa?.id_externo,
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        console.warn(
          `Falha ao buscar códigos disponíveis (${resp.status}): ${errText}`
        );
      } else {
        listaIdProdutos = await resp.json();
      }
    } catch (err) {
      console.warn('Erro ao chamar serviço de códigos disponíveis:', err);
      listaIdProdutos = [];
    }

    // garantir que passamos uma lista de strings para a função de classificação
    const listaParaClassify = Array.isArray(listaIdProdutos)
      ? listaIdProdutos.map((v: any) => String(v))
      : [];
    // classifyExistingProductsIds pode retornar undefined; normalizar para array
    listaIdProdutos =
      (await classifyExistingProductsIds(sisEmpresa?.id, listaParaClassify)) ??
      [];

    // Validar se conseguimos todos os códigos necessários
    const codigosNecessarios = itensBanco.length + produtosNovos;
    if (listaIdProdutos.length < codigosNecessarios) {
      const mensagem = `[PRODUTOS_CÓDIGO_INSUFICIENTE] Códigos insuficientes: solicitado ${codigosNecessarios}, recebido ${listaIdProdutos.length}. Envio cancelado.`;
      console.error(mensagem);
      multiplicadorProdutos += 0.5;
    } else {
      isAptoProds = true;
    }
  } while (!isAptoProds || tentativas++ < MAX_TENTATIVAS);
  // Buscar modo de procura de produto (C = id_externo, I = cd_identificador)
  let procuraProdMode: 'C' | 'I' = 'C';
  try {
    const metodoUrl = `${escritorio.ds_url.replace(/\/$/, '')}/dados/metodo-impt/empresa/${sisEmpresa?.id_externo}`;
    const respMetodo = await fetch(metodoUrl, { method: 'GET' });
    if (respMetodo.ok) {
      const jsonMetodo = await respMetodo.json();
      if (Array.isArray(jsonMetodo) && jsonMetodo.length > 0) {
        const v = String(jsonMetodo[0]?.PROCURA_PROD || '').toUpperCase();
        if (v === 'I' || v === 'C') procuraProdMode = v as 'C' | 'I';
      }
    } else {
      console.warn(
        `Falha ao obter metodo-impt (status ${respMetodo.status}), usando padrão 'C'`
      );
    }
  } catch (err) {
    console.warn(
      'Erro ao buscar metodo-impt, usando padrão PROCURA_PROD=C',
      err?.message || err
    );
  }
  if (Array.isArray(detPath)) {
    for (const detEntry of detPath) {
      const nItem = detEntry?.['$']?.nItem || detEntry?.nItem || null;
      if (!nItem) continue;

      const itemBanco = itensBanco.find(
        (it) => String(it.ds_ordem || '') === String(nItem)
      );
      if (!itemBanco) continue;

      const alterArray = (itemBanco as any).fis_nfe_itens_alter_entrada as
        | any[]
        | undefined;
      const alter =
        Array.isArray(alterArray) && alterArray.length > 0
          ? alterArray[0]
          : null;
      if (!alter) continue; // sem alteração = não modificamos o JSON

      const changes: Record<string, any> = {};

      const getFirstStringValue = (v: any) => {
        if (v === undefined || v === null) return undefined;
        if (Array.isArray(v)) return String(v[0]);
        return String(v);
      };
      let originalProdQComVal: string | undefined;
      let originalProdQTribVal: string | undefined;
      let originalProdVProdVal: string | undefined;
      let originalProdVUnComVal: string | undefined;
      let originalProdVUnTribVal: string | undefined;

      const prod = detEntry?.prod?.[0] || detEntry?.prod;
      if (prod) {
        originalProdQComVal = getFirstStringValue(prod.qCom);
        originalProdQTribVal = getFirstStringValue(prod.qTrib);
        originalProdVProdVal = getFirstStringValue(prod.vProd);
        originalProdVUnComVal = getFirstStringValue(prod.vUnCom);
        originalProdVUnTribVal = getFirstStringValue(prod.vUnTrib);
        if (alter.ds_codigo_cfop_alterado) {
          // remover qualquer caractere não numérico (ex: '5-102' -> '5102') e pad para 4 dígitos
          const rawCfopDigits = String(alter.ds_codigo_cfop_alterado)
            .replace(/[^0-9]/g, '')
            .slice(0, 4);
          const cfopFinal = rawCfopDigits.padStart(4, '0');
          prod.CFOP = [cfopFinal];
          changes.CFOP = cfopFinal;
        }
        if (alter.cd_produto_alterado) {
          const cProd = String(alter.cd_produto_alterado);
          prod.cProd = [cProd];
          changes.cProd = cProd;
        }

        // Se a alteração referencia um produto interno (id_produto_alterado), carregar dados do produto
        if (alter.id_produto_alterado) {
          try {
            const produtoInterno = await prisma.fis_produtos.findUnique({
              where: { id: String(alter.id_produto_alterado) },
              select: {
                ds_nome: true,
                ds_unidade: true,
                ds_codigo_barras: true,
                cd_ncm: true,
                cd_cest: true,
                ds_status: true,
                cd_identificador: true,
                id_externo: true,
              },
            });
            let produtoParaUsar = produtoInterno;
            if (
              produtoInterno.ds_status === 'NOVO' &&
              (produtoInterno.id_externo === null ||
                produtoInterno.id_externo === undefined)
            ) {
              // Lógica para produto novo: consumir próximo código disponível da lista
              const codigoDisponivel =
                Array.isArray(listaIdProdutos) && listaIdProdutos.length > 0
                  ? listaIdProdutos.shift()
                  : null;

              if (!codigoDisponivel) {
                const mensagem = `[PRODUTOS_CÓDIGO_INDISPONÍVEL] Código indisponível para produto NOVO (ID: ${alter.id_produto_alterado}). Envio cancelado.`;
                console.error(mensagem);
                const err = new Error(mensagem);
                (err as any).statusCode = 422;
                (err as any).type = 'PRODUCT_CODE_ERROR';
                throw err;
              }

              const codigoStr = String(codigoDisponivel);
              const prodUpdt = await prisma.fis_produtos.update({
                where: { id: String(alter.id_produto_alterado) },
                data: {
                  id_externo: codigoStr,
                  cd_identificador: codigoStr,
                },
              });
              await prisma.fis_nfe_itens_alter_entrada.updateMany({
                where: {
                  id_produto_alterado: prodUpdt.id,
                  OR: [
                    { cd_produto_alterado: null },
                    { cd_produto_alterado: { not: codigoStr } },
                  ],
                },
                data: { cd_produto_alterado: codigoStr },
              });
              produtoParaUsar = prodUpdt;
            }
            if (produtoParaUsar) {
              if (produtoParaUsar.ds_nome) {
                prod.xProd = [produtoParaUsar.ds_nome];
                changes.xProd = produtoParaUsar.ds_nome;
              }
              if (produtoParaUsar.ds_unidade) {
                prod.uCom = [produtoParaUsar.ds_unidade];
                prod.uTrib = [produtoParaUsar.ds_unidade];
                changes.uCom = produtoParaUsar.ds_unidade;
              }
              if (produtoParaUsar.ds_codigo_barras) {
                prod.cEAN = [produtoParaUsar.ds_codigo_barras];
                prod.cEANTrib = [produtoParaUsar.ds_codigo_barras];
                changes.cEAN = produtoParaUsar.ds_codigo_barras;
              }
              if (produtoParaUsar.cd_ncm) {
                prod.NCM = [produtoParaUsar.cd_ncm];
                changes.NCM = produtoParaUsar.cd_ncm;
              }
              if (produtoParaUsar.cd_cest) {
                prod.CEST = [produtoParaUsar.cd_cest];
                changes.CEST = produtoParaUsar.cd_cest;
              }
              // definir código do produto no XML de acordo com a modalidade configurada
              // PROCURA_PROD: 'C' -> usar id_externo; 'I' -> usar cd_identificador
              try {
                const codigoExterno = produtoParaUsar.id_externo
                  ? String(produtoParaUsar.id_externo)
                  : undefined;
                const codigoIdent = produtoParaUsar.cd_identificador
                  ? String(produtoParaUsar.cd_identificador)
                  : undefined;
                let escolhido: string | undefined;
                if (procuraProdMode === 'I') {
                  escolhido = codigoIdent || codigoExterno;
                } else {
                  escolhido = codigoExterno || codigoIdent;
                }
                if (escolhido) {
                  prod.cProd = [escolhido];
                  changes.cProd = escolhido;
                }
              } catch (e) {
                // não bloquear o processo por erro aqui
                console.warn(
                  'Falha ao definir cProd por modo PROCURA_PROD',
                  e?.message || e
                );
              }
              if (
                prod.uCom &&
                (!prod.uTrib || prod.uTrib[0] !== prod.uCom[0])
              ) {
                prod.uTrib = [prod.uCom[0]];
                changes.uTrib = prod.uCom[0];
              }
            }
          } catch (err) {
            console.error('Erro lendo produto alterado:', err);
          }
        }
        // Se não há produto alterado, preservar nome original ou usar do banco
        // Apenas atualizar se ainda não foi definido
        if (!('xProd' in changes) && itemBanco.ds_produto) {
          const nomeProduto = itemBanco.ds_produto;
          prod.xProd = [nomeProduto];
          changes.xProd = nomeProduto;
        }
        let novoQCom: string | null = null;
        let novoUnCom: string | null = null;

        // Extrair valores reais de prod, tratando arrays
        const getValueFromArray = (v: any): string => {
          if (Array.isArray(v)) return String(v[0] || '0');
          return String(v || '0');
        };

        const qComRaw = getValueFromArray(prod.qCom);
        const vUnComRaw = getValueFromArray(prod.vUnCom);

        if (
          alter.fl_conversao &&
          alter.ds_conversao &&
          Number(alter.ds_conversao) !== 0
        ) {
          try {
            // Converter strings para números decimais (não centavos)
            const qComDecimal = Number(qComRaw.replace(',', '.'));
            const vUnComDecimal = Number(vUnComRaw.replace(',', '.'));

            if (
              !isNaN(qComDecimal) &&
              !isNaN(vUnComDecimal) &&
              vUnComDecimal > 0
            ) {
              const conversaoFator = Number(alter.ds_conversao);

              // Nova quantidade = quantidade original / fator de conversão
              const novaQComDecimal = qComDecimal / conversaoFator;
              // Novo preço unitário = preço original * fator de conversão
              const novaVUnComDecimal = vUnComDecimal * conversaoFator;

              novoQCom = novaQComDecimal.toFixed(4);
              novoUnCom = novaVUnComDecimal.toFixed(6);

              prod.qCom = [novoQCom];
              prod.qTrib = [novoQCom];
              prod.vUnCom = [novoUnCom];
              prod.vUnTrib = [novoUnCom];
              changes.qTrib = novoQCom;
              changes.qCom = novoQCom;
              changes.vUnCom = novoUnCom;
              changes.vUnTrib = novoUnCom;
            }
          } catch (e) {
            console.warn('Erro na conversão de quantidade/preço:', e);
          }
        } else {
          // Sem conversão: usar valores originais ou do banco
          if (!originalProdQComVal && itemBanco.vl_quantidade) {
            // Converter centavos para quantidade decimal
            const qComDecimal = Number(itemBanco.vl_quantidade) / 10000; // 220000 -> 22.0000
            const qComFormatted = qComDecimal.toFixed(4);

            prod.qCom = [qComFormatted];
            changes.qCom = qComFormatted;

            if (!originalProdQTribVal) {
              prod.qTrib = [qComFormatted];
              changes.qTrib = qComFormatted;
            }
          } else if (originalProdQComVal) {
            // Manter valores originais
            changes.qCom = originalProdQComVal;
            prod.qCom = [originalProdQComVal];

            if (originalProdQTribVal) {
              changes.qTrib = originalProdQTribVal;
              prod.qTrib = [originalProdQTribVal];
            }
          }

          // Preservar vUnCom/vUnTrib com valores originais se existirem
          if (originalProdVUnComVal) {
            prod.vUnCom = [originalProdVUnComVal];
            changes.vUnCom = originalProdVUnComVal;
          }
          if (originalProdVUnTribVal) {
            prod.vUnTrib = [originalProdVUnTribVal];
            changes.vUnTrib = originalProdVUnTribVal;
          }
        }
      }

      // 4.2 CST: depende do grupo ICMS (ex.: ICMS00, ICMS10, etc.)
      // procurar em imposto[0].ICMS[0] subchaves com objeto e setar CST dentro do primeiro grupo encontrado.
      const imposto = detEntry?.imposto?.[0] || detEntry?.imposto;
      const icmsContainer = imposto?.ICMS?.[0] || imposto?.ICMS;
      if (icmsContainer && alter.ds_codigo_cst_gerado) {
        const novoCst = String(alter.ds_codigo_cst_gerado).replace(
          /[^0-9]/g,
          ''
        );
        const isSimplesDestino = novoCst.length === 3; // 101..900 => Simples (CSOSN)
        const isNormalDestino = novoCst.length === 2; // 00..90 => Regime Normal (CST)

        const icmsKeys = Object.keys(icmsContainer);
        for (const k of icmsKeys) {
          const originalValue = icmsContainer[k];
          const grp = originalValue?.[0] || originalValue;
          if (!(grp && (grp.CST || grp.CSOSN))) continue;

          const chaveAtual = k; // ex: ICMSSN102, ICMS60, ICMS00
          const ehSimplesAtual = /^ICMSSN\d+$/i.test(chaveAtual);
          const ehNormalAtual =
            /^ICMS\d+$/i.test(chaveAtual) && !ehSimplesAtual;

          let novaChaveGrupo = chaveAtual;
          if (isSimplesDestino && !ehSimplesAtual) {
            novaChaveGrupo = `ICMSSN${novoCst}`;
          } else if (isNormalDestino && !ehNormalAtual) {
            novaChaveGrupo = `ICMS${novoCst}`;
          } else {
            novaChaveGrupo = chaveAtual.replace(/\d+$/, novoCst);
          }

          if (isSimplesDestino) {
            if (grp.CST) delete grp.CST;
            grp.CSOSN = [novoCst];
            changes.CSOSN = novoCst;
          } else if (isNormalDestino) {
            if (grp.CSOSN) delete grp.CSOSN;
            grp.CST = [novoCst];
            changes.CST = novoCst;
          } else {
            if (grp.CST) {
              grp.CST = [novoCst];
              changes.CST = novoCst;
            } else if (grp.CSOSN) {
              grp.CSOSN = [novoCst];
              changes.CSOSN = novoCst;
            }
          }

          if (novaChaveGrupo !== chaveAtual) {
            icmsContainer[novaChaveGrupo] = Array.isArray(originalValue)
              ? [grp]
              : grp;
            delete icmsContainer[chaveAtual];
            changes.ICMSGroupRenamed = `${chaveAtual}->${novaChaveGrupo}`;
          }
          break;
        }
      }

      if (Object.keys(changes).length) {
        try {
          const valorQCom = prod?.qCom?.[0] ?? prod?.qCom;
          const currentQTrib = prod?.qTrib?.[0] ?? prod?.qTrib;
          if (
            valorQCom !== undefined &&
            valorQCom !== null &&
            !originalProdQTribVal &&
            !currentQTrib
          ) {
            prod.qTrib = [String(valorQCom)];
            changes.qTrib = String(valorQCom);
          }
        } catch (e) {}
        const prodAll = detEntry?.prod?.[0] || detEntry?.prod;
        const preserveDecimal = (
          original: string | undefined,
          value: string | number | undefined
        ) => {
          if (!original) return value === undefined ? undefined : String(value);
          const cleaned = String(original).replace(',', '.').trim();
          const m = cleaned.match(/\.(\d+)$/);
          const decimals = m ? Number(m[1].length) : undefined;
          const n = Number(value);
          if (isNaN(n)) return String(value);
          return typeof decimals === 'number'
            ? n.toFixed(decimals)
            : String(value);
        };

        try {
          if (prodAll) {
            // vUnCom
            if (
              originalProdVUnComVal &&
              !('vUnCom' in changes) &&
              prodAll.vUnCom
            ) {
              prodAll.vUnCom = [originalProdVUnComVal];
            } else if (
              originalProdVUnComVal &&
              'vUnCom' in changes &&
              prodAll.vUnCom
            ) {
              prodAll.vUnCom = [
                preserveDecimal(originalProdVUnComVal, prodAll.vUnCom[0]),
              ];
            }

            // vUnTrib
            if (
              originalProdVUnTribVal &&
              !('vUnTrib' in changes) &&
              prodAll.vUnTrib
            ) {
              prodAll.vUnTrib = [originalProdVUnTribVal];
            } else if (
              originalProdVUnTribVal &&
              'vUnTrib' in changes &&
              prodAll.vUnTrib
            ) {
              prodAll.vUnTrib = [
                preserveDecimal(originalProdVUnTribVal, prodAll.vUnTrib[0]),
              ];
            }
          }
        } catch (e) {}

        alteracoesAplicadas.push({ idItem: itemBanco.id, changes });
      }
      try {
        const prodAll = detEntry?.prod?.[0] || detEntry?.prod;
        const normalizeQty = (v: any) => {
          if (v === undefined || v === null) return v;
          const s = Array.isArray(v) ? String(v[0]) : String(v);
          const cleaned = s.replace(',', '.').trim();
          if (cleaned === '') return cleaned;
          const decimalMatch = cleaned.match(/\.(\d+)$/);
          if (decimalMatch && decimalMatch[1]) {
            const decimals = decimalMatch[1].length;
            const n = parseFloat(cleaned);
            if (isNaN(n)) return cleaned;
            return n.toFixed(decimals);
          }

          const n = parseFloat(cleaned);
          if (isNaN(n)) return cleaned;
          return n.toFixed(2);
        };
        if (prodAll) {
          if (prodAll.qCom) prodAll.qCom = [normalizeQty(prodAll.qCom)];
          if (prodAll.qTrib) prodAll.qTrib = [normalizeQty(prodAll.qTrib)];
        }
      } catch (e) {}
    }
  }

  // gerar XML completo a partir do JSON modificado.
  try {
    const builder = new Builder({
      headless: false, // inclui declaração <?xml ...?>
      renderOpts: { pretty: false }, // manter compacto (evita alterar estrutura de espaços)
    });
    const xmlGerado = builder.buildObject(rawDfe);
    return xmlGerado;
  } catch (e) {
    return JSON.stringify({
      status: 'XML_BUILD_FAILED',
      notaFiscalID,
      appliedChanges: alteracoesAplicadas,
      error: (e as Error)?.message,
    });
  }
};
