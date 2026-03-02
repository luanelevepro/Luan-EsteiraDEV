-- Renomear coluna e usar enum TipoCarroceria em tms_cargas (padronizar com tms_veiculos)
ALTER TABLE "tms_cargas" RENAME COLUMN "ds_tipo_veiculo" TO "ds_tipo_carroceria";

ALTER TABLE "tms_cargas"
  ALTER COLUMN "ds_tipo_carroceria" TYPE "TipoCarroceria"
  USING ds_tipo_carroceria::text::"TipoCarroceria";

DROP TYPE IF EXISTS "TipoVeiculo";
