-- DropForeignKey
ALTER TABLE "rtc_produtos_classificacao" DROP CONSTRAINT "rtc_produtos_classificacao_id_fis_produtos_fkey";

-- DropForeignKey
ALTER TABLE "tms_cargas" DROP CONSTRAINT "tms_cargas_id_cidade_origem_fkey";

-- DropIndex
DROP INDEX "tms_cargas_id_fis_cliente_idx";

-- AlterTable
ALTER TABLE "fis_clientes" ADD COLUMN     "id_externo" TEXT;

-- AlterTable
ALTER TABLE "rtc_produtos_classificacao" ALTER COLUMN "dt_created" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "dt_updated" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "dt_updated" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "rtc_produtos_classificacao" ADD CONSTRAINT "rtc_produtos_classificacao_id_fis_produtos_fkey" FOREIGN KEY ("id_fis_produtos") REFERENCES "fis_produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_cargas" ADD CONSTRAINT "tms_cargas_id_cidade_origem_fkey" FOREIGN KEY ("id_cidade_origem") REFERENCES "sis_igbe_city"("id") ON DELETE SET NULL ON UPDATE CASCADE;
