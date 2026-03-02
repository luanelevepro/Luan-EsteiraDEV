/*
  Warnings:

  - The `id_sis_municipios_cnh` column on the `tms_motoristas` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "tms_motoristas" DROP CONSTRAINT "tms_motoristas_id_ger_pessoa_fk_fkey";

-- AlterTable
ALTER TABLE "tms_motoristas" ALTER COLUMN "id_ger_pessoa_fk" DROP NOT NULL,
ALTER COLUMN "ds_cnh_numero" DROP NOT NULL,
ALTER COLUMN "ds_cnh_categoria" DROP NOT NULL,
ALTER COLUMN "dt_vencimento_cnh" DROP NOT NULL,
ALTER COLUMN "dt_primeira_cnh" DROP NOT NULL,
DROP COLUMN "id_sis_municipios_cnh",
ADD COLUMN     "id_sis_municipios_cnh" INTEGER,
ALTER COLUMN "ds_tipo_vinculo" DROP NOT NULL;

-- CreateTable
CREATE TABLE "tms_veiculo_segmento" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_tms_veiculo" TEXT NOT NULL,
    "id_tms_segmento" TEXT NOT NULL,

    CONSTRAINT "tms_veiculo_segmento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tms_motoristas" ADD CONSTRAINT "tms_motoristas_id_sis_municipios_cnh_fkey" FOREIGN KEY ("id_sis_municipios_cnh") REFERENCES "sis_igbe_city"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_motoristas" ADD CONSTRAINT "tms_motoristas_id_ger_pessoa_fk_fkey" FOREIGN KEY ("id_ger_pessoa_fk") REFERENCES "ger_pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_veiculo_segmento" ADD CONSTRAINT "tms_veiculo_segmento_id_tms_veiculo_fkey" FOREIGN KEY ("id_tms_veiculo") REFERENCES "tms_veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_veiculo_segmento" ADD CONSTRAINT "tms_veiculo_segmento_id_tms_segmento_fkey" FOREIGN KEY ("id_tms_segmento") REFERENCES "tms_segmentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
