-- AddColumn: cd_tipo to tms_import_layout (CARGAS | VIAGENS)
ALTER TABLE "tms_import_layout" ADD COLUMN "cd_tipo" TEXT NOT NULL DEFAULT 'CARGAS';

-- CreateIndex: filter by empresa + tipo
CREATE INDEX "tms_import_layout_id_sis_empresa_cd_tipo_idx" ON "tms_import_layout"("id_sis_empresa", "cd_tipo");
