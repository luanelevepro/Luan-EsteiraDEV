/*
  Warnings:

  - The `ds_status` column on the `fis_documento_dfe` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "StatusFaturamento" AS ENUM ('PENDENTE', 'VINCULADO', 'PROCESSADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "fis_documento_dfe" DROP COLUMN "ds_status",
ADD COLUMN     "ds_status" "StatusFaturamento";
