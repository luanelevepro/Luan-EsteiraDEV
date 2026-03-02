-- CreateTable: fis_clientes (cadastro fiscal de clientes vindos dos XMLs)
CREATE TABLE "fis_clientes" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_fis_empresas" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "ds_documento" TEXT,
    "ds_ie" TEXT,
    "ds_nome_fantasia" TEXT,
    "id_cidade" INTEGER,
    "ds_cep" TEXT,
    "ds_logradouro" TEXT,
    "ds_numero" TEXT,
    "ds_complemento" TEXT,
    "ds_bairro" TEXT,
    "ds_uf" TEXT,
    "ds_telefone" TEXT,
    "ds_email" TEXT,
    "cd_municipio_ibge" TEXT,
    "ds_origem_cadastro" TEXT,
    "dt_ultima_ocorrencia_xml" TIMESTAMP(3),

    CONSTRAINT "fis_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tms_embarcadores (cadastro TMS de embarcadores / expedidor)
CREATE TABLE "tms_embarcadores" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_tms_empresa" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "ds_documento" TEXT,
    "ds_ie" TEXT,
    "id_cidade" INTEGER,
    "ds_logradouro" TEXT,
    "ds_numero" TEXT,
    "ds_complemento" TEXT,
    "ds_bairro" TEXT,
    "ds_cep" TEXT,
    "ds_uf" TEXT,
    "ds_telefone" TEXT,
    "ds_email" TEXT,
    "cd_municipio_ibge" TEXT,
    "ds_origem_cadastro" TEXT,

    CONSTRAINT "tms_embarcadores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex fis_clientes: deduplicação por empresa + documento
CREATE UNIQUE INDEX "fis_clientes_id_fis_empresas_ds_documento_key" ON "fis_clientes"("id_fis_empresas", "ds_documento");

CREATE INDEX "fis_clientes_id_fis_empresas_idx" ON "fis_clientes"("id_fis_empresas");

-- CreateIndex tms_embarcadores: deduplicação por empresa + documento
CREATE UNIQUE INDEX "tms_embarcadores_id_tms_empresa_ds_documento_key" ON "tms_embarcadores"("id_tms_empresa", "ds_documento");

CREATE INDEX "tms_embarcadores_id_tms_empresa_idx" ON "tms_embarcadores"("id_tms_empresa");

-- AddForeignKey fis_clientes -> fis_empresas
ALTER TABLE "fis_clientes" ADD CONSTRAINT "fis_clientes_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey fis_clientes -> sis_igbe_city (opcional)
ALTER TABLE "fis_clientes" ADD CONSTRAINT "fis_clientes_id_cidade_fkey" FOREIGN KEY ("id_cidade") REFERENCES "sis_igbe_city"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey tms_embarcadores -> tms_empresas
ALTER TABLE "tms_embarcadores" ADD CONSTRAINT "tms_embarcadores_id_tms_empresa_fkey" FOREIGN KEY ("id_tms_empresa") REFERENCES "tms_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey tms_embarcadores -> sis_igbe_city (opcional)
ALTER TABLE "tms_embarcadores" ADD CONSTRAINT "tms_embarcadores_id_cidade_fkey" FOREIGN KEY ("id_cidade") REFERENCES "sis_igbe_city"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable tms_cargas: adicionar id_embarcador
ALTER TABLE "tms_cargas" ADD COLUMN "id_embarcador" TEXT;

ALTER TABLE "tms_cargas" ADD CONSTRAINT "tms_cargas_id_embarcador_fkey" FOREIGN KEY ("id_embarcador") REFERENCES "tms_embarcadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable tms_entregas: campos recebedor/destinatário
ALTER TABLE "tms_entregas" ADD COLUMN "ds_nome_recebedor" TEXT,
ADD COLUMN "ds_documento_recebedor" TEXT,
ADD COLUMN "ds_nome_destinatario" TEXT,
ADD COLUMN "ds_documento_destinatario" TEXT;
