/*
  Warnings:

  - You are about to drop the column `ds_cnpj_destinatario` on the `fis_nfe` table. All the data in the column will be lost.
  - You are about to drop the column `ds_cnpj_emitente` on the `fis_nfe` table. All the data in the column will be lost.
  - You are about to drop the column `ds_cpf_destinatario` on the `fis_nfe` table. All the data in the column will be lost.
  - You are about to drop the column `ds_cpf_emitente` on the `fis_nfe` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fis_cte" ADD COLUMN     "ds_documento_destinatario" TEXT,
ADD COLUMN     "ds_documento_emitente" TEXT,
ADD COLUMN     "ds_documento_remetente" TEXT,
ADD COLUMN     "ds_razao_social_destinatario" TEXT,
ADD COLUMN     "ds_razao_social_emitente" TEXT,
ADD COLUMN     "ds_razao_social_remetente" TEXT,
ADD COLUMN     "id_fis_fornecedor" TEXT;

-- AlterTable
ALTER TABLE "fis_nfe" DROP COLUMN "ds_cnpj_destinatario",
DROP COLUMN "ds_cnpj_emitente",
DROP COLUMN "ds_cpf_destinatario",
DROP COLUMN "ds_cpf_emitente",
ADD COLUMN     "ds_documento_destinatario" TEXT,
ADD COLUMN     "ds_documento_emitente" TEXT;

-- AddForeignKey
ALTER TABLE "fis_cte" ADD CONSTRAINT "fis_cte_id_fis_fornecedor_fkey" FOREIGN KEY ("id_fis_fornecedor") REFERENCES "fis_fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
