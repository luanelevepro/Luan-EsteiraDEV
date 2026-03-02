/*
  Warnings:

  - You are about to drop the column `dt_sieg_consulta_nfse` on the `fis_empresas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fis_empresas" DROP COLUMN "dt_sieg_consulta_nfse",
ADD COLUMN     "dt_certificado_expiracao" TIMESTAMP(3);
