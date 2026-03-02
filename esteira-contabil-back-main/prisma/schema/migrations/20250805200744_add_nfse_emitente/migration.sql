-- AlterTable
ALTER TABLE "fis_nfse" ADD COLUMN     "id_fis_empresa_emitente" TEXT;

-- AddForeignKey
ALTER TABLE "fis_nfse" ADD CONSTRAINT "fis_nfse_id_fis_empresa_emitente_fkey" FOREIGN KEY ("id_fis_empresa_emitente") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
