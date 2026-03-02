/*
  Warnings:

  - You are about to drop the `_Bloqueados` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_Bloqueados" DROP CONSTRAINT "_Bloqueados_A_fkey";

-- DropForeignKey
ALTER TABLE "_Bloqueados" DROP CONSTRAINT "_Bloqueados_B_fkey";

-- DropTable
DROP TABLE "_Bloqueados";

-- CreateTable
CREATE TABLE "_Bloqueados_Empresa" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_Bloqueados_Empresa_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_Bloqueados_Empresa_B_index" ON "_Bloqueados_Empresa"("B");

-- AddForeignKey
ALTER TABLE "_Bloqueados_Empresa" ADD CONSTRAINT "_Bloqueados_Empresa_A_fkey" FOREIGN KEY ("A") REFERENCES "sis_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Bloqueados_Empresa" ADD CONSTRAINT "_Bloqueados_Empresa_B_fkey" FOREIGN KEY ("B") REFERENCES "sis_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
