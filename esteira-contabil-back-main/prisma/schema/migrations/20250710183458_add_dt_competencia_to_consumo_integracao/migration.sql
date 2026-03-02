/*
  Warnings:

  - Added the required column `dt_competencia` to the `adm_consumo_integracao` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "adm_consumo_integracao" ADD COLUMN     "dt_competencia" TIMESTAMP(3) NOT NULL;
