/*
  Warnings:

  - A unique constraint covering the columns `[id_nfe_item]` on the table `fis_nfe_itens_alter_entrada` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "fis_nfe_itens_alter_entrada_id_nfe_item_key" ON "fis_nfe_itens_alter_entrada"("id_nfe_item");
