-- AlterTable
ALTER TABLE "fis_regras_entrada_nfe" ADD COLUMN     "id_cfop_gerado" TEXT,
ADD COLUMN     "id_cst_gerado" TEXT;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe" ADD CONSTRAINT "fis_regras_entrada_nfe_id_cfop_gerado_fkey" FOREIGN KEY ("id_cfop_gerado") REFERENCES "sis_cfop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe" ADD CONSTRAINT "fis_regras_entrada_nfe_id_cst_gerado_fkey" FOREIGN KEY ("id_cst_gerado") REFERENCES "sis_cst"("id") ON DELETE SET NULL ON UPDATE CASCADE;
