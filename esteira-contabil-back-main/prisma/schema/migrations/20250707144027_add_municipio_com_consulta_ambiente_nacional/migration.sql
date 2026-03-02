-- CreateTable
CREATE TABLE "sis_municipio_ambiente_nacional" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "ds_uf" TEXT NOT NULL,
    "ds_ibge_codigo" TEXT NOT NULL,
    "ds_padrao" TEXT,
    "is_ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sis_municipio_ambiente_nacional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sis_municipio_ambiente_nacional_ds_ibge_codigo_key" ON "sis_municipio_ambiente_nacional"("ds_ibge_codigo");
