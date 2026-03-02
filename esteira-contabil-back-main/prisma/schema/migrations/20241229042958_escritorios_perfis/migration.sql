-- AlterEnum
ALTER TYPE "ModuleType" ADD VALUE 'SISTEMA';

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_escritorio_id_fkey";

-- CreateTable
CREATE TABLE "_EscritoriosToprofiles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EscritoriosToprofiles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EscritoriosToprofiles_B_index" ON "_EscritoriosToprofiles"("B");

-- AddForeignKey
ALTER TABLE "_EscritoriosToprofiles" ADD CONSTRAINT "_EscritoriosToprofiles_A_fkey" FOREIGN KEY ("A") REFERENCES "Escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EscritoriosToprofiles" ADD CONSTRAINT "_EscritoriosToprofiles_B_fkey" FOREIGN KEY ("B") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
