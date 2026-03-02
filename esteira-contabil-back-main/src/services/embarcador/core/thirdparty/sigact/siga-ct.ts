type FipeDataItem = {
  /**
   * fornato: yy
   */
  ano: string;
  /**
   * formato: Float string
   */
  valor: string;
};

type FipeReturn = {
  fipe: string;
  marca: string;
  modelo: string;
  /**
   * formato: yyyy
   */
  ano_base: string;
  /**
   * fomato: m
   */
  mes_base: string;
  dados: FipeDataItem[];
};

export type TFipeSigaCT = {
  return: FipeReturn;
};

export async function getFIPESigaCT({
  cd_fipe,
  data_fab,
}: {
  cd_fipe: string;
  data_fab: string;
}) {
  if (!process.env.API_KEY_SIGACT) {
    console.error(
      '[Embarcador] Chave API SigaCT não encontrada, recusando request.'
    );
    return;
  }

  try {
    const request = await fetch('https://api.sigact.com.br/Fipe/', {
      method: 'POSt',
      headers: {
        Authorization: `Bearer ${process.env.API_KEY_SIGACT}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        fipe: cd_fipe,
      }),
    });

    return (await request.json()) as TFipeSigaCT;
  } catch (err) {
    console.error(
      `[Embarcador] Erro ao buscar dados de veículo na API SigaCT: ${err}`
    );
    return;
  }
}
