/*
  Warnings:

  - You are about to drop the column `n_seq_evento` on the `fis_evento_dfe` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fis_evento_dfe" DROP COLUMN "n_seq_evento",
ADD COLUMN     "ds_seq_evento" INTEGER;
