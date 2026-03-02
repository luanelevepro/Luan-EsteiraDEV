/*
  Warnings:

  - You are about to drop the column `sis_empresasId` on the `sis_access` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sis_access" DROP CONSTRAINT "sis_access_sis_empresasId_fkey";

-- AlterTable
ALTER TABLE "sis_access" DROP COLUMN "sis_empresasId",
ADD COLUMN     "id_empresas" TEXT;

-- AddForeignKey
ALTER TABLE "sis_access" ADD CONSTRAINT "sis_access_id_empresas_fkey" FOREIGN KEY ("id_empresas") REFERENCES "sis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
