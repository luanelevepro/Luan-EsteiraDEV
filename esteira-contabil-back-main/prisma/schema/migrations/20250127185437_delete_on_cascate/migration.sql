-- DropForeignKey
ALTER TABLE "sis_access" DROP CONSTRAINT "sis_access_id_empresas_fkey";

-- DropForeignKey
ALTER TABLE "sis_access" DROP CONSTRAINT "sis_access_id_profiles_fkey";

-- AddForeignKey
ALTER TABLE "sis_access" ADD CONSTRAINT "sis_access_id_profiles_fkey" FOREIGN KEY ("id_profiles") REFERENCES "sis_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_access" ADD CONSTRAINT "sis_access_id_empresas_fkey" FOREIGN KEY ("id_empresas") REFERENCES "sis_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
