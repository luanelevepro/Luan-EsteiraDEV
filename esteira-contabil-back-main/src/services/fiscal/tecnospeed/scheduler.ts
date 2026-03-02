import cron from 'node-cron';
import { prisma } from '../../prisma';
import {
  enviarCertificadosTecnospeed,
  SincronizarProtocolosTecnoSpeed,
  ColetarNotasTecnoSpeed,
  inclusaoNfseTecnoSpeed,
  getEmpresaTecnospeed,
} from './tecnospeed.service';
import { getFiscalEmpresa } from '../fiscal-empresa.service';
import { sincronizarFornecedoresByEmpresaId } from '../fornecedor.service';
import pLimit from 'p-limit';

async function runCertificados(empresaId: string) {
  try {
    console.log(
      `\nIniciando fluxo para empresa ${empresaId} (${new Date().toLocaleString()})`
    );
    await enviarCertificadosTecnospeed(empresaId);
    console.log(`enviarCertificadosTecnospeed concluído para ${empresaId}`);
  } catch (err) {
    console.error(`Erro geral ao processar empresa ${empresaId}:`, err);
  }
}
/**
 * Para cada empresa que possui certificado válido, chamamos em sequência:
 * 1) enviarCertificadosTecnospeed
 * 2) SincronizarProtocolosTecnoSpeed
 * 3) ColetarNotasTecnoSpeed (após 1 hora da chamada de SincronizarProtocolosTecnoSpeed)
 */
async function runTasksForEmpresa(empresaId: string, competencia?: string) {
  try {
    // sincroniza protocolos (gera um batch e grava requests)
    competencia = competencia || new Date().toISOString().slice(0, 7);
    console.log('Competencia de execução Tecnospeed: ', competencia);
    const fis_empresa = await getFiscalEmpresa(empresaId);
    const fis_empresas_tecnospeed = await getEmpresaTecnospeed(empresaId);
    await prisma.fis_empresas_tecnospeed.update({
      where: {
        id: fis_empresas_tecnospeed.id,
      },
      data: {
        ds_status_consulta: 'ABERTO',
      },
    });
    const temFornecedores = await prisma.fis_fornecedores.findMany({
      where: { id_fis_empresas: fis_empresa.id },
      select: { id_externo: true, ds_documento: true },
    });
    try {
      await sincronizarFornecedoresByEmpresaId(empresaId);
    } catch (err) {
      console.error(
        `Erro em sincronizarFornecedoresyEmpresaId para ${empresaId}:`,
        err
      );
    }
    await SincronizarProtocolosTecnoSpeed(empresaId, competencia);
    console.log(`SincronizarProtocolosTecnoSpeed concluído para ${empresaId}`);

    // após 1 hora, faz a coleta das notas para evitar bugs internos na tecnospeed
    setTimeout(
      async () => {
        try {
          await ColetarNotasTecnoSpeed(empresaId);
          console.log(
            `ColetarNotasTecnoSpeed concluído para ${empresaId} (${new Date().toLocaleString()})`
          );
          await inclusaoNfseTecnoSpeed(empresaId, competencia);
        } catch (err) {
          console.error(
            `Erro em ColetarNotasTecnoSpeed para ${empresaId}:`,
            err
          );
        }
      },
      60 * 60 * 1000
    ); // 1 hora = 60 min x 60 s x 1000 ms = 3.600.000 ms
  } catch (err) {
    console.error(`Erro geral ao processar empresa ${empresaId}:`, err);
  }
}

/**
 * Consulta todas as empresas que possuam certificado não expirado
 * e dispara runTasksForEmpresa para cada uma.
 */
async function scheduleRun(competencia?: string) {
  const agora = new Date();
  const empresasComCertificado = await prisma.sis_empresas.findMany({
    where: {
      js_certificados: {
        some: {
          dt_expiracao: { gt: agora },
        },
      },
    },
    select: { id: true },
  });

  if (empresasComCertificado.length === 0) {
    console.log(
      'Nenhuma empresa com certificado válido encontrada no momento.'
    );
    return;
  }
  const limit = pLimit(2);
  console.log(
    `Encontradas ${empresasComCertificado.length} empresa(s) com certificado válido:`
  );
  const todasPromises: Promise<void>[] = [];
  for (const { id } of empresasComCertificado) {
    await runCertificados(id).catch((err) => {
      console.error(`Erro em runCertificados(${id}):`, err);
    });
  }
  for (const { id } of empresasComCertificado) {
    const p = limit(() =>
      runTasksForEmpresa(id, competencia).catch((err) => {
        console.error(`Erro em runTasksForEmpresa(${id}):`, err);
      })
    );
    todasPromises.push(p);
  }
  await Promise.all(todasPromises);
  console.log(
    'Todas as empresas já concluiram o processo (inclui erros e sucessos'
  );
}

/**
 * Agendamento via cron:
 * - no nosso caso, todo sábado às 23:00 (fuso America/Sao_Paulo).
 * - a expressão de agendamento '0 23 * * 6' significa: minuto 0, hora 23, qualquer dia do mês, qualquer mês, no 6º dia da semana (sábado).
 * A o dia e hora definido se dá por alguns motivos:
 * - sábado é um dia de baixa atividade, reduzindo o impacto em momentos que o sistema é muito importante
 * - 23:00 é um horário em que a maioria das prefeituras aceita acesso para consulta de tomados
 */
cron.schedule(
  '0 23 * * 5', // '0 23 * * 6', original
  () => {
    console.log(
      `\n=== Iniciando tarefas agendadas (sábado 23:00) — ${new Date().toLocaleString()} ===`
    );
    scheduleRun().catch((err) =>
      console.error(' Erro ao executar scheduleRun():', err)
    );
  },
  {
    timezone: 'America/Sao_Paulo',
  }
);

export { runCertificados, runTasksForEmpresa, scheduleRun };
