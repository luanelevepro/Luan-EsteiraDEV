/*
  Warnings:

  - You are about to drop the column `id_microregion` on the `sis_ibge_uf` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sis_ibge_uf" DROP CONSTRAINT "sis_ibge_uf_id_microregion_fkey";

-- AlterTable
ALTER TABLE "sis_ibge_uf" DROP COLUMN "id_microregion",
ADD COLUMN     "sis_microregionsId" INTEGER;

-- AlterTable
ALTER TABLE "sis_igbe_city" ADD COLUMN     "id_microregion" INTEGER;

-- AddForeignKey
ALTER TABLE "sis_ibge_uf" ADD CONSTRAINT "sis_ibge_uf_sis_microregionsId_fkey" FOREIGN KEY ("sis_microregionsId") REFERENCES "sis_microregions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_igbe_city" ADD CONSTRAINT "sis_igbe_city_id_microregion_fkey" FOREIGN KEY ("id_microregion") REFERENCES "sis_microregions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
