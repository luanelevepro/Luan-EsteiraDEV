/*
  Warnings:

  - You are about to drop the column `id_escritorio` on the `fis_regras_entrada_nfe` table. All the data in the column will be lost.
  - Added the required column `id_empresa` to the `fis_regras_entrada_nfe` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "fis_regras_entrada_nfe" DROP CONSTRAINT "fis_regras_entrada_nfe_id_escritorio_fkey";

-- AlterTable
ALTER TABLE "fis_regras_entrada_nfe" DROP COLUMN "id_escritorio",
ADD COLUMN     "id_empresa" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe" ADD CONSTRAINT "fis_regras_entrada_nfe_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
