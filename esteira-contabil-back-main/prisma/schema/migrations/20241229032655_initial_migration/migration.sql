-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('SISTEMA', 'CONTADOR', 'ADMINISTRADOR', 'NORMAL');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('ADMINISTRATIVO', 'CONTABILIDADE', 'FINANÇAS', 'FATURAMENTO', 'ESTOQUES', 'RECURSOS_HUMANOS', 'CONTROLADORIA');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "full_name" TEXT,
    "email" TEXT NOT NULL,
    "escritorio_id" TEXT,
    "type" "UserType" NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccess" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profiles_id" TEXT,
    "module_type" "ModuleType" NOT NULL,

    CONSTRAINT "UserAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresas" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "escritorio_id" TEXT NOT NULL,

    CONSTRAINT "Empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escritorios" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Escritorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmpresasToprofiles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EmpresasToprofiles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Empresas_cnpj_key" ON "Empresas"("cnpj");

-- CreateIndex
CREATE INDEX "_EmpresasToprofiles_B_index" ON "_EmpresasToprofiles"("B");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "Escritorios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_profiles_id_fkey" FOREIGN KEY ("profiles_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empresas" ADD CONSTRAINT "Empresas_escritorio_id_fkey" FOREIGN KEY ("escritorio_id") REFERENCES "Escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmpresasToprofiles" ADD CONSTRAINT "_EmpresasToprofiles_A_fkey" FOREIGN KEY ("A") REFERENCES "Empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmpresasToprofiles" ADD CONSTRAINT "_EmpresasToprofiles_B_fkey" FOREIGN KEY ("B") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
