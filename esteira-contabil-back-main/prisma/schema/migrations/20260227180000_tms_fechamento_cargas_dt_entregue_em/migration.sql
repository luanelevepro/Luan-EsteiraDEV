-- 1) Add column dt_entregue_em em tms_cargas
ALTER TABLE "tms_cargas" ADD COLUMN "dt_entregue_em" TIMESTAMP(3);

-- 2) Backfill dt_entregue_em para cargas ENTREGUE via entregas ENTREGUE (quando existir)
WITH ult_entrega AS (
  SELECT
    "id_carga",
    MAX(COALESCE("dt_entrega", "dt_updated")) AS "max_dt"
  FROM "tms_entregas"
  WHERE "ds_status" = 'ENTREGUE'
  GROUP BY "id_carga"
)
UPDATE "tms_cargas" c
SET "dt_entregue_em" = u."max_dt"
FROM ult_entrega u
WHERE c."id" = u."id_carga"
  AND c."ds_status" = 'ENTREGUE'
  AND c."dt_entregue_em" IS NULL;

-- 3) Backfill restante (ENTREGUE sem entregas ENTREGUE): usar dt_updated como fallback
UPDATE "tms_cargas"
SET "dt_entregue_em" = "dt_updated"
WHERE "ds_status" = 'ENTREGUE'
  AND "dt_entregue_em" IS NULL;

-- 4) Create table tms_fechamento_cargas
CREATE TABLE "tms_fechamento_cargas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "id_fechamento" TEXT NOT NULL,
    "id_carga" TEXT NOT NULL,

    "id_viagem" TEXT,
    "nr_sequencia" INTEGER,

    "id_motorista_veiculo" TEXT,
    "dt_entregue_em" TIMESTAMP(3),
    "ds_status_carga" "StatusCarga" NOT NULL,
    "fl_deslocamento_vazio" BOOLEAN NOT NULL DEFAULT false,

    "vl_base_comissao" DECIMAL(14,2),

    CONSTRAINT "tms_fechamento_cargas_pkey" PRIMARY KEY ("id")
);

-- Uniques / Indexes tms_fechamento_cargas
CREATE UNIQUE INDEX "tms_fechamento_cargas_id_fechamento_id_carga_key" ON "tms_fechamento_cargas"("id_fechamento", "id_carga");

CREATE INDEX "tms_fechamento_cargas_id_fechamento_idx" ON "tms_fechamento_cargas"("id_fechamento");

CREATE INDEX "tms_fechamento_cargas_id_carga_idx" ON "tms_fechamento_cargas"("id_carga");

CREATE INDEX "tms_fechamento_cargas_id_viagem_idx" ON "tms_fechamento_cargas"("id_viagem");

-- FK tms_fechamento_cargas
ALTER TABLE "tms_fechamento_cargas" ADD CONSTRAINT "tms_fechamento_cargas_id_fechamento_fkey" FOREIGN KEY ("id_fechamento") REFERENCES "tms_fechamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tms_fechamento_cargas" ADD CONSTRAINT "tms_fechamento_cargas_id_carga_fkey" FOREIGN KEY ("id_carga") REFERENCES "tms_cargas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tms_fechamento_cargas" ADD CONSTRAINT "tms_fechamento_cargas_id_viagem_fkey" FOREIGN KEY ("id_viagem") REFERENCES "tms_viagens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Índices úteis em tms_cargas (se ainda não existirem)
CREATE INDEX IF NOT EXISTS "tms_cargas_ds_status_idx" ON "tms_cargas"("ds_status");
CREATE INDEX IF NOT EXISTS "tms_cargas_dt_entregue_em_idx" ON "tms_cargas"("dt_entregue_em");
CREATE INDEX IF NOT EXISTS "tms_cargas_id_motorista_veiculo_idx" ON "tms_cargas"("id_motorista_veiculo");
