/*
  Warnings:

  - The `ds_tipo_veiculo` column on the `tms_cargas` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `is_carroceria` on the `tms_veiculos` table. All the data in the column will be lost.
  - You are about to drop the column `is_tracionador` on the `tms_veiculos` table. All the data in the column will be lost.

*/
-- CreateEnum (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoUnidade') THEN
    CREATE TYPE "TipoUnidade" AS ENUM ('TRACIONADOR', 'CARROCERIA', 'RIGIDO');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassificacaoTracionador') THEN
    CREATE TYPE "ClassificacaoTracionador" AS ENUM ('CAVALO_4X2', 'CAVALO_6X2', 'CAVALO_6X4', 'CAVALO_8X2', 'CAVALO_8X4');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassificacaoCarroceria') THEN
    CREATE TYPE "ClassificacaoCarroceria" AS ENUM ('CARRETA_LS', 'CARRETA_VANDERLEIA', 'CARRETA_4_EIXO', 'BITREM', 'RODOTREM', 'ROMEU_E_JULIETA', 'REBOQUE_SIMPLES');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassificacaoRigido') THEN
    CREATE TYPE "ClassificacaoRigido" AS ENUM ('CARRO', 'MINI_VAN', 'VAN', 'VUC', 'CAMINHAO_TOCO', 'CAMINHAO_TRUCK');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoCarroceria') THEN
    CREATE TYPE "TipoCarroceria" AS ENUM ('GRANELEIRO', 'BAU', 'SIDER', 'FRIGORIFICO', 'TANQUE', 'PORTA_CONTAINER');
  END IF;
END $$;

-- AlterTable tms_cargas: adiciona coluna só se não existir (idempotente, evita perda de dados)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tms_cargas' AND column_name = 'ds_tipo_veiculo') THEN
    ALTER TABLE "tms_cargas" ADD COLUMN "ds_tipo_veiculo" "TipoCarroceria";
  END IF;
END $$;

-- AlterTable tms_veiculos: drops e adds idempotentes
ALTER TABLE "tms_veiculos" DROP COLUMN IF EXISTS "is_carroceria";
ALTER TABLE "tms_veiculos" DROP COLUMN IF EXISTS "is_tracionador";
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_ano_fabricacao" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_classificacao_carroceria" "ClassificacaoCarroceria";
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_classificacao_rigido" "ClassificacaoRigido";
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_classificacao_tracionador" "ClassificacaoTracionador";
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_marca" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_modelo" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_tipo_carroceria_carga" "TipoCarroceria";
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "ds_tipo_unidade" "TipoUnidade";
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "id_modelo" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "vl_ano_fabricacao" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "vl_ano_modelo" TEXT;
ALTER TABLE "tms_veiculos" ADD COLUMN IF NOT EXISTS "vl_eixos" TEXT;

-- DropEnum (idempotente: só remove se nenhuma coluna usar)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND udt_name = 'TipoVeiculo') THEN
    DROP TYPE "TipoVeiculo";
  END IF;
END $$;

-- CreateTable (idempotente)
CREATE TABLE IF NOT EXISTS "sis_modelos_fipe" (
    "id" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "cd_fipe" TEXT,
    "ds_marca" TEXT NOT NULL,
    "cd_marca" TEXT NOT NULL,
    "ds_ano_modelo" TEXT NOT NULL,
    "vl_valor" DECIMAL(14,2) NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sis_modelos_fipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sis_modelos_fipe_vigencia" (
    "id" TEXT NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,
    "vl_preco" DECIMAL(14,2) NOT NULL,
    "id_sis_modelos_fipe" TEXT NOT NULL,

    CONSTRAINT "sis_modelos_fipe_vigencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotente)
CREATE UNIQUE INDEX IF NOT EXISTS "sis_modelos_fipe_cd_fipe_key" ON "sis_modelos_fipe"("cd_fipe");
CREATE UNIQUE INDEX IF NOT EXISTS "sis_modelos_fipe_vigencia_id_sis_modelos_fipe_dt_vigencia_key" ON "sis_modelos_fipe_vigencia"("id_sis_modelos_fipe", "dt_vigencia");
CREATE INDEX IF NOT EXISTS "tms_veiculos_id_tms_empresas_idx" ON "tms_veiculos"("id_tms_empresas");
CREATE INDEX IF NOT EXISTS "tms_veiculos_is_ativo_idx" ON "tms_veiculos"("is_ativo");

-- AddForeignKey (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sis_modelos_fipe_vigencia_id_sis_modelos_fipe_fkey') THEN
    ALTER TABLE "sis_modelos_fipe_vigencia" ADD CONSTRAINT "sis_modelos_fipe_vigencia_id_sis_modelos_fipe_fkey" FOREIGN KEY ("id_sis_modelos_fipe") REFERENCES "sis_modelos_fipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tms_veiculos_id_modelo_fkey') THEN
    ALTER TABLE "tms_veiculos" ADD CONSTRAINT "tms_veiculos_id_modelo_fkey" FOREIGN KEY ("id_modelo") REFERENCES "sis_modelos_fipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
