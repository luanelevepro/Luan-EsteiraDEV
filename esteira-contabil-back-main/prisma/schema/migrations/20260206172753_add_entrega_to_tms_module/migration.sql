/*
  Warnings:

  - You are about to drop the column `dt_entrega` on the `tms_cargas` table. All the data in the column will be lost.
  - You are about to drop the column `dt_limite_entrega` on the `tms_cargas` table. All the data in the column will be lost.
  - You are about to drop the column `id_cidade_destino` on the `tms_cargas` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusEntrega" AS ENUM ('PENDENTE', 'EM_TRANSITO', 'ENTREGUE', 'DEVOLVIDA', 'CANCELADA');

-- DropForeignKey
ALTER TABLE "tms_cargas" DROP CONSTRAINT "tms_cargas_id_cidade_destino_fkey";

-- AlterTable
ALTER TABLE "tms_cargas" DROP COLUMN "dt_entrega",
DROP COLUMN "dt_limite_entrega",
DROP COLUMN "id_cidade_destino";

-- CreateTable
CREATE TABLE "tms_entregas" (
    "id" TEXT NOT NULL,
    "cd_entrega" TEXT,
    "ds_status" "StatusEntrega" NOT NULL DEFAULT 'PENDENTE',
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_cidade_destino" INTEGER NOT NULL,
    "ds_endereco" TEXT,
    "ds_complemento" TEXT,
    "dt_limite_entrega" TIMESTAMP(3),
    "dt_entrega" TIMESTAMP(3),
    "ds_comprovante_entrega" TEXT,
    "ds_comprovante_key" TEXT,
    "ds_observacoes" TEXT,
    "vl_peso_bruto" DOUBLE PRECISION,
    "vl_cubagem" DOUBLE PRECISION,
    "vl_qtd_volumes" INTEGER,
    "id_carga" TEXT NOT NULL,
    "nr_sequencia" INTEGER NOT NULL,

    CONSTRAINT "tms_entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_entregas_cte" (
    "id" TEXT NOT NULL,
    "id_cte" TEXT NOT NULL,
    "id_entrega" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tms_entregas_cte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_entregas_nfe" (
    "id" TEXT NOT NULL,
    "id_nfe" TEXT NOT NULL,
    "id_entrega" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tms_entregas_nfe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tms_entregas_id_carga_idx" ON "tms_entregas"("id_carga");

-- CreateIndex
CREATE INDEX "tms_entregas_ds_status_idx" ON "tms_entregas"("ds_status");

-- CreateIndex
CREATE UNIQUE INDEX "tms_entregas_id_carga_nr_sequencia_key" ON "tms_entregas"("id_carga", "nr_sequencia");

-- CreateIndex
CREATE INDEX "tms_entregas_cte_id_entrega_idx" ON "tms_entregas_cte"("id_entrega");

-- CreateIndex
CREATE INDEX "tms_entregas_cte_id_cte_idx" ON "tms_entregas_cte"("id_cte");

-- CreateIndex
CREATE UNIQUE INDEX "tms_entregas_cte_id_entrega_id_cte_key" ON "tms_entregas_cte"("id_entrega", "id_cte");

-- CreateIndex
CREATE INDEX "tms_entregas_nfe_id_entrega_idx" ON "tms_entregas_nfe"("id_entrega");

-- CreateIndex
CREATE INDEX "tms_entregas_nfe_id_nfe_idx" ON "tms_entregas_nfe"("id_nfe");

-- CreateIndex
CREATE UNIQUE INDEX "tms_entregas_nfe_id_entrega_id_nfe_key" ON "tms_entregas_nfe"("id_entrega", "id_nfe");

-- AddForeignKey
ALTER TABLE "tms_entregas" ADD CONSTRAINT "tms_entregas_id_cidade_destino_fkey" FOREIGN KEY ("id_cidade_destino") REFERENCES "sis_igbe_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_entregas" ADD CONSTRAINT "tms_entregas_id_carga_fkey" FOREIGN KEY ("id_carga") REFERENCES "tms_cargas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_entregas_cte" ADD CONSTRAINT "tms_entregas_cte_id_entrega_fkey" FOREIGN KEY ("id_entrega") REFERENCES "tms_entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_entregas_cte" ADD CONSTRAINT "tms_entregas_cte_id_cte_fkey" FOREIGN KEY ("id_cte") REFERENCES "fis_cte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_entregas_nfe" ADD CONSTRAINT "tms_entregas_nfe_id_entrega_fkey" FOREIGN KEY ("id_entrega") REFERENCES "tms_entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_entregas_nfe" ADD CONSTRAINT "tms_entregas_nfe_id_nfe_fkey" FOREIGN KEY ("id_nfe") REFERENCES "fis_nfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
