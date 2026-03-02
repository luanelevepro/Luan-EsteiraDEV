/*
  Warnings:

  - You are about to drop the column `ds_tipo_tms_despesa` on the `con_plano_contas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "con_plano_contas" DROP COLUMN "ds_tipo_tms_despesa";

-- CreateTable
CREATE TABLE "rtc_produtos_classificacao" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_fis_produtos" TEXT NOT NULL,
    "cd_ncm_normalizado" TEXT,
    "cd_cst" TEXT NOT NULL DEFAULT '000',
    "cd_class_trib" TEXT NOT NULL DEFAULT '000001',
    "ds_class_trib_descr" TEXT,
    "ds_tipo_aliquota" TEXT,
    "ds_anexo_numero" TEXT,
    "ds_anexo_descricao" TEXT,
    "ds_anexo_numero_item" TEXT,
    "ds_anexo_texto_item" TEXT,
    "fl_ncm_encontrado" BOOLEAN NOT NULL DEFAULT false,
    "fl_confirmado_usuario" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rtc_produtos_classificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rtc_produtos_classificacao_id_fis_produtos_key" ON "rtc_produtos_classificacao"("id_fis_produtos");

-- AddForeignKey
ALTER TABLE "rtc_produtos_classificacao" ADD CONSTRAINT "rtc_produtos_classificacao_id_fis_produtos_fkey" FOREIGN KEY ("id_fis_produtos") REFERENCES "fis_produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
