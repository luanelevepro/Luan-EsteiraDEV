/*
  Warnings:

  - You are about to drop the column `id_company` on the `ops_task` table. All the data in the column will be lost.
  - You are about to drop the column `id_company` on the `ops_task_schedule` table. All the data in the column will be lost.
  - Added the required column `id_sis_empresa` to the `ops_task` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ops"."ops_task_id_company_ds_status_idx";

-- AlterTable
ALTER TABLE "ops"."ops_task" DROP COLUMN "id_company",
ADD COLUMN     "id_sis_empresa" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ops"."ops_task_schedule" DROP COLUMN "id_company",
ADD COLUMN     "id_sis_empresa" TEXT;

-- CreateIndex
CREATE INDEX "ops_task_id_sis_empresa_ds_status_idx" ON "ops"."ops_task"("id_sis_empresa", "ds_status");
