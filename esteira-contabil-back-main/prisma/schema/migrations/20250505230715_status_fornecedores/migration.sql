/*
  Warnings:

  - The `ds_status` column on the `fis_fornecedores` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "StatusFornecedor" AS ENUM ('NOVO', 'ATIVO', 'INATIVO');

-- AlterTable
ALTER TABLE "fis_fornecedores" DROP COLUMN "ds_status",
ADD COLUMN     "ds_status" "StatusFornecedor" DEFAULT 'ATIVO';
