/*
  Warnings:

  - You are about to drop the column `ds_tipo_ef` on the `fis_documento_dfe` table. All the data in the column will be lost.
  - You are about to drop the column `id_fis_empresas` on the `fis_documento_dfe` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id_nfse]` on the table `fis_documento_dfe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_nfe]` on the table `fis_documento_dfe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_cte]` on the table `fis_documento_dfe` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."fis_documento_dfe" DROP CONSTRAINT "fis_documento_dfe_id_fis_empresas_fkey";

-- DropIndex
DROP INDEX "public"."fis_documento_dfe_id_fis_empresas_id_cte_key";

-- DropIndex
DROP INDEX "public"."fis_documento_dfe_id_fis_empresas_id_nfe_key";

-- DropIndex
DROP INDEX "public"."fis_documento_dfe_id_fis_empresas_id_nfse_key";

-- AlterTable
ALTER TABLE "fis_documento_dfe" DROP COLUMN "ds_tipo_ef",
DROP COLUMN "id_fis_empresas",
ADD COLUMN     "ds_documento_transportador" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_id_nfse_key" ON "fis_documento_dfe"("id_nfse");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_id_nfe_key" ON "fis_documento_dfe"("id_nfe");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_id_cte_key" ON "fis_documento_dfe"("id_cte");
