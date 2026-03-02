-- CreateTable sis_armadores (cadastro global de armadores para operação de container)
CREATE TABLE "sis_armadores" (
    "id" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "dt_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sis_armadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable tms_cargas_container (dados específicos quando carga é Porta-Container)
CREATE TABLE "tms_cargas_container" (
    "id" TEXT NOT NULL,
    "id_carga" TEXT NOT NULL,
    "id_armador" TEXT,
    "nr_container" TEXT,
    "nr_controle_container" TEXT,
    "ds_destino_pais" TEXT,
    "ds_setor_container" TEXT,
    "dt_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tms_cargas_container_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tms_cargas_container_id_carga_key" ON "tms_cargas_container"("id_carga");

ALTER TABLE "tms_cargas_container" ADD CONSTRAINT "tms_cargas_container_id_carga_fkey" FOREIGN KEY ("id_carga") REFERENCES "tms_cargas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tms_cargas_container" ADD CONSTRAINT "tms_cargas_container_id_armador_fkey" FOREIGN KEY ("id_armador") REFERENCES "sis_armadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
