import { createOrUpdateFuncionario } from '../funcionario.service';
import { sincronizarCargosByEmpresaId } from './sincronizar-cargos.service';
import { sincronizarDepartamentoByEmpresaId } from './sincronizar-departamento.service';
import { sincronizarCentroCustosByEmpresaId } from './sincronizar-centro-custos.service';
import { prisma } from '../../prisma';
import { createConsumoIntegracao } from '@/services/administrativo/consumo-integracao.service';
import MotoristaService from '@/services/tms/motorista.service';

export const sincronizarFuncionarios = async (): Promise<any> => {
  const patch = '/dados/funcionarios/empresa/';
  try {
    const escritorios = await prisma.sis_empresas.findMany({
      where: { is_escritorio: true },
      select: { ds_url: true, id_externo: true, id: true },
    });

    const resultados = await Promise.all(
      escritorios.map(async (escritorio) => {
        const empresas = await prisma.sis_empresas.findMany({
          where: {
            AND: [
              { id_escritorio: escritorio.id },
              {
                OR: [
                  {
                    js_access: {
                      some: { js_modules: { has: 'RECURSOS_HUMANOS' } },
                    },
                  },
                  { js_access: { some: { js_modules: { has: 'TMS' } } } },
                ],
              },
            ],
          },
          select: { id_externo: true, id: true, rh_empresas: true },
        });

        return Promise.all(
          empresas.map(async (empresa) => {
            const urlPatch = `${escritorio.ds_url}${patch}${empresa.id_externo}`;
            console.log(`Sincronizando: ${urlPatch}`);
            createConsumoIntegracao({
              empresaId: empresa.id,
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
              const funcionarios = [...data];

              const centroCustosIds = new Set<string>();
              const departamentoIds = new Set<string>();
              const cargoIds = new Set<string>();

              funcionarios.forEach((funcionario) => {
                if (funcionario.id_centro_custos) {
                  centroCustosIds.add(funcionario.id_centro_custos);
                }
                if (funcionario.id_departamento) {
                  departamentoIds.add(funcionario.id_departamento);
                }
                if (funcionario.id_cargo) {
                  cargoIds.add(funcionario.id_cargo);
                }
              });

              const centrosCustosArray = Array.from(centroCustosIds);
              const departamentosArray = Array.from(departamentoIds);
              const cargosArray = Array.from(cargoIds);
              const [centrosCustos, departamentos, cargos] = await Promise.all([
                prisma.rh_centro_custos.findMany({
                  where: {
                    id_externo: { in: centrosCustosArray },
                    id_rh_empresas: empresa.rh_empresas[0].id,
                  },
                  select: { id: true, id_externo: true },
                }),
                prisma.rh_departamento.findMany({
                  where: {
                    id_externo: { in: departamentosArray },
                    id_rh_empresas: empresa.rh_empresas[0].id,
                  },
                  select: { id: true, id_externo: true },
                }),
                prisma.rh_cargos.findMany({
                  where: {
                    id_externo: { in: cargosArray },
                    id_rh_empresas: empresa.rh_empresas[0].id,
                  },
                  select: { id: true, id_externo: true },
                }),
              ]);
              const centrosCustosMap = new Map(
                centrosCustos.map((item) => [item.id_externo, item.id])
              );
              const departamentosMap = new Map(
                departamentos.map((item) => [item.id_externo, item.id])
              );
              const cargosMap = new Map(
                cargos.map((item) => [item.id_externo, item.id])
              );
              const listaFuncionarios: any[] = [];
              for (const funcionario of funcionarios) {
                try {
                  if (funcionario.id_externo != null) {
                    funcionario.id_externo = String(funcionario.id_externo);
                  }

                  if (
                    !empresa.rh_empresas ||
                    empresa.rh_empresas.length === 0
                  ) {
                    console.warn(
                      `Empresa ${empresa.id_externo} não possui rh_empresas associada!`
                    );
                    continue;
                  }

                  funcionario.id_rh_empresas = String(
                    empresa.rh_empresas[0].id
                  );

                  if (funcionario.id_centro_custos) {
                    const idCentro = centrosCustosMap.get(
                      funcionario.id_centro_custos
                    );
                    if (!idCentro) {
                      console.warn(
                        `Centro de custos ${funcionario.id_centro_custos} não encontrado.`
                      );
                      funcionario.id_centro_custos = null;
                    } else {
                      funcionario.id_centro_custos = idCentro;
                    }
                  }
                  if (funcionario.id_departamento) {
                    const idDepartamento = departamentosMap.get(
                      funcionario.id_departamento
                    );
                    if (!idDepartamento) {
                      console.warn(
                        `Departamento ${funcionario.id_departamento} não encontrado.`
                      );
                      funcionario.id_departamento = null;
                    } else {
                      funcionario.id_departamento = idDepartamento;
                    }
                  }
                  if (funcionario.id_cargo) {
                    const idCargo = cargosMap.get(funcionario.id_cargo);
                    if (!idCargo) {
                      console.warn(
                        `Cargo ${funcionario.id_cargo} não encontrado.`
                      );
                      funcionario.id_cargo = null;
                    } else {
                      funcionario.id_cargo = idCargo;
                    }
                  }
                  listaFuncionarios.push(funcionario);
                } catch (error) {
                  console.error(
                    `Erro ao processar funcionário ${funcionario.ds_nome}:`,
                    error
                  );
                }
              }
              const resultado = await createOrUpdateFuncionario(
                listaFuncionarios,
                empresa.id
              );
              const motoristaService = new MotoristaService();
              await motoristaService.sincronizarMotoristas({
                empresaId: empresa.id,
              });
              return { url: urlPatch, resultado };
            } catch (error) {
              console.error(
                `Erro ao sincronizar com ${urlPatch}: ${error.message}`
              );
              return { url: urlPatch, sucesso: false, erro: error.message };
            }
          })
        );
      })
    );

    return resultados.flat();
  } catch (error) {
    throw new Error('Erro ao obter cargos: ' + error.message);
  }
};

export const sincronizarFuncionariosByEmpresaId = async (
  empresaId: string
): Promise<any> => {
  await sincronizarCargosByEmpresaId(empresaId);
  await sincronizarDepartamentoByEmpresaId(empresaId);
  await sincronizarCentroCustosByEmpresaId(empresaId);
  const idExternoEmpresa = await prisma.sis_empresas.findFirst({
    where: {
      id: empresaId,
      OR: [
        { js_access: { some: { js_modules: { has: 'RECURSOS_HUMANOS' } } } },
        { js_access: { some: { js_modules: { has: 'TMS' } } } },
      ],
    },
    select: {
      id_externo: true,
      id_escritorio: true,
      id: true,
      rh_empresas: true,
    },
  });

  if (!idExternoEmpresa || !idExternoEmpresa.rh_empresas?.length) {
    console.warn(
      `Empresa não encontrada, sem acesso ao RH ou sem registro em rh_empresas.`
    );
    return [];
  }
  if (!idExternoEmpresa.id_escritorio) {
    idExternoEmpresa.id_escritorio = idExternoEmpresa.id;
  }
  const escritorios = await prisma.sis_empresas.findMany({
    where: {
      AND: [{ is_escritorio: true }, { id: idExternoEmpresa.id_escritorio }],
    },
    select: { ds_url: true, id: true },
  });
  if (escritorios.length === 0) {
    console.warn(`Nenhum escritório encontrado para a empresa de ID externo.`);
    return [];
  }

  const patch = '/dados/funcionarios/empresa/';
  const funcionariosDeTodosEscritorios: any[] = [];
  const fetchResults: {
    escritorioId: string;
    urlPatch: string;
    qtd: number;
  }[] = [];

  await Promise.all(
    escritorios.map(async (escritorio) => {
      const urlPatch = `${escritorio.ds_url}${patch}${idExternoEmpresa.id_externo}`;
      console.log(`Sincronizando (fetch) de: ${urlPatch}`);

      try {
        const resposta = await fetch(urlPatch, {
          method: 'GET',
          headers: { 'ngrok-skip-browser-warning': 'true' },
        });

        if (!resposta.ok) {
          throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        const funcionariosApi: any[] = await resposta.json();
        const funcionarios = funcionariosApi ?? [];

        funcionariosDeTodosEscritorios.push(...funcionarios);

        fetchResults.push({
          escritorioId: String(escritorio.id),
          urlPatch,
          qtd: funcionarios.length,
        });
        createConsumoIntegracao({
          empresaId,
          dt_competencia: new Date().toString(),
          ds_consumo: 1,
          ds_tipo_consumo: 'API_DOMINIO',
          integracaoId: 'dominio',
        });
      } catch (error: any) {
        console.error(`Erro ao obter dados de ${urlPatch}: ${error.message}`);
        fetchResults.push({
          escritorioId: String(escritorio.id),
          urlPatch,
          qtd: 0,
        });
      }
    })
  );

  try {
    if (funcionariosDeTodosEscritorios.length === 0) {
      console.warn('Nenhum funcionário retornado de nenhum escritório.');
      return [];
    }

    const centroCustosSet = new Set<string>();
    const departamentoSet = new Set<string>();
    const cargoSet = new Set<string>();

    for (const f of funcionariosDeTodosEscritorios) {
      if (f.id_centro_custos) centroCustosSet.add(f.id_centro_custos);
      if (f.id_departamento) departamentoSet.add(f.id_departamento);
      if (f.id_cargo) cargoSet.add(f.id_cargo);
    }

    const centrosCustosArray = Array.from(centroCustosSet);
    const departamentosArray = Array.from(departamentoSet);
    const cargosArray = Array.from(cargoSet);

    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const centrosCustos = await prisma.rh_centro_custos.findMany({
      where: {
        id_externo: { in: centrosCustosArray },
        id_rh_empresas: idExternoEmpresa.rh_empresas[0].id,
      },
      select: { id: true, id_externo: true },
    });

    await delay(1000);

    const departamentos = await prisma.rh_departamento.findMany({
      where: {
        id_externo: { in: departamentosArray },
        id_rh_empresas: idExternoEmpresa.rh_empresas[0].id,
      },
      select: { id: true, id_externo: true },
    });

    await delay(1000);

    const cargos = await prisma.rh_cargos.findMany({
      where: {
        id_externo: { in: cargosArray },
        id_rh_empresas: idExternoEmpresa.rh_empresas[0].id,
      },
      select: { id: true, id_externo: true },
    });
    const centrosCustosMap = new Map(
      centrosCustos.map((item) => [item.id_externo, item.id])
    );
    const departamentosMap = new Map(
      departamentos.map((item) => [item.id_externo, item.id])
    );
    const cargosMap = new Map(cargos.map((item) => [item.id_externo, item.id]));

    const listaFuncionarios: any[] = [];
    for (const funcionario of funcionariosDeTodosEscritorios) {
      try {
        if (funcionario.id_externo != null) {
          funcionario.id_externo = String(funcionario.id_externo);
        }

        if (
          !idExternoEmpresa.rh_empresas ||
          idExternoEmpresa.rh_empresas.length === 0
        ) {
          console.warn(`Empresa não possui rh_empresas associada!`);
          continue;
        }

        funcionario.id_rh_empresas = String(idExternoEmpresa.rh_empresas[0].id);

        if (funcionario.id_centro_custos) {
          const idCentro = centrosCustosMap.get(funcionario.id_centro_custos);
          if (!idCentro) {
            console.warn(`Centro de custos não encontrado.`);
            funcionario.id_centro_custos = null;
          } else {
            funcionario.id_centro_custos = idCentro;
          }
        }

        if (funcionario.id_departamento) {
          const idDepartamento = departamentosMap.get(
            funcionario.id_departamento
          );
          if (!idDepartamento) {
            console.warn(`Departamento não encontrado.`);
            funcionario.id_departamento = null;
          } else {
            funcionario.id_departamento = idDepartamento;
          }
        }

        if (funcionario.id_cargo) {
          const idCargo = cargosMap.get(funcionario.id_cargo);
          if (!idCargo) {
            console.warn(`Cargo não encontrado.`);
            funcionario.id_cargo = null;
          } else {
            funcionario.id_cargo = idCargo;
          }
        }

        listaFuncionarios.push(funcionario);
      } catch (error) {
        console.error(
          `Erro ao processar funcionário "${funcionario.ds_nome}":`,
          error
        );
      }
    }

    let resultado;
    try {
      resultado = await createOrUpdateFuncionario(
        listaFuncionarios,
        idExternoEmpresa.id
      );
    } catch (err: any) {
      console.error(`Erro no createOrUpdateFuncionario:`, err.message);
      resultado = { erro: err.message };
    }
    const motoristaService = new MotoristaService();
    await motoristaService.sincronizarMotoristas({
      empresaId: empresaId,
    });
    return {
      fetchResults,
      funcionarioResults: resultado,
      totalFuncionarios: listaFuncionarios.length,
    };
  } catch (error: any) {
    throw new Error('Erro ao obter funcionários: ' + error.message);
  }
};
