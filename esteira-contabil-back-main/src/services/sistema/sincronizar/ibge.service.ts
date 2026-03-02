import { prisma } from '@/services/prisma';

export const updateCitiesRepository = async (uf?: string, slice?: string) => {
  const cityMap: Record<string, any> = {};

  if (uf) {
    try {
      cityMap[uf] = await updateCities(uf, slice);
    } catch (updateError) {
      console.error(`Erro ao atualizar cidades para ${uf}:`, updateError);
    }
    return cityMap;
  }

  try {
    const response = await fetch(
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados/'
    );
    const ufElements = await response.json();

    const upsertUFs = ufElements.map((element: any) => ({
      where: { id: element.id },
      update: {
        ds_state: element.nome,
        ds_state_clean: limparTexto(element.nome),
        ds_uf: element.sigla,
      },
      create: {
        id: element.id,
        ds_state: element.nome,
        ds_state_clean: limparTexto(element.nome),
        ds_uf: element.sigla,
      },
    }));

    await prisma.$transaction(
      upsertUFs.map((uf) => prisma.sis_ibge_uf.upsert(uf))
    );

    for (const element of ufElements) {
      try {
        cityMap[element.sigla] = await updateCities(element.sigla, element.id);
      } catch (updateError) {
        console.error(
          `Erro ao atualizar cidades para ${element.sigla}:`,
          updateError
        );
      }
    }
    return cityMap;
  } catch (error) {
    console.error('Erro ao buscar estados do IBGE:', error);
    throw error;
  }
};

async function updateCities(UF: string, id_UF: string, slice?: string) {
  try {
    const response = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${UF}/municipios`
    );
    let cities = await response.json();

    if (slice) {
      const startIndex = (Number(slice) - 1) * 100;
      cities = cities.slice(startIndex, startIndex + 100);
    }

    const upsertCities = cities.map((city: any) => ({
      where: { id: city.id },
      update: {
        ds_city: city.nome,
        ds_city_clean: limparTexto(city.nome),
        id_ibge_uf: Number(id_UF),
      },
      create: {
        id: city.id,
        ds_city: city.nome,
        ds_city_clean: limparTexto(city.nome),
        id_ibge_uf: Number(id_UF),
      },
    }));

    await prisma.$transaction(
      upsertCities.map((city) => prisma.sis_igbe_city.upsert(city))
    );

    const qtdCities = await prisma.sis_igbe_city.count({
      where: { id_ibge_uf: Number(id_UF) },
    });
    return qtdCities;
  } catch (error) {
    console.error(`Erro ao atualizar cidades para ${UF}:`, error);
    throw error;
  }
}

export const findCitiesRepository = async (nome: string) => {
  const nomeLimpo = limparTexto(nome);

  try {
    return await prisma.sis_igbe_city.findMany({
      where: {
        ds_city_clean: {
          contains: nomeLimpo,
        },
      },
      select: {
        ds_city: true,
        id: true,
        id_ibge_uf: true,
      },
      orderBy: {
        ds_city: 'asc',
      },
    });
  } catch (error) {
    console.error('Erro ao buscar cidades:', error);
    throw error;
  }
};

export function limparTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, '') // remove caracteres especiais
    .replace(/\s+/g, ' ') // normaliza espaços
    .trim()
    .toLowerCase(); // se quiser deixar tudo em minúsculo
}
