-- AlterTable tms_entregas: adicionar vl_total_mercadoria para persistir valor da mercadoria (agregação entrega → carga → viagem)
ALTER TABLE "tms_entregas" ADD COLUMN "vl_total_mercadoria" DOUBLE PRECISION;
