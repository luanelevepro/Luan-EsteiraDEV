/*
  Warnings:

  - A unique constraint covering the columns `[id_nfse,id_fis_empresas]` on the table `fis_documento` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_nfe,id_fis_empresas]` on the table `fis_documento` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_cte,id_fis_empresas]` on the table `fis_documento` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "fis_documento_id_cte_key";

-- DropIndex
DROP INDEX "fis_documento_id_nfe_key";

-- DropIndex
DROP INDEX "fis_documento_id_nfse_key";

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_id_nfse_id_fis_empresas_key" ON "fis_documento"("id_nfse", "id_fis_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_id_nfe_id_fis_empresas_key" ON "fis_documento"("id_nfe", "id_fis_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_id_cte_id_fis_empresas_key" ON "fis_documento"("id_cte", "id_fis_empresas");
