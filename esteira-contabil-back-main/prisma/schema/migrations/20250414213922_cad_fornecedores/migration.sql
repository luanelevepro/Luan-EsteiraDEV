-- CreateTable
CREATE TABLE "fis_fornecedores" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "id_externo" TEXT,
    "id_empresa_externo" TEXT,
    "ds_nome" TEXT,
    "ds_endereco" TEXT,
    "ds_cep" TEXT,
    "ds_inscricao" TEXT,
    "ds_telefone" TEXT,
    "ds_inscricao_municipal" TEXT,
    "ds_bairro" TEXT,
    "ds_email" TEXT,
    "ds_codigo_municipio" INTEGER,
    "ds_complemento" TEXT,
    "dt_cadastro" TEXT,
    "ds_ibge" INTEGER,
    "ds_documento" TEXT,
    "ds_codigo_uf" INTEGER,
    "id_fis_empresas" TEXT NOT NULL,

    CONSTRAINT "fis_fornecedores_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fis_fornecedores" ADD CONSTRAINT "fis_fornecedores_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
