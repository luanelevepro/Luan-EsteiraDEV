-- AlterTable
ALTER TABLE "sis_empresas" ADD COLUMN     "id_regime_tributario" TEXT,
ADD COLUMN     "id_segmento" TEXT;

-- AddForeignKey
ALTER TABLE "sis_empresas" ADD CONSTRAINT "sis_empresas_id_segmento_fkey" FOREIGN KEY ("id_segmento") REFERENCES "fis_segmentos_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_empresas" ADD CONSTRAINT "sis_empresas_id_regime_tributario_fkey" FOREIGN KEY ("id_regime_tributario") REFERENCES "sis_regimes_tributarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
