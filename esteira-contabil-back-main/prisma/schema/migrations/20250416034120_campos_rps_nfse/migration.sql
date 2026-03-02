-- AlterTable
ALTER TABLE "fis_nfse" ADD COLUMN     "ds_codigo_cnae" TEXT,
ADD COLUMN     "ds_codigo_tributacao_municipio" TEXT,
ADD COLUMN     "ds_rps_numero" TEXT,
ADD COLUMN     "ds_rps_serie" TEXT,
ADD COLUMN     "ds_rps_status" TEXT,
ADD COLUMN     "ds_rps_tipo" TEXT,
ADD COLUMN     "ds_valor_credito" TEXT,
ADD COLUMN     "dt_rps_emissao" TIMESTAMP(3);
