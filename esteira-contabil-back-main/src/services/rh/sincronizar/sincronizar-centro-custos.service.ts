import { createOrUpdateCentroCustos } from '../centro-custos.service';
import { prisma } from '../../prisma';
import { createConsumoIntegracao } from '@/services/administrativo/consumo-integracao.service';

export const sincronizarCentroCustos = async (): Promise<any> => {
  const patch = '/dados/centrocustos/empresa/';
  try {
    const escritorios = await prisma.sis_empresas.findMany({
      where: { is_escritorio: true },
      select: { ds_url: true, id_externo: true, id: true },
    });
    let retornos: any[] = [];

    for (const escritorio of escritorios) {
      const empresas = await prisma.sis_empresas.findMany({
        where: {
          js_access: { some: { js_modules: { has: 'RECURSOS_HUMANOS' } } },
          id_escritorio: escritorio.id,
        },
        select: { id_externo: true, id: true, rh_empresas: true },
      });
      for (const empresa of empresas) {
        const urlPatch = `${escritorio.ds_url}${patch}${empresa.id_externo}`;
        createConsumoIntegracao({
          empresaId: empresa.id,
          dt_competencia: new Date().toString(),
          ds_consumo: 1,
          ds_tipo_consumo: 'API_DOMINIO',
          integracaoId: 'dominio',
        });
        console.log(`Sincronizando: ${urlPatch}`);
        let listaCentroCustos: any[] = [];

        try {
          const resposta = await fetch(urlPatch, {
            method: 'GET',
            headers: { 'ngrok-skip-browser-warning': 'true' },
          });
          if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
          }
          const data: any[] = await resposta.json();
          const centrosCustosRecebidos = [...data];

          centrosCustosRecebidos.forEach((centroCustosItem) => {
            try {
              if (centroCustosItem.id_externo != null) {
                centroCustosItem.id_externo = String(
                  centroCustosItem.id_externo
                );
              }
              if (!empresa.rh_empresas || empresa.rh_empresas.length === 0) {
                return;
              }
              centroCustosItem.id_rh_empresas = String(
                empresa.rh_empresas[0].id
              );
              if (
                centroCustosItem.ds_tipo != null &&
                centroCustosItem.ds_tipo == 0
              ) {
                centroCustosItem.ds_tipo = 'SINTÉTICO';
              } else {
                centroCustosItem.ds_tipo = 'ANALÍTICO';
              }
              listaCentroCustos.push(centroCustosItem);
            } catch (error) {
              console.error(
                `Erro ao processar registro de centro de custos: ${error.message}`
              );
            }
          });

          const resultados = await createOrUpdateCentroCustos(
            listaCentroCustos,
            empresa.id
          );
          retornos.push({ url: urlPatch, resultado: resultados });
        } catch (error: any) {
          console.error(
            `Erro ao sincronizar com ${urlPatch}: ${error.message}`
          );
          retornos.push({ url: urlPatch, sucesso: false, erro: error.message });
        }
      }
    }

    return retornos;
  } catch (error: any) {
    throw new Error('Erro ao obter centro de custos: ' + error.message);
  }
};

export const sincronizarCentroCustosByEmpresaId = async (
  empresaId: string
): Promise<any> => {
  const idExternoEmpresa = await prisma.sis_empresas.findFirst({
    where: {
      AND: [
        { id: empresaId },
        { js_access: { some: { js_modules: { has: 'RECURSOS_HUMANOS' } } } },
      ],
    },
    select: {
      id_externo: true,
      id_escritorio: true,
      id: true,
      rh_empresas: true,
    },
  });
  if (!idExternoEmpresa.id_escritorio) {
    idExternoEmpresa.id_escritorio = idExternoEmpresa.id;
  }
  const patch = '/dados/centrocustos/empresa/';
  try {
    const escritorios = await prisma.sis_empresas.findMany({
      where: {
        AND: [{ is_escritorio: true }, { id: idExternoEmpresa.id_escritorio }],
      },
      select: { ds_url: true, id: true },
    });

    let listaCentroCustos: any[] = [];
    await Promise.all(
      escritorios.map(async (escritorio) => {
        const urlPatch = `${escritorio.ds_url}${patch}${idExternoEmpresa.id_externo}`;
        console.log(`Sincronizando: ${urlPatch}`);
        createConsumoIntegracao({
          empresaId: escritorio.id,
          dt_competencia: new Date().toString(),
          ds_consumo: 1,
          ds_tipo_consumo: 'API_DOMINIO',
          integracaoId: 'dominio',
        });
        try {
          const resposta = await fetch(urlPatch, {
            method: 'GET',
            headers: { 'ngrok-skip-browser-warning': 'true' },
          });
          if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
          }
          const data: any[] = await resposta.json();
          const centrosCustosRecebidos = [...data];

          centrosCustosRecebidos.forEach((centroCustosItem) => {
            if (centroCustosItem.id_externo != null) {
              centroCustosItem.id_externo = String(centroCustosItem.id_externo);
            }
            if (
              idExternoEmpresa.rh_empresas &&
              idExternoEmpresa.rh_empresas.length > 0
            ) {
              centroCustosItem.id_rh_empresas = String(
                idExternoEmpresa.rh_empresas[0].id
              );
            }

            if (
              centroCustosItem.ds_tipo != null &&
              centroCustosItem.ds_tipo == 0
            ) {
              centroCustosItem.ds_tipo = 'SINTÉTICO';
            } else {
              centroCustosItem.ds_tipo = 'ANALÍTICO';
            }
            listaCentroCustos.push(centroCustosItem);
          });
        } catch (error: any) {
          console.error(
            `Erro ao sincronizar com ${urlPatch}: ${error.message}`
          );
        }
      })
    );

    const resultados = await createOrUpdateCentroCustos(
      listaCentroCustos,
      idExternoEmpresa.id
    );
    return resultados;
  } catch (error: any) {
    throw new Error('Erro ao obter centro de custos: ' + error.message);
  }
};
