/*
  Warnings:

  - The values [AGUARDANDO_EXTRACAO] on the enum `StatusDocumento` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateTable
CREATE TABLE "fis_documento_historico" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_fis_documento" TEXT NOT NULL,
    "ds_status_anterior" "StatusDocumento",
    "ds_status_novo" "StatusDocumento",
    "ds_motivo" TEXT,
    "id_usuario" TEXT,

    CONSTRAINT "fis_documento_historico_pkey" PRIMARY KEY ("id")
);

-- AlterEnum
BEGIN;
CREATE TYPE "StatusDocumento_new" AS ENUM ('DIGITADO', 'IMPORTADO', 'EM_AUTENTICACAO', 'EMITIDO', 'AGUARDANDO_VALIDACAO', 'AGUARDANDO_INTEGRACAO', 'DIGITADO_EMPRESA', 'RECEBIDO_EMPRESA', 'INTEGRACAO_ESCRITA', 'DIGITADO_FISCAL', 'CONFERIDO_FISCAL', 'ANULADO', 'CANCELADO', 'NAO_PROCESSADO', 'PROCESSADO', 'EM_PROCESSAMENTO', 'OPERACAO_NAO_REALIZADA');
ALTER TABLE "fis_documento" ALTER COLUMN "ds_status" TYPE "StatusDocumento_new" USING ("ds_status"::text::"StatusDocumento_new");
ALTER TABLE "fis_documento_historico" ALTER COLUMN "ds_status_anterior" TYPE "StatusDocumento_new" USING ("ds_status_anterior"::text::"StatusDocumento_new");
ALTER TABLE "fis_documento_historico" ALTER COLUMN "ds_status_novo" TYPE "StatusDocumento_new" USING ("ds_status_novo"::text::"StatusDocumento_new");
ALTER TABLE "fis_documento_dfe" ALTER COLUMN "ds_status" TYPE "StatusDocumento_new" USING ("ds_status"::text::"StatusDocumento_new");
ALTER TYPE "StatusDocumento" RENAME TO "StatusDocumento_old";
ALTER TYPE "StatusDocumento_new" RENAME TO "StatusDocumento";
DROP TYPE "public"."StatusDocumento_old";
COMMIT;

-- AddForeignKey
ALTER TABLE "fis_documento_historico" ADD CONSTRAINT "fis_documento_historico_id_fis_documento_fkey" FOREIGN KEY ("id_fis_documento") REFERENCES "fis_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documento_historico" ADD CONSTRAINT "fis_documento_historico_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "sis_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
