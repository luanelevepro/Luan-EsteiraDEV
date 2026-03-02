import cron from 'node-cron';
import { prisma } from '../../prisma';
import {
  coletarCteSaidaSieg,
  coletarCteSieg,
  coletarNfceSaidaSieg,
  coletarNfeSaidaSieg,
  coletarNfeSieg,
  coletarNfseSaidaSieg,
  coletarNfseSieg,
} from './sieg.service';
import {
  sincronizarDominioNfseByEmpresaId,
  sincronizarDominioNfeByEmpresaId,
} from '../nota-fiscal.service';
import pLimit from 'p-limit';
import { sincronizarFornecedoresByEmpresaId } from '../fornecedor.service';

/**
 * Para cada empresa que possui configuração com a integração do SIEG, chamamos em sequência:
 * 1) coletarNfseSieg
 * 2) sincronizarDominioByEmpresaId
 */
async function runTasksForEmpresa(empresaId: string, competencia?: string) {
  try {
    let dt_competencia: any;
    if (!competencia) {
      dt_competencia = new Date().toISOString().slice(0, 7);
    } else {
      dt_competencia = competencia;
    }
    console.log('Competencia de execução SIEG: ', dt_competencia);

    await sincronizarFornecedoresByEmpresaId(empresaId);
    await Promise.all([
      await coletarNfseSieg(empresaId, dt_competencia),
      await coletarCteSieg(empresaId, dt_competencia),
      await coletarNfeSieg(empresaId, dt_competencia),
    ]);
    await Promise.all([
      coletarCteSaidaSieg(empresaId, dt_competencia),
      coletarNfceSaidaSieg(empresaId, dt_competencia),
      coletarNfeSaidaSieg(empresaId, dt_competencia),
      coletarNfseSaidaSieg(empresaId, dt_competencia),
    ]);
    // await coletarNfseSaidaSieg(empresaId, dt_competencia);
    // await coletarNfeSaidaSieg(empresaId, dt_competencia);
    // await coletarCteSaidaSieg(empresaId, dt_competencia);
    await sincronizarDominioNfseByEmpresaId(empresaId, dt_competencia);
    await sincronizarDominioNfeByEmpresaId(empresaId, dt_competencia);
  } catch (err) {
    console.error(`Erro geral ao processar empresa ${empresaId}:`, err);
  }
}

/**
 * Consulta todas as empresas que possuam configuração com a integração do SIEG
 * e dispara runTasksForEmpresa para cada uma, onde coletará as notas no SIEG e na DOMINIO.
 */
async function scheduleRun(comptencia?: string) {
  const empresasComIntegracao = await prisma.$transaction(async (prisma) => {
    let empresas: { id: string }[] = [];
    const integracao = await prisma.sis_integracao.findFirst({
      where: { ds_nome: 'SIEG' },
      select: { id: true },
    });
    const escritorios = await prisma.sis_empresas.findMany({
      where: { is_escritorio: true },
      select: { id: true },
    });
    for (const { id } of escritorios) {
      let cfg = await prisma.sis_integracao_config.findFirst({
        where: {
          id_sis_empresas: id,
          id_integracao: integracao?.id,
          js_integracao: { ds_nome: 'SIEG' },
        },
        select: { ds_valores_config: true, id_sis_empresas: true },
      });
      if (!cfg) continue;
      const empresasComCfg = await prisma.sis_empresas.findMany({
        where: { id_escritorio: cfg.id_sis_empresas },
        select: { id: true },
      });
      empresas.push(...empresasComCfg);
    }
    return empresas;
  });

  if (empresasComIntegracao.length === 0) {
    console.log('Nenhuma empresa com api key válido encontrada no momento.');
    return;
  }

  console.log(
    `Encontradas ${empresasComIntegracao.length} empresa(s) com api key válido:`
  );
  // concorrencia de 5
  const limit = pLimit(1);
  const todasPromises: Promise<void>[] = [];
  // calcular competências: mês atual e mês anterior (formato YYYY-MM)
  const now = new Date();
  const competenciaAtual = now.toISOString().slice(0, 7);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const competenciaAnterior = prevDate.toISOString().slice(0, 7);

  console.log(
    'Competências a processar:',
    competenciaAnterior,
    competenciaAtual
  );

  for (const { id } of empresasComIntegracao) {
    for (const comp of [competenciaAnterior, competenciaAtual]) {
      const p = limit(() =>
        runTasksForEmpresa(id, comp).catch((err) => {
          console.error(`Erro em runTasksForEmpresa(${id}, ${comp}):`, err);
        })
      );
      todasPromises.push(p);
    }
  }
  await Promise.all(todasPromises);
  console.log(
    'Todas as empresas já concluiram o processo (inclui erros e sucessos)'
  );
}

/**
 * Agendamento via cron:
 * - no nosso caso, todos os dias (fuso America/Sao_Paulo).
 * - a expressão de agendamento '0 23 * * *' significa: minuto 0, hora 23, qualquer dia do mês, qualquer mês, em qualquer dia da semana (sábado).
 * O dia e hora definido se dá por alguns motivos:
 * - diariamente é necessário coletar as notas do SIEG e da DOMINIO para comparação
 * - 23:00 é um horário de baixo consumo de recursos do sistema
 */
cron.schedule(
  '0 1 * * 1,2,3,4,5',
  () => {
    console.log(
      `\n=== Iniciando tarefas agendadas (diariamente 01:00) — ${new Date().toLocaleString()} ===`
    );
    scheduleRun().catch((err) =>
      console.error(' Erro ao executar scheduleRun():', err)
    );
  },
  {
    timezone: 'America/Sao_Paulo',
  }
);

export { runTasksForEmpresa, scheduleRun };
