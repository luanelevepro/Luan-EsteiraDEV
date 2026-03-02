-- CreateTable
CREATE TABLE "tms_import_layout" (
    "id" TEXT NOT NULL,
    "id_sis_empresa" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "ds_descricao" TEXT,
    "js_mapeamento" JSONB NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tms_import_layout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tms_import_layout_id_sis_empresa_idx" ON "tms_import_layout"("id_sis_empresa");

-- AddForeignKey
ALTER TABLE "tms_import_layout" ADD CONSTRAINT "tms_import_layout_id_sis_empresa_fkey" FOREIGN KEY ("id_sis_empresa") REFERENCES "sis_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
