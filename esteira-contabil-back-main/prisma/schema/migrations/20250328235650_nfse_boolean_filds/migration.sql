/*
  Warnings:

  - You are about to drop the column `ds_iss_retido` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_optante_simples_nacional` on the `fis_nfse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fis_nfse" DROP COLUMN "ds_iss_retido",
DROP COLUMN "ds_optante_simples_nacional",
ADD COLUMN     "is_iss_retido" BOOLEAN,
ADD COLUMN     "is_optante_simples_nacional" BOOLEAN;

-- CreateTable
CREATE TABLE "emb_estabelecimentos" (
    "id" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "id_cidade" INTEGER NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_estabelecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_transportadoras" (
    "cd_transportadora" TEXT NOT NULL,
    "ds_cnpj" TEXT NOT NULL,
    "ds_nome_fantasia" TEXT NOT NULL,
    "ds_razao_social" TEXT NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "cd_uf" TEXT NOT NULL,
    "cd_cidade" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_transportadoras_pkey" PRIMARY KEY ("cd_transportadora")
);

-- CreateTable
CREATE TABLE "emb_transportadoras_historico" (
    "cd_transportadora" VARCHAR(10) NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,
    "id_regime_tributario" TEXT,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_transportadoras_historico_pkey" PRIMARY KEY ("cd_transportadora")
);

-- CreateTable
CREATE TABLE "emb_taxa_juros_ano_modelo" (
    "cd_ano" INTEGER NOT NULL,
    "vl_taxa_juros" DOUBLE PRECISION NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_taxa_juros_ano_modelo_pkey" PRIMARY KEY ("cd_ano")
);

-- CreateIndex
CREATE UNIQUE INDEX "emb_transportadoras_cd_transportadora_key" ON "emb_transportadoras"("cd_transportadora");

-- CreateIndex
CREATE UNIQUE INDEX "emb_transportadoras_ds_cnpj_key" ON "emb_transportadoras"("ds_cnpj");

-- CreateIndex
CREATE INDEX "emb_transportadoras_cd_transportadora_idx" ON "emb_transportadoras"("cd_transportadora");

-- CreateIndex
CREATE UNIQUE INDEX "emb_transportadoras_historico_cd_transportadora_dt_vigencia_key" ON "emb_transportadoras_historico"("cd_transportadora", "dt_vigencia");

-- CreateIndex
CREATE UNIQUE INDEX "emb_taxa_juros_ano_modelo_cd_ano_key" ON "emb_taxa_juros_ano_modelo"("cd_ano");

-- AddForeignKey
ALTER TABLE "emb_estabelecimentos" ADD CONSTRAINT "emb_estabelecimentos_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_transportadoras" ADD CONSTRAINT "emb_transportadoras_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
