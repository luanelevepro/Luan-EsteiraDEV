/*
  Warnings:

  - You are about to drop the `_Bloqueados_Empresa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ProdutoSegmento` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_Bloqueados_Empresa" DROP CONSTRAINT "_Bloqueados_Empresa_A_fkey";

-- DropForeignKey
ALTER TABLE "_Bloqueados_Empresa" DROP CONSTRAINT "_Bloqueados_Empresa_B_fkey";

-- DropForeignKey
ALTER TABLE "_ProdutoSegmento" DROP CONSTRAINT "_ProdutoSegmento_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProdutoSegmento" DROP CONSTRAINT "_ProdutoSegmento_B_fkey";

-- DropTable
DROP TABLE "_Bloqueados_Empresa";

-- DropTable
DROP TABLE "_ProdutoSegmento";

-- CreateTable
CREATE TABLE "_bloqueados_profiles_empresas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_bloqueados_profiles_empresas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_prd_segmento" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_prd_segmento_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_bloqueados_profiles_empresas_B_index" ON "_bloqueados_profiles_empresas"("B");

-- CreateIndex
CREATE INDEX "_prd_segmento_B_index" ON "_prd_segmento"("B");

-- AddForeignKey
ALTER TABLE "_bloqueados_profiles_empresas" ADD CONSTRAINT "_bloqueados_profiles_empresas_A_fkey" FOREIGN KEY ("A") REFERENCES "sis_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_bloqueados_profiles_empresas" ADD CONSTRAINT "_bloqueados_profiles_empresas_B_fkey" FOREIGN KEY ("B") REFERENCES "sis_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_prd_segmento" ADD CONSTRAINT "_prd_segmento_A_fkey" FOREIGN KEY ("A") REFERENCES "fis_prd_segmento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_prd_segmento" ADD CONSTRAINT "_prd_segmento_B_fkey" FOREIGN KEY ("B") REFERENCES "fis_segmentos_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
