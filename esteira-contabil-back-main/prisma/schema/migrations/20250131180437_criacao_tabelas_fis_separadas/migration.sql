/*
  Warnings:

  - You are about to drop the `fis_cadastros` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "fis_cadastros";

-- DropEnum
DROP TYPE "CadastroTipo";

-- CreateTable
CREATE TABLE "fis_regimes_tributarios" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "codigo" TEXT,

    CONSTRAINT "fis_regimes_tributarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_segmentos_empresas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "codigo" TEXT,

    CONSTRAINT "fis_segmentos_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_produtos_segmento" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "codigo" TEXT,
    "id_segmento" TEXT NOT NULL,

    CONSTRAINT "fis_produtos_segmento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_tipos_produto" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "codigo" TEXT,

    CONSTRAINT "fis_tipos_produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_origem_cst" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "codigo" TEXT,

    CONSTRAINT "fis_origem_cst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_cst" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "codigo" TEXT,

    CONSTRAINT "fis_cst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_cfop" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "codigo" TEXT,

    CONSTRAINT "fis_cfop_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fis_produtos_segmento" ADD CONSTRAINT "fis_produtos_segmento_id_segmento_fkey" FOREIGN KEY ("id_segmento") REFERENCES "fis_segmentos_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
