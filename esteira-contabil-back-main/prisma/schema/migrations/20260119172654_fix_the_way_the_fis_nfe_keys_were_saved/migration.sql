/*
  Warnings:

  - You are about to drop the column `ds_chave_nfe` on the `fis_cte` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "OrigemExtracao" ADD VALUE 'API_EMAIL';

-- AlterTable
ALTER TABLE "fis_cte" DROP COLUMN "ds_chave_nfe",
ADD COLUMN     "js_chaves_nfe" JSONB;

-- AlterTable
ALTER TABLE "fis_nfe" ADD COLUMN     "id_cte_relacionada" TEXT;

-- AddForeignKey
ALTER TABLE "fis_nfe" ADD CONSTRAINT "fis_nfe_id_cte_relacionada_fkey" FOREIGN KEY ("id_cte_relacionada") REFERENCES "fis_cte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
