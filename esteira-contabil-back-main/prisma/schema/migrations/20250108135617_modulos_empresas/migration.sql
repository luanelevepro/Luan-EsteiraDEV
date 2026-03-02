-- AlterTable
ALTER TABLE "sis_access" ADD COLUMN     "sis_empresasId" TEXT;

-- AddForeignKey
ALTER TABLE "sis_access" ADD CONSTRAINT "sis_access_sis_empresasId_fkey" FOREIGN KEY ("sis_empresasId") REFERENCES "sis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
