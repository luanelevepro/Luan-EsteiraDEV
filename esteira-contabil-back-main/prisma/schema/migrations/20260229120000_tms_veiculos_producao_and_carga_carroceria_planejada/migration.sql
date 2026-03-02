-- Campos em tms_veiculos alinhados ao ambiente de produção (classificação e tipo de carroceria para carga)
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_ano_fabricacao" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_classificacao_carroceria" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_classificacao_rigido" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_classificacao_tracionador" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_marca" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_modelo" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_tipo_carroceria_carga" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_tipo_unidade" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "vl_ano_fabricacao" INTEGER;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "vl_ano_modelo" INTEGER;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "vl_eixos" INTEGER;

-- Carroceria planejada para a carga (FK para tms_veiculos)
ALTER TABLE "tms_cargas" ADD COLUMN IF NOT EXISTS "id_carroceria_planejada" TEXT;
ALTER TABLE "tms_cargas" ADD CONSTRAINT "tms_cargas_id_carroceria_planejada_fkey"
  FOREIGN KEY ("id_carroceria_planejada") REFERENCES "tms_veiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
