/*
  Warnings:

  - You are about to drop the column `ds_codigo_centro` on the `con_centro_custos` table. All the data in the column will be lost.
  - You are about to drop the column `ds_nome_centro` on the `con_centro_custos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "con_centro_custos" DROP COLUMN "ds_codigo_centro",
DROP COLUMN "ds_nome_centro",
ADD COLUMN     "ds_nome_ccusto" TEXT,
ADD COLUMN     "id_externo_ccusto" TEXT;
