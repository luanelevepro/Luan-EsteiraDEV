/*
  Warnings:

  - The `ds_status` column on the `fis_documento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ds_status` column on the `fis_nota_fiscal_servico` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "StatusDocumento" AS ENUM ('DIGITADO', 'IMPORTADO', 'EM_AUTENTICACAO', 'EMITIDO', 'AGUARDANDO_INTEGRACAO', 'DIGITADO_EMPRESA', 'RECEBIDO_EMPRESA', 'INTEGRACAO_ESCRITA', 'DIGITADO_CONTABILIDADE', 'CONFERIDO_CONTABILIDADE', 'ANULADO', 'CANCELADO', 'NAO_PROCESSADO', 'PROCESSADO', 'EM_PROCESSAMENTO');

-- AlterTable
ALTER TABLE "fis_documento" DROP COLUMN "ds_status",
ADD COLUMN     "ds_status" "StatusDocumento";

-- AlterTable
ALTER TABLE "fis_nota_fiscal_servico" DROP COLUMN "ds_status",
ADD COLUMN     "ds_status" "StatusDocumento";

-- DropEnum
DROP TYPE "Status";
