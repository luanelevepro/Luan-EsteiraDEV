/*
  Warnings:

  - You are about to drop the column `ds_odometro_final` on the `tms_viagem_despesas` table. All the data in the column will be lost.
  - You are about to drop the column `ds_odometro_inicial` on the `tms_viagem_despesas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tms_viagem_despesas" DROP COLUMN "ds_odometro_final",
DROP COLUMN "ds_odometro_inicial",
ADD COLUMN     "ds_odometro" TEXT;
