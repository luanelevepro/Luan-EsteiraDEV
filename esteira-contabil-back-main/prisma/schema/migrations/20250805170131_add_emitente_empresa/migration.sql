/*
  Warnings:

  - You are about to drop the column `id_fis_empresas` on the `fis_nfe` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id_fis_empresa_destinatario,ds_numero]` on the table `fis_nfe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_fis_empresa_emitente,ds_numero]` on the table `fis_nfe` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "fis_nfe" DROP CONSTRAINT "fis_nfe_id_fis_empresas_fkey";

-- DropIndex
DROP INDEX "fis_nfe_id_fis_empresas_ds_numero_key";

-- AlterTable
ALTER TABLE "fis_nfe" DROP COLUMN "id_fis_empresas",
ADD COLUMN     "id_fis_empresa_emitente" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "fis_nfe_id_fis_empresa_destinatario_ds_numero_key" ON "fis_nfe"("id_fis_empresa_destinatario", "ds_numero");

-- CreateIndex
CREATE UNIQUE INDEX "fis_nfe_id_fis_empresa_emitente_ds_numero_key" ON "fis_nfe"("id_fis_empresa_emitente", "ds_numero");

-- AddForeignKey
ALTER TABLE "fis_nfe" ADD CONSTRAINT "fis_nfe_id_fis_empresa_emitente_fkey" FOREIGN KEY ("id_fis_empresa_emitente") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
