-- DropForeignKey
ALTER TABLE "fis_nfe_itens_alter_entrada" DROP CONSTRAINT "fis_nfe_itens_alter_entrada_id_regra_nfe_entrada_fkey";

-- AlterTable
ALTER TABLE "fis_nfe_itens_alter_entrada" ALTER COLUMN "id_regra_nfe_entrada" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "fis_nfe_itens_alter_entrada" ADD CONSTRAINT "fis_nfe_itens_alter_entrada_id_regra_nfe_entrada_fkey" FOREIGN KEY ("id_regra_nfe_entrada") REFERENCES "fis_regras_entrada_nfe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
