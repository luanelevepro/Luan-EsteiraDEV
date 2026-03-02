/*
  Warnings:

  - A unique constraint covering the columns `[id_fis_empresa_emitente,ds_numero,dt_emissao]` on the table `fis_cte` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_fis_empresa_destinatario,ds_numero,dt_emissao]` on the table `fis_cte` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_fis_empresa_destinatario,ds_numero,dt_emissao]` on the table `fis_nfe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_fis_empresa_emitente,ds_numero,dt_emissao]` on the table `fis_nfe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_fis_empresas,ds_numero,dt_emissao]` on the table `fis_nfse` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_fis_empresa_emitente,ds_numero,dt_emissao]` on the table `fis_nfse` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "fis_cte_id_fis_empresa_destinatario_cd_cte_key";

-- DropIndex
DROP INDEX "fis_cte_id_fis_empresa_emitente_cd_cte_key";

-- DropIndex
DROP INDEX "fis_nfe_id_fis_empresa_destinatario_ds_numero_key";

-- DropIndex
DROP INDEX "fis_nfe_id_fis_empresa_emitente_ds_numero_key";

-- DropIndex
DROP INDEX "fis_nfse_id_fis_empresas_ds_numero_id_fis_fornecedor_key";

-- CreateIndex
CREATE UNIQUE INDEX "fis_cte_id_fis_empresa_emitente_ds_numero_dt_emissao_key" ON "fis_cte"("id_fis_empresa_emitente", "ds_numero", "dt_emissao");

-- CreateIndex
CREATE UNIQUE INDEX "fis_cte_id_fis_empresa_destinatario_ds_numero_dt_emissao_key" ON "fis_cte"("id_fis_empresa_destinatario", "ds_numero", "dt_emissao");

-- CreateIndex
CREATE UNIQUE INDEX "fis_nfe_id_fis_empresa_destinatario_ds_numero_dt_emissao_key" ON "fis_nfe"("id_fis_empresa_destinatario", "ds_numero", "dt_emissao");

-- CreateIndex
CREATE UNIQUE INDEX "fis_nfe_id_fis_empresa_emitente_ds_numero_dt_emissao_key" ON "fis_nfe"("id_fis_empresa_emitente", "ds_numero", "dt_emissao");

-- CreateIndex
CREATE UNIQUE INDEX "fis_nfse_id_fis_empresas_ds_numero_dt_emissao_key" ON "fis_nfse"("id_fis_empresas", "ds_numero", "dt_emissao");

-- CreateIndex
CREATE UNIQUE INDEX "fis_nfse_id_fis_empresa_emitente_ds_numero_dt_emissao_key" ON "fis_nfse"("id_fis_empresa_emitente", "ds_numero", "dt_emissao");
