-- CreateTable
CREATE TABLE "fis_produtos" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome" TEXT NOT NULL,
    "ds_unidade" TEXT NOT NULL,
    "cd_cncm" TEXT NOT NULL,
    "cd_cest" TEXT,
    "dt_cadastro" TIMESTAMP(3) NOT NULL,
    "ds_tipo_item" INTEGER NOT NULL,
    "ds_codigo_barras" TEXT,
    "id_fis_empresas" TEXT NOT NULL,

    CONSTRAINT "fis_produtos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fis_produtos_id_fis_empresas_ds_nome_key" ON "fis_produtos"("id_fis_empresas", "ds_nome");

-- AddForeignKey
ALTER TABLE "fis_produtos" ADD CONSTRAINT "fis_produtos_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
