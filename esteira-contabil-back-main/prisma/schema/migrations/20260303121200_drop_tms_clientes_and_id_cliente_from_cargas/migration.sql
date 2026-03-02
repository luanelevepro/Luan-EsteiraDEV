-- DropForeignKey: tms_cargas.id_cliente -> tms_clientes
ALTER TABLE "tms_cargas" DROP CONSTRAINT IF EXISTS "tms_cargas_id_cliente_fkey";

-- DropColumn: id_cliente from tms_cargas
ALTER TABLE "tms_cargas" DROP COLUMN IF EXISTS "id_cliente";

-- DropTable: tms_clientes (replaced by fis_clientes)
DROP TABLE IF EXISTS "tms_clientes";
