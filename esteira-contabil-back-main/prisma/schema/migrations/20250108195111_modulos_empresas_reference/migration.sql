/*
  Warnings:

  - You are about to drop the column `id_empresas` on the `sis_access` table. All the data in the column will be lost.
  - You are about to drop the column `id_profiles` on the `sis_access` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sis_access" DROP CONSTRAINT "sis_access_id_empresas_fkey";

-- DropForeignKey
ALTER TABLE "sis_access" DROP CONSTRAINT "sis_access_id_profiles_fkey";

-- AlterTable
ALTER TABLE "sis_access" DROP COLUMN "id_empresas",
DROP COLUMN "id_profiles",
ADD COLUMN     "id_empresa" TEXT,
ADD COLUMN     "id_profile" TEXT;

-- AddForeignKey
ALTER TABLE "sis_access" ADD CONSTRAINT "sis_access_id_profile_fkey" FOREIGN KEY ("id_profile") REFERENCES "sis_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_access" ADD CONSTRAINT "sis_access_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "sis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
