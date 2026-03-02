-- AlterTable tms_cargas: flag explícita para deslocamento vazio (cd_carga é apenas identificador)
ALTER TABLE "tms_cargas" ADD COLUMN "fl_deslocamento_vazio" BOOLEAN DEFAULT false;

-- Backfill: cargas que hoje são identificadas pelo código como deslocamento vazio
UPDATE "tms_cargas" SET "fl_deslocamento_vazio" = true WHERE "cd_carga" = 'DESLOCAMENTO_VAZIO';
