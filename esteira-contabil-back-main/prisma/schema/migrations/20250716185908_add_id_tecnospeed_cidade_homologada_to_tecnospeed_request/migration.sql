-- AlterTable
ALTER TABLE "fis_tecnospeed_request" ADD COLUMN     "id_cidade_homologada" TEXT;

-- AddForeignKey
ALTER TABLE "fis_tecnospeed_request" ADD CONSTRAINT "fis_tecnospeed_request_id_cidade_homologada_fkey" FOREIGN KEY ("id_cidade_homologada") REFERENCES "fis_tecnospeed_cidade_homologada"("id") ON DELETE SET NULL ON UPDATE CASCADE;
