import * as cheerio from 'cheerio';

// Simple JS fetch functions for the Tabela Fipe API
// Replace BASE_URL with your actual API base site
const BASE_URL = 'https://www.tabelafipebrasil.com/api';

// Tipos/auxiliares locais (evita dependência de módulo removido)
export enum VehicleType {
  Car = 0,
  Truck = 1,
  Motorcycle = 2,
  Unknown = 99,
}

export type FipeResult = {
  fipeData: {
    Marca: string;
    Modelo: string;
    CodigoFipe: string;
    AnoModelo: string;
    Valor: number;
    MesReferencia: string;
  };
  vehicleType: VehicleType;
  provider: string;
};

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function findClosestMatch<T extends Record<string, any>>(
  list: T[] = [],
  term: string,
  key: keyof T
): T | null {
  const target = normalize(String(term));
  if (!target) return list[0] ?? null;
  const exact = list.find((item) => normalize(String(item[key])) === target);
  if (exact) return exact;
  const contains = list.find((item) =>
    normalize(String(item[key])).includes(target)
  );
  return contains ?? list[0] ?? null;
}

function findClosestYearMatch<T extends { nome?: string; id?: string }>(
  list: T[] = [],
  year: string | number
): T | null {
  const y = String(year);
  return (
    list.find(
      (item) =>
        (item.nome && item.nome.includes(y)) ||
        (item.id && String(item.id).includes(y))
    ) ??
    list[0] ??
    null
  );
}

export function parseFipeHtml(html: string): FipeResult {
  const $ = cheerio.load(html);
  const marca = $('.tfb-marca').first().text().trim();
  const modeloGenerico = $('.tfb-modelogenerico').first().text().trim();
  const modelo = $('.tfb-modelo').first().text().trim();
  const anoModelo = $('.tfb-ano').first().text().trim();
  const valorRaw = $('.tfb-price').first().text().trim();
  const mesReferencia = $('.tfb-mesreferencia').first().text().trim();
  let codigoFipe = '';

  let valor = 0;
  if (valorRaw) {
    valor = Number(valorRaw.replace(/[^\d,]/g, '').replace(',', '.'));
  }

  // Guess vehicle type from URL or brand/model (very basic)
  let vehicleType = VehicleType.Unknown;
  const logoImg = $('img[alt],img[title]').first();
  const logoSrc = logoImg.attr('src') || '';
  if (
    /caminhao|truck/i.test(logoSrc) ||
    /caminh(ã|a)o|truck/i.test(modeloGenerico + modelo)
  ) {
    vehicleType = VehicleType.Truck;
  } else if (
    /carro|auto|car/i.test(logoSrc) ||
    /carro|auto|car/i.test(modeloGenerico + modelo)
  ) {
    vehicleType = VehicleType.Car;
  }

  return {
    fipeData: {
      Marca: marca,
      Modelo: modelo,
      CodigoFipe: codigoFipe,
      AnoModelo: anoModelo,
      Valor: valor,
      MesReferencia: mesReferencia,
    },
    vehicleType,
    provider: 'fipebrasil:fipe',
  };
}

export function extractOptionsFromHtml(html: string) {
  const $ = cheerio.load(`<select>${html}</select>`);
  return $('option')
    .map((_, el) => ({
      id: $(el).attr('value') ?? '',
      nome: $(el).text().trim(),
    }))
    .get();
}

export async function getMarcas(tipo: VehicleType) {
  const tipoStr = {
    [0]: 'M',
    [1]: 'C',
    [2]: 'A',
  };

  const marcas = await fetch(
    `${BASE_URL}/tabelafipe-makes.php?tipo=${encodeURIComponent(tipoStr[tipo])}`
  ).then((res) => res.text());

  return extractOptionsFromHtml(marcas);
}

// marca = fetchMarcas() -> id
export async function getGenericModels(marca: string) {
  const genericModels = await fetch(
    `${BASE_URL}/tabelafipe-gen-models.php?marca=${encodeURIComponent(marca)}`
  ).then((res) => res.text());

  return extractOptionsFromHtml(genericModels);
}

// marca = fetchMarcas() -> id
// genModelo = fetchGenericModels() -> id
export async function getModels(marca: string, genModelo: string) {
  const params = new URLSearchParams({ marca, 'gen-modelo': genModelo });
  const models = await fetch(
    `${BASE_URL}/tabelafipe-models.php?${params}`
  ).then((res) => res.text());

  return extractOptionsFromHtml(models);
}

// modelo = fetchModels() -> id
export async function getAnos(modelo: string) {
  const anos = await fetch(
    `${BASE_URL}/tabelafipe-anos.php?modelo=${encodeURIComponent(modelo)}`
  ).then((res) => res.text());

  return extractOptionsFromHtml(anos);
}

// modelo = fetchModels() -> id
// ano = fetchAnos() -> id
export async function getByAnoModelo(modelo: string, ano: string) {
  const params = new URLSearchParams({ modelo, ano });
  const value = await fetch(`${BASE_URL}/tabelafipe-result.php?${params}`).then(
    (res) => res.text()
  );

  const numeric = Number(value.replace(/[^\d,]/g, '').replace(',', '.'));
  return numeric;
}

export async function fetchByAnoFipeID({ fipeid, ano }) {
  if (/^\d{7}$/.test(fipeid)) {
    fipeid = fipeid.slice(0, 6) + '-' + fipeid.slice(6);
  }

  if (!/^\d{6}-\d$/.test(fipeid)) {
    console.error(
      '[Embarcador] cd_fipe inválido. O formato deve ser XXXXXX-X.'
    );
    return;
  }
  const params = new URLSearchParams();
  if (fipeid) params.append('fipeid', fipeid);
  if (ano) params.append('ano', ano);
  const url = `${BASE_URL}/tabelafipe-value.php${params.toString() ? '?' + params : ''}`;
  const data = await fetch(url).then((res) => res.text());

  return parseFipeHtml(data);
}

/**
 * Busca um veículo FIPE por marca, modelo e ano, navegando pelas opções disponíveis.
 * @param {Object} params
 * @param {string} params.marca - Nome da marca
 * @param {string} params.modelo - Nome do modelo
 * @param {string|number} params.ano - Ano do modelo
 * @param {VehicleType} [params.tipo=VehicleType.Car] - Tipo do veículo (opcional, default: Car)
 * @returns {Promise<{fipeData: any, vehicleType: VehicleType, provider: string}>}
 */
export async function fetchVeiculoFIPE({
  marca,
  modelo,
  ano,
  tipo = VehicleType.Car,
}) {
  // 1. Buscar marcas
  const marcas = await getMarcas(tipo);
  if (!marcas) throw new Error('Falha ao buscar marcas');
  const marcaObj = findClosestMatch(marcas, marca, 'nome');
  if (!marcaObj) throw new Error(`Marca não encontrada: ${marca}`);

  // 2. Buscar modelos genéricos
  const genModels = await getGenericModels(marcaObj.id);
  if (!genModels) throw new Error('Falha ao buscar modelos genéricos');
  const genModelObj = findClosestMatch(genModels, modelo, 'nome');
  if (!genModelObj)
    throw new Error(`Modelo genérico não encontrado: ${modelo}`);

  // 3. Buscar modelos específicos
  const models = await getModels(marcaObj.id, genModelObj.id);
  if (!models) throw new Error('Falha ao buscar modelos');
  const modelObj = findClosestMatch(models, modelo, 'nome');
  if (!modelObj) throw new Error(`Modelo não encontrado: ${modelo}`);

  // 4. Buscar anos disponíveis
  const anos = await getAnos(modelObj.id);
  if (!anos) throw new Error('Falha ao buscar anos');
  const anoObj = findClosestYearMatch(anos, ano);
  if (!anoObj) throw new Error(`Ano não encontrado: ${ano}`);

  // 5. Buscar valor FIPE
  const valor = await getByAnoModelo(modelObj.id, anoObj.id);
  if (valor == null) throw new Error('Falha ao buscar valor FIPE');

  return {
    fipeData: {
      Marca: marcaObj.nome,
      Modelo: modelObj.nome,
      CodigoFipe: '', // Não disponível nesta API
      AnoModelo: anoObj.nome,
      Valor: valor,
      MesReferencia: '', // Não disponível nesta API
    },
    vehicleType: tipo,
    provider: 'fipebrasil',
  };
}
