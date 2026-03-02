-- CreateEnum
CREATE TYPE "TipoColunas" AS ENUM ('STATUS', 'DATA', 'TEXTO', 'OPCAO');

-- CreateEnum
CREATE TYPE "TabelasPersonalizadas" AS ENUM ('CARGASLIST', 'ENTREGASLIST', 'VIAGENSLIST');

-- CreateTable
CREATE TABLE "sis_colunas_personalizadas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome_coluna" TEXT NOT NULL,
    "ds_descricao" TEXT,
    "ds_cor" TEXT NOT NULL,
    "ds_tipo" "TipoColunas" NOT NULL,
    "js_valores" JSONB,
    "ds_tabela" "TabelasPersonalizadas" NOT NULL,
    "id_sis_empresa" TEXT NOT NULL,

    CONSTRAINT "sis_colunas_personalizadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_coluna_dado" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_sis_colunas_personalizadas" TEXT NOT NULL,
    "id_referencia" TEXT NOT NULL,
    "ds_valor" TEXT NOT NULL,

    CONSTRAINT "sis_coluna_dado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sis_colunas_personalizadas_id_sis_empresa_ds_tabela_idx" ON "sis_colunas_personalizadas"("id_sis_empresa", "ds_tabela");

-- CreateIndex
CREATE UNIQUE INDEX "sis_colunas_personalizadas_id_sis_empresa_ds_tabela_ds_nome_key" ON "sis_colunas_personalizadas"("id_sis_empresa", "ds_tabela", "ds_nome_coluna");

-- CreateIndex
CREATE INDEX "sis_coluna_dado_id_sis_colunas_personalizadas_id_referencia_idx" ON "sis_coluna_dado"("id_sis_colunas_personalizadas", "id_referencia");

-- CreateIndex
CREATE UNIQUE INDEX "sis_coluna_dado_id_sis_colunas_personalizadas_id_referencia_key" ON "sis_coluna_dado"("id_sis_colunas_personalizadas", "id_referencia");

-- AddForeignKey
ALTER TABLE "sis_colunas_personalizadas" ADD CONSTRAINT "sis_colunas_personalizadas_id_sis_empresa_fkey" FOREIGN KEY ("id_sis_empresa") REFERENCES "sis_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_coluna_dado" ADD CONSTRAINT "sis_coluna_dado_id_sis_colunas_personalizadas_fkey" FOREIGN KEY ("id_sis_colunas_personalizadas") REFERENCES "sis_colunas_personalizadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
