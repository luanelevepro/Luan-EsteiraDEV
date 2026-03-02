-- CreateEnum
CREATE TYPE "CrtType" AS ENUM ('SIMPLES', 'NORMAL', 'MEI');

-- AlterTable
ALTER TABLE "sis_regimes_tributarios" ADD COLUMN     "ds_crt" "CrtType";
