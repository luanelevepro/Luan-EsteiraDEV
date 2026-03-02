import { getCachedData } from "@/core/cache";
import { prisma } from "@/services/prisma";
import { emb_ibge_uf } from "@prisma/client";

export async function ensureEmbarcadorCity({
  id_sis_ibge_cidade,
}: {
  id_sis_ibge_cidade?: number;
}) {
  if (!id_sis_ibge_cidade) {
    throw new Error(
      "id_sis_ibge_cidade precisa ser informado (ensureEmbarcadorCity)"
    );
  }

  const cachedCity = await getCachedData(
    `sis_city_${id_sis_ibge_cidade}.`,
    async () => {
      return await prisma.emb_ibge_cidades.findUnique({
        where: {
          id_sis_cidade: id_sis_ibge_cidade,
        },
        include: {
          js_emb_ibge_uf: true,
          js_sis_city: true,
        },
      });
    }
  );

  if (!cachedCity) {
    const sistemCity = await prisma.sis_igbe_city.findUnique({
      where: {
        id: id_sis_ibge_cidade,
      },
      include: {
        js_uf: true,
      },
    });

    if (!sistemCity) {
      throw new Error(
        "[ Erro crítico ] [ Cache Embarcador ] Cidade não encontrada no sistema - Estamos sincronizados com o IBGE?"
      );
    }

    const ensuredEmbUF = await ensureEmbarcadorUF({
      id_uf: sistemCity.js_uf.id,
    });

    if (!ensuredEmbUF) {
      throw new Error(
        `[ Erro crítico ] [ Cache Embarcador ] UF ${sistemCity.js_uf.id} não encontrada no sistema - Estamos sincronizados com o IBGE?`
      );
    }

    const createdCity = prisma.emb_ibge_cidades.create({
      data: {
        id_sis_cidade: sistemCity.id,
        id_emb_uf: ensuredEmbUF.id,
      },
      include: {
        js_emb_ibge_uf: {
          include: {
            js_sis_ibge_uf: true,
          },
        },
        js_sis_city: true,
      },
    });

    return createdCity;
  } else {
    return cachedCity;
  }
}

export async function ensureEmbarcadorUF({ id_uf }: { id_uf?: number }) {
  try {
    let finalData: emb_ibge_uf | null;
    if (!id_uf) {
      throw new Error(
        "id_city ou id_uf precisam ser informados (ensureEmbarcadorCityOrUF)"
      );
    }

    const cachedUF = await getCachedData(`sis_uf_${id_uf}.`, async () => {
      return await prisma.emb_ibge_uf.findUnique({
        where: {
          id_sis_ibge_uf: id_uf,
        },
      });
    });

    if (!cachedUF) {
      const sistemUF = await prisma.sis_ibge_uf.findUnique({
        where: {
          id: id_uf,
        },
      });

      if (!sistemUF) {
        throw new Error(
          `[ Erro crítico ] [ Cache Embarcador ] UF "${id_uf}" não encontrada no sistema - Estamos sincronizados com o IBGE?`
        );
      }
      finalData = await prisma.emb_ibge_uf.create({
        data: {
          id_sis_ibge_uf: sistemUF.id,
        },
      });

      return finalData;
    } else {
      finalData = cachedUF;

      return finalData;
    }
  } catch (e) {
    console.error(
      `[ Erro crítico ] [ Cache Embarcador ] ${e} - Estamos sincronizados com o IBGE?`
    );
    throw e;
  }
}
