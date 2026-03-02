-- Reorganização dos enums TMS (StatusColeta EM_COLETA, StatusItemViagem EM_DESLOCAMENTO,
-- StatusCarga EM_TRANSITO, StatusViagem EM_VIAGEM).
--
-- Executar este SQL no banco UMA VEZ por ambiente (dev, prod) ANTES de rodar
-- `prisma generate` e subir a aplicação com o novo código.
-- Script idempotente onde possível: só renomeia se o valor antigo existir.

-- StatusItemViagem: EM_ANDAMENTO ou EM_TRANSITO -> EM_DESLOCAMENTO
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'StatusItemViagem' AND e.enumlabel = 'EM_ANDAMENTO') THEN
    ALTER TYPE "StatusItemViagem" RENAME VALUE 'EM_ANDAMENTO' TO 'EM_DESLOCAMENTO';
  ELSIF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'StatusItemViagem' AND e.enumlabel = 'EM_TRANSITO') THEN
    ALTER TYPE "StatusItemViagem" RENAME VALUE 'EM_TRANSITO' TO 'EM_DESLOCAMENTO';
  END IF;
END $$;

-- StatusColeta: EM_ANDAMENTO ou EM_TRANSITO -> EM_COLETA
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'StatusColeta' AND e.enumlabel = 'EM_ANDAMENTO') THEN
    ALTER TYPE "StatusColeta" RENAME VALUE 'EM_ANDAMENTO' TO 'EM_COLETA';
  ELSIF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'StatusColeta' AND e.enumlabel = 'EM_TRANSITO') THEN
    ALTER TYPE "StatusColeta" RENAME VALUE 'EM_TRANSITO' TO 'EM_COLETA';
  END IF;
END $$;

-- StatusCarga: EMITIDA -> EM_TRANSITO (executar só se EMITIDA existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'StatusCarga' AND e.enumlabel = 'EMITIDA') THEN
    EXECUTE 'ALTER TYPE "StatusCarga" RENAME VALUE ''EMITIDA'' TO ''EM_TRANSITO''';
  END IF;
END $$;

-- StatusViagem: EM_TRANSITO -> EM_VIAGEM (executar só se EM_TRANSITO existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'StatusViagem' AND e.enumlabel = 'EM_TRANSITO') THEN
    EXECUTE 'ALTER TYPE "StatusViagem" RENAME VALUE ''EM_TRANSITO'' TO ''EM_VIAGEM''';
  END IF;
END $$;
