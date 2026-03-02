import { createOrUpdateCargo } from '../cargo.service';
import { sincronizarCargosNivelSenioridade } from './sincronizar-cargos-nivel-senioridade.service';
import { prisma } from '../../prisma';
import { createConsumoIntegracao } from '@/services/administrativo/consumo-integracao.service';

export const sincronizarCargos = async (): Promise<any> => {
  const patch = '/dados/cargos/empresa/';
  try {
    const escritorios = await prisma.sis_empresas.findMany({
      where: { is_escritorio: true },
      select: { ds_url: true, id_externo: true, id: true },
    });
    const empresasProcessadas = new Set<string>();
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
        empresasProcessadas.add(empresa.id);
        const urlPatch = `${escritorio.ds_url}${patch}${empresa.id_externo}`;
        createConsumoIntegracao({
          empresaId: empresa.id,
          dt_competencia: new Date().toString(),
          ds_consumo: 1,
          ds_tipo_consumo: 'API_DOMINIO',
          integracaoId: 'dominio',
        });
        console.log(`Sincronizando: ${urlPatch}`);

        try {
          const resposta = await fetch(urlPatch, {
            method: 'GET',
            headers: { 'ngrok-skip-browser-warning': 'true' },
          });
          if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
          }
          const data: any[] = await resposta.json();
          const cargosRecebidos = [...data];
          let listaCargos: any[] = [];
          cargosRecebidos.forEach((cargo) => {
            try {
              if (cargo.id_externo != null) {
                cargo.id_externo = String(cargo.id_externo);
              }
              if (!empresa.rh_empresas || empresa.rh_empresas.length === 0) {
                return;
              }
              cargo.id_rh_empresas = String(empresa.rh_empresas[0].id);
              listaCargos.push(cargo);
            } catch (error) {
              console.error(`Erro ao processar cargo ${cargo.ds_nome}:`, error);
            }
          });
          const resultados = await createOrUpdateCargo(listaCargos, empresa.id);
          retornos.push({ url: urlPatch, resultado: resultados });
        } catch (error: any) {
          console.error(
            `Erro ao sincronizar com ${urlPatch}: ${error.message}`
          );
          retornos.push({ url: urlPatch, sucesso: false, erro: error.message });
        }
      }
    }

    const empresasUnicas = Array.from(empresasProcessadas);
    const syncResults = await Promise.all(
      empresasUnicas.map((empresaId) => {
        return sincronizarCargosNivelSenioridade(empresaId);
      })
    );

    return { cargoResults: retornos.flat(), syncResults };
  } catch (error: any) {
    throw new Error('Erro ao obter cargos: ' + error.message);
  }
};

export const sincronizarCargosByEmpresaId = async (
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
  const patch = '/dados/cargos/empresa/';
  try {
    const escritorios = await prisma.sis_empresas.findMany({
      where: {
        AND: [{ is_escritorio: true }, { id: idExternoEmpresa.id_escritorio }],
      },
      select: { ds_url: true, id: true },
    });

    let listaCargos: any[] = [];

    await Promise.all(
      escritorios.map(async (escritorio) => {
        const urlPatch = `${escritorio.ds_url}${patch}${idExternoEmpresa.id_externo}`;
        createConsumoIntegracao({
          empresaId,
          dt_competencia: new Date().toString(),
          ds_consumo: 1,
          ds_tipo_consumo: 'API_DOMINIO',
          integracaoId: 'dominio',
        });
        console.log(`Sincronizando: ${urlPatch}`);
        try {
          const resposta = await fetch(urlPatch, {
            method: 'GET',
            headers: { 'ngrok-skip-browser-warning': 'true' },
          });
          if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
          }
          const data: any[] = await resposta.json();
          const cargosRecebidos = [...data];
          cargosRecebidos.forEach((cargo) => {
            if (cargo.id_externo != null) {
              cargo.id_externo = String(cargo.id_externo);
            }
            if (
              !idExternoEmpresa.rh_empresas ||
              idExternoEmpresa.rh_empresas.length === 0
            ) {
              return;
            }
            cargo.id_rh_empresas = String(idExternoEmpresa.rh_empresas[0].id);
            listaCargos.push(cargo);
          });
        } catch (error: any) {
          console.error(
            `Erro ao sincronizar com ${urlPatch}: ${error.message}`
          );
        }
      })
    );
    const resultados = await createOrUpdateCargo(
      listaCargos,
      idExternoEmpresa.id
    );
    await sincronizarCargosNivelSenioridade(empresaId);

    return resultados;
  } catch (error: any) {
    throw new Error('Erro ao obter cargos: ' + error.message);
  }
};
