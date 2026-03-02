/*
  Warnings:

  - You are about to drop the `fis_cidade_homologada` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "fis_tecnospeed_api_action" DROP CONSTRAINT "fis_tecnospeed_api_action_ds_id_cidade_homologada_fkey";

-- DropTable
DROP TABLE "fis_cidade_homologada";

-- CreateTable
CREATE TABLE "fis_tecnospeed_cidade_homologada" (
    "id" TEXT NOT NULL,
    "ds_ibge_codigo" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "ds_padrao" TEXT,
    "fl_consultar_notas_tomada" BOOLEAN NOT NULL,
    "fl_prestador_obrigatorio" BOOLEAN NOT NULL,
    "fl_precisa_certificado" BOOLEAN NOT NULL,
    "fl_paginar" BOOLEAN NOT NULL,
    "ds_tipo_comunicacao" TEXT NOT NULL,
    "fl_requer_login" BOOLEAN NOT NULL,
    "vl_timeout_ms" INTEGER NOT NULL DEFAULT 30000,
    "vl_max_retries" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "fis_tecnospeed_cidade_homologada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fis_tecnospeed_cidade_homologada_ds_ibge_codigo_key" ON "fis_tecnospeed_cidade_homologada"("ds_ibge_codigo");

-- AddForeignKey
ALTER TABLE "fis_tecnospeed_api_action" ADD CONSTRAINT "fis_tecnospeed_api_action_ds_id_cidade_homologada_fkey" FOREIGN KEY ("ds_id_cidade_homologada") REFERENCES "fis_tecnospeed_cidade_homologada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
