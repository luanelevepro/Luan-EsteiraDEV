/*
  Warnings:

  - The primary key for the `emb_fipe_historico` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cd_fipe_tracionador` on the `emb_frota` table. All the data in the column will be lost.
  - The primary key for the `emb_tabela_fipe` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[cd_fipe,vl_ano_modelo]` on the table `emb_tabela_fipe` will be added. If there are existing duplicate values, this will fail.

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

-- DropIndex
DROP INDEX "emb_tabela_fipe_cd_fipe_key";

-- AlterTable
ALTER TABLE "emb_fipe_historico" DROP CONSTRAINT "emb_fipe_historico_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_fipe" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_fipe_historico_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_fipe_historico_id_seq";

-- AlterTable
ALTER TABLE "emb_frota" DROP COLUMN "cd_fipe_tracionador",
ADD COLUMN     "id_tabela_fipe" TEXT,
ADD COLUMN     "id_tabela_fipe_carroceria_semi" TEXT,
ADD COLUMN     "id_tabela_fipe_carroceria_semi_2" TEXT;

-- AlterTable
ALTER TABLE "emb_frota_reposicao" ALTER COLUMN "id_emb_tabela_fipe" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "emb_tabela_fipe" DROP CONSTRAINT "emb_tabela_fipe_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_tabela_fipe_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_tabela_fipe_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "emb_tabela_fipe_cd_fipe_vl_ano_modelo_key" ON "emb_tabela_fipe"("cd_fipe", "vl_ano_modelo");

-- AddForeignKey
ALTER TABLE "emb_fipe_historico" ADD CONSTRAINT "emb_fipe_historico_id_emb_fipe_fkey" FOREIGN KEY ("id_emb_fipe") REFERENCES "emb_tabela_fipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_tabela_fipe_fkey" FOREIGN KEY ("id_tabela_fipe") REFERENCES "emb_tabela_fipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_tabela_fipe_carroceria_semi_fkey" FOREIGN KEY ("id_tabela_fipe_carroceria_semi") REFERENCES "emb_tabela_fipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_tabela_fipe_carroceria_semi_2_fkey" FOREIGN KEY ("id_tabela_fipe_carroceria_semi_2") REFERENCES "emb_tabela_fipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_reposicao" ADD CONSTRAINT "emb_frota_reposicao_id_emb_tabela_fipe_fkey" FOREIGN KEY ("id_emb_tabela_fipe") REFERENCES "emb_tabela_fipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
