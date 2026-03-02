-- CreateEnum
CREATE TYPE "SatConferenciaStatus" AS ENUM ('RECEBIDO', 'PROCESSANDO', 'CONCLUIDO', 'ERRO');

-- CreateEnum
CREATE TYPE "SatConferenciaItemStatus" AS ENUM ('ACHADO', 'NAO_ENCONTRADO', 'MULTIPLOS', 'ERRO');

-- CreateTable
CREATE TABLE "fis_sat_conferencia" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_fis_empresas" TEXT,
    "id_user" TEXT,
    "ds_filename" TEXT,
    "cd_file_hash" TEXT,
    "ds_status" "SatConferenciaStatus" NOT NULL DEFAULT 'RECEBIDO',
    "vl_rows_total" INTEGER DEFAULT 0,
    "vl_rows_processadas" INTEGER DEFAULT 0,
    "vl_errors_count" INTEGER DEFAULT 0,
    "ds_conteudo" JSONB,
    "ds_message" JSONB,

    CONSTRAINT "fis_sat_conferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_sat_conferencia_item" (
    "id" TEXT NOT NULL,
    "id_conferencia" TEXT NOT NULL,
    "ds_numero_row" INTEGER NOT NULL,
    "id_fis_documento" TEXT,
    "ds_status" "SatConferenciaItemStatus",
    "ds_message" TEXT,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fis_sat_conferencia_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fis_sat_conferencia_id_fis_empresas_idx" ON "fis_sat_conferencia"("id_fis_empresas");

-- CreateIndex
CREATE INDEX "fis_sat_conferencia_item_id_conferencia_idx" ON "fis_sat_conferencia_item"("id_conferencia");

-- AddForeignKey
ALTER TABLE "fis_sat_conferencia" ADD CONSTRAINT "fis_sat_conferencia_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "sis_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_sat_conferencia_item" ADD CONSTRAINT "fis_sat_conferencia_item_id_fis_documento_fkey" FOREIGN KEY ("id_fis_documento") REFERENCES "fis_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_sat_conferencia_item" ADD CONSTRAINT "fis_sat_conferencia_item_id_conferencia_fkey" FOREIGN KEY ("id_conferencia") REFERENCES "fis_sat_conferencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
