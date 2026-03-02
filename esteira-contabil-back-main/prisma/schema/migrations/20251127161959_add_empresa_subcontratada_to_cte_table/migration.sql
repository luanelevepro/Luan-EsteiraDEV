-- AlterTable
ALTER TABLE "fis_cte" ADD COLUMN     "ds_documento_subcontratada" TEXT,
ADD COLUMN     "ds_observacao" TEXT,
ADD COLUMN     "ds_razao_social_subcontratada" TEXT,
ADD COLUMN     "id_fis_empresa_subcontratada" TEXT,
ADD COLUMN     "js_documentos_autorizados" JSONB;

-- AddForeignKey
ALTER TABLE "fis_cte" ADD CONSTRAINT "fis_cte_id_fis_empresa_subcontratada_fkey" FOREIGN KEY ("id_fis_empresa_subcontratada") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
