-- DropForeignKey
ALTER TABLE "fis_nfse" DROP CONSTRAINT "fis_nfse_id_fis_empresas_fkey";

-- AlterTable
ALTER TABLE "fis_nfse" ALTER COLUMN "id_fis_empresas" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "fis_nfse" ADD CONSTRAINT "fis_nfse_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
