/*
  Warnings:

  - You are about to drop the column `ds_codigo` on the `fis_prd_segmento` table. All the data in the column will be lost.
  - You are about to drop the column `ds_codigo` on the `fis_segmentos_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `ds_codigo` on the `sis_regimes_tributarios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fis_prd_segmento" DROP COLUMN "ds_codigo",
ADD COLUMN     "id_fis_empresas" TEXT;

-- AlterTable
ALTER TABLE "fis_segmentos_empresas" DROP COLUMN "ds_codigo",
ADD COLUMN     "id_fis_empresas" TEXT;

-- AlterTable
ALTER TABLE "sis_regimes_tributarios" DROP COLUMN "ds_codigo";

-- CreateTable
CREATE TABLE "fis_empresas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_sis_empresas" TEXT NOT NULL,

    CONSTRAINT "fis_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fis_empresas_id_sis_empresas_key" ON "fis_empresas"("id_sis_empresas");

-- AddForeignKey
ALTER TABLE "fis_empresas" ADD CONSTRAINT "fis_empresas_id_sis_empresas_fkey" FOREIGN KEY ("id_sis_empresas") REFERENCES "sis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_segmentos_empresas" ADD CONSTRAINT "fis_segmentos_empresas_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_prd_segmento" ADD CONSTRAINT "fis_prd_segmento_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
