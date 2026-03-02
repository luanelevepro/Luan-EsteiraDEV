/*
  Warnings:

  - You are about to drop the column `carga` on the `tms_viagens` table. All the data in the column will be lost.
  - You are about to drop the column `dt_start_point` on the `tms_viagens` table. All the data in the column will be lost.
  - You are about to drop the column `id_motorista` on the `tms_viagens` table. All the data in the column will be lost.
  - You are about to drop the column `id_viagem` on the `tms_viagens` table. All the data in the column will be lost.
  - You are about to drop the column `rota` on the `tms_viagens` table. All the data in the column will be lost.
  - Added the required column `cd_viagem` to the `tms_viagens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ds_motorista` to the `tms_viagens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ds_placa_cavalo` to the `tms_viagens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_tms_empresa` to the `tms_viagens` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatusViagem" AS ENUM ('PLANEJADA', 'EM_COLETA', 'EM_TRANSITO', 'CONCLUIDA', 'ATRASADA', 'CANCELADA');

-- DropForeignKey
ALTER TABLE "tms_viagens" DROP CONSTRAINT "tms_viagens_id_motorista_fkey";

-- DropIndex
DROP INDEX "tms_viagens_id_viagem_key";

-- AlterTable
ALTER TABLE "tms_viagens" DROP COLUMN "carga",
DROP COLUMN "dt_start_point",
DROP COLUMN "id_motorista",
DROP COLUMN "id_viagem",
DROP COLUMN "rota",
ADD COLUMN     "cd_viagem" TEXT NOT NULL,
ADD COLUMN     "ds_comprovante_entrega" TEXT,
ADD COLUMN     "ds_comprovante_key" TEXT,
ADD COLUMN     "ds_motorista" TEXT NOT NULL,
ADD COLUMN     "ds_placa_carreta_1" TEXT,
ADD COLUMN     "ds_placa_carreta_2" TEXT,
ADD COLUMN     "ds_placa_carreta_3" TEXT,
ADD COLUMN     "ds_placa_cavalo" TEXT NOT NULL,
ADD COLUMN     "ds_status" "StatusViagem" NOT NULL DEFAULT 'PLANEJADA',
ADD COLUMN     "dt_agendada" TIMESTAMP(3),
ADD COLUMN     "dt_conclusao" TIMESTAMP(3),
ADD COLUMN     "dt_previsao_retorno" TIMESTAMP(3),
ADD COLUMN     "id_tms_empresa" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "tms_viagens_cargas" (
    "id" TEXT NOT NULL,
    "id_viagem" TEXT NOT NULL,
    "id_carga" TEXT NOT NULL,
    "dt_vinculacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nr_sequencia" INTEGER NOT NULL,

    CONSTRAINT "tms_viagens_cargas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tms_viagens_cargas_id_viagem_idx" ON "tms_viagens_cargas"("id_viagem");

-- CreateIndex
CREATE INDEX "tms_viagens_cargas_id_carga_idx" ON "tms_viagens_cargas"("id_carga");

-- CreateIndex
CREATE UNIQUE INDEX "tms_viagens_cargas_id_viagem_id_carga_key" ON "tms_viagens_cargas"("id_viagem", "id_carga");

-- CreateIndex
CREATE INDEX "tms_viagens_id_tms_empresa_idx" ON "tms_viagens"("id_tms_empresa");

-- CreateIndex
CREATE INDEX "tms_viagens_ds_status_idx" ON "tms_viagens"("ds_status");

-- CreateIndex
CREATE INDEX "tms_viagens_dt_agendada_idx" ON "tms_viagens"("dt_agendada");

-- AddForeignKey
ALTER TABLE "tms_viagens" ADD CONSTRAINT "tms_viagens_id_tms_empresa_fkey" FOREIGN KEY ("id_tms_empresa") REFERENCES "tms_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_viagens_cargas" ADD CONSTRAINT "tms_viagens_cargas_id_viagem_fkey" FOREIGN KEY ("id_viagem") REFERENCES "tms_viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_viagens_cargas" ADD CONSTRAINT "tms_viagens_cargas_id_carga_fkey" FOREIGN KEY ("id_carga") REFERENCES "tms_cargas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
