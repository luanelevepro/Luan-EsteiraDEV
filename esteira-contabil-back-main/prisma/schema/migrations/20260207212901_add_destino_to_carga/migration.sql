-- AlterTable
ALTER TABLE "tms_cargas" ADD COLUMN     "id_cidade_destino" INTEGER;

-- AddForeignKey
ALTER TABLE "tms_cargas" ADD CONSTRAINT "tms_cargas_id_cidade_destino_fkey" FOREIGN KEY ("id_cidade_destino") REFERENCES "sis_igbe_city"("id") ON DELETE SET NULL ON UPDATE CASCADE;
