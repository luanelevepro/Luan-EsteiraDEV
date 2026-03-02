-- AlterTable: produto predominante na carga (ex.: importação sem destino/entrega)
ALTER TABLE "tms_cargas" ADD COLUMN IF NOT EXISTS "ds_produto_predominante" TEXT;
