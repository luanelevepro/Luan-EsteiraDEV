-- AlterEnum
ALTER TYPE "ModuleType" ADD VALUE 'EMBARCADOR';

-- AlterTable
ALTER TABLE "sis_regimes_tributarios" ADD COLUMN     "emb_empresasId" TEXT;

-- CreateTable
CREATE TABLE "emb_empresas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "id_sis_empresas" TEXT NOT NULL,

    CONSTRAINT "emb_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_classificacao_veiculos" (
    "id" SERIAL NOT NULL,
    "ds_classificacao" VARCHAR(35) NOT NULL,
    "fl_carroceria_um_independente" BOOLEAN,
    "fl_carroceria_dois_independente" BOOLEAN,
    "id_emb_empresas" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_classificacao_veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_classificacao_carrocerias" (
    "id" SERIAL NOT NULL,
    "ds_classificacao" VARCHAR(35) NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_classificacao_carrocerias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_classificacao_implementos" (
    "id" SERIAL NOT NULL,
    "ds_classificacao" VARCHAR(35) NOT NULL,
    "fl_acrescimo_eixo" BOOLEAN,
    "id_emb_empresas" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_classificacao_implementos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_grupos_tributarios" (
    "id" TEXT NOT NULL,
    "ds_nome" VARCHAR(50) NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,

    CONSTRAINT "sis_grupos_tributarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_simples_nacional" (
    "id" TEXT NOT NULL,
    "cd_simples" INTEGER NOT NULL,
    "ds_nome" VARCHAR(50) NOT NULL,

    CONSTRAINT "sis_simples_nacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_uf" (
    "cd_uf" VARCHAR(2) NOT NULL,
    "ds_nome" VARCHAR(50) NOT NULL,

    CONSTRAINT "sis_uf_pkey" PRIMARY KEY ("cd_uf")
);

-- CreateTable
CREATE TABLE "sis_uf_historico" (
    "cd_uf" VARCHAR(2) NOT NULL,
    "dt_vigencia" TIMESTAMP(0) NOT NULL,
    "vl_percentual_ipva_carros" DOUBLE PRECISION NOT NULL,
    "vl_percentual_ipva_caminhoes" DOUBLE PRECISION NOT NULL,
    "vl_icms_proprio" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "sis_uf_historico_pkey" PRIMARY KEY ("cd_uf","dt_vigencia")
);

-- CreateTable
CREATE TABLE "sis_emb_marcas_carrocerias" (
    "id" SERIAL NOT NULL,
    "cd_marca" INTEGER NOT NULL,
    "ds_nome" TEXT NOT NULL,

    CONSTRAINT "sis_emb_marcas_carrocerias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emb_empresas_id_sis_empresas_key" ON "emb_empresas"("id_sis_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_classificacao_veiculos_ds_classificacao_id_emb_empresas_key" ON "emb_classificacao_veiculos"("ds_classificacao", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_classificacao_carrocerias_ds_classificacao_id_emb_empre_key" ON "emb_classificacao_carrocerias"("ds_classificacao", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_classificacao_implementos_ds_classificacao_id_emb_empre_key" ON "emb_classificacao_implementos"("ds_classificacao", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "sis_simples_nacional_cd_simples_key" ON "sis_simples_nacional"("cd_simples");

-- CreateIndex
CREATE UNIQUE INDEX "sis_emb_marcas_carrocerias_cd_marca_key" ON "sis_emb_marcas_carrocerias"("cd_marca");

-- AddForeignKey
ALTER TABLE "emb_empresas" ADD CONSTRAINT "emb_empresas_id_sis_empresas_fkey" FOREIGN KEY ("id_sis_empresas") REFERENCES "sis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_classificacao_veiculos" ADD CONSTRAINT "emb_classificacao_veiculos_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_classificacao_carrocerias" ADD CONSTRAINT "emb_classificacao_carrocerias_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_classificacao_implementos" ADD CONSTRAINT "emb_classificacao_implementos_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_regimes_tributarios" ADD CONSTRAINT "sis_regimes_tributarios_emb_empresasId_fkey" FOREIGN KEY ("emb_empresasId") REFERENCES "emb_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_uf_historico" ADD CONSTRAINT "sis_uf_historico_cd_uf_fkey" FOREIGN KEY ("cd_uf") REFERENCES "sis_uf"("cd_uf") ON DELETE RESTRICT ON UPDATE CASCADE;
