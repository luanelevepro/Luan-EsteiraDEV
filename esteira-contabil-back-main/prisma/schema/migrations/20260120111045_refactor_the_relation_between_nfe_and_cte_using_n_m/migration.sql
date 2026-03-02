/*
  Warnings:

  - You are about to drop the column `id_cte_relacionada` on the `fis_nfe` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "fis_nfe" DROP CONSTRAINT "fis_nfe_id_cte_relacionada_fkey";

-- AlterTable
ALTER TABLE "fis_nfe" DROP COLUMN "id_cte_relacionada";

-- CreateTable
CREATE TABLE "fis_cte_nfe" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "id_fis_cte" TEXT NOT NULL,
    "id_fis_nfe" TEXT NOT NULL,
    "fl_relacao_valida" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fis_cte_nfe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fis_cte_nfe_id_fis_nfe_idx" ON "fis_cte_nfe"("id_fis_nfe");

-- CreateIndex
CREATE INDEX "fis_cte_nfe_fl_relacao_valida_idx" ON "fis_cte_nfe"("fl_relacao_valida");

-- CreateIndex
CREATE UNIQUE INDEX "fis_cte_nfe_id_fis_cte_id_fis_nfe_key" ON "fis_cte_nfe"("id_fis_cte", "id_fis_nfe");

-- AddForeignKey
ALTER TABLE "fis_cte_nfe" ADD CONSTRAINT "fis_cte_nfe_id_fis_cte_fkey" FOREIGN KEY ("id_fis_cte") REFERENCES "fis_cte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_cte_nfe" ADD CONSTRAINT "fis_cte_nfe_id_fis_nfe_fkey" FOREIGN KEY ("id_fis_nfe") REFERENCES "fis_nfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
