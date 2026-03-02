/*
  Warnings:

  - You are about to drop the column `id_segmento` on the `sis_cfop` table. All the data in the column will be lost.
  - You are about to drop the column `id_segmento` on the `sis_cst` table. All the data in the column will be lost.
  - You are about to drop the column `id_segmento` on the `sis_origem_cst` table. All the data in the column will be lost.
  - You are about to drop the column `id_segmento` on the `sis_tipos_produto` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sis_cfop" DROP COLUMN "id_segmento";

-- AlterTable
ALTER TABLE "sis_cst" DROP COLUMN "id_segmento";

-- AlterTable
ALTER TABLE "sis_origem_cst" DROP COLUMN "id_segmento";

-- AlterTable
ALTER TABLE "sis_tipos_produto" DROP COLUMN "id_segmento";
