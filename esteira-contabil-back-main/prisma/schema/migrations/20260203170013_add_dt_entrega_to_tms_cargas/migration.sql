/*
  Warnings:

  - You are about to drop the column `ds_nome` on the `tms_cargas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tms_cargas" DROP COLUMN "ds_nome",
ADD COLUMN     "dt_entrega" TIMESTAMP(3),
ALTER COLUMN "cd_carga" DROP NOT NULL;
