/*
  Warnings:

  - You are about to drop the column `nota_fiscal_id` on the `fis_documento` table. All the data in the column will be lost.
  - You are about to drop the `fis_nota_fiscal` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[id_nfse]` on the table `fis_documento` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "fis_documento" DROP CONSTRAINT "fis_documento_nota_fiscal_id_fkey";

-- DropForeignKey
ALTER TABLE "fis_nota_fiscal" DROP CONSTRAINT "fis_nota_fiscal_id_fis_empresas_fkey";

-- DropIndex
DROP INDEX "fis_documento_nota_fiscal_id_key";

-- AlterTable
ALTER TABLE "fis_documento" DROP COLUMN "nota_fiscal_id",
ADD COLUMN     "id_nfse" TEXT;

-- DropTable
DROP TABLE "fis_nota_fiscal";

-- CreateTable
CREATE TABLE "fis_nfse" (
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

    CONSTRAINT "fis_nfse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fis_documento_id_nfse_key" ON "fis_documento"("id_nfse");

-- AddForeignKey
ALTER TABLE "fis_nfse" ADD CONSTRAINT "fis_nfse_id_fis_empresas_fkey" FOREIGN KEY ("id_fis_empresas") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documento" ADD CONSTRAINT "fis_documento_id_nfse_fkey" FOREIGN KEY ("id_nfse") REFERENCES "fis_nfse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
