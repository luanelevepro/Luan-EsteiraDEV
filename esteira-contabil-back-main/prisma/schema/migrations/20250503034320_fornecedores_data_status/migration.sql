/*
  Warnings:

  - The `dt_cadastro` column on the `fis_fornecedores` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "fis_fornecedores" ADD COLUMN     "ds_status" TEXT,
DROP COLUMN "dt_cadastro",
ADD COLUMN     "dt_cadastro" TIMESTAMP(3);
