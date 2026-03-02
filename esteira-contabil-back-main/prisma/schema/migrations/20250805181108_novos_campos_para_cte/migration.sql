/*
  Warnings:

  - You are about to drop the column `id_fis_empresas` on the `fis_cte` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id_fis_empresa_emitente,cd_cte]` on the table `fis_cte` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_fis_empresa_destinatario,cd_cte]` on the table `fis_cte` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "fis_cte" DROP CONSTRAINT "fis_cte_id_fis_empresas_fkey";

-- DropIndex
DROP INDEX "fis_cte_id_fis_empresas_cd_cte_key";

-- AlterTable
ALTER TABLE "fis_cte" DROP COLUMN "id_fis_empresas",
ADD COLUMN     "id_fis_empresa_destinatario" TEXT,
ADD COLUMN     "id_fis_empresa_emitente" TEXT,
ADD COLUMN     "id_fis_empresa_remetente" TEXT,
ADD COLUMN     "id_fis_empresa_tomador" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "fis_cte_id_fis_empresa_emitente_cd_cte_key" ON "fis_cte"("id_fis_empresa_emitente", "cd_cte");

-- CreateIndex
CREATE UNIQUE INDEX "fis_cte_id_fis_empresa_destinatario_cd_cte_key" ON "fis_cte"("id_fis_empresa_destinatario", "cd_cte");

-- AddForeignKey
ALTER TABLE "fis_cte" ADD CONSTRAINT "fis_cte_id_fis_empresa_emitente_fkey" FOREIGN KEY ("id_fis_empresa_emitente") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_cte" ADD CONSTRAINT "fis_cte_id_fis_empresa_destinatario_fkey" FOREIGN KEY ("id_fis_empresa_destinatario") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_cte" ADD CONSTRAINT "fis_cte_id_fis_empresa_remetente_fkey" FOREIGN KEY ("id_fis_empresa_remetente") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_cte" ADD CONSTRAINT "fis_cte_id_fis_empresa_tomador_fkey" FOREIGN KEY ("id_fis_empresa_tomador") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
