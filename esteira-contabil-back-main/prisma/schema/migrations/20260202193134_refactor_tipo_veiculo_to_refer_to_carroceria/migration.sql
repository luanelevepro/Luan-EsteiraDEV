/*
  Warnings:

  - The values [CARRETA,TRUCK,VUC,UTILITARIO,BITREM,RODOTREM] on the enum `TipoVeiculo` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TipoVeiculo_new" AS ENUM ('GRANELEIRO', 'BAU', 'SIDER', 'FRIGORIFICO', 'TANQUE', 'PORTA_CONTAINER');
ALTER TABLE "tms_cargas" ALTER COLUMN "ds_tipo_veiculo" TYPE "TipoVeiculo_new" USING ("ds_tipo_veiculo"::text::"TipoVeiculo_new");
ALTER TYPE "TipoVeiculo" RENAME TO "TipoVeiculo_old";
ALTER TYPE "TipoVeiculo_new" RENAME TO "TipoVeiculo";
DROP TYPE "public"."TipoVeiculo_old";
COMMIT;
