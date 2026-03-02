/*
  Warnings:

  - A unique constraint covering the columns `[id_fis_empresas,id_fis_produto,id_fis_fornecedor]` on the table `fis_nfe_produto_fornecedor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "fis_nfe_produto_fornecedor_id_fis_empresas_id_fis_produto_i_key" ON "fis_nfe_produto_fornecedor"("id_fis_empresas", "id_fis_produto", "id_fis_fornecedor");
