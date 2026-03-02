/*
  Warnings:

  - The `ds_incentivo_fiscal` column on the `fis_nfse` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "fis_nfse" DROP COLUMN "ds_incentivo_fiscal",
ADD COLUMN     "ds_incentivo_fiscal" BOOLEAN;
