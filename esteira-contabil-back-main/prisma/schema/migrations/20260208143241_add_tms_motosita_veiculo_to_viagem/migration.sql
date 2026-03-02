-- AlterTable
ALTER TABLE "tms_viagens" ADD COLUMN     "id_motorista_veiculo" TEXT;

-- AddForeignKey
ALTER TABLE "tms_viagens" ADD CONSTRAINT "tms_viagens_id_motorista_veiculo_fkey" FOREIGN KEY ("id_motorista_veiculo") REFERENCES "tms_motoristas_veiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
