-- AlterTable
ALTER TABLE "rh_cargo_nivel_senioridade" ADD COLUMN     "cd_ordem_senioridade" INTEGER;

-- AlterTable
ALTER TABLE "rh_cargos" ALTER COLUMN "is_ativo" SET DEFAULT true;

-- AlterTable
ALTER TABLE "rh_niveis" ALTER COLUMN "is_ativo" SET DEFAULT true;

-- AlterTable
ALTER TABLE "rh_senioridade" ALTER COLUMN "is_ativo" SET DEFAULT true;

-- CreateTable
CREATE TABLE "rh_senioridade_cargo" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cd_ordem" INTEGER,
    "id_cargo" TEXT,
    "id_senioridade" TEXT,

    CONSTRAINT "rh_senioridade_cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_nivel_cargo" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cd_ordem" INTEGER,
    "id_cargo" TEXT,
    "id_nivel" TEXT,

    CONSTRAINT "rh_nivel_cargo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rh_senioridade_cargo" ADD CONSTRAINT "rh_senioridade_cargo_id_cargo_fkey" FOREIGN KEY ("id_cargo") REFERENCES "rh_cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_senioridade_cargo" ADD CONSTRAINT "rh_senioridade_cargo_id_senioridade_fkey" FOREIGN KEY ("id_senioridade") REFERENCES "rh_senioridade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_nivel_cargo" ADD CONSTRAINT "rh_nivel_cargo_id_cargo_fkey" FOREIGN KEY ("id_cargo") REFERENCES "rh_cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_nivel_cargo" ADD CONSTRAINT "rh_nivel_cargo_id_nivel_fkey" FOREIGN KEY ("id_nivel") REFERENCES "rh_niveis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
