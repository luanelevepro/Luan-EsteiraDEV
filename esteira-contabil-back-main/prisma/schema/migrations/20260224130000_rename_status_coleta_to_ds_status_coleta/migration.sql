-- RenameColumn tms_cargas: alinhar ao padrão ds_ do projeto
ALTER TABLE "tms_cargas" RENAME COLUMN "status_coleta" TO "ds_status_coleta";
