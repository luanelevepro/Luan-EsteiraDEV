/*
  Warnings:

  - You are about to drop the column `id_ger_pessoa_fk` on the `tms_motoristas` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "tms_motoristas" DROP CONSTRAINT "tms_motoristas_id_ger_pessoa_fk_fkey";

-- AlterTable
ALTER TABLE "tms_motoristas" DROP COLUMN "id_ger_pessoa_fk",
ADD COLUMN     "id_ger_pessoa" TEXT;

-- AddForeignKey
ALTER TABLE "tms_motoristas" ADD CONSTRAINT "tms_motoristas_id_rh_funcionarios_fkey" FOREIGN KEY ("id_rh_funcionarios") REFERENCES "rh_funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_motoristas" ADD CONSTRAINT "tms_motoristas_id_ger_pessoa_fkey" FOREIGN KEY ("id_ger_pessoa") REFERENCES "ger_pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
