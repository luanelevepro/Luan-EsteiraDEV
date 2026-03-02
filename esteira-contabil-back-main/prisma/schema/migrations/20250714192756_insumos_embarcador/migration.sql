/*
  Warnings:

  - A unique constraint covering the columns `[id_emb_empresas,ds_classificacao]` on the table `emb_classificacao_implementos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cd_fornecedor,id_emb_empresas]` on the table `emb_fornecedores_insumos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_sis_simples_nacional,dt_vigencia]` on the table `sis_simples_nacional_vigencia` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "emb_classificacao_implementos_ds_classificacao_key";

-- DropIndex
DROP INDEX "emb_classificacao_implementos_id_emb_empresas_key";

-- DropIndex
DROP INDEX "sis_simples_nacional_vigencia_dt_vigencia_key";

-- CreateTable
CREATE TABLE "sis_grupos_tributarios_vigencia" (
    "id" TEXT NOT NULL,
    "id_sis_grupos_tributarios" TEXT NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,
    "id_sis_ibge_uf_origem_carga" INTEGER NOT NULL,
    "vl_cst" INTEGER NOT NULL,
    "fl_dif_icms" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sis_grupos_tributarios_vigencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_simples_nacional_divisao_taxas_prm_vigencia" (
    "id" TEXT NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,
    "vl_porcent_cpp" DECIMAL(14,2) NOT NULL,
    "vl_porcent_csll" DECIMAL(14,2) NOT NULL,
    "vl_porcent_irpj" DECIMAL(14,2) NOT NULL,
    "vl_porcent_pis" DECIMAL(14,2) NOT NULL,
    "vl_porcent_cofins" DECIMAL(14,2) NOT NULL,
    "vl_porcent_icms" DECIMAL(14,2) NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_sis_simples_nacional" TEXT NOT NULL,

    CONSTRAINT "sis_simples_nacional_divisao_taxas_prm_vigencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_ibge_uf_vigencia" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,
    "vl_percentual_ipva_carros" DECIMAL(10,6) NOT NULL,
    "vl_percentual_ipva_caminhoes" DECIMAL(10,6) NOT NULL,
    "vl_icms_proprio" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "excecoes_uf_interestadual" JSONB,
    "icms_interestadual" DECIMAL(10,2),
    "vl_icms_excecao" DECIMAL(10,2),
    "credito_icms_combustivel" BOOLEAN NOT NULL DEFAULT false,
    "credito_icms_imobilizado" BOOLEAN NOT NULL DEFAULT false,
    "credito_icms_manutencao" BOOLEAN NOT NULL DEFAULT false,
    "credito_icms_pneu" BOOLEAN NOT NULL DEFAULT false,
    "id_sis_ibge_uf" INTEGER NOT NULL,

    CONSTRAINT "sis_ibge_uf_vigencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sis_grupos_tributarios_vigencia_id_sis_grupos_tributarios_d_key" ON "sis_grupos_tributarios_vigencia"("id_sis_grupos_tributarios", "dt_vigencia");

-- CreateIndex
CREATE UNIQUE INDEX "sis_simples_nacional_divisao_taxas_prm_vigencia_id_sis_simp_key" ON "sis_simples_nacional_divisao_taxas_prm_vigencia"("id_sis_simples_nacional", "dt_vigencia");

-- CreateIndex
CREATE UNIQUE INDEX "sis_ibge_uf_vigencia_id_sis_ibge_uf_dt_vigencia_key" ON "sis_ibge_uf_vigencia"("id_sis_ibge_uf", "dt_vigencia");

-- CreateIndex
CREATE UNIQUE INDEX "emb_classificacao_implementos_id_emb_empresas_ds_classifica_key" ON "emb_classificacao_implementos"("id_emb_empresas", "ds_classificacao");

-- CreateIndex
CREATE UNIQUE INDEX "emb_fornecedores_insumos_cd_fornecedor_id_emb_empresas_key" ON "emb_fornecedores_insumos"("cd_fornecedor", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "sis_simples_nacional_vigencia_id_sis_simples_nacional_dt_vi_key" ON "sis_simples_nacional_vigencia"("id_sis_simples_nacional", "dt_vigencia");

-- AddForeignKey
ALTER TABLE "sis_grupos_tributarios_vigencia" ADD CONSTRAINT "sis_grupos_tributarios_vigencia_id_sis_grupos_tributarios_fkey" FOREIGN KEY ("id_sis_grupos_tributarios") REFERENCES "sis_grupos_tributarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_grupos_tributarios_vigencia" ADD CONSTRAINT "sis_grupos_tributarios_vigencia_id_sis_ibge_uf_origem_carg_fkey" FOREIGN KEY ("id_sis_ibge_uf_origem_carga") REFERENCES "sis_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_simples_nacional_divisao_taxas_prm_vigencia" ADD CONSTRAINT "sis_simples_nacional_divisao_taxas_prm_vigencia_id_sis_sim_fkey" FOREIGN KEY ("id_sis_simples_nacional") REFERENCES "sis_simples_nacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_ibge_uf_vigencia" ADD CONSTRAINT "sis_ibge_uf_vigencia_id_sis_ibge_uf_fkey" FOREIGN KEY ("id_sis_ibge_uf") REFERENCES "sis_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
