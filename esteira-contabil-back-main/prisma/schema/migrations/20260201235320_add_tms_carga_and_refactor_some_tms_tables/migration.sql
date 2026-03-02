/*
  Warnings:

  - You are about to drop the column `id_tms_motoristas_fk` on the `tms_motoristas_veiculos` table. All the data in the column will be lost.
  - You are about to drop the column `id_tms_veiculos_fk` on the `tms_motoristas_veiculos` table. All the data in the column will be lost.
  - You are about to drop the `viagens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `viagens_cte` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `viagens_nfe` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `id_tms_motoristas` to the `tms_motoristas_veiculos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_tms_veiculos` to the `tms_motoristas_veiculos` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PrioridadeCarga" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('CARRETA', 'TRUCK', 'VUC', 'UTILITARIO', 'BITREM', 'RODOTREM');

-- DropForeignKey
ALTER TABLE "tms_motoristas_veiculos" DROP CONSTRAINT "tms_motoristas_veiculos_id_tms_motoristas_fk_fkey";

-- DropForeignKey
ALTER TABLE "tms_motoristas_veiculos" DROP CONSTRAINT "tms_motoristas_veiculos_id_tms_veiculos_fk_fkey";

-- DropForeignKey
ALTER TABLE "viagens" DROP CONSTRAINT "viagens_id_motorista_fkey";

-- DropForeignKey
ALTER TABLE "viagens_cte" DROP CONSTRAINT "viagens_cte_id_cte_fkey";

-- DropForeignKey
ALTER TABLE "viagens_cte" DROP CONSTRAINT "viagens_cte_id_viagem_fkey";

-- DropForeignKey
ALTER TABLE "viagens_nfe" DROP CONSTRAINT "viagens_nfe_id_nfe_fkey";

-- DropForeignKey
ALTER TABLE "viagens_nfe" DROP CONSTRAINT "viagens_nfe_id_viagem_fkey";

-- AlterTable
ALTER TABLE "tms_motoristas_veiculos" DROP COLUMN "id_tms_motoristas_fk",
DROP COLUMN "id_tms_veiculos_fk",
ADD COLUMN     "id_tms_motoristas" TEXT NOT NULL,
ADD COLUMN     "id_tms_veiculos" TEXT NOT NULL;

-- DropTable
DROP TABLE "viagens";

-- DropTable
DROP TABLE "viagens_cte";

-- DropTable
DROP TABLE "viagens_nfe";

-- CreateTable
CREATE TABLE "tms_viagens" (
    "id" TEXT NOT NULL,
    "id_viagem" TEXT NOT NULL,
    "id_motorista" TEXT NOT NULL,
    "dt_start_point" TEXT,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "carga" BOOLEAN NOT NULL DEFAULT false,
    "rota" TEXT[],

    CONSTRAINT "tms_viagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_cargas_nfe" (
    "id" TEXT NOT NULL,
    "id_nfe" TEXT NOT NULL,
    "id_carga" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tms_cargas_nfe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_cargas_cte" (
    "id" TEXT NOT NULL,
    "id_cte" TEXT NOT NULL,
    "id_carga" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tms_cargas_cte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_cargas" (
    "id" TEXT NOT NULL,
    "cd_carga" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_coleta_inicio" TIMESTAMP(3),
    "dt_coleta_fim" TIMESTAMP(3),
    "dt_limite_entrega" TIMESTAMP(3),
    "ds_observacoes" TEXT,
    "ds_tipo_veiculo" "TipoVeiculo",
    "ds_prioridade" "PrioridadeCarga" NOT NULL DEFAULT 'NORMAL',
    "vl_peso_bruto" DOUBLE PRECISION,
    "vl_cubagem" DOUBLE PRECISION,
    "vl_qtd_volumes" INTEGER,
    "vl_limite_empilhamento" INTEGER,
    "fl_requer_seguro" BOOLEAN NOT NULL DEFAULT true,
    "id_cidade_origem" INTEGER NOT NULL,
    "id_cidade_destino" INTEGER NOT NULL,
    "id_tms_empresa" TEXT NOT NULL,
    "id_motorista_veiculo" TEXT,
    "id_cliente" TEXT,
    "id_segmento" TEXT,

    CONSTRAINT "tms_cargas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tms_viagens_id_viagem_key" ON "tms_viagens"("id_viagem");

-- CreateIndex
CREATE UNIQUE INDEX "tms_cargas_nfe_id_carga_id_nfe_key" ON "tms_cargas_nfe"("id_carga", "id_nfe");

-- CreateIndex
CREATE UNIQUE INDEX "tms_cargas_cte_id_carga_id_cte_key" ON "tms_cargas_cte"("id_carga", "id_cte");

-- AddForeignKey
ALTER TABLE "tms_motoristas_veiculos" ADD CONSTRAINT "tms_motoristas_veiculos_id_tms_motoristas_fkey" FOREIGN KEY ("id_tms_motoristas") REFERENCES "tms_motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_motoristas_veiculos" ADD CONSTRAINT "tms_motoristas_veiculos_id_tms_veiculos_fkey" FOREIGN KEY ("id_tms_veiculos") REFERENCES "tms_veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_viagens" ADD CONSTRAINT "tms_viagens_id_motorista_fkey" FOREIGN KEY ("id_motorista") REFERENCES "tms_motoristas_veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_cargas_nfe" ADD CONSTRAINT "tms_cargas_nfe_id_carga_fkey" FOREIGN KEY ("id_carga") REFERENCES "tms_cargas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_cargas_nfe" ADD CONSTRAINT "tms_cargas_nfe_id_nfe_fkey" FOREIGN KEY ("id_nfe") REFERENCES "fis_nfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_cargas_cte" ADD CONSTRAINT "tms_cargas_cte_id_carga_fkey" FOREIGN KEY ("id_carga") REFERENCES "tms_cargas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_cargas_cte" ADD CONSTRAINT "tms_cargas_cte_id_cte_fkey" FOREIGN KEY ("id_cte") REFERENCES "fis_cte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_cargas" ADD CONSTRAINT "tms_cargas_id_cidade_origem_fkey" FOREIGN KEY ("id_cidade_origem") REFERENCES "sis_igbe_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_cargas" ADD CONSTRAINT "tms_cargas_id_cidade_destino_fkey" FOREIGN KEY ("id_cidade_destino") REFERENCES "sis_igbe_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_cargas" ADD CONSTRAINT "tms_cargas_id_tms_empresa_fkey" FOREIGN KEY ("id_tms_empresa") REFERENCES "tms_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_cargas" ADD CONSTRAINT "tms_cargas_id_motorista_veiculo_fkey" FOREIGN KEY ("id_motorista_veiculo") REFERENCES "tms_motoristas_veiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_cargas" ADD CONSTRAINT "tms_cargas_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "tms_clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_cargas" ADD CONSTRAINT "tms_cargas_id_segmento_fkey" FOREIGN KEY ("id_segmento") REFERENCES "tms_segmentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
