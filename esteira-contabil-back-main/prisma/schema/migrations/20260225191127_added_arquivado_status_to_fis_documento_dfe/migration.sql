/*
  Warnings:

  - A unique constraint covering the columns `[ds_origem,id_fis_documento_dfe]` on the table `fis_documento_dfe_historico` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "StatusFaturamento" ADD VALUE 'ARQUIVADO';

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_historico_ds_origem_id_fis_documento_dfe_key" ON "fis_documento_dfe_historico"("ds_origem", "id_fis_documento_dfe");
