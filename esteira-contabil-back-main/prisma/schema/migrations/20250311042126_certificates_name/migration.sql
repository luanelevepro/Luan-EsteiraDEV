/*
  Warnings:

  - Added the required column `ds_nome_arquivo` to the `sis_certificados` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sis_certificados" ADD COLUMN     "ds_nome_arquivo" TEXT NOT NULL;
