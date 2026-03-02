/*
  Warnings:

  - You are about to drop the column `vl_cofins` on the `sis_simples_nacional_vigencia` table. All the data in the column will be lost.
  - You are about to drop the column `vl_cpp` on the `sis_simples_nacional_vigencia` table. All the data in the column will be lost.
  - You are about to drop the column `vl_csll` on the `sis_simples_nacional_vigencia` table. All the data in the column will be lost.
  - You are about to drop the column `vl_icms` on the `sis_simples_nacional_vigencia` table. All the data in the column will be lost.
  - You are about to drop the column `vl_irpj` on the `sis_simples_nacional_vigencia` table. All the data in the column will be lost.
  - You are about to drop the column `vl_pis` on the `sis_simples_nacional_vigencia` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sis_simples_nacional_vigencia" DROP COLUMN "vl_cofins",
DROP COLUMN "vl_cpp",
DROP COLUMN "vl_csll",
DROP COLUMN "vl_icms",
DROP COLUMN "vl_irpj",
DROP COLUMN "vl_pis";
