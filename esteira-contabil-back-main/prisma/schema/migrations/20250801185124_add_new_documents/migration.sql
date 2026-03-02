/*
  Warnings:

  - A unique constraint covering the columns `[id_nfe]` on the table `fis_documento` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_cte]` on the table `fis_documento` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_nfe]` on the table `fis_documento_dfe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_cte]` on the table `fis_documento_dfe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_fis_evento]` on the table `fis_documento_dfe` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TipoEf" AS ENUM ('ENTRADA', 'SAIDA');

-- AlterTable
ALTER TABLE "fis_documento" ADD COLUMN     "ds_tipo_ef" "TipoEf",
ADD COLUMN     "id_cte" TEXT,
ADD COLUMN     "id_nfe" TEXT;

-- AlterTable
ALTER TABLE "fis_documento_dfe" ADD COLUMN     "id_cte" TEXT,
ADD COLUMN     "id_fis_evento" TEXT,
ADD COLUMN     "id_nfe" TEXT;

-- CreateTable
CREATE TABLE "fis_nfe_produto_fornecedor" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "id_fis_empresas" TEXT NOT NULL,
    "id_fis_produtos" TEXT NOT NULL,
    "id_fis_fornecedor" TEXT NOT NULL,
    "ds_codigo_produto" TEXT,

    CONSTRAINT "fis_nfe_produto_fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_nfe" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "id_fis_empresas" TEXT NOT NULL,
    "id_fis_empresa_destinatario" TEXT,
    "ds_id_nfe" TEXT,
    "ds_chave" TEXT,
    "ds_uf" TEXT,
    "cd_nf" TEXT,
    "ds_natureza_operacao" TEXT,
    "ds_modelo" TEXT,
    "ds_serie" TEXT,
    "ds_numero" TEXT,
    "dt_emissao" TIMESTAMP(3),
    "dt_saida_entrega" TIMESTAMP(3),
    "cd_tipo_operacao" TEXT,
    "cd_municipio" TEXT,
    "ds_fin_nfe" TEXT,
    "vl_base_calculo" TEXT,
    "vl_produto" TEXT,
    "vl_nf" TEXT,
    "vl_frete" TEXT,
    "vl_seg" TEXT,
    "vl_desc" TEXT,
    "vl_ii" TEXT,
    "vl_ipi" TEXT,
    "vl_ipidevol" TEXT,
    "vl_pis" TEXT,
    "vl_cofins" TEXT,
    "vl_outros" TEXT,
    "vl_bc" TEXT,
    "vl_icms" TEXT,
    "vl_icms_desoner" TEXT,
    "ds_base_calculo_mono_total" TEXT,
    "ds_porcentagem_mono_total" TEXT,
    "js_itens" JSONB,
    "ds_cnpj_emitente" TEXT,
    "ds_cpf_emitente" TEXT,
    "ds_razao_social_emitente" TEXT,
    "ds_cnpj_destinatario" TEXT,
    "ds_cpf_destinatario" TEXT,
    "ds_razao_social_destinatario" TEXT,
    "id_fis_fornecedor" TEXT,

    CONSTRAINT "fis_nfe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_nfe_itens" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "ds_ordem" INTEGER,
    "id_fis_nfe" TEXT NOT NULL,
    "ds_produto" TEXT,
    "cd_produto_anp" TEXT,
    "ds_produto_anp_descricao" TEXT,
    "ds_codigo" TEXT,
    "ds_unidade" TEXT,
    "vl_base_calculo_icms" TEXT,
    "vl_quantidade" TEXT,
    "vl_valor_unitario" TEXT,
    "vl_valor_total" TEXT,
    "vl_icms" TEXT,
    "ds_unidade_tributavel" TEXT,
    "vl_quantidade_tributavel" TEXT,
    "vl_total_tributavel" TEXT,
    "vl_valor_unitario_trib" TEXT,
    "ds_porcentagem_icms" TEXT,
    "ds_enquadramento_ipi" TEXT,
    "ds_ipi_nao_tributavel_cst" TEXT,
    "ds_pis_nao_tributavel_cst" TEXT,
    "ds_cofins_nao_tributavel_cst" TEXT,
    "ds_base_calculo_mono" TEXT,
    "ds_porcentagem_mono" TEXT,
    "vl_icms_mono" TEXT,
    "cd_ncm" TEXT,
    "cd_cest" TEXT,
    "cd_cfop" TEXT,
    "cd_barras" TEXT,

    CONSTRAINT "fis_nfe_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_cte" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "id_fis_empresas" TEXT NOT NULL,
    "ds_id_cte" TEXT NOT NULL,
    "ds_chave" TEXT NOT NULL,
    "ds_chave_nfe" TEXT,
    "ds_uf" INTEGER,
    "cd_cte" TEXT,
    "ds_cfop" TEXT,
    "ds_natureza_operacao" TEXT,
    "ds_modelo" INTEGER,
    "ds_serie" INTEGER,
    "ds_numero" TEXT,
    "dt_emissao" TIMESTAMP(3),
    "ds_tp_cte" INTEGER,
    "ds_modal" TEXT,
    "ds_tp_serv" INTEGER,
    "cd_mun_env" TEXT,
    "ds_nome_mun_env" TEXT,
    "ds_uf_env" TEXT,
    "cd_mun_ini" TEXT,
    "ds_nome_mun_ini" TEXT,
    "ds_uf_ini" TEXT,
    "cd_mun_fim" TEXT,
    "ds_nome_mun_fim" TEXT,
    "ds_uf_fim" TEXT,
    "ds_retira" INTEGER,
    "ds_ind_ie_toma" INTEGER,
    "vl_total" DECIMAL(65,30),
    "vl_rec" DECIMAL(65,30),
    "vl_total_trib" DECIMAL(65,30) NOT NULL,
    "ds_cst_tributacao" TEXT,
    "vl_base_calculo_icms" DECIMAL(65,30),
    "vl_icms" DECIMAL(65,30),
    "vl_porcentagem_icms" DECIMAL(65,30),

    CONSTRAINT "fis_cte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_cte_comp_carga" (
    "id" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "vl_comp" DECIMAL(65,30) NOT NULL,
    "id_fis_cte" TEXT NOT NULL,

    CONSTRAINT "fis_cte_comp_carga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_cte_carga" (
    "id" TEXT NOT NULL,
    "ds_und" TEXT NOT NULL,
    "ds_tipo_medida" TEXT NOT NULL,
    "vl_qtd_carregada" DECIMAL(65,30) NOT NULL,
    "id_fis_cte" TEXT NOT NULL,

    CONSTRAINT "fis_cte_carga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_evento_dfe" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_raw" TEXT NOT NULL,
    "ds_error" TEXT,
    "ds_evento_id" TEXT,
    "ds_chave_doc" TEXT,
    "cd_codigo_evento" TEXT,
    "n_seq_evento" INTEGER,
    "dt_evento" TIMESTAMP(3),
    "ds_justificativa_evento" TEXT,
    "ds_protocolo" TEXT,
    "ds_status_retorno" TEXT,
    "id_fis_documento_dfe" TEXT NOT NULL,

    CONSTRAINT "fis_evento_dfe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_evento" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_evento_id" TEXT NOT NULL,
    "ds_chave_doc" TEXT,
    "cd_codigo_evento" TEXT,
    "ds_seq_evento" INTEGER,
    "dt_evento" TIMESTAMP(3),
    "ds_justificativa_evento" TEXT,
    "ds_protocolo" TEXT,
    "ds_status_retorno" TEXT,
    "id_fis_documento" TEXT NOT NULL,

    CONSTRAINT "fis_evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fis_nfe_id_fis_empresas_ds_numero_key" ON "fis_nfe"("id_fis_empresas", "ds_numero");

-- CreateIndex
CREATE UNIQUE INDEX "fis_cte_ds_id_cte_key" ON "fis_cte"("ds_id_cte");

-- CreateIndex
CREATE UNIQUE INDEX "fis_cte_ds_chave_key" ON "fis_cte"("ds_chave");

-- CreateIndex
CREATE INDEX "fis_cte_ds_chave_idx" ON "fis_cte"("ds_chave");

-- CreateIndex
CREATE UNIQUE INDEX "fis_cte_id_fis_empresas_cd_cte_key" ON "fis_cte"("id_fis_empresas", "cd_cte");

-- CreateIndex
CREATE INDEX "fis_cte_comp_carga_id_fis_cte_idx" ON "fis_cte_comp_carga"("id_fis_cte");

-- CreateIndex
CREATE INDEX "fis_cte_carga_id_fis_cte_idx" ON "fis_cte_carga"("id_fis_cte");

-- CreateIndex
CREATE INDEX "fis_evento_dfe_ds_chave_doc_idx" ON "fis_evento_dfe"("ds_chave_doc");

-- CreateIndex
CREATE INDEX "fis_evento_dfe_cd_codigo_evento_idx" ON "fis_evento_dfe"("cd_codigo_evento");

-- CreateIndex
CREATE UNIQUE INDEX "fis_evento_dfe_ds_evento_id_id_fis_documento_dfe_key" ON "fis_evento_dfe"("ds_evento_id", "id_fis_documento_dfe");

-- CreateIndex
CREATE INDEX "fis_evento_id_fis_documento_idx" ON "fis_evento"("id_fis_documento");

-- CreateIndex
CREATE INDEX "fis_evento_cd_codigo_evento_idx" ON "fis_evento"("cd_codigo_evento");

-- CreateIndex
CREATE UNIQUE INDEX "fis_evento_ds_evento_id_id_fis_documento_key" ON "fis_evento"("ds_evento_id", "id_fis_documento");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_id_nfe_key" ON "fis_documento"("id_nfe");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_id_cte_key" ON "fis_documento"("id_cte");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_id_nfe_key" ON "fis_documento_dfe"("id_nfe");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_id_cte_key" ON "fis_documento_dfe"("id_cte");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_id_fis_evento_key" ON "fis_documento_dfe"("id_fis_evento");

-- AddForeignKey
ALTER TABLE "fis_nfe_produto_fornecedor" ADD CONSTRAINT "fis_nfe_produto_fornecedor_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_nfe_produto_fornecedor" ADD CONSTRAINT "fis_nfe_produto_fornecedor_id_fis_produtos_fkey" FOREIGN KEY ("id_fis_produtos") REFERENCES "fis_produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_nfe_produto_fornecedor" ADD CONSTRAINT "fis_nfe_produto_fornecedor_id_fis_fornecedor_fkey" FOREIGN KEY ("id_fis_fornecedor") REFERENCES "fis_fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_nfe" ADD CONSTRAINT "fis_nfe_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_nfe" ADD CONSTRAINT "fis_nfe_id_fis_empresa_destinatario_fkey" FOREIGN KEY ("id_fis_empresa_destinatario") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_nfe" ADD CONSTRAINT "fis_nfe_id_fis_fornecedor_fkey" FOREIGN KEY ("id_fis_fornecedor") REFERENCES "fis_fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_nfe_itens" ADD CONSTRAINT "fis_nfe_itens_id_fis_nfe_fkey" FOREIGN KEY ("id_fis_nfe") REFERENCES "fis_nfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_cte" ADD CONSTRAINT "fis_cte_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_cte_comp_carga" ADD CONSTRAINT "fis_cte_comp_carga_id_fis_cte_fkey" FOREIGN KEY ("id_fis_cte") REFERENCES "fis_cte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_cte_carga" ADD CONSTRAINT "fis_cte_carga_id_fis_cte_fkey" FOREIGN KEY ("id_fis_cte") REFERENCES "fis_cte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documento" ADD CONSTRAINT "fis_documento_id_nfe_fkey" FOREIGN KEY ("id_nfe") REFERENCES "fis_nfe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documento" ADD CONSTRAINT "fis_documento_id_cte_fkey" FOREIGN KEY ("id_cte") REFERENCES "fis_cte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documento_dfe" ADD CONSTRAINT "fis_documento_dfe_id_nfe_fkey" FOREIGN KEY ("id_nfe") REFERENCES "fis_nfe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documento_dfe" ADD CONSTRAINT "fis_documento_dfe_id_cte_fkey" FOREIGN KEY ("id_cte") REFERENCES "fis_cte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_evento_dfe" ADD CONSTRAINT "fis_evento_dfe_id_fis_documento_dfe_fkey" FOREIGN KEY ("id_fis_documento_dfe") REFERENCES "fis_documento_dfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_evento" ADD CONSTRAINT "fis_evento_id_fis_documento_fkey" FOREIGN KEY ("id_fis_documento") REFERENCES "fis_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
