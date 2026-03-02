/*
  Warnings:

  - The values [TOMADO] on the enum `TipoEf` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[id_fis_empresas,id_nfse]` on the table `fis_documento_dfe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_fis_empresas,id_nfe]` on the table `fis_documento_dfe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_fis_empresas,id_cte]` on the table `fis_documento_dfe` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TipoEf_new" AS ENUM ('ENTRADA', 'SAIDA');
ALTER TABLE "fis_documento" ALTER COLUMN "ds_tipo_ef" DROP DEFAULT;
ALTER TABLE "fis_documento_dfe" ALTER COLUMN "ds_tipo_ef" DROP DEFAULT;
ALTER TABLE "fis_documento" ALTER COLUMN "ds_tipo_ef" TYPE "TipoEf_new" USING ("ds_tipo_ef"::text::"TipoEf_new");
ALTER TABLE "fis_documento_dfe" ALTER COLUMN "ds_tipo_ef" TYPE "TipoEf_new" USING ("ds_tipo_ef"::text::"TipoEf_new");
ALTER TYPE "TipoEf" RENAME TO "TipoEf_old";
ALTER TYPE "TipoEf_new" RENAME TO "TipoEf";
DROP TYPE "TipoEf_old";
ALTER TABLE "fis_documento" ALTER COLUMN "ds_tipo_ef" SET DEFAULT 'ENTRADA';
ALTER TABLE "fis_documento_dfe" ALTER COLUMN "ds_tipo_ef" SET DEFAULT 'ENTRADA';
COMMIT;

-- AlterTable
ALTER TABLE "fis_nfe" ADD COLUMN     "ds_documento_transportador" TEXT,
ADD COLUMN     "ds_razao_social_transportador" TEXT,
ADD COLUMN     "id_fis_empresa_transportadora" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_id_fis_empresas_id_nfse_key" ON "fis_documento_dfe"("id_fis_empresas", "id_nfse");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_id_fis_empresas_id_nfe_key" ON "fis_documento_dfe"("id_fis_empresas", "id_nfe");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_dfe_id_fis_empresas_id_cte_key" ON "fis_documento_dfe"("id_fis_empresas", "id_cte");

-- AddForeignKey
ALTER TABLE "fis_nfe" ADD CONSTRAINT "fis_nfe_id_fis_empresa_transportadora_fkey" FOREIGN KEY ("id_fis_empresa_transportadora") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
