-- CreateTable
CREATE TABLE "fis_nfe_itens_alter_entrada" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "id_nfe_item" TEXT NOT NULL,
    "id_regra_nfe_entrada" TEXT NOT NULL,
    "id_cfop_alterado" TEXT,
    "ds_codigo_cfop_alterado" TEXT,
    "id_cst_gerado" TEXT,
    "ds_codigo_cst_gerado" TEXT,
    "id_produto_alterado" TEXT,
    "cd_produto_alterado" TEXT,

    CONSTRAINT "fis_nfe_itens_alter_entrada_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fis_nfe_itens_alter_entrada" ADD CONSTRAINT "fis_nfe_itens_alter_entrada_id_nfe_item_fkey" FOREIGN KEY ("id_nfe_item") REFERENCES "fis_nfe_itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_nfe_itens_alter_entrada" ADD CONSTRAINT "fis_nfe_itens_alter_entrada_id_regra_nfe_entrada_fkey" FOREIGN KEY ("id_regra_nfe_entrada") REFERENCES "fis_regras_entrada_nfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_nfe_itens_alter_entrada" ADD CONSTRAINT "fis_nfe_itens_alter_entrada_id_cfop_alterado_fkey" FOREIGN KEY ("id_cfop_alterado") REFERENCES "sis_cfop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_nfe_itens_alter_entrada" ADD CONSTRAINT "fis_nfe_itens_alter_entrada_id_cst_gerado_fkey" FOREIGN KEY ("id_cst_gerado") REFERENCES "sis_cst"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_nfe_itens_alter_entrada" ADD CONSTRAINT "fis_nfe_itens_alter_entrada_id_produto_alterado_fkey" FOREIGN KEY ("id_produto_alterado") REFERENCES "fis_produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
