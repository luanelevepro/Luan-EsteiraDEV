/*
  Warnings:

  - You are about to drop the column `cd_icms` on the `fis_cte` table. All the data in the column will be lost.
  - You are about to drop the column `cd_icms` on the `fis_nfe` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fis_cte" DROP COLUMN "cd_icms";

-- AlterTable
ALTER TABLE "fis_nfe" DROP COLUMN "cd_icms";
