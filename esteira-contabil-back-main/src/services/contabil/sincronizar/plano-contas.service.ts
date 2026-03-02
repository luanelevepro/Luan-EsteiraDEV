import { createConsumoIntegracao } from '@/services/administrativo/consumo-integracao.service';
import { prisma } from '../../prisma';
import { getClassPai } from '../functions/plano-contas-pattern-parser';
import {
  createOrUpdatePlanoContas,
  updatePlanoContasPai,
} from '../plano-contas.service';

export const sincronizarPlanoContasByEmpresaId = async (
  empresaId: string
): Promise<any> => {
  const idExternoEmpresa = await prisma.sis_empresas.findFirst({
    where: {
      AND: [
        { id: empresaId },
        {
          js_access: {
            some: { js_modules: { hasSome: ['CONTABILIDADE', 'TMS'] } },
          },
        },
      ],
    },
    select: {
      id_externo: true,
      id_escritorio: true,
      id: true,
      con_empresas: true,
    },
  });
  if (!idExternoEmpresa.id_escritorio) {
    idExternoEmpresa.id_escritorio = idExternoEmpresa.id;
  }
  const patch = '/dados/planocontas/empresa/';
  try {
    const escritorios = await prisma.sis_empresas.findMany({
      where: {
        AND: [{ is_escritorio: true }, { id: idExternoEmpresa.id_escritorio }],
      },
      select: { ds_url: true, id: true },
    });

    let listaPlanoContas: any[] = [];
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
          const planoContasRecebidos = [...data];

          planoContasRecebidos.forEach((planoContasItem) => {
            const [pai, nivel, ds_classificacao] = getClassPai(
              planoContasItem.ds_classificacao_cta,
              [1, 1, 1, 2, 3]
            );
            planoContasItem.ds_classificacao_pai = pai;
            planoContasItem.ds_classificacao_cta = ds_classificacao;
            planoContasItem.ds_nivel_cta = nivel;
            if (planoContasItem.id_externo != null) {
              planoContasItem.id_externo = String(planoContasItem.id_externo);
            }

            listaPlanoContas.push(planoContasItem);
          });
        } catch (error: any) {
          console.error(
            `Erro ao sincronizar com ${urlPatch}: ${error.message}`
          );
        }
      })
    );
    const resultados = await createOrUpdatePlanoContas(
      listaPlanoContas,
      idExternoEmpresa.id
    );
    await updatePlanoContasPai(idExternoEmpresa.id);
    return resultados;
  } catch (error: any) {
    throw new Error('Erro ao obter plano de contas: ' + error.message);
  }
};
