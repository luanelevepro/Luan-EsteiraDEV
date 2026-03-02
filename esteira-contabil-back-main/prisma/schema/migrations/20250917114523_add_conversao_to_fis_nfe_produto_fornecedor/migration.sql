/*
  Warnings:

  - Added the required column `fl_conversao` to the `fis_nfe_produto_fornecedor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fis_nfe_produto_fornecedor" ADD COLUMN     "ds_conversao" TEXT,
ADD COLUMN     "fl_conversao" BOOLEAN NOT NULL;
