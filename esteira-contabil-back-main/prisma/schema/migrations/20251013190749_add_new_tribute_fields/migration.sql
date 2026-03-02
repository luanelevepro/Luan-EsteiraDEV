/*
  Warnings:

  - Added the required column `vl_cofins` to the `sis_simples_nacional_vigencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vl_cpp` to the `sis_simples_nacional_vigencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vl_csll` to the `sis_simples_nacional_vigencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vl_icms` to the `sis_simples_nacional_vigencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vl_irpj` to the `sis_simples_nacional_vigencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vl_pis` to the `sis_simples_nacional_vigencia` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sis_simples_nacional_vigencia" ADD COLUMN     "vl_cofins" DECIMAL(7,2) NOT NULL,
ADD COLUMN     "vl_cpp" DECIMAL(7,2) NOT NULL,
ADD COLUMN     "vl_csll" DECIMAL(7,2) NOT NULL,
ADD COLUMN     "vl_icms" DECIMAL(7,2) NOT NULL,
ADD COLUMN     "vl_irpj" DECIMAL(7,2) NOT NULL,
ADD COLUMN     "vl_pis" DECIMAL(7,2) NOT NULL;
