-- DropForeignKey
ALTER TABLE "public"."rtc_produtos_classificacao" DROP CONSTRAINT "rtc_produtos_classificacao_id_fis_produtos_fkey";

-- AlterTable
ALTER TABLE "rtc_produtos_classificacao" ALTER COLUMN "dt_created" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "dt_updated" DROP DEFAULT,
ALTER COLUMN "dt_updated" SET DATA TYPE TIMESTAMP(6);

-- AddForeignKey
ALTER TABLE "rtc_produtos_classificacao" ADD CONSTRAINT "rtc_produtos_classificacao_id_fis_produtos_fkey" FOREIGN KEY ("id_fis_produtos") REFERENCES "fis_produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
