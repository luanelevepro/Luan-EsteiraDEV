-- AlterTable: fis_cte - endereço do remetente (toma): rem.enderReme do CT-e
ALTER TABLE "fis_cte" ADD COLUMN "ds_endereco_remetente" TEXT,
ADD COLUMN "ds_complemento_remetente" TEXT;
