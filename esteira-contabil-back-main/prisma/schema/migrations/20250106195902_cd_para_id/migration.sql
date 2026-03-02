/*
  Warnings:

  - You are about to drop the column `profiles_id` on the `sis_access` table. All the data in the column will be lost.
  - You are about to drop the column `escritorio_id` on the `sis_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `escritorio_id` on the `sis_profiles` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sis_access" DROP CONSTRAINT "sis_access_profiles_id_fkey";

-- DropForeignKey
ALTER TABLE "sis_empresas" DROP CONSTRAINT "sis_empresas_escritorio_id_fkey";

-- AlterTable
ALTER TABLE "sis_access" DROP COLUMN "profiles_id",
ADD COLUMN     "id_profiles" TEXT;

-- AlterTable
ALTER TABLE "sis_empresas" DROP COLUMN "escritorio_id",
ADD COLUMN     "id_escritorio" TEXT;

-- AlterTable
ALTER TABLE "sis_profiles" DROP COLUMN "escritorio_id",
ADD COLUMN     "id_escritorio" TEXT;

-- AddForeignKey
ALTER TABLE "sis_access" ADD CONSTRAINT "sis_access_id_profiles_fkey" FOREIGN KEY ("id_profiles") REFERENCES "sis_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_empresas" ADD CONSTRAINT "sis_empresas_id_escritorio_fkey" FOREIGN KEY ("id_escritorio") REFERENCES "sis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
