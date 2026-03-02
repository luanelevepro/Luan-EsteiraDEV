import { prisma } from '../../src/services/prisma';

type DuplicateGroup = {
  empresa: string;
  numero: string | null;
  quantidade: number;
  notas: Array<{
    id: string;
    ds_numero: string | null;
    ds_codigo_verificacao: string | null;
    dt_emissao: Date | null;
    dt_updated: Date;
    id_fis_fornecedor: string | null;
    fis_documento: Array<{ id: string }>; // Mudou para array
  }>;
  comDocumentos: boolean;
};

type CompanyResults = {
  nomeEmpresa: string;
  duplicados: DuplicateGroup[];
};

// Função para normalizar números removendo zeros à esquerda
const normalizarNumero = (numero: string | null): string => {
  if (!numero) return '';
  // Remove zeros à esquerda e retorna o número
  return numero.replace(/^0+/, '');
};

export const removeDuplicateNfse = async () => {
  console.log('Iniciando remoção de notas fiscais duplicadas...');

  // Buscar todas as empresas
  const empresas = await prisma.fis_empresas.findMany({
    select: {
      id: true,
      sis_empresas: {
        select: {
          ds_razao_social: true,
        },
      },
    },
  });

  console.log(`Encontradas ${empresas.length} empresas para processamento`);

  let totalRemovidos = 0;
  const resultadosDetalhados: Record<string, CompanyResults> = {};

  // Para cada empresa, buscar e tratar notas duplicadas
  for (const empresa of empresas) {
    console.log(
      `\n==== Processando empresa: ${empresa.sis_empresas?.ds_razao_social || empresa.id} ====`
    );

    // Buscar todas as notas fiscais para esta empresa
    const notas = await prisma.fis_nfse.findMany({
      where: {
        id_fis_empresas: empresa.id,
        // Filtrar apenas notas com número válido
        ds_numero: {
          not: null,
          notIn: [''],
        },
      },
      select: {
        id: true,
        ds_numero: true,
        ds_codigo_verificacao: true,
        dt_emissao: true,
        dt_updated: true,
        id_fis_fornecedor: true,
        fis_documento: {
          select: {
            id: true,
          },
        },
      },
    });

    // Agrupar notas pelo número normalizado (sem zeros à esquerda)
    const notasPorNumero = notas.reduce(
      (acc, nota) => {
        if (!nota.ds_numero) return acc;

        // Normalizar removendo zeros à esquerda
        const numeroNormalizado = normalizarNumero(nota.ds_numero);

        const chave = `${empresa.id}-${numeroNormalizado}`;

        if (!acc[chave]) {
          acc[chave] = {
            empresa: empresa.id,
            numero: nota.ds_numero,
            notas: [],
          };
        }
        acc[chave].notas.push(nota);
        return acc;
      },
      {} as Record<
        string,
        {
          empresa: string;
          numero: string | null;
          notas: Array<{
            id: string;
            ds_numero: string | null;
            ds_codigo_verificacao: string | null;
            dt_emissao: Date | null;
            dt_updated: Date;
            id_fis_fornecedor: string | null;
            fis_documento: Array<{ id: string }>; // Mudou para array
          }>;
        }
      >
    );

    // Filtrar para incluir apenas notas com o mesmo número na mesma empresa
    const gruposDuplicados = Object.entries(notasPorNumero)
      .filter(([_, grupo]) => grupo.notas.length > 1)
      .map(([chave, grupo]) => ({
        empresa: grupo.empresa,
        numero: grupo.numero,
        quantidade: grupo.notas.length,
        notas: grupo.notas,
        comDocumentos: grupo.notas.some((n) => n.fis_documento.length > 0), // Mudou para verificar array
      }));

    if (gruposDuplicados.length > 0) {
      console.log(
        `Encontrados ${gruposDuplicados.length} grupos de notas fiscais duplicadas que violam a restrição única`
      );

      resultadosDetalhados[empresa.id] = {
        nomeEmpresa:
          empresa.sis_empresas?.ds_razao_social || 'Nome não disponível',
        duplicados: gruposDuplicados,
      };

      // Processar cada grupo de duplicados
      for (const grupo of gruposDuplicados) {
        // Exibir informações sobre o grupo
        const numerosEncontrados = new Set(grupo.notas.map((n) => n.ds_numero));

        console.log(
          `\nProcessando nota fiscal: Número(s) [${Array.from(numerosEncontrados).join(', ')}] (${grupo.quantidade} ocorrências)`
        );
        console.log(
          `Isso viola a restrição única do banco de dados (id_fis_empresas, ds_numero)!`
        );
        console.log(
          grupo.comDocumentos
            ? '⚠️ ATENÇÃO: Possui documentos associados!'
            : '✓ Sem documentos associados'
        );

        // Buscar notas completas com seus documentos
        const notasCompletas = await prisma.fis_nfse.findMany({
          where: {
            id_fis_empresas: empresa.id,
            id: {
              in: grupo.notas.map((n) => n.id),
            },
          },
          orderBy: [
            // Depois ordenar por data de atualização
            { dt_updated: 'desc' },
          ],
          include: {
            fis_documento: true,
          },
        });

        if (notasCompletas.length <= 1) {
          console.log('Nenhum duplicado encontrado, continuando...');
          continue;
        }

        // Ordenar para priorizar notas com documentos
        notasCompletas.sort((a, b) => {
          // Primeiro critério: priorizar notas com documentos
          const aTemDocumento = a.fis_documento.length > 0;
          const bTemDocumento = b.fis_documento.length > 0;

          if (aTemDocumento && !bTemDocumento) return -1;
          if (!aTemDocumento && bTemDocumento) return 1;

          // Segundo critério: data de atualização mais recente
          return b.dt_updated.getTime() - a.dt_updated.getTime();
        });

        // Manter a nota mais relevante (com documento ou mais recente) e excluir o resto
        const notaManter = notasCompletas[0];
        const notasRemover = notasCompletas.slice(1);

        console.log(`Mantendo nota fiscal: ${notaManter.id}`);
        console.log(`    Número: ${notaManter.ds_numero}`);
        console.log(
          `    Código de Verificação: ${notaManter.ds_codigo_verificacao || 'Não informado'}`
        );
        console.log(
          `    Data emissão: ${notaManter.dt_emissao?.toISOString() || 'Não informada'}`
        );
        console.log(
          `    Data última atualização: ${notaManter.dt_updated.toLocaleString()}`
        );
        console.log(
          `    Documentos associados: ${notaManter.fis_documento.length > 0 ? notaManter.fis_documento.map((d) => d.id).join(', ') : 'Nenhum'}`
        );

        let documentosPreservados = 0;
        let notasExcluidas = 0;

        // Processar notas a serem removidas
        for (const notaRemover of notasRemover) {
          console.log(`\nProcessando nota para remoção: ${notaRemover.id}`);
          console.log(`    Número: ${notaRemover.ds_numero}`);
          console.log(
            `    Código de Verificação: ${notaRemover.ds_codigo_verificacao || 'Não informado'}`
          );
          console.log(
            `    Data emissão: ${notaRemover.dt_emissao?.toISOString() || 'Não informada'}`
          );
          console.log(
            `    Data última atualização: ${notaRemover.dt_updated.toLocaleString()}`
          );

          // Se a nota a ser removida tem documentos e a nota a manter tem poucos documentos,
          // transferir os documentos para a nota que vamos manter
          if (notaRemover.fis_documento.length > 0) {
            console.log(
              `Transferindo ${notaRemover.fis_documento.length} documento(s) para a nota ${notaManter.id}`
            );

            for (const documento of notaRemover.fis_documento) {
              try {
                // Atualiza o documento para apontar para a nota a manter
                await prisma.fis_documento.update({
                  where: {
                    id: documento.id,
                  },
                  data: {
                    id_nfse: notaManter.id,
                  },
                });

                documentosPreservados++;
                console.log(
                  `✅ Documento ${documento.id} transferido com sucesso`
                );
              } catch (error) {
                console.error(
                  `❌ Erro ao transferir documento ${documento.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
                );
              }
            }
          }

          try {
            // Excluir a nota fiscal duplicada
            await prisma.fis_nfse.delete({
              where: {
                id: notaRemover.id,
              },
            });

            console.log(`✅ Nota fiscal excluída com sucesso`);
            notasExcluidas++;
            totalRemovidos++;
          } catch (error) {
            console.error(
              `❌ Erro ao excluir nota fiscal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
            );
          }
        }

        console.log(
          `\nResumo do processamento para nota(s) [${Array.from(numerosEncontrados).join(', ')}]:`
        );
        console.log(
          `- Documentos preservados/transferidos: ${documentosPreservados}`
        );
        console.log(`- Notas fiscais excluídas: ${notasExcluidas}`);
        console.log('-------------------');
      }
    } else {
      console.log(`Nenhuma nota fiscal duplicada encontrada nesta empresa`);
    }
  }

  // Resumo final
  console.log(`\n==== RESUMO FINAL ====`);
  console.log(`Total de notas fiscais removidas: ${totalRemovidos}`);

  if (totalRemovidos > 0) {
    console.log('\nEmpresas processadas:');
    Object.entries(resultadosDetalhados).forEach(([empresaId, info]) => {
      console.log(
        `- ${info.nomeEmpresa}: ${info.duplicados.reduce((total, grupo) => total + grupo.quantidade - 1, 0)} notas fiscais removidas`
      );
    });
    console.log(
      '\n✅ A restrição única (id_fis_empresas, ds_numero) agora pode ser aplicada com sucesso.'
    );
  }
};

// Função para remover documentos órfãos (sem notas associadas)
const removeOrphanedDocuments = async () => {
  console.log('\n==== Iniciando limpeza de documentos órfãos ====');
  console.log('Buscando documentos sem notas fiscais associadas...');

  // Encontrar documentos onde id_nfse está nulo ou aponta para uma nota que não existe mais
  const documentosOrfaos = await prisma.fis_documento.findMany({
    where: {
      OR: [
        { id_nfse: null },
        {
          id_nfse: {
            not: null,
          },
          js_nfse: null, // Mudou de js_nfse para fis_nfse
        },
      ],
    },
    include: {
      fis_empresas: {
        select: {
          sis_empresas: {
            select: {
              ds_razao_social: true,
            },
          },
        },
      },
    },
  });

  if (documentosOrfaos.length === 0) {
    console.log('Nenhum documento órfão encontrado.');
    return 0;
  }

  console.log(
    `Encontrados ${documentosOrfaos.length} documentos sem notas fiscais associadas.`
  );

  // Agrupar por empresa para relatório
  const documentosPorEmpresa: Record<
    string,
    { nome: string; documentos: typeof documentosOrfaos }
  > = {};

  for (const doc of documentosOrfaos) {
    if (!documentosPorEmpresa[doc.id_fis_empresas]) {
      documentosPorEmpresa[doc.id_fis_empresas] = {
        nome:
          doc.fis_empresas?.sis_empresas?.ds_razao_social ||
          'Nome não disponível',
        documentos: [],
      };
    }
    documentosPorEmpresa[doc.id_fis_empresas].documentos.push(doc);
  }

  // Exibir informações dos documentos órfãos
  Object.entries(documentosPorEmpresa).forEach(([empresaId, info]) => {
    console.log(`\n- Empresa: ${info.nome}`);
    console.log(`  Documentos órfãos: ${info.documentos.length}`);
  });

  // Confirmar exclusão
  console.log(`\nRemovendo ${documentosOrfaos.length} documentos órfãos...`);

  let removidos = 0;

  // Excluir os documentos órfãos
  for (const doc of documentosOrfaos) {
    try {
      await prisma.fis_documento.delete({
        where: {
          id: doc.id,
        },
      });
      removidos++;

      if (removidos % 10 === 0) {
        console.log(
          `Progresso: ${removidos}/${documentosOrfaos.length} documentos removidos`
        );
      }
    } catch (error) {
      console.error(
        `❌ Erro ao excluir documento ${doc.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  console.log(
    `\n✅ Limpeza concluída: ${removidos} documentos órfãos foram removidos.`
  );
  return removidos;
};

removeDuplicateNfse()
  .then(async () => {
    console.log('\nIniciando verificação de documentos órfãos...');
    const documentosRemovidosCount = await removeOrphanedDocuments();

    if (documentosRemovidosCount > 0) {
      console.log(
        `\nTotal de documentos órfãos removidos: ${documentosRemovidosCount}`
      );
    }
  })
  .catch((e) => {
    console.error('Erro durante o processamento:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Processamento concluído');
  });
