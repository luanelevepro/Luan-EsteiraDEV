/*
  Warnings:

  - The primary key for the `fis_nota_fiscal_servico` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "fis_nota_fiscal_servico" DROP CONSTRAINT "fis_nota_fiscal_servico_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "fis_nota_fiscal_servico_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "fis_nota_fiscal_servico_id_seq";
