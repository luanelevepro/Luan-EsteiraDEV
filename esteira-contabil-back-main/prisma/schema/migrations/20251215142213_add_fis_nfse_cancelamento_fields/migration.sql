-- AlterTable
ALTER TABLE "fis_nfse" ADD COLUMN     "cd_codigo_cancelamento" TEXT,
ADD COLUMN     "ds_justificativa_cancelamento" TEXT,
ADD COLUMN     "ds_protocolo_cancelamento" TEXT,
ADD COLUMN     "ds_status_cancelamento" TEXT,
ADD COLUMN     "ds_xml_cancelamento" TEXT,
ADD COLUMN     "dt_cancelamento" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "fis_nfse_dt_cancelamento_ds_status_cancelamento_idx" ON "fis_nfse"("dt_cancelamento", "ds_status_cancelamento");
