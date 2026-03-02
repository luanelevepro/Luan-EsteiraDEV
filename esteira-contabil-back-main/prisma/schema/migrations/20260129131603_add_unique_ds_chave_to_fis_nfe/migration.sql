/*
  Warnings:

  - A unique constraint covering the columns `[ds_chave]` on the table `fis_nfe` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "fis_nfe_ds_chave_key" ON "fis_nfe"("ds_chave");
