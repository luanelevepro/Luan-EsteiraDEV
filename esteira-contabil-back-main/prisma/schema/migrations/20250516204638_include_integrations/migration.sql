-- AlterTable
ALTER TABLE "fis_documento" ADD COLUMN     "ds_origem" JSONB;

-- CreateTable
CREATE TABLE "sis_tipo_integracao" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "ds_nome" TEXT NOT NULL,

    CONSTRAINT "sis_tipo_integracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_integracao" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "ds_descricao" TEXT,
    "fl_is_para_escritorio" BOOLEAN DEFAULT false,
    "id_tipo_integracao" TEXT NOT NULL,

    CONSTRAINT "sis_integracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_integracao_campos" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "ds_campo_nome" TEXT NOT NULL,
    "ds_campo_placeholder" TEXT,
    "ds_campo_tipo" TEXT NOT NULL,
    "ds_campo_ordem" INTEGER NOT NULL,
    "id_integracao" TEXT NOT NULL,

    CONSTRAINT "sis_integracao_campos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_integracao_config" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "ds_valores_config" JSONB NOT NULL,
    "id_integracao" TEXT NOT NULL,
    "id_sis_empresas" TEXT NOT NULL,

    CONSTRAINT "sis_integracao_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sis_integracao_config_id_sis_empresas_id_integracao_key" ON "sis_integracao_config"("id_sis_empresas", "id_integracao");

-- AddForeignKey
ALTER TABLE "sis_integracao" ADD CONSTRAINT "sis_integracao_id_tipo_integracao_fkey" FOREIGN KEY ("id_tipo_integracao") REFERENCES "sis_tipo_integracao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_integracao_campos" ADD CONSTRAINT "sis_integracao_campos_id_integracao_fkey" FOREIGN KEY ("id_integracao") REFERENCES "sis_integracao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_integracao_config" ADD CONSTRAINT "sis_integracao_config_id_integracao_fkey" FOREIGN KEY ("id_integracao") REFERENCES "sis_integracao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_integracao_config" ADD CONSTRAINT "sis_integracao_config_id_sis_empresas_fkey" FOREIGN KEY ("id_sis_empresas") REFERENCES "sis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
