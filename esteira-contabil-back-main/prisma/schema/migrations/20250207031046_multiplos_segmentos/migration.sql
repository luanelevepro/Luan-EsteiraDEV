/*
  Warnings:

  - You are about to drop the column `id_segmento` on the `fis_prd_segmento` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "fis_prd_segmento" DROP CONSTRAINT "fis_prd_segmento_id_segmento_fkey";

-- AlterTable
ALTER TABLE "fis_prd_segmento" DROP COLUMN "id_segmento";

-- CreateTable
CREATE TABLE "_ProdutoSegmento" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProdutoSegmento_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProdutoSegmento_B_index" ON "_ProdutoSegmento"("B");

-- AddForeignKey
ALTER TABLE "_ProdutoSegmento" ADD CONSTRAINT "_ProdutoSegmento_A_fkey" FOREIGN KEY ("A") REFERENCES "fis_prd_segmento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProdutoSegmento" ADD CONSTRAINT "_ProdutoSegmento_B_fkey" FOREIGN KEY ("B") REFERENCES "fis_segmentos_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
