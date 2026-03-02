-- AlterTable
ALTER TABLE "fis_evento_dfe" ADD COLUMN     "id_evento" TEXT;

-- AddForeignKey
ALTER TABLE "fis_evento_dfe" ADD CONSTRAINT "fis_evento_dfe_id_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "fis_evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
