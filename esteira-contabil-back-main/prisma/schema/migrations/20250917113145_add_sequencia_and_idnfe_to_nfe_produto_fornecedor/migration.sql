/*
  Warnings:

  - You are about to drop the column `id_fis_produtos` on the `fis_nfe_produto_fornecedor` table. All the data in the column will be lost.
  - Added the required column `id_fis_produto` to the `fis_nfe_produto_fornecedor` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "fis_nfe_produto_fornecedor" DROP CONSTRAINT "fis_nfe_produto_fornecedor_id_fis_produtos_fkey";

-- AlterTable
ALTER TABLE "fis_nfe_produto_fornecedor" DROP COLUMN "id_fis_produtos",
ADD COLUMN     "ds_ordem_origem" INTEGER,
ADD COLUMN     "id_fis_produto" TEXT NOT NULL,
ADD COLUMN     "id_nfe" TEXT;

-- AddForeignKey
ALTER TABLE "fis_nfe_produto_fornecedor" ADD CONSTRAINT "fis_nfe_produto_fornecedor_id_nfe_fkey" FOREIGN KEY ("id_nfe") REFERENCES "fis_nfe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_nfe_produto_fornecedor" ADD CONSTRAINT "fis_nfe_produto_fornecedor_id_fis_produto_fkey" FOREIGN KEY ("id_fis_produto") REFERENCES "fis_produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
