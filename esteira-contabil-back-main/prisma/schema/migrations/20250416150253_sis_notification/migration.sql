-- CreateEnum
CREATE TYPE "tipos_notifacoes" AS ENUM ('WARN', 'INFO', 'SUCCESS', 'ERROR', 'DEBUG');

-- CreateTable
CREATE TABLE "sis_profiles_notificacoes" (
    "id" TEXT NOT NULL,
    "id_profile" TEXT NOT NULL,
    "ds_titulo" TEXT NOT NULL,
    "ds_descricao" TEXT,
    "cd_tipo" "tipos_notifacoes" NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sis_profiles_notificacoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sis_profiles_notificacoes" ADD CONSTRAINT "sis_profiles_notificacoes_id_profile_fkey" FOREIGN KEY ("id_profile") REFERENCES "sis_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
