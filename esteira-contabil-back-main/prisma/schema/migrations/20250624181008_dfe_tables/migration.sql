/*
  Warnings:

  - You are about to drop the column `id_fis_empresas` on the `fis_tecnospeed_process` table. All the data in the column will be lost.
  - You are about to drop the `fis_tecnospeed_api_action` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `id_fis_empresas_tecnospeed` to the `fis_tecnospeed_process` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrigemExtracao" AS ENUM ('DFE_SIEG', 'DFE_TECNOSPEED_TOMADOS');

-- CreateEnum
CREATE TYPE "StatusExtracao" AS ENUM ('ERRO', 'IMPORTADO', 'INTEGRADO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoDocumento" ADD VALUE 'CTE';
ALTER TYPE "TipoDocumento" ADD VALUE 'NFE';
ALTER TYPE "TipoDocumento" ADD VALUE 'CFE';
ALTER TYPE "TipoDocumento" ADD VALUE 'NFCE';

-- DropForeignKey
ALTER TABLE "fis_tecnospeed_api_action" DROP CONSTRAINT "fis_tecnospeed_api_action_ds_id_cidade_homologada_fkey";

-- DropForeignKey
ALTER TABLE "fis_tecnospeed_process" DROP CONSTRAINT "fis_tecnospeed_process_id_fis_empresas_fkey";

-- AlterTable
ALTER TABLE "fis_tecnospeed_process" DROP COLUMN "id_fis_empresas",
ADD COLUMN     "id_fis_empresas_tecnospeed" TEXT NOT NULL;

-- DropTable
DROP TABLE "fis_tecnospeed_api_action";

-- CreateTable
CREATE TABLE "fis_empresas_tecnospeed" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "id_tecnospeed_certificado" TEXT,
    "dt_certificado_expiracao" TIMESTAMP(3),
    "dt_consulta_api" TIMESTAMP(3),
    "id_fis_empresas" TEXT NOT NULL,

    CONSTRAINT "fis_empresas_tecnospeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_documento_dfe" (
    "id" TEXT NOT NULL,
    "ds_raw" TEXT NOT NULL,
    "ds_error" TEXT,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "ds_tipo" "TipoDocumento",
    "ds_situacao_integracao" "StatusExtracao",
    "ds_origem" "OrigemExtracao",
    "ds_status" "StatusDocumento",
    "ds_documento_destinatario" TEXT,
    "ds_documento_emitente" TEXT,
    "ds_documento_tomador" TEXT,
    "ds_documento_remetente" TEXT,
    "dt_emissao" TIMESTAMP(3),
    "id_nfse" TEXT,
    "id_fis_documento" TEXT,
    "id_fis_empresas" TEXT NOT NULL,

    CONSTRAINT "fis_documento_dfe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fis_empresas_tecnospeed_id_fis_empresas_key" ON "fis_empresas_tecnospeed"("id_fis_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_id_nfse_key" ON "fis_documento_dfe"("id_nfse");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_id_fis_documento_key" ON "fis_documento_dfe"("id_fis_documento");

-- AddForeignKey
ALTER TABLE "fis_empresas_tecnospeed" ADD CONSTRAINT "fis_empresas_tecnospeed_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_tecnospeed_process" ADD CONSTRAINT "fis_tecnospeed_process_id_fis_empresas_tecnospeed_fkey" FOREIGN KEY ("id_fis_empresas_tecnospeed") REFERENCES "fis_empresas_tecnospeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documento_dfe" ADD CONSTRAINT "fis_documento_dfe_id_nfse_fkey" FOREIGN KEY ("id_nfse") REFERENCES "fis_nfse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documento_dfe" ADD CONSTRAINT "fis_documento_dfe_id_fis_documento_fkey" FOREIGN KEY ("id_fis_documento") REFERENCES "fis_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documento_dfe" ADD CONSTRAINT "fis_documento_dfe_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
