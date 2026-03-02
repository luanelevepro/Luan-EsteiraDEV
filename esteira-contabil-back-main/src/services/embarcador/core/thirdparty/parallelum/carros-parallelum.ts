/**
 * @author https://parallelum.com.br
 * @example [ { codigo: 102, nome: 'AGRALE' } ]
 */
export type TMarcaCarro = {
  codigo: string;
  nome: string;
};

export async function getMarcasCarros(): Promise<void | TMarcaCarro[]> {
  const apiURL = 'https://parallelum.com.br/fipe/api/v1/carros/marcas';

  try {
    const request = await fetch(apiURL, {
      method: 'GET',
    });

    return (await request.json()) as TMarcaCarro[];
  } catch (err) {
    console.error(`[Embarcador] Erro ao buscar marcas de caminhões : ${err}`);
    return;
  }
}

/**
 * @author https://parallelum.com.br
 * @example [ { codigo: 2503, nome: '10000 / 10000 S  2p (diesel) (E5)' } ]
 */
export type TModelosCarro = {
  modelos: {
    codigo: number;
    nome: string;
  }[];
  anos: {
    codigo: string;
    name: string;
  };
};

export async function getModelosCarros({
  cd_marca,
}: {
  cd_marca: string;
}): Promise<void | TModelosCarro> {
  const apiURL = `https://parallelum.com.br/fipe/api/v1/carros/marcas/${cd_marca}/modelos`;

  try {
    const request = await fetch(apiURL, {
      method: 'GET',
    });

    return (await request.json()) as TModelosCarro;
  } catch (err) {
    console.error(`[Embarcador] Erro ao buscar modelos de caminhões : ${err}`);
    return;
  }
}

/**
 * @author https://parallelum.com.br
 * @example [ { codigo: '2022-3´, nome: '2022' } ]
 */
export type TAnoCarro = {
  codigo: string;
  nome: string;
};

export async function getAnosModelosCarros({
  cd_marca,
  cd_modelo,
}: {
  cd_marca: string;
  cd_modelo: string | number;
}): Promise<void | TAnoCarro[]> {
  const apiURL = `https://parallelum.com.br/fipe/api/v1/carros/marcas/${cd_marca}/modelos/${cd_modelo}/anos`;

  try {
    const request = await fetch(apiURL, {
      method: 'GET',
    });

    return (await request.json()) as TAnoCarro[];
  } catch (err) {
    console.error(
      `[Embarcador] Erro ao buscar anos de modelos de caminhões : ${err}`
    );
    return;
  }
}

export type TFIPECarro = {
  TipoVeiculo: number;
  /**
   * @example "R$ 1.000,00"
   */
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  /**
   * @description Deveria retornar o tipo de combustível, mas, retorna Gasolina até mesmo para carros elétricos.
   * @see BYD eT3 (Elétrico): https://parallelum.com.br/fipe/api/v1/carros/marcas/238/modelos/9831/anos/2022-1
   */
  Combustível: 'Gasolina';
  CodigoFipe: string;
  MesReferencia: string;
  SiglaCombustivel: string;
};

/**
 * @description Busca informações FIPE de caminhões via API 3rd party.
 * @see getMarcascarros
 * @see getModeloscarros
 * @see getAnosModeloscarros
 * @returns
 */
export async function getFIPECarro({
  cd_marca,
  cd_modelo,
  cd_ano,
}: {
  cd_marca: string;
  cd_modelo: string | number;
  cd_ano: string;
}): Promise<void | (Omit<TFIPECarro, 'Valor'> & { Valor: number })> {
  const apiURL = `https://parallelum.com.br/fipe/api/v1/carros/marcas/${cd_marca}/modelos/${cd_modelo}/anos/${cd_ano}`;

  try {
    const request = await fetch(apiURL, {
      method: 'GET',
    });

    const response = (await request.json()) as TFIPECarro;
    return {
      ...response,
      Valor: parseFloat(
        response.Valor.replace('R$ ', '').replace('.', '').replace(',', '.')
      ),
    };
  } catch (err) {
    console.error(`[Embarcador] Erro ao buscar FIPE de caminhões : ${err}`);
    return;
  }
}
