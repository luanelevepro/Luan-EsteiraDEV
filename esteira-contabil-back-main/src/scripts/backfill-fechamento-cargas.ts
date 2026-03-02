/**
 * Backfill de tms_fechamento_cargas e tms_fechamento_viagens para fechamentos históricos.
 * Insere vínculos faltantes (createMany skipDuplicates) e deriva viagens a partir das cargas.
 * Inclusive em fechamentos FECHADOS.
 * Executar após deploy da feature "Fechamento por Cargas ENTREGUE".
 *
 * Uso: npx ts-node src/scripts/backfill-fechamento-cargas.ts
 */
import { prisma } from '../services/prisma';
import FechamentoMotoristasService from '../services/tms/fechamento-motoristas.service';

async function main() {
  const service = new FechamentoMotoristasService();

  const fechamentos = await prisma.tms_fechamentos.findMany({
    select: { id: true, competencia: true, id_tms_motoristas: true },
    orderBy: [{ competencia: 'asc' }, { id: 'asc' }],
  });

  console.log(
    `[backfill-fechamento-cargas] ${fechamentos.length} fechamento(s) encontrado(s).`
  );

  let totalCargas = 0;
  let totalViagens = 0;
  for (const f of fechamentos) {
    try {
      const result = await service.backfillCargasDoFechamentoSemRemover(f.id);
      if (result.cargasIncluidas > 0 || result.viagensIncluidas > 0) {
        const parts: string[] = [];
        if (result.cargasIncluidas > 0)
          parts.push(`+${result.cargasIncluidas} carga(s)`);
        if (result.viagensIncluidas > 0)
          parts.push(`+${result.viagensIncluidas} viagem(ns)`);
        console.log(
          `  ${f.competencia} motorista=${f.id_tms_motoristas.slice(0, 8)}... ${parts.join(', ')}`
        );
        totalCargas += result.cargasIncluidas;
        totalViagens += result.viagensIncluidas;
      }
    } catch (e) {
      console.error(`  Erro fechamento ${f.id} (${f.competencia}):`, e);
    }
  }

  console.log(
    `[backfill-fechamento-cargas] Concluído. Total: ${totalCargas} carga(s), ${totalViagens} viagem(ns) incluídas.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
