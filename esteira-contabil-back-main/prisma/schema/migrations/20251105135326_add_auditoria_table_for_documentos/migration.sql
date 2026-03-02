/*
  Warnings:

  - A unique constraint covering the columns `[id_fis_empresas,ds_nome,cd_ncm,ds_tipo_item]` on the table `fis_produtos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "TipoEf" ADD VALUE 'TOMADO';

-- DropIndex
-- DROP INDEX "public"."fis_produtos_id_fis_empresas_ds_nome_cd_ncm_key";

-- CreateTable
CREATE TABLE "fis_auditoria_doc" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_fis_documento" TEXT NOT NULL,
    "ds_tipo_doc" "TipoDocumento" NOT NULL,
    "js_inconsistencias" JSONB NOT NULL,
    "id_nfe" TEXT,
    "id_nfse" TEXT,
    "id_cte" TEXT,

    CONSTRAINT "fis_auditoria_doc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- CREATE UNIQUE INDEX "fis_produtos_id_fis_empresas_ds_nome_cd_ncm_ds_tipo_item_key" ON "fis_produtos"("id_fis_empresas", "ds_nome", "cd_ncm", "ds_tipo_item");

-- AddForeignKey
ALTER TABLE "fis_auditoria_doc" ADD CONSTRAINT "fis_auditoria_doc_id_fis_documento_fkey" FOREIGN KEY ("id_fis_documento") REFERENCES "fis_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_auditoria_doc" ADD CONSTRAINT "fis_auditoria_doc_id_nfe_fkey" FOREIGN KEY ("id_nfe") REFERENCES "fis_nfe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_auditoria_doc" ADD CONSTRAINT "fis_auditoria_doc_id_nfse_fkey" FOREIGN KEY ("id_nfse") REFERENCES "fis_nfse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_auditoria_doc" ADD CONSTRAINT "fis_auditoria_doc_id_cte_fkey" FOREIGN KEY ("id_cte") REFERENCES "fis_cte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
