/*
  Warnings:

  - You are about to drop the `fis_cfop` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fis_cst` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fis_origem_cst` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fis_regimes_tributarios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fis_tipos_produto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sis_produtos_segmento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sis_segmentos_empresas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sis_produtos_segmento" DROP CONSTRAINT "sis_produtos_segmento_id_segmento_fkey";

-- DropTable
DROP TABLE "fis_cfop";

-- DropTable
DROP TABLE "fis_cst";

-- DropTable
DROP TABLE "fis_origem_cst";

-- DropTable
DROP TABLE "fis_regimes_tributarios";

-- DropTable
DROP TABLE "fis_tipos_produto";

-- DropTable
DROP TABLE "sis_produtos_segmento";

-- DropTable
DROP TABLE "sis_segmentos_empresas";

-- CreateTable
CREATE TABLE "sis_regimes_tributarios" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_descricao" TEXT NOT NULL,
    "ds_codigo" TEXT,

    CONSTRAINT "sis_regimes_tributarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_segmentos_empresas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_descricao" TEXT NOT NULL,
    "ds_codigo" TEXT,

    CONSTRAINT "fis_segmentos_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_prd_segmento" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_descricao" TEXT NOT NULL,
    "ds_codigo" TEXT,
    "id_segmento" TEXT NOT NULL,

    CONSTRAINT "fis_prd_segmento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_tipos_produto" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_codigo" TEXT,
    "id_segmento" TEXT NOT NULL,

    CONSTRAINT "sis_tipos_produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_origem_cst" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_codigo" TEXT,
    "id_segmento" TEXT NOT NULL,

    CONSTRAINT "sis_origem_cst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_cst" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_codigo" TEXT,
    "id_segmento" TEXT NOT NULL,

    CONSTRAINT "sis_cst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_cfop" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_codigo" TEXT,
    "id_segmento" TEXT NOT NULL,

    CONSTRAINT "sis_cfop_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fis_prd_segmento" ADD CONSTRAINT "fis_prd_segmento_id_segmento_fkey" FOREIGN KEY ("id_segmento") REFERENCES "fis_segmentos_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
