-- AlterTable: fis_cte - expedidor (exped) e recebedor (receb) do CT-e
ALTER TABLE "fis_cte" ADD COLUMN "ds_documento_expedidor" TEXT,
ADD COLUMN "ds_razao_social_expedidor" TEXT,
ADD COLUMN "ds_documento_recebedor" TEXT,
ADD COLUMN "ds_razao_social_recebedor" TEXT;
