/*
  Warnings:

  - Added the required column `ds_descricao` to the `sis_cfop` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ds_descricao` to the `sis_cst` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ds_descricao` to the `sis_origem_cst` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ds_descricao` to the `sis_tipos_produto` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sis_cfop" ADD COLUMN     "ds_descricao" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sis_cst" ADD COLUMN     "ds_descricao" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sis_origem_cst" ADD COLUMN     "ds_descricao" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sis_tipos_produto" ADD COLUMN     "ds_descricao" TEXT NOT NULL;
