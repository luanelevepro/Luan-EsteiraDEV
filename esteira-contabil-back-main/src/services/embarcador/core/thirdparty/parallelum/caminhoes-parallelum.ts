/**
 * @author https://parallelum.com.br
 * @example [ { codigo: 102, nome: 'AGRALE' } ]
 */
export type TMarcaCaminhao = {
  codigo: string;
  nome: string;
};

export async function getMarcasCaminhoes(): Promise<void | TMarcaCaminhao[]> {
  const apiURL = 'https://parallelum.com.br/fipe/api/v1/caminhoes/marcas';

  try {
    const request = await fetch(apiURL, {
      method: 'GET',
    });

    return (await request.json()) as TMarcaCaminhao[];
  } catch (err) {
    console.error(`[Embarcador] Erro ao buscar marcas de caminhões : ${err}`);
    return;
  }
}

/**
 * @author https://parallelum.com.br
 * @example [ { codigo: 2503, nome: '10000 / 10000 S  2p (diesel) (E5)' } ]
 */
export type TModelosCaminhao = {
  modelos: {
    codigo: number;
    nome: string;
  }[];
  anos: {
    codigo: string;
    name: string;
  };
};

export async function getModelosCaminhoes({
  cd_marca,
}: {
  cd_marca: string;
}): Promise<void | TModelosCaminhao> {
  const apiURL = `https://parallelum.com.br/fipe/api/v1/caminhoes/marcas/${cd_marca}/modelos`;

  try {
    const request = await fetch(apiURL, {
      method: 'GET',
    });

    return (await request.json()) as TModelosCaminhao;
  } catch (err) {
    console.error(`[Embarcador] Erro ao buscar modelos de caminhões : ${err}`);
    return;
  }
}

/**
 * @author https://parallelum.com.br
 * @example [ { codigo: '2022-3´, nome: '2022' } ]
 */
export type TAnoCaminhao = {
  codigo: string;
  nome: string;
};

export async function getAnosModelosCaminhoes({
  cd_marca,
  cd_modelo,
}: {
  cd_marca: string;
  cd_modelo: string | number;
}): Promise<void | TAnoCaminhao[]> {
  const apiURL = `https://parallelum.com.br/fipe/api/v1/caminhoes/marcas/${cd_marca}/modelos/${cd_modelo}/anos`;

  try {
    const request = await fetch(apiURL, {
      method: 'GET',
    });

    return (await request.json()) as TAnoCaminhao[];
  } catch (err) {
    console.error(
      `[Embarcador] Erro ao buscar anos de modelos de caminhões : ${err}`
    );
    return;
  }
}

export type TFIPECaminhao = {
  TipoVeiculo: number;
  /**
   * @example "R$ 1.000,00"
   */
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  /**
   * @description Deveria retornar o tipo de combustível, mas, retorna Diesel até mesmo para caminhões elétricos.
   */
  Combustível: 'Diesel';
  CodigoFipe: string;
  MesReferencia: string;
  SiglaCombustivel: string;
};

/**
 * @description Busca informações FIPE de caminhões via API 3rd party.
 * @see getMarcasCaminhoes
 * @see getModelosCaminhoes
 * @see getAnosModelosCaminhoes
 * @returns
 */
export async function getFIPECaminhao({
  cd_marca,
  cd_modelo,
  cd_ano,
}: {
  cd_marca: string;
  cd_modelo: string | number;
  cd_ano: string;
}): Promise<void | (Omit<TFIPECaminhao, 'Valor'> & { Valor: number })> {
  const apiURL = `https://parallelum.com.br/fipe/api/v1/caminhoes/marcas/${cd_marca}/modelos/${cd_modelo}/anos/${cd_ano}`;

  try {
    const request = await fetch(apiURL, {
      method: 'GET',
    });

    const response = (await request.json()) as TFIPECaminhao;
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
