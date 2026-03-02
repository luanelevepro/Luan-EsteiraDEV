-- Remove tabela tms_cargas_container_status (substituída por sis_colunas_personalizadas)
DROP TABLE IF EXISTS "tms_cargas_container_status";

-- Renomeia coluna nr_controle_container para nr_lacre_container em tms_cargas_container
ALTER TABLE "tms_cargas_container" RENAME COLUMN "nr_controle_container" TO "nr_lacre_container";
