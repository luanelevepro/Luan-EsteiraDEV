/*
  Warnings:

  - You are about to drop the `fis_produtos_segmento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fis_segmentos_empresas` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "ModuleType" ADD VALUE 'FISCAL';

-- DropForeignKey
ALTER TABLE "fis_produtos_segmento" DROP CONSTRAINT "fis_produtos_segmento_id_segmento_fkey";

-- DropTable
DROP TABLE "fis_produtos_segmento";

-- DropTable
DROP TABLE "fis_segmentos_empresas";

-- CreateTable
CREATE TABLE "sis_segmentos_empresas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "codigo" TEXT,

    CONSTRAINT "sis_segmentos_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_produtos_segmento" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "codigo" TEXT,
    "id_segmento" TEXT NOT NULL,

    CONSTRAINT "sis_produtos_segmento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sis_produtos_segmento" ADD CONSTRAINT "sis_produtos_segmento_id_segmento_fkey" FOREIGN KEY ("id_segmento") REFERENCES "sis_segmentos_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
