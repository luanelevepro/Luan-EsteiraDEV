/*
  Warnings:

  - You are about to drop the column `ds_prestador_bairro` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_prestador_cep` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_prestador_cnpj` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_prestador_codigo_municipio` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_prestador_email` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_prestador_endereco` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_prestador_inscricao` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_prestador_nome_fantasia` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_prestador_numero` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_prestador_razao_social` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_prestador_telefone` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_prestador_uf` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_tomador_bairro` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_tomador_cep` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_tomador_cnpj` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_tomador_codigo_municipio` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_tomador_email` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_tomador_endereco` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_tomador_inscricao` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_tomador_numero` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_tomador_razao_social` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_tomador_telefone` on the `fis_nfse` table. All the data in the column will be lost.
  - You are about to drop the column `ds_tomador_uf` on the `fis_nfse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fis_nfse" DROP COLUMN "ds_prestador_bairro",
DROP COLUMN "ds_prestador_cep",
DROP COLUMN "ds_prestador_cnpj",
DROP COLUMN "ds_prestador_codigo_municipio",
DROP COLUMN "ds_prestador_email",
DROP COLUMN "ds_prestador_endereco",
DROP COLUMN "ds_prestador_inscricao",
DROP COLUMN "ds_prestador_nome_fantasia",
DROP COLUMN "ds_prestador_numero",
DROP COLUMN "ds_prestador_razao_social",
DROP COLUMN "ds_prestador_telefone",
DROP COLUMN "ds_prestador_uf",
DROP COLUMN "ds_tomador_bairro",
DROP COLUMN "ds_tomador_cep",
DROP COLUMN "ds_tomador_cnpj",
DROP COLUMN "ds_tomador_codigo_municipio",
DROP COLUMN "ds_tomador_email",
DROP COLUMN "ds_tomador_endereco",
DROP COLUMN "ds_tomador_inscricao",
DROP COLUMN "ds_tomador_numero",
DROP COLUMN "ds_tomador_razao_social",
DROP COLUMN "ds_tomador_telefone",
DROP COLUMN "ds_tomador_uf";
