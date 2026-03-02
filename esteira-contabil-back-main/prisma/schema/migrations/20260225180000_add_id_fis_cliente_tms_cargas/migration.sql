-- AlterTable: tms_cargas - cliente tomador passa a poder ser fis_clientes (cadastro fiscal com CNPJ)
ALTER TABLE "tms_cargas" ADD COLUMN IF NOT EXISTS "id_fis_cliente" TEXT;

-- AddForeignKey: tms_cargas.id_fis_cliente -> fis_clientes.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tms_cargas_id_fis_cliente_fkey'
  ) THEN
    ALTER TABLE "tms_cargas" ADD CONSTRAINT "tms_cargas_id_fis_cliente_fkey"
      FOREIGN KEY ("id_fis_cliente") REFERENCES "fis_clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Index para consultas por id_fis_cliente
CREATE INDEX IF NOT EXISTS "tms_cargas_id_fis_cliente_idx" ON "tms_cargas"("id_fis_cliente");
