/*
  Warnings:

  - You are about to drop the column `ds_filepath` on the `fis_sat_conferencia` table. All the data in the column will be lost.
  - The `ds_message` column on the `fis_sat_conferencia` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "fis_sat_conferencia" DROP COLUMN "ds_filepath",
DROP COLUMN "ds_message",
ADD COLUMN     "ds_message" JSONB;
