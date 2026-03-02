-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('NFSE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Status" ADD VALUE 'DIGITADO';
ALTER TYPE "Status" ADD VALUE 'IMPORTADO';
ALTER TYPE "Status" ADD VALUE 'EM_AUTENTICACAO';
ALTER TYPE "Status" ADD VALUE 'EMITIDO';
ALTER TYPE "Status" ADD VALUE 'AGUARDANDO_INTEGRACAO';
ALTER TYPE "Status" ADD VALUE 'DIGITADO_EMPRESA';
ALTER TYPE "Status" ADD VALUE 'RECEBIDO_EMPRESA';
ALTER TYPE "Status" ADD VALUE 'INTEGRACAO_ESCRITA';
ALTER TYPE "Status" ADD VALUE 'DIGITADO_CONTABILIDADE';
ALTER TYPE "Status" ADD VALUE 'CONFERIDO_CONTABILIDADE';
ALTER TYPE "Status" ADD VALUE 'ANULADO';
ALTER TYPE "Status" ADD VALUE 'CANCELADO';

-- CreateTable
CREATE TABLE "fis_nota_fiscal" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "id_fis_empresas" TEXT NOT NULL,
    "ds_numero" TEXT,
    "ds_codigo_verificacao" TEXT,
    "dt_emissao" TIMESTAMP(3),
    "ds_base_calculo" TEXT,
    "ds_aliquota" TEXT,
    "ds_valor_iss" TEXT,
    "ds_valor_liquido_nfse" TEXT,
    "ds_prestador_cnpj" TEXT,
    "ds_prestador_inscricao" TEXT,
    "ds_prestador_razao_social" TEXT,
    "ds_prestador_nome_fantasia" TEXT,
    "ds_prestador_endereco" TEXT,
    "ds_prestador_numero" TEXT,
    "ds_prestador_bairro" TEXT,
    "ds_prestador_codigo_municipio" TEXT,
    "ds_prestador_uf" TEXT,
    "ds_prestador_cep" TEXT,
    "ds_prestador_telefone" TEXT,
    "ds_prestador_email" TEXT,
    "ds_orgao_gerador_codigo_municipio" TEXT,
    "ds_orgao_gerador_uf" TEXT,
    "dt_competencia" TIMESTAMP(3),
    "ds_valor_servicos" TEXT,
    "ds_valor_deducoes" TEXT,
    "ds_desconto_incondicionado" TEXT,
    "ds_desconto_condicionado" TEXT,
    "ds_iss_retido" TEXT,
    "ds_responsavel_retencao" TEXT,
    "ds_item_lista_servico" TEXT,
    "ds_discriminacao" TEXT,
    "ds_codigo_municipio" TEXT,
    "ds_exigibilidade_iss" TEXT,
    "ds_municipio_incidencia" TEXT,
    "ds_tomador_cnpj" TEXT,
    "ds_tomador_inscricao" TEXT,
    "ds_tomador_razao_social" TEXT,
    "ds_tomador_endereco" TEXT,
    "ds_tomador_numero" TEXT,
    "ds_tomador_bairro" TEXT,
    "ds_tomador_codigo_municipio" TEXT,
    "ds_tomador_uf" TEXT,
    "ds_tomador_cep" TEXT,
    "ds_tomador_telefone" TEXT,
    "ds_tomador_email" TEXT,
    "ds_optante_simples_nacional" TEXT,
    "ds_incentivo_fiscal" TEXT,

    CONSTRAINT "fis_nota_fiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_documento" (
    "id" TEXT NOT NULL,
    "ds_tipo" "TipoDocumento",
    "ds_status" "TipoDocumento",
    "nota_fiscal_id" TEXT,
    "id_fis_empresas" TEXT NOT NULL,

    CONSTRAINT "fis_documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_nota_fiscal_id_key" ON "fis_documento"("nota_fiscal_id");

-- AddForeignKey
ALTER TABLE "fis_nota_fiscal" ADD CONSTRAINT "fis_nota_fiscal_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documento" ADD CONSTRAINT "fis_documento_nota_fiscal_id_fkey" FOREIGN KEY ("nota_fiscal_id") REFERENCES "fis_nota_fiscal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documento" ADD CONSTRAINT "fis_documento_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
