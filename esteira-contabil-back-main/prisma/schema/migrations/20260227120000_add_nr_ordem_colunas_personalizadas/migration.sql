-- AlterTable
ALTER TABLE "sis_colunas_personalizadas" ADD COLUMN IF NOT EXISTS "nr_ordem" INTEGER NOT NULL DEFAULT 0;
