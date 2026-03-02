/*
  Warnings:

  - You are about to drop the column `ds_incentivo_fiscal` on the `fis_nfse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fis_nfse" DROP COLUMN "ds_incentivo_fiscal",
ADD COLUMN     "is_incentivo_fiscal" BOOLEAN;
