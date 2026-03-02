-- AlterTable
ALTER TABLE "sis_cfop" ADD COLUMN     "fl_fit_cte" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fl_fit_entrada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fl_fit_nfe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fl_fit_saida" BOOLEAN NOT NULL DEFAULT false;
