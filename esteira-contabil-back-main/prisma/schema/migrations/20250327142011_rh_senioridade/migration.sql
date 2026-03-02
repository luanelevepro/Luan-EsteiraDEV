/*
  Warnings:

  - You are about to drop the column `updated_at` on the `rh_cargo_nivel_senioridade_vigencia` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "rh_cargo_nivel_senioridade_vigencia" DROP COLUMN "updated_at",
ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
