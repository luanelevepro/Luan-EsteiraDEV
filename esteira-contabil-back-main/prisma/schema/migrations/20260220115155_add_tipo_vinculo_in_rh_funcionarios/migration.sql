/*
  Warnings:

  - You are about to drop the column `ds_tipo_vinculo` on the `tms_motoristas` table. All the data in the column will be lost.

*/
-- AlterTable (IF NOT EXISTS para não falhar quando o banco já está alinhado)
ALTER TABLE "con_plano_contas" ADD COLUMN IF NOT EXISTS "ds_tipo_tms_despesa" "TipoDespesa";

-- AlterTable
ALTER TABLE "rh_funcionarios" ADD COLUMN IF NOT EXISTS "ds_tipo_vinculo" TEXT;

-- AlterTable (só dropa se existir)
ALTER TABLE "tms_motoristas" DROP COLUMN IF EXISTS "ds_tipo_vinculo";
