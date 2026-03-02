-- CreateTable
CREATE TABLE "tms_cargas_container_status" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_tms_empresa" TEXT NOT NULL,
    "nr_sequencia" INTEGER NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "ds_cor" TEXT NOT NULL,

    CONSTRAINT "tms_cargas_container_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tms_cargas_container_status_id_tms_empresa_idx" ON "tms_cargas_container_status"("id_tms_empresa");

-- CreateIndex
CREATE INDEX "tms_cargas_container_status_id_tms_empresa_nr_sequencia_idx" ON "tms_cargas_container_status"("id_tms_empresa", "nr_sequencia");

-- AddForeignKey
ALTER TABLE "tms_cargas_container_status" ADD CONSTRAINT "tms_cargas_container_status_id_tms_empresa_fkey" FOREIGN KEY ("id_tms_empresa") REFERENCES "tms_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
