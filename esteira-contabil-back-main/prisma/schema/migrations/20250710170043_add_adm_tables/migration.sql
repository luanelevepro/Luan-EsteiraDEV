-- CreateEnum
CREATE TYPE "TipoConsumoIntegracao" AS ENUM ('NFSE_TOMADOS_TECNOSPEED');

-- CreateTable
CREATE TABLE "adm_empresas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "id_sis_empresas" TEXT NOT NULL,

    CONSTRAINT "adm_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_consumo_integracao" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "ds_tipo_consumo" "TipoConsumoIntegracao" NOT NULL,
    "ds_consumo" INTEGER NOT NULL,
    "id_integracao" TEXT NOT NULL,
    "id_adm_empresas" TEXT NOT NULL,

    CONSTRAINT "adm_consumo_integracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adm_empresas_id_sis_empresas_key" ON "adm_empresas"("id_sis_empresas");

-- AddForeignKey
ALTER TABLE "adm_empresas" ADD CONSTRAINT "adm_empresas_id_sis_empresas_fkey" FOREIGN KEY ("id_sis_empresas") REFERENCES "sis_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_consumo_integracao" ADD CONSTRAINT "adm_consumo_integracao_id_integracao_fkey" FOREIGN KEY ("id_integracao") REFERENCES "sis_integracao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_consumo_integracao" ADD CONSTRAINT "adm_consumo_integracao_id_adm_empresas_fkey" FOREIGN KEY ("id_adm_empresas") REFERENCES "adm_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
