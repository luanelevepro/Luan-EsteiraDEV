-- AlterTable: fis_cte - endereço do destino da entrega (enderDest/enderReceb do CT-e)
ALTER TABLE "fis_cte" ADD COLUMN "ds_endereco_destino" TEXT,
ADD COLUMN "ds_complemento_destino" TEXT;
