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

export const findDuplicateNfse = async () => {
  console.log('Iniciando detecção de notas fiscais duplicadas...');

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

  // Para cada empresa, buscar notas com número duplicado (violação da restrição única)
  for (const empresa of empresas) {
    console.log(
      `\n==== Verificando empresa: ${empresa.sis_empresas?.ds_razao_social || empresa.id} ====`
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
        comDocumentos: grupo.notas.some((n) => n.fis_documento.length > 0), // Mudou a verificação
      }));

    if (gruposDuplicados.length > 0) {
      console.log(
        `Encontrados ${gruposDuplicados.length} grupos de notas fiscais duplicadas`
      );

      resultadosDetalhados[empresa.id] = {
        nomeEmpresa:
          empresa.sis_empresas?.ds_razao_social || 'Nome não disponível',
        duplicados: gruposDuplicados,
      };

      // Exibir detalhes de cada grupo duplicado
      for (const grupo of gruposDuplicados) {
        // Valores originais para exibição
        const numerosEncontrados = new Set(grupo.notas.map((n) => n.ds_numero));

        console.log(
          `\nNF-e com número(s) [${Array.from(numerosEncontrados).join(', ')}] na empresa ${empresa.sis_empresas?.ds_razao_social || empresa.id} (${grupo.quantidade} ocorrências)`
        );
        console.log(
          `Isso viola a restrição única do banco de dados (id_fis_empresas, ds_numero)!`
        );
        console.log(
          grupo.comDocumentos
            ? '⚠️ ATENÇÃO: Possui documentos associados!'
            : '✓ Sem documentos associados'
        );

        // Exibir detalhes de cada nota no grupo
        console.log('Detalhes das notas:');
        for (const nota of grupo.notas) {
          console.log(`  - ID: ${nota.id}`);
          console.log(`    Número: ${nota.ds_numero}`);
          console.log(
            `    Código de Verificação: ${nota.ds_codigo_verificacao || 'Não informado'}`
          );
          console.log(
            `    Data Emissão: ${nota.dt_emissao?.toISOString() || 'Não informada'}`
          );
          console.log(
            `    Última atualização: ${nota.dt_updated?.toISOString() || 'Não informada'}`
          );
          console.log(
            `    ID Fornecedor: ${nota.id_fis_fornecedor || 'Não vinculado'}`
          );
          console.log(
            `    Documentos: ${
              nota.fis_documento.length > 0
                ? nota.fis_documento.map((doc) => doc.id).join(', ')
                : 'Não possui'
            }`
          );
        }
      }

      totalDuplicados += gruposDuplicados.length;
    } else {
      console.log(`Nenhuma nota fiscal duplicada encontrada nesta empresa`);
    }
  }

  // Resumo final
  console.log(`\n==== RESUMO FINAL ====`);
  console.log(
    `Total de grupos de notas fiscais duplicadas: ${totalDuplicados}`
  );

  if (totalDuplicados > 0) {
    console.log('\nEmpresas com notas fiscais duplicadas:');
    Object.entries(resultadosDetalhados).forEach(([empresaId, info]) => {
      const duplicadosComDocumentos = info.duplicados.filter(
        (d) => d.comDocumentos
      ).length;
      console.log(
        `- ${info.nomeEmpresa}: ${info.duplicados.length} grupos duplicados ${duplicadosComDocumentos > 0 ? `(${duplicadosComDocumentos} com documentos ⚠️)` : ''}`
      );
    });
  }

  console.log(
    '\n⚠️ ATENÇÃO: Essas duplicatas violam a restrição única (id_fis_empresas, ds_numero) e podem causar erros de migração.'
  );
};

findDuplicateNfse()
  .catch((e) => {
    console.error('Erro durante a detecção de notas fiscais duplicadas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Detecção de notas fiscais duplicadas concluída');
  });
