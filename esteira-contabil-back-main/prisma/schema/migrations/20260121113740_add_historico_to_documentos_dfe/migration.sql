-- CreateTable
CREATE TABLE "fis_documento_dfe_raw" (
    "id" TEXT NOT NULL,
    "id_fis_documento_dfe" TEXT NOT NULL,
    "ds_raw" TEXT NOT NULL,
    "ds_origem" "OrigemExtracao",
    "ds_error" TEXT,
    "dt_received" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fis_documento_dfe_raw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fis_documento_dfe_raw_id_fis_documento_dfe_idx" ON "fis_documento_dfe_raw"("id_fis_documento_dfe");

-- CreateIndex
CREATE INDEX "fis_documento_dfe_raw_ds_origem_idx" ON "fis_documento_dfe_raw"("ds_origem");

-- AddForeignKey
ALTER TABLE "fis_documento_dfe_raw" ADD CONSTRAINT "fis_documento_dfe_raw_id_fis_documento_dfe_fkey" FOREIGN KEY ("id_fis_documento_dfe") REFERENCES "fis_documento_dfe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
