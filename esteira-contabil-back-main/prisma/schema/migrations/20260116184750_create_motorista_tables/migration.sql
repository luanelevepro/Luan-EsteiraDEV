-- CreateTable
CREATE TABLE "ger_pessoa" (
    "id" TEXT NOT NULL,
    "ds_tipo_pessoa" TEXT NOT NULL DEFAULT 'F',
    "ds_nome" TEXT NOT NULL,
    "ds_documento" TEXT NOT NULL,
    "ds_email" TEXT,
    "ds_telefone" TEXT,
    "ds_logradouro" TEXT,
    "ds_numero" TEXT,
    "ds_complemento" TEXT,
    "ds_bairro" TEXT,
    "ds_cep" TEXT,
    "id_sis_municipios" TEXT,
    "is_ativo" BOOLEAN NOT NULL DEFAULT true,
    "dt_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ger_pessoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_motoristas" (
    "id" TEXT NOT NULL,
    "id_ger_pessoa_fk" TEXT NOT NULL,
    "id_rh_funcionarios" TEXT,
    "ds_cnh_numero" TEXT NOT NULL,
    "ds_cnh_categoria" TEXT NOT NULL,
    "dt_vencimento_cnh" TIMESTAMP(3) NOT NULL,
    "dt_primeira_cnh" TIMESTAMP(3) NOT NULL,
    "id_sis_municipios_cnh" TEXT NOT NULL,
    "ds_tipo_vinculo" TEXT NOT NULL,
    "is_ativo" BOOLEAN NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tms_motoristas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_motoristas_veiculos" (
    "id" TEXT NOT NULL,
    "id_tms_motoristas_fk" TEXT NOT NULL,
    "id_tms_veiculos_fk" TEXT NOT NULL,
    "dt_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_fim" TIMESTAMP(3),
    "is_principal" BOOLEAN NOT NULL DEFAULT false,
    "is_ativo" BOOLEAN NOT NULL DEFAULT true,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tms_motoristas_veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ger_pessoa_ds_documento_key" ON "ger_pessoa"("ds_documento");

-- AddForeignKey
ALTER TABLE "tms_motoristas" ADD CONSTRAINT "tms_motoristas_id_ger_pessoa_fk_fkey" FOREIGN KEY ("id_ger_pessoa_fk") REFERENCES "ger_pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_motoristas_veiculos" ADD CONSTRAINT "tms_motoristas_veiculos_id_tms_motoristas_fk_fkey" FOREIGN KEY ("id_tms_motoristas_fk") REFERENCES "tms_motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_motoristas_veiculos" ADD CONSTRAINT "tms_motoristas_veiculos_id_tms_veiculos_fk_fkey" FOREIGN KEY ("id_tms_veiculos_fk") REFERENCES "tms_veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
