/*
  Warnings:

  - You are about to drop the column `sis_microregionsId` on the `sis_ibge_uf` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sis_ibge_uf" DROP CONSTRAINT "sis_ibge_uf_sis_microregionsId_fkey";

-- AlterTable
ALTER TABLE "sis_ibge_uf" DROP COLUMN "sis_microregionsId";
