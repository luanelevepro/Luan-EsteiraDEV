/*
  Warnings:

  - You are about to drop the `fis_nota_fiscal_servico` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "fis_nota_fiscal_servico" DROP CONSTRAINT "fis_nota_fiscal_servico_id_fis_empresas_fkey";

-- AlterTable
ALTER TABLE "fis_nfse" ADD COLUMN     "ds_valor_descontos" TEXT,
ADD COLUMN     "ds_valor_retencoes" TEXT,
ADD COLUMN     "js_servicos" JSONB;

-- DropTable
DROP TABLE "fis_nota_fiscal_servico";
