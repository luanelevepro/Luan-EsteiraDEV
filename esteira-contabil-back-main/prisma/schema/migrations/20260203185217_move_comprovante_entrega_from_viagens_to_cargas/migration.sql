/*
  Warnings:

  - You are about to drop the column `ds_comprovante_entrega` on the `tms_viagens` table. All the data in the column will be lost.
  - You are about to drop the column `ds_comprovante_key` on the `tms_viagens` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tms_cargas" ADD COLUMN     "ds_comprovante_entrega" TEXT,
ADD COLUMN     "ds_comprovante_key" TEXT;

-- AlterTable
ALTER TABLE "tms_viagens" DROP COLUMN "ds_comprovante_entrega",
DROP COLUMN "ds_comprovante_key";
