/*
  Warnings:

  - You are about to drop the column `id_auxiliar_verificador_extra_carga` on the `emb_custo_fixo_vigencia` table. All the data in the column will be lost.
  - You are about to drop the column `ds_verificador_extra` on the `emb_custo_variavel_vigencia` table. All the data in the column will be lost.
  - You are about to drop the column `id_auxiliar_verificador_extra_carga` on the `emb_custo_variavel_vigencia` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" DROP CONSTRAINT "emb_custo_fixo_vigencia_id_auxiliar_verificador_extra_carg_fkey";

-- DropForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" DROP CONSTRAINT "emb_custo_variavel_vigencia_id_auxiliar_verificador_extra__fkey";

-- AlterTable
ALTER TABLE "emb_custo_fixo_vigencia" DROP COLUMN "id_auxiliar_verificador_extra_carga",
ADD COLUMN     "emb_carga_auxiliar_verificador_extraId" INTEGER;

-- AlterTable
ALTER TABLE "emb_custo_variavel_vigencia" DROP COLUMN "ds_verificador_extra",
DROP COLUMN "id_auxiliar_verificador_extra_carga",
ADD COLUMN     "emb_carga_auxiliar_verificador_extraId" INTEGER,
ALTER COLUMN "js_custo_variavel" DROP NOT NULL;

-- CreateTable
CREATE TABLE "sis_simples_nacional_vigencia" (
    "id" TEXT NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,
    "vl_receita_minima" DECIMAL(14,2),
    "vl_receita_maxima" DECIMAL(14,2),
    "vl_aliquota" DECIMAL(7,4) NOT NULL,
    "vl_dedutivel" DECIMAL(14,2) NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_sis_simples_nacional" TEXT NOT NULL,

    CONSTRAINT "sis_simples_nacional_vigencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sis_simples_nacional_vigencia_dt_vigencia_key" ON "sis_simples_nacional_vigencia"("dt_vigencia");

-- CreateIndex
CREATE UNIQUE INDEX "sis_simples_nacional_vigencia_id_sis_simples_nacional_key" ON "sis_simples_nacional_vigencia"("id_sis_simples_nacional");

-- AddForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" ADD CONSTRAINT "emb_custo_fixo_vigencia_emb_carga_auxiliar_verificador_ext_fkey" FOREIGN KEY ("emb_carga_auxiliar_verificador_extraId") REFERENCES "emb_carga_auxiliar_verificador_extra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" ADD CONSTRAINT "emb_custo_variavel_vigencia_emb_carga_auxiliar_verificador_fkey" FOREIGN KEY ("emb_carga_auxiliar_verificador_extraId") REFERENCES "emb_carga_auxiliar_verificador_extra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_simples_nacional_vigencia" ADD CONSTRAINT "sis_simples_nacional_vigencia_id_sis_simples_nacional_fkey" FOREIGN KEY ("id_sis_simples_nacional") REFERENCES "sis_simples_nacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
