/*
  Warnings:

  - Added the required column `id_tms_empresas` to the `tms_veiculos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tms_veiculos" ADD COLUMN     "id_tms_empresas" TEXT NOT NULL,
ADD COLUMN     "is_carroceria" BOOLEAN DEFAULT false,
ADD COLUMN     "is_tracionador" BOOLEAN DEFAULT false,
ALTER COLUMN "is_ativo" SET DEFAULT true;

-- AddForeignKey
ALTER TABLE "tms_veiculos" ADD CONSTRAINT "tms_veiculos_id_tms_empresas_fkey" FOREIGN KEY ("id_tms_empresas") REFERENCES "tms_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
