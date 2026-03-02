import { prisma } from '../services/prisma';
import { NfseOrigem } from '@prisma/client';

export async function updateNfseOrigin() {
  console.log('Iniciando atualização de origem das notas fiscais...');

  try {
    // 1. Atualizar notas com discriminação específica para ESTEIRA
    const esteiraResult = await prisma.fis_nfse.updateMany({
      where: {
        ds_discriminacao: {
          contains: 'Descricao',
        },
      },
      data: {
        ds_origem: NfseOrigem.ESTEIRA,
      },
    });

    console.log(`Notas atualizadas para ESTEIRA: ${esteiraResult.count}`);

    // 2. Atualizar notas com status IMPORTADO para XML
    // Primeiro, buscar os IDs das notas que atendem ao critério
    const notasComDocumentoImportado = await prisma.fis_nfse.findMany({
      where: {
        fis_documento: {
          some: {
            ds_status: 'IMPORTADO',
          },
        },
      },
      select: {
        id: true,
      },
    });

    console.log(
      `Encontradas ${notasComDocumentoImportado.length} notas com documentos IMPORTADO`
    );

    // Atualizar essas notas usando os IDs encontrados
    const xmlResult = await prisma.fis_nfse.updateMany({
      where: {
        id: {
          in: notasComDocumentoImportado.map((nota) => nota.id),
        },
      },
      data: {
        ds_origem: NfseOrigem.XML,
      },
    });

    console.log(`Notas atualizadas para XML: ${xmlResult.count}`);

    // 3. Atualizar o restante para DOMINIO
    const dominioResult = await prisma.fis_nfse.updateMany({
      where: {
        ds_origem: null,
      },
      data: {
        ds_origem: NfseOrigem.DOMINIO,
      },
    });

    console.log(`Notas atualizadas para DOMINIO: ${dominioResult.count}`);

    // Resumo final
    const totalAtualizado =
      esteiraResult.count + xmlResult.count + dominioResult.count;
    console.log('\n==== RESUMO FINAL ====');
    console.log(`Total de notas atualizadas: ${totalAtualizado}`);
    console.log(`- ESTEIRA: ${esteiraResult.count}`);
    console.log(`- XML: ${xmlResult.count}`);
    console.log(`- DOMINIO: ${dominioResult.count}`);

    // Verificação adicional: mostrar estatísticas finais
    const estatisticasFinais = await prisma.fis_nfse.groupBy({
      by: ['ds_origem'],
      _count: {
        id: true,
      },
    });

    console.log('\n==== ESTATÍSTICAS FINAIS POR ORIGEM ====');
    estatisticasFinais.forEach((stat) => {
      console.log(`${stat.ds_origem || 'NULL'}: ${stat._count.id} notas`);
    });
  } catch (error) {
    console.error('Erro durante a atualização:', error);
    throw error;
  }
}

// Executar o script
updateNfseOrigin()
  .catch((e) => {
    console.error('Erro durante o processamento:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Processamento concluído');
  });
