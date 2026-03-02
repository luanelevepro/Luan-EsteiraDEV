/*
  Warnings:

  - A unique constraint covering the columns `[id_fis_empresas,ds_documento]` on the table `fis_fornecedores` will be added. If there are existing duplicate values, this will fail.
  - Made the column `ds_documento` on table `fis_fornecedores` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "fis_fornecedores" ALTER COLUMN "ds_documento" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "fis_fornecedores_id_fis_empresas_ds_documento_key" ON "fis_fornecedores"("id_fis_empresas", "ds_documento");
