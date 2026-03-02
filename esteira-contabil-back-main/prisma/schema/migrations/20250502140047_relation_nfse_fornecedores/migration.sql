-- AlterTable
ALTER TABLE "fis_nfse" ADD COLUMN     "id_fis_fornecedor" TEXT;

-- AddForeignKey
ALTER TABLE "fis_nfse" ADD CONSTRAINT "fis_nfse_id_fis_fornecedor_fkey" FOREIGN KEY ("id_fis_fornecedor") REFERENCES "fis_fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
