/*
  Warnings:

  - Made the column `is_escritorio` on table `sis_empresas` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "sis_empresas" ALTER COLUMN "is_escritorio" SET NOT NULL,
ALTER COLUMN "is_escritorio" SET DEFAULT false;
