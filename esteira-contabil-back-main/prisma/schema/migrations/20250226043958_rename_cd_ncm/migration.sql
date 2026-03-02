/*
  Warnings:

  - You are about to drop the column `cd_cncm` on the `fis_produtos` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusProduto" AS ENUM ('ATIVO', 'INATIVO');

-- AlterTable
ALTER TABLE "fis_produtos" DROP COLUMN "cd_cncm",
ADD COLUMN     "cd_ncm" TEXT,
ADD COLUMN     "ds_status" "StatusProduto" NOT NULL DEFAULT 'ATIVO';
