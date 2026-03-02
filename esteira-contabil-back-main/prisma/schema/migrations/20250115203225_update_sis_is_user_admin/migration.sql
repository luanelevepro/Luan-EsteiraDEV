/*
  Warnings:

  - You are about to drop the column `id_admin` on the `sis_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sis_profiles" DROP COLUMN "id_admin",
ADD COLUMN     "is_admin" BOOLEAN NOT NULL DEFAULT false;
