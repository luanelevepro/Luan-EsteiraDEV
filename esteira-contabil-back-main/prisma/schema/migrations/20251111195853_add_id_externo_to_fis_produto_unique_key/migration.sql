/*
  Warnings:

  - A unique constraint covering the columns `[id_fis_empresas,ds_nome,cd_ncm,ds_tipo_item,id_externo]` on the table `fis_produtos` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
-- DROP INDEX "public"."fis_produtos_id_fis_empresas_ds_nome_cd_ncm_ds_tipo_item_key";

-- CreateIndex
-- CREATE UNIQUE INDEX "fis_produtos_id_fis_empresas_ds_nome_cd_ncm_ds_tipo_item_id_key" ON "fis_produtos"("id_fis_empresas", "ds_nome", "cd_ncm", "ds_tipo_item", "id_externo");
