/*
  Warnings:

  - You are about to drop the column `type` on the `profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "type";

-- DropEnum
DROP TYPE "UserType";
