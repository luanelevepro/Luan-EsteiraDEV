-- AlterTable
ALTER TABLE "rtc_produtos_classificacao" ADD COLUMN     "ds_tipo_reducao" TEXT,
ADD COLUMN     "vl_reducao_cbs" DECIMAL(65,30),
ADD COLUMN     "vl_reducao_ibs_mun" DECIMAL(65,30),
ADD COLUMN     "vl_reducao_ibs_uf" DECIMAL(65,30);
