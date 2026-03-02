-- CreateEnum
CREATE TYPE "IntegracaoAction" AS ENUM ('SEND', 'REVERT', 'OTHER');

-- CreateEnum
CREATE TYPE "IntegracaoStatus" AS ENUM ('PENDING', 'SENT', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "fis_integracao_documentos" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_fis_empresas" TEXT NOT NULL,
    "id_fis_documento" TEXT,
    "id_fis_nfe" TEXT,
    "id_fis_nfse" TEXT,
    "id_fis_cte" TEXT,
    "id_profile" TEXT,
    "action" "IntegracaoAction" NOT NULL,
    "status" "IntegracaoStatus" NOT NULL DEFAULT 'PENDING',
    "ds_destination" TEXT,
    "ds_lote_id" TEXT,
    "ds_filename" TEXT,
    "ds_raw" TEXT,
    "ds_response" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "dt_sent" TIMESTAMP(3),
    "dt_finished" TIMESTAMP(3),
    "js_metadata" JSONB,

    CONSTRAINT "fis_integracao_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fis_integracao_documentos_id_fis_empresas_idx" ON "fis_integracao_documentos"("id_fis_empresas");

-- CreateIndex
CREATE INDEX "fis_integracao_documentos_status_idx" ON "fis_integracao_documentos"("status");

-- AddForeignKey
ALTER TABLE "fis_integracao_documentos" ADD CONSTRAINT "fis_integracao_documentos_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_integracao_documentos" ADD CONSTRAINT "fis_integracao_documentos_id_fis_documento_fkey" FOREIGN KEY ("id_fis_documento") REFERENCES "fis_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_integracao_documentos" ADD CONSTRAINT "fis_integracao_documentos_id_fis_nfe_fkey" FOREIGN KEY ("id_fis_nfe") REFERENCES "fis_nfe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_integracao_documentos" ADD CONSTRAINT "fis_integracao_documentos_id_fis_nfse_fkey" FOREIGN KEY ("id_fis_nfse") REFERENCES "fis_nfse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_integracao_documentos" ADD CONSTRAINT "fis_integracao_documentos_id_fis_cte_fkey" FOREIGN KEY ("id_fis_cte") REFERENCES "fis_cte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_integracao_documentos" ADD CONSTRAINT "fis_integracao_documentos_id_profile_fkey" FOREIGN KEY ("id_profile") REFERENCES "sis_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
