/*
  Warnings:

  - The primary key for the `sis_empresas` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cd_empresa` on the `sis_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `ds_cnpj` on the `sis_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `dt_criacao` on the `sis_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `id_escritorio` on the `sis_empresas` table. All the data in the column will be lost.
  - You are about to drop the `UserAccess` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_profilesTosis_empresas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_profilesTosis_escritorios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sis_escritorios` table. If the table is not empty, all the data it contains will be lost.
  - The required column `id` was added to the `sis_empresas` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "UserAccess" DROP CONSTRAINT "UserAccess_profiles_id_fkey";

-- DropForeignKey
ALTER TABLE "_profilesTosis_empresas" DROP CONSTRAINT "_profilesTosis_empresas_A_fkey";

-- DropForeignKey
ALTER TABLE "_profilesTosis_empresas" DROP CONSTRAINT "_profilesTosis_empresas_B_fkey";

-- DropForeignKey
ALTER TABLE "_profilesTosis_escritorios" DROP CONSTRAINT "_profilesTosis_escritorios_A_fkey";

-- DropForeignKey
ALTER TABLE "_profilesTosis_escritorios" DROP CONSTRAINT "_profilesTosis_escritorios_B_fkey";

-- DropForeignKey
ALTER TABLE "sis_empresas" DROP CONSTRAINT "sis_empresas_id_escritorio_fkey";

-- DropIndex
DROP INDEX "sis_empresas_ds_cnpj_key";

-- AlterTable
ALTER TABLE "sis_empresas" DROP CONSTRAINT "sis_empresas_pkey",
DROP COLUMN "cd_empresa",
DROP COLUMN "ds_cnpj",
DROP COLUMN "dt_criacao",
DROP COLUMN "id_escritorio",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ds_apelido" TEXT,
ADD COLUMN     "ds_cnae" TEXT,
ADD COLUMN     "ds_documento" TEXT,
ADD COLUMN     "ds_fantasia" TEXT,
ADD COLUMN     "ds_razao_social" TEXT,
ADD COLUMN     "ds_status" BOOLEAN,
ADD COLUMN     "ds_uf" TEXT,
ADD COLUMN     "dt_ativacao" TIMESTAMP(3),
ADD COLUMN     "dt_inativacao" TIMESTAMP(3),
ADD COLUMN     "escritorio_id" TEXT,
ADD COLUMN     "fl_escritorio" BOOLEAN,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "ds_nome" DROP NOT NULL,
ADD CONSTRAINT "sis_empresas_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "UserAccess";

-- DropTable
DROP TABLE "_profilesTosis_empresas";

-- DropTable
DROP TABLE "_profilesTosis_escritorios";

-- DropTable
DROP TABLE "profiles";

-- DropTable
DROP TABLE "sis_escritorios";

-- CreateTable
CREATE TABLE "sis_profiles" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "full_name" TEXT,
    "email" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "escritorio_id" TEXT,

    CONSTRAINT "sis_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_access" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profiles_id" TEXT,
    "module_type" "ModuleType" NOT NULL,

    CONSTRAINT "sis_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_sis_empresasTosis_profiles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_sis_empresasTosis_profiles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "sis_profiles_email_key" ON "sis_profiles"("email");

-- CreateIndex
CREATE INDEX "_sis_empresasTosis_profiles_B_index" ON "_sis_empresasTosis_profiles"("B");

-- AddForeignKey
ALTER TABLE "sis_access" ADD CONSTRAINT "sis_access_profiles_id_fkey" FOREIGN KEY ("profiles_id") REFERENCES "sis_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_empresas" ADD CONSTRAINT "sis_empresas_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "sis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_sis_empresasTosis_profiles" ADD CONSTRAINT "_sis_empresasTosis_profiles_A_fkey" FOREIGN KEY ("A") REFERENCES "sis_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_sis_empresasTosis_profiles" ADD CONSTRAINT "_sis_empresasTosis_profiles_B_fkey" FOREIGN KEY ("B") REFERENCES "sis_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
