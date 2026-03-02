/*
  Warnings:

  - You are about to drop the column `dt_certificado_expiracao` on the `fis_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `id_tecnospeed_certificado` on the `fis_empresas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fis_empresas" DROP COLUMN "dt_certificado_expiracao",
DROP COLUMN "id_tecnospeed_certificado";
