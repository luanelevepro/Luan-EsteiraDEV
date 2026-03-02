/*
  Warnings:

  - The `id_modelo` column on the `tms_veiculos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `emb_tabela_fipe` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sis_modelos_fipe` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sis_modelos_fipe_vigencia` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "emb_fipe_historico" DROP CONSTRAINT "emb_fipe_historico_id_emb_fipe_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_cd_fipe_carroceria_semi_2_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_cd_fipe_carroceria_semi_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_cd_fipe_tracionador_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota_reposicao" DROP CONSTRAINT "emb_frota_reposicao_id_emb_tabela_fipe_fkey";

-- DropForeignKey
ALTER TABLE "emb_tabela_fipe" DROP CONSTRAINT "emb_tabela_fipe_id_emb_tipos_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "sis_modelos_fipe_vigencia" DROP CONSTRAINT "sis_modelos_fipe_vigencia_id_sis_modelos_fipe_fkey";

-- DropForeignKey
ALTER TABLE "tms_veiculos" DROP CONSTRAINT "tms_veiculos_id_modelo_fkey";

-- AlterTable
ALTER TABLE "tms_veiculos" DROP COLUMN "id_modelo",
ADD COLUMN     "id_modelo" INTEGER;

-- DropTable
DROP TABLE "emb_tabela_fipe";

-- DropTable
DROP TABLE "sis_modelos_fipe";

-- DropTable
DROP TABLE "sis_modelos_fipe_vigencia";

-- CreateTable
CREATE TABLE "sis_tabela_fipe" (
    "id" SERIAL NOT NULL,
    "ds_marca" TEXT NOT NULL,
    "ds_modelo" TEXT NOT NULL,
    "cd_fipe" VARCHAR(50) NOT NULL,
    "vl_ano_modelo" VARCHAR(4) NOT NULL,
    "vl_valor" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3),
    "id_emb_tipos_veiculo" INTEGER,

    CONSTRAINT "sis_tabela_fipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sis_tabela_fipe_cd_fipe_key" ON "sis_tabela_fipe"("cd_fipe");

-- AddForeignKey
ALTER TABLE "sis_tabela_fipe" ADD CONSTRAINT "sis_tabela_fipe_id_emb_tipos_veiculo_fkey" FOREIGN KEY ("id_emb_tipos_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_fipe_historico" ADD CONSTRAINT "emb_fipe_historico_id_emb_fipe_fkey" FOREIGN KEY ("id_emb_fipe") REFERENCES "sis_tabela_fipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_cd_fipe_tracionador_fkey" FOREIGN KEY ("cd_fipe_tracionador") REFERENCES "sis_tabela_fipe"("cd_fipe") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_cd_fipe_carroceria_semi_fkey" FOREIGN KEY ("cd_fipe_carroceria_semi") REFERENCES "sis_tabela_fipe"("cd_fipe") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_cd_fipe_carroceria_semi_2_fkey" FOREIGN KEY ("cd_fipe_carroceria_semi_2") REFERENCES "sis_tabela_fipe"("cd_fipe") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_reposicao" ADD CONSTRAINT "emb_frota_reposicao_id_emb_tabela_fipe_fkey" FOREIGN KEY ("id_emb_tabela_fipe") REFERENCES "sis_tabela_fipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_veiculos" ADD CONSTRAINT "tms_veiculos_id_modelo_fkey" FOREIGN KEY ("id_modelo") REFERENCES "sis_tabela_fipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
