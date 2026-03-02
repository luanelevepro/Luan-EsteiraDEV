/*
  Warnings:

  - The `cd_ibge` column on the `fis_cte` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "fis_cte" ALTER COLUMN "ds_uf" SET DATA TYPE TEXT,
DROP COLUMN "cd_ibge",
ADD COLUMN     "cd_ibge" INTEGER;
