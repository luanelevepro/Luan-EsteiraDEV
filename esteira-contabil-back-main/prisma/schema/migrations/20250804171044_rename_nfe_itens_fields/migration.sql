/*
  Warnings:

  - You are about to drop the column `vl_valor_total` on the `fis_nfe_itens` table. All the data in the column will be lost.
  - You are about to drop the column `vl_valor_unitario` on the `fis_nfe_itens` table. All the data in the column will be lost.
  - You are about to drop the column `vl_valor_unitario_trib` on the `fis_nfe_itens` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fis_nfe_itens" DROP COLUMN "vl_valor_total",
DROP COLUMN "vl_valor_unitario",
DROP COLUMN "vl_valor_unitario_trib",
ADD COLUMN     "vl_total" TEXT,
ADD COLUMN     "vl_unitario" TEXT,
ADD COLUMN     "vl_unitario_tributavel" TEXT;
