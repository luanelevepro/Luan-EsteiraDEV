/**
 * Serviço de integração com a API FIPE Parallelum v2
 * @see https://fipe.parallelum.com.br/api/v2/
 * @see https://deividfortuna.github.io/fipe/v2/
 *
 * Mapeamento para sis_tabela_fipe e sis_fipe_historico (fipe.prisma)
 */

const BASE_URL = 'https://fipe.parallelum.com.br/api/v2';

// Tipos da API Parallelum v2
export type VehicleTypeApi = 'cars' | 'motorcycles' | 'trucks';

export type ReferenceItem = {
  code: string;
  month?: string;
  label?: string;
};

export type BrandItem = {
  code: string;
  name: string;
  id?: number;
};

export type ModelItem = {
  code: string;
  name: string;
  id?: number;
};

export type YearItem = {
  code: string;
  name: string;
  id?: string;
  label?: string;
};

export type FipeInfoResponse = {
  brand: string;
  codeFipe: string;
  fuel: string;
  fuelAcronym: string;
  model: string;
  modelYear: number;
  price: string;
  priceHistory?: Array<{ month: string; price: string; reference: string }>;
  referenceMonth: string;
  vehicleType: number;
};

export type FipeHistoryResponse = {
  vehicle?: {
    vehicleType: string;
    fipeCode: string;
    yearId: string;
  };
  history?: Array<{
    reference: string;
    price: number;
    formatted?: string;
    month?: string;
  }>;
  brand?: string;
  codeFipe?: string;
  model?: string;
  modelYear?: number;
  price?: string;
  priceHistory?: Array<{ month: string; price: string; reference: string }>;
};

// Tipos normalizados para uso no sistema
export type FipeTabelaFipeInput = {
  ds_marca: string;
  ds_modelo: string;
  cd_fipe: string;
  vl_ano_modelo: string;
  vl_valor: string;
  id_emb_tipos_veiculo?: string | null;
};

export type FipeHistoricoItem = {
  vl_mes: string;
  vl_ano: string;
  vl_ano_modelo: string;
  vl_valor: number;
};

function getToken(): string | undefined {
  return (
    process.env.FIPE_SUBSCRIPTION_TOKEN ||
    process.env.FIPE_PARALLELUM_TOKEN ||
    process.env.FIPE_TOKEN
  );
}

function getHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['X-Subscription-Token'] = token;
  } else {
    console.warn(
      '[FipeBrasil] Token não configurado (.env FIPE_SUBSCRIPTION_TOKEN). Requisições podem falhar com 401/403.'
    );
  }
  return headers;
}

async function request<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(
      `[FipeBrasil] API error ${res.status}: ${res.statusText} - ${url}`
    );
  }
  return res.json() as Promise<T>;
}

/**
 * Extrai ano em 4 dígitos para sis_tabela_fipe.vl_ano_modelo (VarChar(4))
 */
export function extrairAno4Digitos(anoModelo: string): string {
  const match = anoModelo.match(/^\d{4}/);
  return match ? match[0] : anoModelo.slice(0, 4);
}

/**
 * 4.1) Referências de Meses da FIPE
 * GET /references
 */
export async function getReferences(): Promise<ReferenceItem[]> {
  return request<ReferenceItem[]>(`${BASE_URL}/references`);
}

/**
 * 4.2) Marcas Por Tipo
 * GET /{vehicleType}/brands
 */
export async function getMarcasPorTipo(
  vehicleType: VehicleTypeApi,
  reference?: string | number
): Promise<BrandItem[]> {
  const params = reference ? `?reference=${reference}` : '';
  return request<BrandItem[]>(`${BASE_URL}/${vehicleType}/brands${params}`);
}

/**
 * 4.3) Modelos de veículo por marca
 * GET /{vehicleType}/brands/{brandId}/models
 */
export async function getModelosPorMarca(
  vehicleType: VehicleTypeApi,
  brandId: string | number,
  reference?: string | number
): Promise<ModelItem[]> {
  const params = reference ? `?reference=${reference}` : '';
  const data = await request<ModelItem[] | { modelos: ModelItem[] }>(
    `${BASE_URL}/${vehicleType}/brands/${brandId}/models${params}`
  );
  return Array.isArray(data) ? data : (data.modelos ?? []);
}

/**
 * 4.4) Anos por código FIPE
 * GET /{vehicleType}/{fipeCode}/years
 */
export async function getAnosPorCodigoFipe(
  vehicleType: VehicleTypeApi,
  fipeCode: string,
  reference?: string | number
): Promise<YearItem[]> {
  const params = reference ? `?reference=${reference}` : '';
  return request<YearItem[]>(
    `${BASE_URL}/${vehicleType}/${fipeCode}/years${params}`
  );
}

/**
 * 4.5) Anos para modelo específico
 * GET /{vehicleType}/brands/{brandId}/models/{modelId}/years
 */
export async function getAnosPorModelo(
  vehicleType: VehicleTypeApi,
  brandId: string | number,
  modelId: string | number,
  reference?: string | number
): Promise<YearItem[]> {
  const params = reference ? `?reference=${reference}` : '';
  return request<YearItem[]>(
    `${BASE_URL}/${vehicleType}/brands/${brandId}/models/${modelId}/years${params}`
  );
}

/**
 * 4.6) Anos para marca específica
 * GET /{vehicleType}/brands/{brandId}/years
 */
export async function getAnosPorMarca(
  vehicleType: VehicleTypeApi,
  brandId: string | number,
  reference?: string | number
): Promise<YearItem[]> {
  const params = reference ? `?reference=${reference}` : '';
  return request<YearItem[]>(
    `${BASE_URL}/${vehicleType}/brands/${brandId}/years${params}`
  );
}

/**
 * 4.7) Modelos de veículo por marca e ano
 * GET /{vehicleType}/brands/{brandId}/years/{yearId}/models
 */
export async function getModelosPorMarcaEAno(
  vehicleType: VehicleTypeApi,
  brandId: string | number,
  yearId: string,
  reference?: string | number
): Promise<ModelItem[]> {
  const params = reference ? `?reference=${reference}` : '';
  return request<ModelItem[]>(
    `${BASE_URL}/${vehicleType}/brands/${brandId}/years/${yearId}/models${params}`
  );
}

/**
 * 4.8) Informações da FIPE dentro do Ano (Fluxo Hierárquico)
 * GET /{vehicleType}/brands/{brandId}/models/{modelId}/years/{yearId}
 */
export async function getInfoFipeHierarquico(
  vehicleType: VehicleTypeApi,
  brandId: string | number,
  modelId: string | number,
  yearId: string,
  reference?: string | number
): Promise<FipeInfoResponse> {
  const params = reference ? `?reference=${reference}` : '';
  return request<FipeInfoResponse>(
    `${BASE_URL}/${vehicleType}/brands/${brandId}/models/${modelId}/years/${yearId}${params}`
  );
}

/**
 * 4.9) Informações da FIPE por código FIPE (Fluxo Direto)
 * GET /{vehicleType}/{fipeCode}/years/{yearId}
 */
export async function getInfoFipePorCodigo(
  vehicleType: VehicleTypeApi,
  fipeCode: string,
  yearId: string,
  reference?: string | number
): Promise<FipeInfoResponse> {
  const params = reference ? `?reference=${reference}` : '';
  return request<FipeInfoResponse>(
    `${BASE_URL}/${vehicleType}/${fipeCode}/years/${yearId}${params}`
  );
}

/**
 * 4.10) Informações da FIPE com histórico
 * GET /{vehicleType}/{fipeCode}/years/{yearId}/history
 */
export async function getInfoFipeComHistorico(
  vehicleType: VehicleTypeApi,
  fipeCode: string,
  yearId: string,
  reference?: string | number
): Promise<FipeHistoryResponse> {
  const params = reference ? `?reference=${reference}` : '';
  return request<FipeHistoryResponse>(
    `${BASE_URL}/${vehicleType}/${fipeCode}/years/${yearId}/history${params}`
  );
}

/**
 * Converte resposta da API para formato sis_tabela_fipe.
 * vl_ano_modelo: limitado a 4 caracteres (VarChar(4)) - usa apenas o ano.
 */
export function toTabelaFipeInput(
  apiResponse: FipeInfoResponse,
  idEmbTiposVeiculo?: string | number | null
): FipeTabelaFipeInput {
  const anoModelo = String(apiResponse.modelYear ?? '');
  return {
    ds_marca: apiResponse.brand,
    ds_modelo: apiResponse.model,
    cd_fipe: apiResponse.codeFipe,
    vl_ano_modelo: extrairAno4Digitos(anoModelo),
    vl_valor: apiResponse.price,
    id_emb_tipos_veiculo:
      idEmbTiposVeiculo != null ? String(idEmbTiposVeiculo) : null,
  };
}

/**
 * Extrai itens de histórico para sis_fipe_historico.
 * Interpreta reference (ex: "308") e month (ex: "abril de 2024").
 */
export function toHistoricoItems(
  history: FipeHistoryResponse['history'],
  vlAnoModelo: string
): FipeHistoricoItem[] {
  if (!history?.length) return [];

  return history.map((item) => {
    const monthStr = (item.month ?? item.reference ?? '').toString();
    const [mesParte, anoParte] = monthStr.split(' de ');
    const vl_ano = anoParte ?? new Date().getFullYear().toString();
    const vl_mes = mesParte || (item.reference ?? '');

    let vl_valor = 0;
    if (typeof item.price === 'number') {
      vl_valor = item.price;
    } else if (item.formatted) {
      const num = parseFloat(
        item.formatted.replace('R$ ', '').replace(/\./g, '').replace(',', '.')
      );
      vl_valor = Number.isNaN(num) ? 0 : num;
    }

    return {
      vl_mes,
      vl_ano,
      vl_ano_modelo: vlAnoModelo,
      vl_valor,
    };
  });
}

/**
 * Fluxo A — Hierárquico: Marca → Modelo → Ano → Info FIPE
 */
export async function buscarFipeHierarquico(params: {
  vehicleType: VehicleTypeApi;
  brandId: string | number;
  modelId: string | number;
  yearId: string;
  reference?: string | number;
  idEmbTiposVeiculo?: number | null;
}): Promise<FipeTabelaFipeInput> {
  const info = await getInfoFipeHierarquico(
    params.vehicleType,
    params.brandId,
    params.modelId,
    params.yearId,
    params.reference
  );
  return toTabelaFipeInput(info, params.idEmbTiposVeiculo);
}

/**
 * Fluxo B — Direto por código FIPE: Código → Ano → Info FIPE
 */
export async function buscarFipePorCodigo(params: {
  vehicleType: VehicleTypeApi;
  fipeCode: string;
  yearId: string;
  reference?: string | number;
  idEmbTiposVeiculo?: string | null;
}): Promise<FipeTabelaFipeInput> {
  const fipeCode = normalizarCodigoFipe(params.fipeCode);
  const info = await getInfoFipePorCodigo(
    params.vehicleType,
    fipeCode,
    params.yearId,
    params.reference
  );
  return toTabelaFipeInput(info, params.idEmbTiposVeiculo);
}

/**
 * Busca histórico de preços para um veículo por código FIPE.
 */
export async function buscarHistoricoFipe(params: {
  vehicleType: VehicleTypeApi;
  fipeCode: string;
  yearId: string;
  reference?: string | number;
}): Promise<FipeHistoricoItem[]> {
  const fipeCode = normalizarCodigoFipe(params.fipeCode);
  const response = await getInfoFipeComHistorico(
    params.vehicleType,
    fipeCode,
    params.yearId,
    params.reference
  );

  const vlAnoModelo = String(
    response.vehicle?.yearId ?? response.modelYear ?? params.yearId
  );
  const history = response.history ?? response.priceHistory;

  if (Array.isArray(history)) {
    return history.map((item: Record<string, unknown>) => {
      const monthStr = String(item.month ?? item.reference ?? '');
      const [mesParte, anoParte] = monthStr.split(' de ');
      const vl_ano = anoParte ?? new Date().getFullYear().toString();
      const vl_mes = mesParte || String(item.reference ?? '');

      let vl_valor = 0;
      if (typeof item.price === 'number') {
        vl_valor = item.price;
      } else if (typeof item.price === 'string') {
        vl_valor =
          parseFloat(
            item.price.replace('R$ ', '').replace(/\./g, '').replace(',', '.')
          ) || 0;
      } else if (typeof item.formatted === 'string') {
        vl_valor =
          parseFloat(
            item.formatted
              .replace('R$ ', '')
              .replace(/\./g, '')
              .replace(',', '.')
          ) || 0;
      }

      return {
        vl_mes,
        vl_ano,
        vl_ano_modelo: vlAnoModelo,
        vl_valor,
      };
    });
  }

  return [];
}

/**
 * Normaliza código FIPE: XXXXXXX → XXXXXX-X
 */
export function normalizarCodigoFipe(codigo: string): string {
  const limpo = codigo.replace(/[^\d]/g, '');
  if (limpo.length === 7) {
    return `${limpo.slice(0, 6)}-${limpo.slice(6)}`;
  }
  if (!/^\d{6}-\d$/.test(codigo) && limpo.length === 6) {
    return `${limpo}-0`;
  }
  return codigo;
}
