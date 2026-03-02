/*
  Warnings:

  - You are about to drop the column `created_at` on the `sis_access` table. All the data in the column will be lost.
  - You are about to drop the column `module_type` on the `sis_access` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `sis_access` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `sis_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `ds_status` on the `sis_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `fl_escritorio` on the `sis_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `sis_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `confirmed` on the `sis_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `sis_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `sis_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `sis_profiles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ds_email]` on the table `sis_profiles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `js_module_type` to the `sis_access` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ds_email` to the `sis_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "sis_profiles_email_key";

-- AlterTable
ALTER TABLE "sis_access" DROP COLUMN "created_at",
DROP COLUMN "module_type",
DROP COLUMN "updated_at",
ADD COLUMN     "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "js_module_type" "ModuleType" NOT NULL;

-- AlterTable
ALTER TABLE "sis_empresas" DROP COLUMN "created_at",
DROP COLUMN "ds_status",
DROP COLUMN "fl_escritorio",
DROP COLUMN "updated_at",
ADD COLUMN     "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_ativo" BOOLEAN,
ADD COLUMN     "is_escritorio" BOOLEAN;

-- AlterTable
ALTER TABLE "sis_profiles" DROP COLUMN "confirmed",
DROP COLUMN "created_at",
DROP COLUMN "email",
DROP COLUMN "full_name",
ADD COLUMN     "ds_email" TEXT NOT NULL,
ADD COLUMN     "ds_name" TEXT,
ADD COLUMN     "dt_created" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_confirmed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "sis_profiles_ds_email_key" ON "sis_profiles"("ds_email");
