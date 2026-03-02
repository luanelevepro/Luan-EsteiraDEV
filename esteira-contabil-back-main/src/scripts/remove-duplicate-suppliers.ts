import { prisma } from '../../src/services/prisma';

type DuplicateGroup = {
  documento: string;
  quantidade: number;
  fornecedores: Array<{
    id: string;
    ds_nome: string | null;
    ds_documento: string | null;
    _count: { fis_nfse: number };
  }>;
  comNotasFiscais: boolean;
};

type CompanyResults = {
  nomeEmpresa: string;
  duplicados: DuplicateGroup[];
};

export const removeDuplicateSuppliers = async () => {
  console.log('Iniciando remoção de fornecedores duplicados...');

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

  // Para cada empresa, buscar e tratar fornecedores duplicados
  for (const empresa of empresas) {
    console.log(
      `\n==== Processando empresa: ${empresa.sis_empresas?.ds_razao_social || empresa.id} ====`
    );

    // Buscar todos fornecedores com documentos não vazios para esta empresa
    const fornecedores = await prisma.fis_fornecedores.findMany({
      where: {
        id_fis_empresas: empresa.id,
        ds_documento: {
          not: null,
          notIn: [''],
        },
      },
      select: {
        id: true,
        ds_nome: true,
        ds_documento: true,
        _count: {
          select: {
            fis_nfse: true,
          },
        },
      },
    });

    // Agrupar fornecedores por documento
    const fornecedoresPorDocumento = fornecedores.reduce(
      (acc, fornecedor) => {
        const documento = fornecedor.ds_documento;
        if (!documento) return acc;

        if (!acc[documento]) {
          acc[documento] = [];
        }
        acc[documento].push(fornecedor);
        return acc;
      },
      {} as Record<
        string,
        Array<{
          id: string;
          ds_nome: string | null;
          ds_documento: string | null;
          _count: { fis_nfse: number };
        }>
      >
    );

    // Filtrar para incluir apenas documentos com múltiplos fornecedores
    const gruposDuplicados = Object.entries(fornecedoresPorDocumento)
      .filter(([_, fornecedores]) => fornecedores.length > 1)
      .map(([documento, fornecedores]) => ({
        documento,
        quantidade: fornecedores.length,
        fornecedores,
        comNotasFiscais: fornecedores.some((f) => f._count.fis_nfse > 0),
      }));

    if (gruposDuplicados.length > 0) {
      console.log(
        `Encontrados ${gruposDuplicados.length} grupos de documentos duplicados`
      );

      resultadosDetalhados[empresa.id] = {
        nomeEmpresa:
          empresa.sis_empresas?.ds_razao_social || 'Nome não disponível',
        duplicados: gruposDuplicados,
      };

      // Processar cada grupo de duplicados
      for (const grupo of gruposDuplicados) {
        const documento = grupo.documento;

        console.log(
          `\nProcessando documento: ${documento} (${grupo.quantidade} ocorrências)`
        );
        console.log(
          grupo.comNotasFiscais
            ? '⚠️ ATENÇÃO: Possui notas fiscais associadas!'
            : '✓ Sem notas fiscais associadas'
        );

        // Buscar todos os fornecedores duplicados completos para este documento
        const fornecedoresCompletos = await prisma.fis_fornecedores.findMany({
          where: {
            id_fis_empresas: empresa.id,
            ds_documento: documento,
          },
          orderBy: {
            dt_updated: 'desc', // O mais recentemente atualizado primeiro
          },
          include: {
            fis_nfse: {
              select: {
                id: true,
              },
            },
          },
        });

        if (fornecedoresCompletos.length <= 1) {
          console.log('Nenhum duplicado encontrado, continuando...');
          continue;
        }

        // Manter o primeiro (mais recentemente atualizado) e excluir o resto
        const fornecedorManter = fornecedoresCompletos[0];
        const fornecedoresRemover = fornecedoresCompletos.slice(1);

        console.log(
          `Mantendo fornecedor: ${fornecedorManter.id} (${fornecedorManter.ds_nome || 'Sem nome'})`
        );
        console.log(
          `- Data última atualização: ${fornecedorManter.dt_updated.toLocaleString()}`
        );
        console.log(
          `- Notas fiscais associadas: ${fornecedorManter.fis_nfse.length}`
        );

        let notasAtualizadas = 0;
        let fornecedoresExcluidos = 0;

        // Verificar e atualizar registros relacionados
        for (const fornecedorRemover of fornecedoresRemover) {
          console.log(
            `\nProcessando fornecedor para remoção: ${fornecedorRemover.id} (${fornecedorRemover.ds_nome || 'Sem nome'})`
          );
          console.log(
            `- Data última atualização: ${fornecedorRemover.dt_updated.toLocaleString()}`
          );

          const notasFiscais = fornecedorRemover.fis_nfse;

          if (notasFiscais.length > 0) {
            console.log(
              `Atualizando ${notasFiscais.length} notas fiscais para apontar para o fornecedor ${fornecedorManter.id}`
            );

            // Atualizar registros de NFSe para apontar para o fornecedor que estamos mantendo
            await prisma.fis_nfse.updateMany({
              where: {
                id_fis_fornecedor: fornecedorRemover.id,
              },
              data: {
                id_fis_fornecedor: fornecedorManter.id,
              },
            });

            notasAtualizadas += notasFiscais.length;
          } else {
            console.log('✓ Sem notas fiscais para migrar');
          }

          try {
            // Excluir o fornecedor duplicado
            await prisma.fis_fornecedores.delete({
              where: {
                id: fornecedorRemover.id,
              },
            });

            console.log(`✅ Fornecedor excluído com sucesso`);
            fornecedoresExcluidos++;
            totalRemovidos++;
          } catch (error) {
            console.error(
              `❌ Erro ao excluir fornecedor: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
            );
          }
        }

        console.log(`\nResumo do processamento para documento ${documento}:`);
        console.log(`- Notas fiscais migradas: ${notasAtualizadas}`);
        console.log(`- Fornecedores excluídos: ${fornecedoresExcluidos}`);
        console.log('-------------------');
      }
    } else {
      console.log(`Nenhum fornecedor duplicado encontrado nesta empresa`);
    }
  }

  // Resumo final
  console.log(`\n==== RESUMO FINAL ====`);
  console.log(`Total de fornecedores removidos: ${totalRemovidos}`);

  if (totalRemovidos > 0) {
    console.log('\nEmpresas processadas:');
    Object.entries(resultadosDetalhados).forEach(([empresaId, info]) => {
      console.log(
        `- ${info.nomeEmpresa}: ${info.duplicados.reduce((total, grupo) => total + grupo.fornecedores.length - 1, 0)} fornecedores removidos`
      );
    });
  }
};

removeDuplicateSuppliers()
  .catch((e) => {
    console.error('Erro durante a remoção de fornecedores duplicados:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Remoção de fornecedores duplicados concluída');
  });
