-- AlterTable
ALTER TABLE "tms_viagem_despesas" ADD COLUMN     "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id_conta_despesa" TEXT;

-- AddForeignKey
ALTER TABLE "tms_viagem_despesas" ADD CONSTRAINT "tms_viagem_despesas_id_conta_despesa_fkey" FOREIGN KEY ("id_conta_despesa") REFERENCES "con_plano_contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
