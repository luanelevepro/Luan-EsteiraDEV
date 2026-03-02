-- AlterTable tms_entregas: lista de produtos por entrega (proPred CT-e; xProd itens NF-e)
ALTER TABLE "tms_entregas" ADD COLUMN "js_produtos" TEXT[] DEFAULT ARRAY[]::TEXT[];
