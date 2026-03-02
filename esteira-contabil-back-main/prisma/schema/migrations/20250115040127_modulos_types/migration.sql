/*
  Warnings:

  - The `js_modules` column on the `sis_access` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "sis_access" DROP COLUMN "js_modules",
ADD COLUMN     "js_modules" "ModuleType"[];
