/*
  Warnings:

  - You are about to drop the `fis_cte_nfe` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OrigemVinculo" AS ENUM ('XML', 'MANUAL');

-- DropForeignKey
ALTER TABLE "fis_cte_nfe" DROP CONSTRAINT "fis_cte_nfe_id_fis_cte_fkey";

-- DropForeignKey
ALTER TABLE "fis_cte_nfe" DROP CONSTRAINT "fis_cte_nfe_id_fis_nfe_fkey";

-- DropTable
DROP TABLE "fis_cte_nfe";

-- CreateTable
CREATE TABLE "fis_documentos_relacinados" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "fl_ativo" BOOLEAN NOT NULL DEFAULT true,
    "ds_origem" "OrigemVinculo" NOT NULL DEFAULT 'XML',
    "id_fis_documento" TEXT NOT NULL,
    "id_documento_referenciado" TEXT NOT NULL,

    CONSTRAINT "fis_documentos_relacinados_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fis_documentos_relacinados" ADD CONSTRAINT "fis_documentos_relacinados_id_fis_documento_fkey" FOREIGN KEY ("id_fis_documento") REFERENCES "fis_documento_dfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documentos_relacinados" ADD CONSTRAINT "fis_documentos_relacinados_id_documento_referenciado_fkey" FOREIGN KEY ("id_documento_referenciado") REFERENCES "fis_documento_dfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
