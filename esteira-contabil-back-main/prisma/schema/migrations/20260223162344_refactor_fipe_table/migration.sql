/*
  Warnings:

  - You are about to drop the `emb_fipe_historico` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "emb_fipe_historico" DROP CONSTRAINT "emb_fipe_historico_id_emb_fipe_fkey";

-- DropForeignKey
ALTER TABLE "emb_fipe_historico" DROP CONSTRAINT "emb_fipe_historico_id_emb_tipos_veiculo_fkey";

-- DropTable
DROP TABLE "emb_fipe_historico";

-- CreateTable
CREATE TABLE "sis_fipe_historico" (
    "id" SERIAL NOT NULL,
    "id_emb_fipe" INTEGER NOT NULL,
    "ds_marca" TEXT NOT NULL,
    "ds_modelo" TEXT NOT NULL,
    "cd_fipe" VARCHAR(50) NOT NULL,
    "id_emb_tipos_veiculo" INTEGER,
    "cd_tipo_veiculo" INTEGER DEFAULT 0,
    "vl_mes" VARCHAR(50) NOT NULL,
    "vl_ano" VARCHAR(50) NOT NULL,
    "vl_ano_modelo" VARCHAR(50) NOT NULL,
    "vl_valor" DECIMAL(14,2),

    CONSTRAINT "sis_fipe_historico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sis_fipe_historico" ADD CONSTRAINT "sis_fipe_historico_id_emb_fipe_fkey" FOREIGN KEY ("id_emb_fipe") REFERENCES "sis_tabela_fipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_fipe_historico" ADD CONSTRAINT "sis_fipe_historico_id_emb_tipos_veiculo_fkey" FOREIGN KEY ("id_emb_tipos_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
