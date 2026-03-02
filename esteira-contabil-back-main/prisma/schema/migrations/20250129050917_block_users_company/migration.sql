-- CreateTable
CREATE TABLE "_Bloqueados" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_Bloqueados_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_Bloqueados_B_index" ON "_Bloqueados"("B");

-- AddForeignKey
ALTER TABLE "_Bloqueados" ADD CONSTRAINT "_Bloqueados_A_fkey" FOREIGN KEY ("A") REFERENCES "sis_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Bloqueados" ADD CONSTRAINT "_Bloqueados_B_fkey" FOREIGN KEY ("B") REFERENCES "sis_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
