-- CreateEnum
CREATE TYPE "TipoDespesa" AS ENUM ('DESPESA', 'ADIANTAMENTO', 'ABASTECIMENTO', 'PEDAGIO');

-- CreateTable
CREATE TABLE "tms_viagem_despesas" (
    "id" TEXT NOT NULL,
    "id_viagem" TEXT NOT NULL,
    "ds_tipo" "TipoDespesa" NOT NULL,
    "vl_despesa" TEXT NOT NULL,
    "id_nfe_item" TEXT,
    "id_nfse" TEXT,
    "dt_despesa" TIMESTAMP(3) NOT NULL,
    "ds_observacao" TEXT,

    CONSTRAINT "tms_viagem_despesas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tms_viagem_despesas_id_viagem_idx" ON "tms_viagem_despesas"("id_viagem");

-- AddForeignKey
ALTER TABLE "tms_viagem_despesas" ADD CONSTRAINT "tms_viagem_despesas_id_viagem_fkey" FOREIGN KEY ("id_viagem") REFERENCES "tms_viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_viagem_despesas" ADD CONSTRAINT "tms_viagem_despesas_id_nfe_item_fkey" FOREIGN KEY ("id_nfe_item") REFERENCES "fis_nfe_itens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_viagem_despesas" ADD CONSTRAINT "tms_viagem_despesas_id_nfse_fkey" FOREIGN KEY ("id_nfse") REFERENCES "fis_nfse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
