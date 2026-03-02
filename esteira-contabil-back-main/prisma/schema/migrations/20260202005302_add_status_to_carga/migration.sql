/*
  Warnings:

  - Added the required column `ds_status` to the `tms_cargas` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatusCarga" AS ENUM ('PENDENTE', 'AGENDADA', 'EMITIDA', 'ENTREGUE');

-- AlterTable
ALTER TABLE "tms_cargas" ADD COLUMN     "ds_status" "StatusCarga" NOT NULL;
