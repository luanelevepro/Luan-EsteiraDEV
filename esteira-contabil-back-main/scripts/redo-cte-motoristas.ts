import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MotoristaExtraction {
  nome: string | null;
  cpf: string | null;
}

// export const chamarRedo = async () => {
//   const allDfe = await prisma.fis_documento_dfe.findMany({
//     where: {
//       dt_emissao: { gte: new Date('2025-11-01') },
//     },
//     select: {
//       js_cte: {
//         select: {
//           ds_observacao: true,
//         },
//       },
//     },
//   });
//   allDfe.forEach((dfe) => {
//     extractMotoristaFromObs(dfe.js_cte?.ds_observacao || null);
//   });
// };

function cleanNome(nomeRaw: string | null): string | null {
  if (!nomeRaw) return null;
  // Remove números do início e fim, mantém apenas letras e espaços
  let cleaned = nomeRaw.replace(/^[^A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ]*/i, '').trim();
  cleaned = cleaned.replace(/[^A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ\s]/gi, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

function extractMotoristaFromObs(
  observacao: string | null
): MotoristaExtraction {
  if (!observacao) return { nome: null, cpf: null };

  const texto = String(observacao);

  let nome: string | null = null;
  let cpf: string | null = null;

  // Padrão 1: MOTORISTA: NOME; CPF: 00000000000
  let nomeMatch = texto.match(/MOTORISTA:\s*([^;:\n]+?)(?:\s*[;:]|\s*$)/i);
  let cpfMatch = texto.match(/CPF:\s*([0-9\.\/-]+)/i);

  if (nomeMatch) {
    nome = cleanNome(nomeMatch[1].trim());
  }
  if (cpfMatch) {
    cpf = cpfMatch[1].replace(/\D/g, '');
  }

  // Se encontrou dados com padrão 1, retorna
  if (nome || cpf) {
    return { nome, cpf };
  }

  // Padrão 2: Procura por "NOME, CPF" ou "NOME CPF" no texto
  // Tenta encontrar: NOME_SOBRENOME (maiúscula), CPF: 00000000000 ou apenas números
  const nomeCpfMatch = texto.match(
    /([A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ][A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ\s]+?),\s*(?:CPF[:\s]+)?(\d{2,})/i
  );

  if (nomeCpfMatch) {
    nome = cleanNome(nomeCpfMatch[1].trim());
    const potencialCpf = nomeCpfMatch[2].trim();
    // Verifica se é um CPF válido (11 dígitos)
    if (potencialCpf.replace(/\D/g, '').length === 11) {
      cpf = potencialCpf.replace(/\D/g, '');
    }
  }

  // Padrão 3: Se ainda não encontrou nome, tenta procurar apenas o nome (palavras maiúsculas consecutivas)
  if (!nome) {
    const soNomeMatch = texto.match(
      /(?:MOTORISTA|CONDUTOR|MOTORISTA PRINCIPAL)[\s:]+([A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ][A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ\s]+?)(?:\s*[;,\n]|$)/i
    );
    if (soNomeMatch) {
      nome = cleanNome(soNomeMatch[1].trim());
    }
  }

  // Última tentativa: procura por blocos de texto em maiúsculas (nome do motorista)
  if (!nome) {
    const ultimaTentativa = texto.match(
      /^([A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ][A-ZÀÁÂÃÄÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ\s]{2,}?)(?:\s*[,;]|\s*(?:CPF|CNH)|$)/m
    );
    if (ultimaTentativa) {
      nome = cleanNome(ultimaTentativa[1].trim());
    }
  }

  return { nome: nome || null, cpf: cpf || null };
}

export async function redoCteMotoristas() {
  try {
    console.log('🚀 Iniciando reprocessamento de motoristas dos CTes...\n');

    // Buscar todos os CTes com dt_emissao >= 01-11-2025
    const dataInicio = new Date('2026-01-01T00:00:00.000Z');

    const ctes = await prisma.fis_cte.findMany({
      where: {
        dt_emissao: {
          gte: dataInicio,
        },
      },
      select: {
        id: true,
        ds_numero: true,
        dt_emissao: true,
        ds_observacao: true,
        ds_nome_motorista: true,
        ds_documento_motorista: true,
      },
      orderBy: {
        dt_emissao: 'asc',
      },
    });

    console.log(`📊 Total de CTes encontrados: ${ctes.length}\n`);

    let processados = 0;
    let atualizados = 0;
    let semAlteracao = 0;
    let erros = 0;

    for (const cte of ctes) {
      try {
        const { nome, cpf } = extractMotoristaFromObs(cte.ds_observacao);

        // Verificar se há algo para atualizar
        const precisaAtualizar =
          (nome && nome !== cte.ds_nome_motorista) ||
          (cpf && cpf !== cte.ds_documento_motorista);

        if (precisaAtualizar) {
          await prisma.fis_cte.update({
            where: { id: cte.id },
            data: {
              ds_nome_motorista: nome,
              ds_documento_motorista: cpf,
            },
          });

          console.log(
            `✅ CTe ${cte.ds_numero} atualizado: ${nome || 'N/A'} | ${cpf || 'N/A'}`
          );
          atualizados++;
        } else {
          semAlteracao++;
        }

        processados++;

        // Log de progresso a cada 100 registros
        if (processados % 100 === 0) {
          console.log(`\n📈 Progresso: ${processados}/${ctes.length}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar CTe ${cte.ds_numero}:`, error);
        erros++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DO PROCESSAMENTO');
    console.log('='.repeat(60));
    console.log(`Total processados: ${processados}`);
    console.log(`✅ Atualizados: ${atualizados}`);
    console.log(`⏭️  Sem alteração: ${semAlteracao}`);
    console.log(`❌ Erros: ${erros}`);
    console.log('='.repeat(60) + '\n');

    console.log('✨ Script finalizado com sucesso!\n');
  } catch (error) {
    console.error('❌ Erro fatal durante execução do script:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
// redoCteMotoristas();
