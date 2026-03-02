-- AlterTable
ALTER TABLE "fis_empresas" ADD COLUMN     "id_tecnospeed_certificado" TEXT;

-- CreateTable
CREATE TABLE "fis_tecnospeed_process" (
    "id" TEXT NOT NULL,
    "dt_execucao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_fis_empresas" TEXT NOT NULL,
    "ds_status" TEXT NOT NULL,
    "ds_mensagem_geral" TEXT,

    CONSTRAINT "fis_tecnospeed_process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_tecnospeed_request" (
    "id" TEXT NOT NULL,
    "id_process" TEXT NOT NULL,
    "id_fis_fornecedor" TEXT,
    "ds_cidade_ibge" TEXT,
    "ds_protocolo" TEXT,
    "ds_erro" TEXT,
    "vl_tentativas" INTEGER NOT NULL DEFAULT 0,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fis_tecnospeed_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_tecnospeed_raw" (
    "id" TEXT NOT NULL,
    "id_request" TEXT NOT NULL,
    "js_raw" JSONB NOT NULL,
    "dt_fetched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pagina" INTEGER NOT NULL,

    CONSTRAINT "fis_tecnospeed_raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_cidade_homologada" (
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

    CONSTRAINT "fis_cidade_homologada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_tecnospeed_api_action" (
    "id" TEXT NOT NULL,
    "ds_nome_acao" TEXT NOT NULL,
    "ds_url" TEXT NOT NULL,
    "ds_metodo" TEXT NOT NULL,
    "ds_descricao" TEXT,
    "fl_requer_login" BOOLEAN NOT NULL,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "ds_tipo_request" TEXT NOT NULL,
    "ds_id_cidade_homologada" TEXT NOT NULL,

    CONSTRAINT "fis_tecnospeed_api_action_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fis_cidade_homologada_ds_ibge_codigo_key" ON "fis_cidade_homologada"("ds_ibge_codigo");

-- CreateIndex
CREATE UNIQUE INDEX "fis_tecnospeed_api_action_ds_id_cidade_homologada_ds_nome_a_key" ON "fis_tecnospeed_api_action"("ds_id_cidade_homologada", "ds_nome_acao");

-- AddForeignKey
ALTER TABLE "fis_tecnospeed_process" ADD CONSTRAINT "fis_tecnospeed_process_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_tecnospeed_request" ADD CONSTRAINT "fis_tecnospeed_request_id_process_fkey" FOREIGN KEY ("id_process") REFERENCES "fis_tecnospeed_process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_tecnospeed_request" ADD CONSTRAINT "fis_tecnospeed_request_id_fis_fornecedor_fkey" FOREIGN KEY ("id_fis_fornecedor") REFERENCES "fis_fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_tecnospeed_raw" ADD CONSTRAINT "fis_tecnospeed_raw_id_request_fkey" FOREIGN KEY ("id_request") REFERENCES "fis_tecnospeed_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_tecnospeed_api_action" ADD CONSTRAINT "fis_tecnospeed_api_action_ds_id_cidade_homologada_fkey" FOREIGN KEY ("ds_id_cidade_homologada") REFERENCES "fis_cidade_homologada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
