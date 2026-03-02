-- AlterTable
ALTER TABLE "fis_produtos" ADD COLUMN     "id_sis_tipos_servico" TEXT;

-- AddForeignKey
ALTER TABLE "fis_produtos" ADD CONSTRAINT "fis_produtos_id_sis_tipos_servico_fkey" FOREIGN KEY ("id_sis_tipos_servico") REFERENCES "sis_tipos_servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
