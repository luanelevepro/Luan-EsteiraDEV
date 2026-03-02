-- CreateEnum
CREATE TYPE "NfseOrigem" AS ENUM ('PREFEITURA', 'ESTEIRA', 'DOMINIO', 'XML');

-- AlterTable
ALTER TABLE "fis_nfse" ADD COLUMN     "ds_origem" "NfseOrigem";
