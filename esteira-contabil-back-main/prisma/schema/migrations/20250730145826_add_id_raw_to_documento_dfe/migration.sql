-- AlterTable
ALTER TABLE "fis_documento_dfe" ADD COLUMN     "id_protocolo_raw" TEXT;

-- AddForeignKey
ALTER TABLE "fis_documento_dfe" ADD CONSTRAINT "fis_documento_dfe_id_protocolo_raw_fkey" FOREIGN KEY ("id_protocolo_raw") REFERENCES "fis_tecnospeed_raw"("id") ON DELETE SET NULL ON UPDATE CASCADE;
