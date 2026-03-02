/*
  Warnings:

  - You are about to drop the `Empresas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Escritorios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_EmpresasToprofiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_EscritoriosToprofiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Empresas" DROP CONSTRAINT "Empresas_escritorio_id_fkey";

-- DropForeignKey
ALTER TABLE "_EmpresasToprofiles" DROP CONSTRAINT "_EmpresasToprofiles_A_fkey";

-- DropForeignKey
ALTER TABLE "_EmpresasToprofiles" DROP CONSTRAINT "_EmpresasToprofiles_B_fkey";

-- DropForeignKey
ALTER TABLE "_EscritoriosToprofiles" DROP CONSTRAINT "_EscritoriosToprofiles_A_fkey";

-- DropForeignKey
ALTER TABLE "_EscritoriosToprofiles" DROP CONSTRAINT "_EscritoriosToprofiles_B_fkey";

-- DropTable
DROP TABLE "Empresas";

-- DropTable
DROP TABLE "Escritorios";

-- DropTable
DROP TABLE "_EmpresasToprofiles";

-- DropTable
DROP TABLE "_EscritoriosToprofiles";

-- CreateTable
CREATE TABLE "sis_empresas" (
    "cd_empresa" TEXT NOT NULL,
    "dt_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome" TEXT NOT NULL,
    "ds_cnpj" TEXT NOT NULL,
    "id_escritorio" TEXT NOT NULL,

    CONSTRAINT "sis_empresas_pkey" PRIMARY KEY ("cd_empresa")
);

-- CreateTable
CREATE TABLE "sis_escritorios" (
    "cd_escritorio" TEXT NOT NULL,
    "dt_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome" TEXT NOT NULL,

    CONSTRAINT "sis_escritorios_pkey" PRIMARY KEY ("cd_escritorio")
);

-- CreateTable
CREATE TABLE "_profilesTosis_escritorios" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_profilesTosis_escritorios_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_profilesTosis_empresas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_profilesTosis_empresas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "sis_empresas_ds_cnpj_key" ON "sis_empresas"("ds_cnpj");

-- CreateIndex
CREATE INDEX "_profilesTosis_escritorios_B_index" ON "_profilesTosis_escritorios"("B");

-- CreateIndex
CREATE INDEX "_profilesTosis_empresas_B_index" ON "_profilesTosis_empresas"("B");

-- AddForeignKey
ALTER TABLE "sis_empresas" ADD CONSTRAINT "sis_empresas_id_escritorio_fkey" FOREIGN KEY ("id_escritorio") REFERENCES "sis_escritorios"("cd_escritorio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_profilesTosis_escritorios" ADD CONSTRAINT "_profilesTosis_escritorios_A_fkey" FOREIGN KEY ("A") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_profilesTosis_escritorios" ADD CONSTRAINT "_profilesTosis_escritorios_B_fkey" FOREIGN KEY ("B") REFERENCES "sis_escritorios"("cd_escritorio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_profilesTosis_empresas" ADD CONSTRAINT "_profilesTosis_empresas_A_fkey" FOREIGN KEY ("A") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_profilesTosis_empresas" ADD CONSTRAINT "_profilesTosis_empresas_B_fkey" FOREIGN KEY ("B") REFERENCES "sis_empresas"("cd_empresa") ON DELETE CASCADE ON UPDATE CASCADE;
