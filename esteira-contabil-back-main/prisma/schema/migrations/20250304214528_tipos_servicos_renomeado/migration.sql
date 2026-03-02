/*
  Warnings:

  - You are about to drop the column `id_sis_tipos_servicos` on the `fis_prd_segmento` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "fis_prd_segmento" DROP CONSTRAINT "fis_prd_segmento_id_sis_tipos_servicos_fkey";

-- AlterTable
ALTER TABLE "fis_prd_segmento" DROP COLUMN "id_sis_tipos_servicos",
ADD COLUMN     "id_sis_tipos_servico" TEXT;

-- AddForeignKey
ALTER TABLE "fis_prd_segmento" ADD CONSTRAINT "fis_prd_segmento_id_sis_tipos_servico_fkey" FOREIGN KEY ("id_sis_tipos_servico") REFERENCES "sis_tipos_servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
