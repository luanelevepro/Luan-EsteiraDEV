/*
  Warnings:

  - A unique constraint covering the columns `[id_fis_empresas,ds_numero,id_fis_fornecedor]` on the table `fis_nfse` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "fis_nfse_id_fis_empresas_ds_numero_key";

-- CreateIndex
CREATE UNIQUE INDEX "fis_nfse_id_fis_empresas_ds_numero_id_fis_fornecedor_key" ON "fis_nfse"("id_fis_empresas", "ds_numero", "id_fis_fornecedor");
