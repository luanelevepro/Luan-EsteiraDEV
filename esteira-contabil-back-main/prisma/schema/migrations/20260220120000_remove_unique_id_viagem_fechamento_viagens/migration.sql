-- Remove unique constraint on id_viagem so the same trip can appear in multiple closures (different months)
DROP INDEX IF EXISTS "tms_fechamento_viagens_id_viagem_key";
