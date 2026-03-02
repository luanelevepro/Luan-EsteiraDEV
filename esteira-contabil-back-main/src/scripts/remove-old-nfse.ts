import { prisma } from '../services/prisma';

type CompanyResults = {
  nomeEmpresa: string;
  notasRemovidas: number;
  documentosRemovidos: number;
};

export const removeOldNfse = async () => {
  console.log('Iniciando remoção de notas fiscais antigas...');

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

  let totalNotasRemovidas = 0;
  let totalDocumentosRemovidos = 0;
  const resultadosDetalhados: Record<string, CompanyResults> = {};

  // Para cada empresa, buscar e remover notas antigas
  for (const empresa of empresas) {
    console.log(
      `\n==== Processando empresa: ${empresa.sis_empresas?.ds_razao_social || empresa.id} ====`
    );

    // Calcular o ano anterior
    const anoAtual = new Date().getFullYear();
    const anoAnterior = anoAtual - 1;

    // Primeiro, buscar os IDs das notas fiscais antigas
    const notasAntigas = await prisma.fis_nfse.findMany({
      where: {
        id_fis_empresas: empresa.id,
        dt_emissao: {
          lt: new Date(anoAnterior, 0, 1), // Menor que 1º de janeiro do ano anterior
        },
        fis_documento: {
          some: {
            // Mudou para 'some' porque agora é uma relação 1:N
            ds_status: {
              in: ['CONFERIDO_FISCAL', 'DIGITADO_FISCAL', 'CANCELADO'],
            },
          },
        },
      },
      select: {
        id: true,
        ds_numero: true,
        dt_emissao: true,
        fis_documento: {
          select: {
            id: true,
            ds_status: true,
          },
        },
      },
    });

    if (notasAntigas.length === 0) {
      console.log('Nenhuma nota fiscal antiga encontrada nesta empresa');
      continue;
    }

    console.log(
      `Encontradas ${notasAntigas.length} notas fiscais antigas para remoção`
    );

    // Mostrar mais detalhes sobre as notas que serão removidas
    let totalDocumentosParaRemover = 0;
    notasAntigas.forEach((nota) => {
      totalDocumentosParaRemover += nota.fis_documento.length;
    });

    console.log(
      `Total de documentos associados: ${totalDocumentosParaRemover}`
    );

    try {
      // Executar as remoções em lote dentro de uma transação
      const resultado = await prisma.$transaction(async (tx) => {
        // 1. Remover documentos em lote
        const documentosRemovidos = await tx.fis_documento.deleteMany({
          where: {
            id_nfse: {
              in: notasAntigas.map((nota) => nota.id),
            },
          },
        });

        // 2. Remover notas fiscais em lote
        const notasRemovidas = await tx.fis_nfse.deleteMany({
          where: {
            id: {
              in: notasAntigas.map((nota) => nota.id),
            },
          },
        });

        return {
          documentosRemovidos: documentosRemovidos.count,
          notasRemovidas: notasRemovidas.count,
        };
      });

      // Registrar resultados
      resultadosDetalhados[empresa.id] = {
        nomeEmpresa:
          empresa.sis_empresas?.ds_razao_social || 'Nome não disponível',
        notasRemovidas: resultado.notasRemovidas,
        documentosRemovidos: resultado.documentosRemovidos,
      };

      totalNotasRemovidas += resultado.notasRemovidas;
      totalDocumentosRemovidos += resultado.documentosRemovidos;

      console.log(
        `\nResumo do processamento para ${empresa.sis_empresas?.ds_razao_social || empresa.id}:`
      );
      console.log(`- Notas fiscais removidas: ${resultado.notasRemovidas}`);
      console.log(`- Documentos removidos: ${resultado.documentosRemovidos}`);
      console.log('-------------------');
    } catch (error) {
      console.error(
        `❌ Erro ao processar empresa ${empresa.sis_empresas?.ds_razao_social || empresa.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  // Resumo final
  console.log(`\n==== RESUMO FINAL ====`);
  console.log(`Total de notas fiscais removidas: ${totalNotasRemovidas}`);
  console.log(`Total de documentos removidos: ${totalDocumentosRemovidos}`);

  if (totalNotasRemovidas > 0) {
    console.log('\nEmpresas processadas:');
    Object.entries(resultadosDetalhados).forEach(([empresaId, info]) => {
      console.log(
        `- ${info.nomeEmpresa}: ${info.notasRemovidas} notas fiscais e ${info.documentosRemovidos} documentos removidos`
      );
    });
  }
};

removeOldNfse()
  .catch((e) => {
    console.error('Erro durante o processamento:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Processamento concluído');
  });
