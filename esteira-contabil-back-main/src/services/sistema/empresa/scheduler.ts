import cron from 'node-cron';
import { prisma } from '../../prisma';
import pLimit from 'p-limit';
import { sincronizarEscritorio } from '../sincronizar.service';
import { sincronizarProdutos } from '@/services/fiscal/produto.service';
import { sincronizarFornecedoresByEmpresaId } from '@/services/fiscal/fornecedor.service';

/**
 * Executa as tarefas de sincronização para um escritório específico.
 *
 * Para cada escritório que possui configuração válida, executa em sequência:
 * 1. Sincronização do escritório com a API externa
 * 2. Sincronização de produtos para todas as empresas do escritório
 *
 * @param escritorioId - ID do escritório a ser processado
 */
async function runTasksForEmpresa(escritorioId: string) {
  try {
    await sincronizarEscritorio(escritorioId);
    const empresasOfEscritorio = await prisma.sis_empresas.findMany({
      where: { id_escritorio: escritorioId },
      select: { id: true },
    });
    empresasOfEscritorio.push({
      id: escritorioId,
    });
    for (const emp of empresasOfEscritorio) {
      await sincronizarProdutos(emp.id);
      await sincronizarFornecedoresByEmpresaId(emp.id);
    }
  } catch (err) {
    console.error(`Erro ao processar escritório ${escritorioId}:`, err);
  }
}

/**
 * Executa o processo de sincronização para todos os escritórios configurados.
 *
 * Consulta todos os escritórios cadastrados no sistema e executa as tarefas
 * de sincronização para cada um, incluindo sincronização de dados externos
 * e processamento de produtos.
 *
 * @param competencia - Competência específica para sincronização (opcional)
 */
async function scheduleRun(competencia?: string) {
  console.log('=== Iniciando processo de sincronização geral ===');

  const escritorios = await prisma.sis_empresas.findMany({
    where: { is_escritorio: true },
    select: { id: true },
  });

  if (escritorios.length === 0) {
    console.log('Nenhum escritório encontrado para sincronização.');
    return;
  }

  console.log(
    `Encontrados ${escritorios.length} escritório(s) para sincronização${
      competencia ? ` - Competência: ${competencia}` : ''
    }`
  );

  // Limita concorrência para 1 escritório por vez para evitar sobrecarga
  const limit = pLimit(1);
  const todasPromises: Promise<void>[] = [];

  for (const escritorio of escritorios) {
    const p = limit(() =>
      runTasksForEmpresa(escritorio.id).catch((err) => {
        console.error(
          `Erro na sincronização do escritório ${escritorio.id}:`,
          err
        );
      })
    );
    todasPromises.push(p);
  }

  await Promise.all(todasPromises);
  console.log(
    '=== Processo de sincronização concluído para todos os escritórios ==='
  );
}

/**
 * Agendamento automático de sincronização via cron.
 *
 * Configuração atual:
 * - Execução: Segunda a Sexta-feira às 03:00 (horário de Brasília)
 * - Timezone: America/Sao_Paulo
 * - Expressão cron: '0 18 * * 0,1,2,3,4'
 *
 * Motivos para este horário:
 * - Período de baixo uso do sistema (madrugada)
 * - Dados atualizados disponíveis para o início do expediente
 * - Menor impacto na performance durante horário comercial
 */
cron.schedule(
  '0 19 * * 0,1,2,3,4',
  () => {
    const agora = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
    console.log(
      `\n=== Iniciando sincronização automática agendada - ${agora} ===`
    );

    scheduleRun().catch((err) =>
      console.error('Erro durante execução da sincronização agendada:', err)
    );
  },
  {
    timezone: 'America/Sao_Paulo',
  }
);

export { runTasksForEmpresa, scheduleRun };
