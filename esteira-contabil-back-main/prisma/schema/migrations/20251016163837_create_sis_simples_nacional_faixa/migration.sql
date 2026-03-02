/*
  Warnings:

  - You are about to drop the column `id_sis_simples_nacional` on the `sis_simples_nacional_divisao_taxas_prm_vigencia` table. All the data in the column will be lost.
  - You are about to drop the column `id_sis_simples_nacional` on the `sis_simples_nacional_vigencia` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id_sis_simples_nacional_faixa,dt_vigencia]` on the table `sis_simples_nacional_divisao_taxas_prm_vigencia` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_sis_simples_nacional_faixa,dt_vigencia]` on the table `sis_simples_nacional_vigencia` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_sis_simples_nacional_faixa` to the `sis_simples_nacional_divisao_taxas_prm_vigencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_sis_simples_nacional_faixa` to the `sis_simples_nacional_vigencia` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "sis_simples_nacional_divisao_taxas_prm_vigencia" DROP CONSTRAINT "sis_simples_nacional_divisao_taxas_prm_vigencia_id_sis_sim_fkey";

-- DropForeignKey
ALTER TABLE "sis_simples_nacional_vigencia" DROP CONSTRAINT "sis_simples_nacional_vigencia_id_sis_simples_nacional_fkey";

-- DropIndex
DROP INDEX "sis_simples_nacional_divisao_taxas_prm_vigencia_id_sis_simp_key";

-- DropIndex
DROP INDEX "sis_simples_nacional_vigencia_id_sis_simples_nacional_dt_vi_key";

-- DropIndex
DROP INDEX "sis_simples_nacional_vigencia_id_sis_simples_nacional_key";

-- AlterTable
ALTER TABLE "sis_simples_nacional_divisao_taxas_prm_vigencia" DROP COLUMN "id_sis_simples_nacional",
ADD COLUMN     "id_sis_simples_nacional_faixa" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sis_simples_nacional_vigencia" DROP COLUMN "id_sis_simples_nacional",
ADD COLUMN     "id_sis_simples_nacional_faixa" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "sis_simples_nacional_faixa" (
    "id" TEXT NOT NULL,
    "ds_faixa" VARCHAR(50) NOT NULL,
    "cd_faixa" INTEGER NOT NULL,
    "id_sis_simples_nacional" TEXT NOT NULL,

    CONSTRAINT "sis_simples_nacional_faixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sis_simples_nacional_divisao_taxas_prm_vigencia_id_sis_simp_key" ON "sis_simples_nacional_divisao_taxas_prm_vigencia"("id_sis_simples_nacional_faixa", "dt_vigencia");

-- CreateIndex
CREATE UNIQUE INDEX "sis_simples_nacional_vigencia_id_sis_simples_nacional_faixa_key" ON "sis_simples_nacional_vigencia"("id_sis_simples_nacional_faixa", "dt_vigencia");

-- AddForeignKey
ALTER TABLE "sis_simples_nacional_faixa" ADD CONSTRAINT "sis_simples_nacional_faixa_id_sis_simples_nacional_fkey" FOREIGN KEY ("id_sis_simples_nacional") REFERENCES "sis_simples_nacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_simples_nacional_vigencia" ADD CONSTRAINT "sis_simples_nacional_vigencia_id_sis_simples_nacional_faix_fkey" FOREIGN KEY ("id_sis_simples_nacional_faixa") REFERENCES "sis_simples_nacional_faixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_simples_nacional_divisao_taxas_prm_vigencia" ADD CONSTRAINT "sis_simples_nacional_divisao_taxas_prm_vigencia_id_sis_sim_fkey" FOREIGN KEY ("id_sis_simples_nacional_faixa") REFERENCES "sis_simples_nacional_faixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
