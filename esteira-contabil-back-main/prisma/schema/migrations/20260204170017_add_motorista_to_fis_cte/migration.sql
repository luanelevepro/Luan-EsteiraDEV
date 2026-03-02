-- AlterTable
ALTER TABLE "fis_cte" ADD COLUMN     "ds_documento_motorista" TEXT,
ADD COLUMN     "ds_nome_motorista" TEXT,
ADD COLUMN     "id_motorista" TEXT;

-- AddForeignKey
ALTER TABLE "fis_cte" ADD CONSTRAINT "fis_cte_id_motorista_fkey" FOREIGN KEY ("id_motorista") REFERENCES "tms_motoristas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
