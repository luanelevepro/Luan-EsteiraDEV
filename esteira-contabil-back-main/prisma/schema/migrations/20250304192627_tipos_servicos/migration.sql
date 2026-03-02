-- AlterTable
ALTER TABLE "fis_prd_segmento" ADD COLUMN     "id_sis_tipos_produto" TEXT,
ADD COLUMN     "id_sis_tipos_servicos" TEXT;

-- CreateTable
CREATE TABLE "sis_tipos_servicos" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_descricao" TEXT NOT NULL,
    "ds_codigo" TEXT,

    CONSTRAINT "sis_tipos_servicos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fis_prd_segmento" ADD CONSTRAINT "fis_prd_segmento_id_sis_tipos_produto_fkey" FOREIGN KEY ("id_sis_tipos_produto") REFERENCES "sis_tipos_produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_prd_segmento" ADD CONSTRAINT "fis_prd_segmento_id_sis_tipos_servicos_fkey" FOREIGN KEY ("id_sis_tipos_servicos") REFERENCES "sis_tipos_servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
