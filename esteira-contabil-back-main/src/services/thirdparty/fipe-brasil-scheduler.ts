import cron from 'node-cron';
import { sincronizarFipe } from './fipe-sync.service';

/**
 * Agendamento automático da sincronização FIPE via cron.
 *
 * Executa no primeiro sábado de cada mês às 02:00 (America/Sao_Paulo).
 * Expressão: 0 2 1-7 * 6
 * - minuto 0, hora 2
 * - dias 1 a 7 do mês (garante primeiro sábado)
 * - qualquer mês
 * - dia da semana 6 (sábado)
 */
cron.schedule(
  '0 2 1-7 * 6',
  () => {
    console.log(
      `\n=== Sincronização FIPE agendada (1º sábado do mês, 02:00) — ${new Date().toLocaleString()} ===`
    );
    sincronizarFipe().catch((err) =>
      console.error('[FipeBrasil] Erro ao executar sincronizarFipe():', err)
    );
  },
  {
    timezone: 'America/Sao_Paulo',
  }
);

export { sincronizarFipe };
