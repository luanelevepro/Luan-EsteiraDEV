/*
  Warnings:

  - A unique constraint covering the columns `[id_fis_empresas,ds_numero]` on the table `fis_nfse` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "fis_nfse_id_fis_empresas_ds_numero_key" ON "fis_nfse"("id_fis_empresas", "ds_numero");
