/*
  Warnings:

  - You are about to drop the column `id_fis_documento` on the `fis_documentos_relacionados` table. All the data in the column will be lost.
  - Added the required column `id_documento_origem` to the `fis_documentos_relacionados` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "fis_documentos_relacionados" DROP CONSTRAINT "fis_documentos_relacionados_id_fis_documento_fkey";

-- AlterTable
ALTER TABLE "fis_documentos_relacionados" DROP COLUMN "id_fis_documento",
ADD COLUMN     "id_documento_origem" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "fis_documentos_relacionados" ADD CONSTRAINT "fis_documentos_relacionados_id_documento_origem_fkey" FOREIGN KEY ("id_documento_origem") REFERENCES "fis_documento_dfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
