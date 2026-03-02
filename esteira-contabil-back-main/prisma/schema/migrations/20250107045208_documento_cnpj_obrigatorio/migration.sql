/*
  Warnings:

  - A unique constraint covering the columns `[ds_documento]` on the table `sis_empresas` will be added. If there are existing duplicate values, this will fail.
  - Made the column `ds_documento` on table `sis_empresas` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "sis_empresas" ALTER COLUMN "ds_documento" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sis_empresas_ds_documento_key" ON "sis_empresas"("ds_documento");
