/*
  Warnings:

  - Added the required column `id_tms_empresas` to the `tms_segmentos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tms_segmentos" ADD COLUMN     "id_tms_empresas" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "tms_segmentos" ADD CONSTRAINT "tms_segmentos_id_tms_empresas_fkey" FOREIGN KEY ("id_tms_empresas") REFERENCES "tms_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
