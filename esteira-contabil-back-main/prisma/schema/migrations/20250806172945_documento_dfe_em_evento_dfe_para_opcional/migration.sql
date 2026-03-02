/*
  Warnings:

  - You are about to drop the column `id_fis_evento` on the `fis_documento_dfe` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "fis_evento_dfe" DROP CONSTRAINT "fis_evento_dfe_id_fis_documento_dfe_fkey";

-- DropIndex
DROP INDEX "fis_documento_dfe_id_fis_evento_key";

-- AlterTable
ALTER TABLE "fis_documento_dfe" DROP COLUMN "id_fis_evento";

-- AlterTable
ALTER TABLE "fis_evento_dfe" ALTER COLUMN "id_fis_documento_dfe" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "fis_evento_dfe" ADD CONSTRAINT "fis_evento_dfe_id_fis_documento_dfe_fkey" FOREIGN KEY ("id_fis_documento_dfe") REFERENCES "fis_documento_dfe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
