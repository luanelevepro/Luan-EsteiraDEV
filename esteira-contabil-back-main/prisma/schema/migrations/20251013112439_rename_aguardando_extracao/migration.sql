/*
  Warnings:

  - The values [AGURADANDO_EXTRACAO] on the enum `StatusDocumento` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatusDocumento_new" AS ENUM ('DIGITADO', 'IMPORTADO', 'EM_AUTENTICACAO', 'EMITIDO', 'AGUARDANDO_VALIDACAO', 'AGUARDANDO_INTEGRACAO', 'AGUARDANDO_EXTRACAO', 'DIGITADO_EMPRESA', 'RECEBIDO_EMPRESA', 'INTEGRACAO_ESCRITA', 'DIGITADO_FISCAL', 'CONFERIDO_FISCAL', 'ANULADO', 'CANCELADO', 'NAO_PROCESSADO', 'PROCESSADO', 'EM_PROCESSAMENTO');
ALTER TABLE "fis_documento" ALTER COLUMN "ds_status" TYPE "StatusDocumento_new" USING ("ds_status"::text::"StatusDocumento_new");
ALTER TABLE "fis_documento_dfe" ALTER COLUMN "ds_status" TYPE "StatusDocumento_new" USING ("ds_status"::text::"StatusDocumento_new");
ALTER TYPE "StatusDocumento" RENAME TO "StatusDocumento_old";
ALTER TYPE "StatusDocumento_new" RENAME TO "StatusDocumento";
DROP TYPE "StatusDocumento_old";
COMMIT;
