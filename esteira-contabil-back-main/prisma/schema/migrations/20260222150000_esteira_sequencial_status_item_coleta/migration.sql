-- CreateEnum StatusItemViagem (esteira sequencial: item da viagem)
CREATE TYPE "StatusItemViagem" AS ENUM ('BLOQUEADO', 'DISPONIVEL', 'EM_ANDAMENTO', 'CONCLUIDO');

-- CreateEnum StatusColeta (etapa de coleta da carga antes das entregas)
CREATE TYPE "StatusColeta" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO');

-- AlterTable tms_viagens_cargas: status do item e auditoria
ALTER TABLE "tms_viagens_cargas" ADD COLUMN "ds_status" "StatusItemViagem" NOT NULL DEFAULT 'BLOQUEADO';
ALTER TABLE "tms_viagens_cargas" ADD COLUMN "dt_iniciado_em" TIMESTAMP(3);
ALTER TABLE "tms_viagens_cargas" ADD COLUMN "dt_finalizado_em" TIMESTAMP(3);

-- AlterTable tms_cargas: status da etapa de coleta
ALTER TABLE "tms_cargas" ADD COLUMN "status_coleta" "StatusColeta" DEFAULT 'PENDENTE';

-- Backfill: primeiro item de cada viagem DISPONIVEL, demais BLOQUEADO (regra de negócio aplicada no serviço)
UPDATE "tms_viagens_cargas" vc
SET "ds_status" = CASE
  WHEN vc."nr_sequencia" = (SELECT MIN(nr."nr_sequencia") FROM "tms_viagens_cargas" nr WHERE nr."id_viagem" = vc."id_viagem")
  THEN 'DISPONIVEL'::"StatusItemViagem"
  ELSE 'BLOQUEADO'::"StatusItemViagem"
END;
