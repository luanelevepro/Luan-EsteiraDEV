/*
  Warnings:

  - You are about to drop the `fis_documentos_relacinados` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "fis_documentos_relacinados" DROP CONSTRAINT "fis_documentos_relacinados_id_documento_referenciado_fkey";

-- DropForeignKey
ALTER TABLE "fis_documentos_relacinados" DROP CONSTRAINT "fis_documentos_relacinados_id_fis_documento_fkey";

-- DropTable
DROP TABLE "fis_documentos_relacinados";

-- CreateTable
CREATE TABLE "fis_documentos_relacionados" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "fl_ativo" BOOLEAN NOT NULL DEFAULT true,
    "ds_origem" "OrigemVinculo" NOT NULL DEFAULT 'XML',
    "id_fis_documento" TEXT NOT NULL,
    "id_documento_referenciado" TEXT NOT NULL,

    CONSTRAINT "fis_documentos_relacionados_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fis_documentos_relacionados" ADD CONSTRAINT "fis_documentos_relacionados_id_fis_documento_fkey" FOREIGN KEY ("id_fis_documento") REFERENCES "fis_documento_dfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documentos_relacionados" ADD CONSTRAINT "fis_documentos_relacionados_id_documento_referenciado_fkey" FOREIGN KEY ("id_documento_referenciado") REFERENCES "fis_documento_dfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
