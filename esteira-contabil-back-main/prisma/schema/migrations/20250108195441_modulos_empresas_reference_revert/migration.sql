/*
  Warnings:

  - You are about to drop the column `id_empresa` on the `sis_access` table. All the data in the column will be lost.
  - You are about to drop the column `id_profile` on the `sis_access` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sis_access" DROP CONSTRAINT "sis_access_id_empresa_fkey";

-- DropForeignKey
ALTER TABLE "sis_access" DROP CONSTRAINT "sis_access_id_profile_fkey";

-- AlterTable
ALTER TABLE "sis_access" DROP COLUMN "id_empresa",
DROP COLUMN "id_profile",
ADD COLUMN     "id_empresas" TEXT,
ADD COLUMN     "id_profiles" TEXT;

-- AddForeignKey
ALTER TABLE "sis_access" ADD CONSTRAINT "sis_access_id_profiles_fkey" FOREIGN KEY ("id_profiles") REFERENCES "sis_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_access" ADD CONSTRAINT "sis_access_id_empresas_fkey" FOREIGN KEY ("id_empresas") REFERENCES "sis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
