import { Prisma, ModuleType } from '@prisma/client';
import { createOrUpdateEmpresa } from './empresa/empresa.service';
import { prisma } from '../prisma';
import { createConsumoIntegracao } from '../administrativo/consumo-integracao.service';

export const sincronizarEscritorio = async (
  idEscritorio: string
): Promise<any> => {
  const patch = '/dados/empresas';

  const successes: any[] = [];
  const errors: any[] = [];

  try {
    if (!idEscritorio) {
      throw new Error('Este não é um escritório válido.');
    }
    const escritorio = await prisma.sis_empresas.findUnique({
      where: { id: idEscritorio, is_escritorio: true },
      include: { js_empresas: true },
    });

    if (!escritorio) {
      throw new Error(`Escritório com ID ${idEscritorio} não encontrado`);
    }

    const urlPatch = escritorio.ds_url + patch;
    console.log(`Sincronizando: ${urlPatch}`);

    try {
      const resposta = await fetch(urlPatch, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!resposta.ok) {
        if (!resposta.ok) {
          if (resposta.status === 530) {
            throw new Error(`Tunel não está disponível.`);
          }
        }
        throw new Error(`Erro HTTP: ${resposta.status}`);
      }

      const data: any[] = await resposta.json();

      const itemEscritorio = data.find((item) => item.is_escritorio === true);

      if (!itemEscritorio) {
        throw new Error(`Nenhum escritório encontrado.`);
      }

      if (itemEscritorio.ds_documento !== escritorio.ds_documento) {
        throw new Error(
          `O escritório da URL encontrado (${itemEscritorio.ds_documento}) é diferente do escritório (${escritorio.ds_documento}) que fez a requisição.`
        );
      }

      // Obter todos os documentos das empresas recebidas
      const todosDocumentos = data
        .filter((empresa) => empresa.ds_documento && !empresa.is_escritorio)
        .map((empresa) => empresa.ds_documento);

      // Buscar todas as empresas existentes com esses documentos
      const todasEmpresasExistentes = await prisma.sis_empresas.findMany({
        where: {
          ds_documento: { in: todosDocumentos },
          is_escritorio: false,
        },
      });

      // Mapear empresas existentes por documento para fácil acesso
      const todasEmpresasExistentesPorDocumento = new Map(
        todasEmpresasExistentes.map((empresa) => [
          empresa.ds_documento,
          empresa,
        ])
      );

      // Mapear empresas do escritório atual
      const empresasCadastradas = new Map(
        escritorio.js_empresas.map((empresa) => [empresa.ds_documento, empresa])
      );

      // Identificar empresas que estão em outros escritórios
      const empresasTransferidas = data.filter(
        (empresa) =>
          todasEmpresasExistentesPorDocumento.has(empresa.ds_documento) &&
          todasEmpresasExistentesPorDocumento.get(empresa.ds_documento)
            .id_escritorio !== idEscritorio &&
          empresa.ds_documento &&
          !empresa.is_escritorio
      );

      // Atualizar empresas transferidas
      if (empresasTransferidas.length > 0) {
        const transferUpdates = empresasTransferidas.map((empresa) => {
          const empresaExistente = todasEmpresasExistentesPorDocumento.get(
            empresa.ds_documento
          );

          return prisma.sis_empresas.update({
            where: { id: empresaExistente.id },
            data: {
              id_escritorio: idEscritorio,
              id_externo: empresa.id_externo || empresaExistente.id_externo,
              ds_razao_social:
                empresa.ds_razao_social || empresaExistente.ds_razao_social,
              ds_fantasia:
                empresa.ds_fantasia && empresa.ds_fantasia.trim() !== ''
                  ? empresa.ds_fantasia
                  : (empresaExistente?.ds_fantasia || empresa.ds_razao_social),
              ds_apelido: empresa.ds_apelido || empresaExistente.ds_apelido,
              ds_nome: empresa.ds_nome || empresaExistente.ds_nome,
              ds_cnae: empresa.ds_cnae || empresaExistente.ds_cnae,
              ds_uf: empresa.ds_uf || empresaExistente.ds_uf,
              is_ativo: empresa.is_ativo ?? empresaExistente.is_ativo,
              dt_ativacao: empresa.dt_ativacao || empresaExistente.dt_ativacao,
              dt_inativacao:
                empresa.dt_inativacao || empresaExistente.dt_inativacao,
              ds_inscricao_municipal:
                empresa.ds_inscricao_municipal || empresaExistente.ds_inscricao_municipal,
              ds_inscricao_estadual:
                empresa.ds_inscricao_estadual || empresaExistente.ds_inscricao_estadual,
            },
          });
        });

        try {
          await prisma.$transaction(transferUpdates);

          // Adicionar as empresas transferidas às empresas do escritório atual
          for (const empresa of empresasTransferidas) {
            empresasCadastradas.set(
              empresa.ds_documento,
              todasEmpresasExistentesPorDocumento.get(empresa.ds_documento)
            );
          }
        } catch (error) {
          console.error('Erro ao transferir empresas:', error);
        }
      }

      // Filtrar apenas empresas realmente novas (que não estão em nenhum escritório)
      const empresasUnicas = data
        .filter(
          (empresa) =>
            !todasEmpresasExistentesPorDocumento.has(empresa.ds_documento) &&
            empresa.ds_documento &&
            !empresa.is_escritorio
        )
        .map((empresa) => ({
          ...empresa,
          id_escritorio: idEscritorio,
          ds_fantasia:
            empresa.ds_fantasia && empresa.ds_fantasia.trim() !== ''
              ? empresa.ds_fantasia
              : empresa.ds_razao_social,
        }));

      const empresasAtualizaveis = data.filter(
        (empresa) =>
          empresasCadastradas.has(empresa.ds_documento) &&
          !empresa.is_escritorio
      );

      escritorio.js_empresas = [];
      empresasAtualizaveis.push(escritorio);
      if (empresasUnicas.length > 0) {
        try {
          // Filter out fields that aren't in the schema
          const empresasUnicasFiltered = empresasUnicas.map((empresa) => ({
            id_externo: empresa.id_externo,
            ds_razao_social: empresa.ds_razao_social,
            ds_fantasia: empresa.ds_fantasia,
            ds_apelido: empresa.ds_apelido,
            ds_nome: empresa.ds_nome,
            ds_documento: empresa.ds_documento,
            is_ativo: empresa.is_ativo,
            dt_ativacao: empresa.dt_ativacao,
            dt_inativacao: empresa.dt_inativacao,
            ds_url: empresa.ds_url,
            ds_integration_key: empresa.ds_integration_key,
            ds_cnae: empresa.ds_cnae,
            ds_inscricao_municipal: empresa.ds_inscricao_municipal,
            ds_inscricao_estadual: empresa.ds_inscricao_estadual,
            ds_uf: empresa.ds_uf,
            is_escritorio: empresa.is_escritorio,
            id_escritorio: idEscritorio,
          }));

          const empresasCriadas = await prisma.sis_empresas.createMany({
            data: empresasUnicasFiltered,
            skipDuplicates: true,
          });

          if (empresasCriadas.count > 0) {
            try {
              const empresasIds = await prisma.sis_empresas.findMany({
                where: {
                  ds_documento: {
                    in: empresasUnicas.map((e) => e.ds_documento),
                  },
                },
                select: { id: true },
              });

              // Criação do array de acessos para o createMany
              const accesses = empresasIds.map((empresa) => ({
                id_empresas: empresa.id,
                js_modules: [ModuleType.ADM_EMPRESA],
              }));

              const accessInseridos = await prisma.sis_access.createMany({
                data: accesses,
                skipDuplicates: true,
              });
              createConsumoIntegracao({
                empresaId: escritorio.id,
                dt_competencia: new Date().toString(),
                ds_consumo: 1,
                ds_tipo_consumo: 'API_DOMINIO',
                integracaoId: 'dominio',
              });
            } catch (error) {
              console.error('Erro ao criar acessos em lote:', error.message);
            }
          }
        } catch (error) {
          console.error('Erro ao inserir empresas:', error);
        }
      }

      const updates = empresasAtualizaveis.map((empresa) => {
        const empresaExistente = empresasCadastradas.get(empresa.ds_documento);
        const dadoAtualizacao = data.find(
          (item) => item.ds_documento === empresa.ds_documento
        );

        return prisma.sis_empresas.update({
          where: { ds_documento: empresa.ds_documento },
          data: {
            ds_razao_social:
              dadoAtualizacao.ds_razao_social ??
              empresaExistente?.ds_razao_social,
            ds_fantasia:
              dadoAtualizacao.ds_fantasia &&
              dadoAtualizacao.ds_fantasia.trim() !== ''
                ? dadoAtualizacao.ds_fantasia
                : empresaExistente?.ds_fantasia || empresa.ds_razao_social,
            ds_apelido:
              dadoAtualizacao.ds_apelido ?? empresaExistente?.ds_apelido,
            ds_nome: dadoAtualizacao.ds_nome ?? empresaExistente?.ds_nome,
            ds_cnae: dadoAtualizacao.ds_cnae ?? empresaExistente?.ds_cnae,
            ds_uf: dadoAtualizacao.ds_uf ?? empresaExistente?.ds_uf,
            is_ativo: dadoAtualizacao.is_ativo ?? empresaExistente?.is_ativo,
            dt_ativacao:
              dadoAtualizacao.dt_ativacao ?? empresaExistente?.dt_ativacao,
            id_externo:
              dadoAtualizacao.id_externo ?? empresaExistente?.id_externo,
            dt_inativacao:
              dadoAtualizacao.dt_inativacao ?? empresaExistente?.dt_inativacao,
            id_escritorio: idEscritorio,
            ds_inscricao_municipal:
              dadoAtualizacao.ds_inscricao_municipal ??
              empresaExistente?.ds_inscricao_municipal,
            ds_inscricao_estadual:
              dadoAtualizacao.ds_inscricao_estadual ??
              empresaExistente?.ds_inscricao_estadual,
          },
        });
      });

      try {
        const result = await prisma.$transaction(updates);
      } catch (error) {
        console.error(`Erro ao atualizar empresas:`, error.message);
      }

      return { successes, errors };
    } catch (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

export const deleteAll = async (idEscritorio: string): Promise<any> => {
  const patch = '/dados/empresas';

  const successes: any[] = [];
  const errors: any[] = [];

  try {
    await prisma.sis_empresas.deleteMany({ where: { is_escritorio: false } });
  } catch (error) {
    throw new Error(error.message);
  }
};

export const sincronizarEmpresas = async (): Promise<any> => {
  const patch = '/dados/empresas';

  const successes: any[] = [];
  const errors: any[] = [];

  try {
    const empresas = await prisma.sis_empresas.findMany({
      where: { is_escritorio: true },
      select: {
        ds_url: true,
        id: true,
      },
    });

    const resultados = await Promise.all(
      empresas.map(async (empresa) => {
        const urlPatch = empresa.ds_url + patch;
        console.log(`Sincronizando: ${urlPatch}`);

        try {
          const resposta = await fetch(urlPatch, {
            method: 'GET',
            headers: {
              'ngrok-skip-browser-warning': 'true',
            },
          });

          if (!resposta.ok) {
            if (!resposta.ok) {
              if (resposta.status === 530) {
                throw new Error(`Tunel não está disponível.`);
              }
            }
            throw new Error(`Erro HTTP: ${resposta.status}`);
          }

          const data: any[] = await resposta.json();

          const empresasUnicas = Array.from(
            new Map(
              data.map((empresa) => [empresa.ds_documento, empresa])
            ).values()
          );

          for (const empresaUnica of empresasUnicas) {
            try {
              const result = await createOrUpdateEmpresa(empresaUnica);
              successes.push(result);
            } catch (error) {
              errors.push({ message: error.message });
            }
          }
          createConsumoIntegracao({
            empresaId: empresa.id,
            dt_competencia: new Date().toString(),
            ds_consumo: 1,
            ds_tipo_consumo: 'API_DOMINIO',
            integracaoId: 'dominio',
          });
          return { successes: successes, errors: errors };
        } catch (error) {
          console.error(
            `Erro ao sincronizar com ${urlPatch}: ${error.message}`
          );
          return { url: urlPatch, sucesso: false, erro: error.message };
        }
      })
    );

    return resultados;
  } catch (error) {
    throw new Error('Erro ao obter empresas: ' + error.message);
  }
};
