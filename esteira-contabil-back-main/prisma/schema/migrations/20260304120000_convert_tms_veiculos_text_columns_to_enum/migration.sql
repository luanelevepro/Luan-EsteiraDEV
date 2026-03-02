-- Converte colunas de tms_veiculos de TEXT para os tipos enum (alinhando ao schema Prisma e ao print2).
-- Garante que os tipos enum existam.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoUnidade') THEN
    CREATE TYPE "TipoUnidade" AS ENUM ('TRACIONADOR', 'CARROCERIA', 'RIGIDO');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoCarroceria') THEN
    CREATE TYPE "TipoCarroceria" AS ENUM ('GRANELEIRO', 'BAU', 'SIDER', 'FRIGORIFICO', 'TANQUE', 'PORTA_CONTAINER');
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

-- Converte colunas de TEXT para enum (idempotente: se já forem enum, o USING mantém os valores).
ALTER TABLE "tms_veiculos"
  ALTER COLUMN "ds_tipo_unidade" TYPE "TipoUnidade" USING ds_tipo_unidade::"TipoUnidade";

ALTER TABLE "tms_veiculos"
  ALTER COLUMN "ds_tipo_carroceria_carga" TYPE "TipoCarroceria" USING ds_tipo_carroceria_carga::"TipoCarroceria";

ALTER TABLE "tms_veiculos"
  ALTER COLUMN "ds_classificacao_tracionador" TYPE "ClassificacaoTracionador" USING ds_classificacao_tracionador::"ClassificacaoTracionador";

ALTER TABLE "tms_veiculos"
  ALTER COLUMN "ds_classificacao_carroceria" TYPE "ClassificacaoCarroceria" USING ds_classificacao_carroceria::"ClassificacaoCarroceria";

ALTER TABLE "tms_veiculos"
  ALTER COLUMN "ds_classificacao_rigido" TYPE "ClassificacaoRigido" USING ds_classificacao_rigido::"ClassificacaoRigido";
