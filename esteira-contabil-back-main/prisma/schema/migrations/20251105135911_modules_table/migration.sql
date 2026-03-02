-- CreateTable
CREATE TABLE "sis_modules" (
    "id" TEXT NOT NULL,
    "ds_module" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sis_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_profiles_modules" (
    "id_profile" TEXT NOT NULL,
    "id_module" TEXT NOT NULL,
    "dt_ativacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_activated" BOOLEAN NOT NULL DEFAULT false,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sis_profiles_modules_pkey" PRIMARY KEY ("id_profile","id_module")
);

-- CreateTable
CREATE TABLE "sis_empresas_modules" (
    "id_empresa" TEXT NOT NULL,
    "id_module" TEXT NOT NULL,
    "dt_ativacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_activated" BOOLEAN NOT NULL DEFAULT false,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sis_empresas_modules_pkey" PRIMARY KEY ("id_empresa","id_module")
);

-- AddForeignKey
ALTER TABLE "sis_profiles_modules" ADD CONSTRAINT "sis_profiles_modules_id_profile_fkey" FOREIGN KEY ("id_profile") REFERENCES "sis_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_profiles_modules" ADD CONSTRAINT "sis_profiles_modules_id_module_fkey" FOREIGN KEY ("id_module") REFERENCES "sis_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_empresas_modules" ADD CONSTRAINT "sis_empresas_modules_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "sis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_empresas_modules" ADD CONSTRAINT "sis_empresas_modules_id_module_fkey" FOREIGN KEY ("id_module") REFERENCES "sis_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
