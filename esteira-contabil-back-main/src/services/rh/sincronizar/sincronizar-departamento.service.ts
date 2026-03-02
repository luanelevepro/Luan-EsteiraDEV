import { createOrUpdateDepartamento } from '../departamento.service';
import { prisma } from '../../prisma';
import { createConsumoIntegracao } from '@/services/administrativo/consumo-integracao.service';

export const sincronizarDepartamento = async (): Promise<any> => {
  const patch = '/dados/departamento/empresa/';
  try {
    const escritorios = await prisma.sis_empresas.findMany({
      where: { is_escritorio: true },
      select: { ds_url: true, id_externo: true, id: true },
    });
    let retorno: any[] = [];

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
        let listaDepartamentos: any[] = [];
        try {
          const resposta = await fetch(urlPatch, {
            method: 'GET',
            headers: { 'ngrok-skip-browser-warning': 'true' },
          });
          if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
          }
          const data: any[] = await resposta.json();
          const departamentosRecebidos = [...data];
          departamentosRecebidos.forEach((departamentoItem) => {
            try {
              if (departamentoItem.id_externo != null) {
                departamentoItem.id_externo = String(
                  departamentoItem.id_externo
                );
              }
              if (empresa.rh_empresas && empresa.rh_empresas.length > 0) {
                departamentoItem.id_rh_empresas = String(
                  empresa.rh_empresas[0].id
                );
              } else {
                return;
              }
              listaDepartamentos.push(departamentoItem);
            } catch (error) {
              console.error(
                `Erro ao processar registro de departamento: ${error.message}`
              );
            }
          });
          const resultados = await createOrUpdateDepartamento(
            listaDepartamentos,
            empresa.id
          );
          retorno.push({ url: urlPatch, resultado: resultados });
        } catch (error: any) {
          console.error(
            `Erro ao sincronizar com ${urlPatch}: ${error.message}`
          );
          retorno.push({ url: urlPatch, sucesso: false, erro: error.message });
        }
      }
    }

    return retorno;
  } catch (error: any) {
    throw new Error('Erro ao obter departamentos: ' + error.message);
  }
};

export const sincronizarDepartamentoByEmpresaId = async (
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
  const patch = '/dados/departamento/empresa/';
  try {
    const escritorios = await prisma.sis_empresas.findMany({
      where: {
        AND: [{ is_escritorio: true }, { id: idExternoEmpresa.id_escritorio }],
      },
      select: { ds_url: true, id: true },
    });
    let listaDepartamentos: any[] = [];

    await Promise.all(
      escritorios.map(async (escritorio) => {
        const urlPatch = `${escritorio.ds_url}${patch}${idExternoEmpresa.id_externo}`;
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
          const departamentosRecebidos = [...data];

          departamentosRecebidos.forEach((departamentoItem) => {
            if (departamentoItem.id_externo != null) {
              departamentoItem.id_externo = String(departamentoItem.id_externo);
            }
            if (
              idExternoEmpresa.rh_empresas &&
              idExternoEmpresa.rh_empresas.length > 0
            ) {
              departamentoItem.id_rh_empresas = String(
                idExternoEmpresa.rh_empresas[0].id
              );
            }
            listaDepartamentos.push(departamentoItem);
          });
        } catch (error: any) {
          console.error(
            `Erro ao sincronizar com ${urlPatch}: ${error.message}`
          );
        }
      })
    );

    const resultados = await createOrUpdateDepartamento(
      listaDepartamentos,
      idExternoEmpresa.id
    );
    createConsumoIntegracao({
      empresaId,
      dt_competencia: new Date().toString(),
      ds_consumo: 1,
      ds_tipo_consumo: 'API_DOMINIO',
      integracaoId: 'dominio',
    });
    return resultados;
  } catch (error: any) {
    throw new Error('Erro ao obter departamentos: ' + error.message);
  }
};
