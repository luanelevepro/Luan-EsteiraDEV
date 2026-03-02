-- AlterTable tms_entregas: data/hora em que a entrega entrou em rota (saiu para entrega)
ALTER TABLE "tms_entregas" ADD COLUMN "dt_inicio_rota" TIMESTAMP(3);
