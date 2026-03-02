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

export const findDuplicateSuppliers = async () => {
  console.log('Iniciando detecção de fornecedores duplicados...');

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

  console.log(`Encontradas ${empresas.length} empresas para verificação`);

  let totalDuplicados = 0;
  let resultadosDetalhados: Record<string, CompanyResults> = {};

  // Para cada empresa, buscar fornecedores com documentos duplicados
  for (const empresa of empresas) {
    console.log(
      `\n==== Verificando empresa: ${empresa.sis_empresas?.ds_razao_social || empresa.id} ====`
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

      // Exibir detalhes de cada documento duplicado
      for (const grupo of gruposDuplicados) {
        console.log(
          `\nDocumento: ${grupo.documento} (${grupo.quantidade} ocorrências)`
        );
        console.log(
          grupo.comNotasFiscais
            ? '⚠️ ATENÇÃO: Possui notas fiscais associadas!'
            : '✓ Sem notas fiscais associadas'
        );

        // Exibir detalhes de cada fornecedor no grupo
        console.log('Detalhes dos fornecedores:');
        for (const fornecedor of grupo.fornecedores) {
          const notasFiscais = fornecedor._count.fis_nfse;
          console.log(`  - ID: ${fornecedor.id}`);
          console.log(`    Nome: ${fornecedor.ds_nome || 'Sem nome'}`);
          console.log(
            `    Notas Fiscais: ${notasFiscais} ${notasFiscais > 0 ? '⚠️' : '✓'}`
          );
        }
      }

      totalDuplicados += gruposDuplicados.length;
    } else {
      console.log(`Nenhum fornecedor duplicado encontrado nesta empresa`);
    }
  }

  // Resumo final
  console.log(`\n==== RESUMO FINAL ====`);
  console.log(`Total de grupos de documentos duplicados: ${totalDuplicados}`);

  if (totalDuplicados > 0) {
    console.log('\nEmpresas com fornecedores duplicados:');
    Object.entries(resultadosDetalhados).forEach(([empresaId, info]) => {
      const duplicadosComNotas = info.duplicados.filter(
        (d) => d.comNotasFiscais
      ).length;
      console.log(
        `- ${info.nomeEmpresa}: ${info.duplicados.length} grupos duplicados ${duplicadosComNotas > 0 ? `(${duplicadosComNotas} com notas fiscais ⚠️)` : ''}`
      );
    });
  }
};

findDuplicateSuppliers()
  .catch((e) => {
    console.error('Erro durante a detecção de fornecedores duplicados:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Detecção de fornecedores duplicados concluída');
  });
