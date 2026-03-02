import { parseStringPromise } from 'xml2js';

/**
 * Interface para dados de cancelamento extraídos do XML
 */
export interface NfseCancelamentoData {
  numero: string;
  cpfCnpj: string;
  inscricaoMunicipal: string;
  codigoMunicipio: string;
  codigoCancelamento?: string;
  dataHora: string;
  xmlCompleto: string;
}

/**
 * Busca o XML da NFS-e na Tecnospeed e extrai dados de cancelamento
 * @param xmlUrl URL do XML fornecida pela Tecnospeed (ds_raw em fis_documento_dfe)
 * @param headers Headers de autenticação (Authorization, etc)
 * @returns Dados de cancelamento extraídos do XML
 */
export async function extrairDadosCancelamentoNfse(
  xmlUrl: string,
  headers?: Record<string, string>
): Promise<NfseCancelamentoData | null> {
  try {
    console.log(`[NFSE-CANCELAMENTO] Buscando XML em: ${xmlUrl}`);

    const response = await fetch(xmlUrl, {
      method: 'GET',
      headers: headers || {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(
        `[NFSE-CANCELAMENTO] Erro ao buscar XML: ${response.status}`
      );
      return null;
    }

    const xmlString = await response.text();

    // Parse do XML
    const parsed = await parseStringPromise(xmlString, {
      explicitArray: true,
    });

    const compNfse = parsed.CompNfse;
    if (!compNfse) {
      console.warn('[NFSE-CANCELAMENTO] CompNfse não encontrado no XML');
      return null;
    }

    // Extrair dados do <Nfse> (para informações base)
    const nfse = compNfse.Nfse?.[0];
    const infNfse = nfse?.InfNfse?.[0];

    if (!infNfse) {
      console.warn('[NFSE-CANCELAMENTO] InfNfse não encontrado no XML');
      return null;
    }

    // Extrair dados do cancelamento
    const nfseCancelamento = compNfse.NfseCancelamento?.[0];
    if (!nfseCancelamento) {
      console.warn(
        '[NFSE-CANCELAMENTO] NfseCancelamento não encontrado - NFS-e pode não estar cancelada'
      );
      return null;
    }

    const confirmacao = nfseCancelamento.Confirmacao?.[0];
    const pedido = confirmacao?.Pedido?.[0];
    const infPedido = pedido?.InfPedidoCancelamento?.[0];
    const identificacao = infPedido?.IdentificacaoNfse?.[0];

    if (!identificacao) {
      console.warn('[NFSE-CANCELAMENTO] IdentificacaoNfse não encontrada');
      return null;
    }

    // Extrair CNPJ (pode estar em <Cnpj> ou <Cpf>)
    const cpfCnpj =
      identificacao.CpfCnpj?.[0]?.Cnpj?.[0] ||
      identificacao.CpfCnpj?.[0]?.Cpf?.[0];

    if (!cpfCnpj) {
      console.warn('[NFSE-CANCELAMENTO] CNPJ/CPF não encontrado');
      return null;
    }

    const numero = identificacao.Numero?.[0];
    const inscricaoMunicipal = identificacao.InscricaoMunicipal?.[0];
    const codigoMunicipio = identificacao.CodigoMunicipio?.[0];
    const codigoCancelamento = infPedido?.CodigoCancelamento?.[0];
    const dataHora = confirmacao?.DataHora?.[0];

    if (!numero || !dataHora) {
      console.warn(
        '[NFSE-CANCELAMENTO] Número ou DataHora ausentes no cancelamento'
      );
      return null;
    }

    console.log(
      `[NFSE-CANCELAMENTO] Dados extraídos com sucesso: NFS-e ${numero}`
    );

    return {
      numero,
      cpfCnpj,
      inscricaoMunicipal: inscricaoMunicipal || '',
      codigoMunicipio: codigoMunicipio || '',
      codigoCancelamento: codigoCancelamento || '1', // padrão Betha
      dataHora,
      xmlCompleto: xmlString,
    };
  } catch (error) {
    console.error(
      '[NFSE-CANCELAMENTO] Erro ao processar XML de cancelamento:',
      error
    );
    return null;
  }
}

/**
 * Extrai dados do <NfseCancelamento> XML se já tiver o XML completo
 * @param xmlString Conteúdo completo do XML
 * @returns Dados de cancelamento ou null
 */
export async function extrairCancelamentoDoXml(
  xmlString: string
): Promise<NfseCancelamentoData | null> {
  try {
    const parsed = await parseStringPromise(xmlString, {
      explicitArray: true,
    });

    const compNfse = parsed.CompNfse;
    if (!compNfse) {
      return null;
    }

    // Verificar se tem cancelamento
    const nfseCancelamento = compNfse.NfseCancelamento?.[0];
    if (!nfseCancelamento) {
      return null;
    }

    const confirmacao = nfseCancelamento.Confirmacao?.[0];
    const pedido = confirmacao?.Pedido?.[0];
    const infPedido = pedido?.InfPedidoCancelamento?.[0];
    const identificacao = infPedido?.IdentificacaoNfse?.[0];

    if (!identificacao) {
      return null;
    }

    const cpfCnpj =
      identificacao.CpfCnpj?.[0]?.Cnpj?.[0] ||
      identificacao.CpfCnpj?.[0]?.Cpf?.[0];
    const numero = identificacao.Numero?.[0];
    const inscricaoMunicipal = identificacao.InscricaoMunicipal?.[0];
    const codigoMunicipio = identificacao.CodigoMunicipio?.[0];
    const codigoCancelamento = infPedido?.CodigoCancelamento?.[0];
    const dataHora = confirmacao?.DataHora?.[0];

    if (!numero || !cpfCnpj || !dataHora) {
      return null;
    }

    return {
      numero,
      cpfCnpj,
      inscricaoMunicipal: inscricaoMunicipal || '',
      codigoMunicipio: codigoMunicipio || '',
      codigoCancelamento: codigoCancelamento || '1',
      dataHora,
      xmlCompleto: xmlString,
    };
  } catch (error) {
    console.error('[NFSE-CANCELAMENTO] Erro ao extrair do XML:', error);
    return null;
  }
}

/**
 * Reconstrói o XML de cancelamento a partir dos dados salvos em fis_nfse
 * Útil para reprocessamento ou auditoria
 */
export function reconstruirXmlCancelamento(nfseData: any): string {
  if (!nfseData.dt_cancelamento || !nfseData.ds_xml_cancelamento) {
    throw new Error('Dados de cancelamento incompletos para reconstruir XML');
  }

  // Se já tem o XML completo armazenado, retornar
  if (nfseData.ds_xml_cancelamento.includes('<NfseCancelamento')) {
    return nfseData.ds_xml_cancelamento;
  }

  // Senão, montar um XML mínimo de cancelamento
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.betha.com.br/e-nota-contribuinte-ws">
  <NfseCancelamento versao="2.02">
    <Confirmacao>
      <Pedido>
        <InfPedidoCancelamento>
          <IdentificacaoNfse>
            <Numero>${nfseData.ds_numero}</Numero>
            <CpfCnpj>
              <Cnpj>${nfseData.ds_documento_emitente}</Cnpj>
            </CpfCnpj>
            <InscricaoMunicipal>${nfseData.ds_rps_serie || ''}</InscricaoMunicipal>
            <CodigoMunicipio>${nfseData.ds_codigo_municipio}</CodigoMunicipio>
          </IdentificacaoNfse>
          <CodigoCancelamento>${nfseData.cd_codigo_cancelamento || '1'}</CodigoCancelamento>
        </InfPedidoCancelamento>
      </Pedido>
      <DataHora>${nfseData.dt_cancelamento.toISOString().replace(/\.\d{3}Z$/, '')}</DataHora>
    </Confirmacao>
  </NfseCancelamento>
</CompNfse>`;

  return xml;
}
