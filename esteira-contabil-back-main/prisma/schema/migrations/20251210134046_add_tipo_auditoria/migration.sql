-- CreateEnum
CREATE TYPE "CriticidadeLevel" AS ENUM ('INFO', 'AVISO', 'CRITICA');

-- CreateTable
CREATE TABLE "fis_tipo_inconsistencia" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cd_codigo" TEXT NOT NULL,
    "ds_descricao" TEXT NOT NULL,
    "criticidade_padrao" "CriticidadeLevel" NOT NULL,
    "ds_grupo" TEXT,
    "fl_ativo" BOOLEAN NOT NULL DEFAULT true,
    "ds_ordem_exibicao" INTEGER DEFAULT 0,
    "versao_regra" TEXT,
    "dt_inicio_vigencia" TIMESTAMP(3),
    "dt_fim_vigencia" TIMESTAMP(3),

    CONSTRAINT "fis_tipo_inconsistencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fis_tipo_inconsistencia_cd_codigo_key" ON "fis_tipo_inconsistencia"("cd_codigo");
