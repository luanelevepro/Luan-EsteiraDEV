-- CreateTable
CREATE TABLE "tms_empresas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_sis_empresas" TEXT NOT NULL,

    CONSTRAINT "tms_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_veiculos" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_placa" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "id_externo" TEXT,
    "cd_identificador" TEXT,
    "dt_aquisicao" TIMESTAMP(3),
    "dt_baixa" TIMESTAMP(3),
    "dt_cadastro" TIMESTAMP(3),
    "vl_aquisicao" TEXT,
    "is_ativo" BOOLEAN,
    "id_centro_custos" TEXT,

    CONSTRAINT "tms_veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tms_empresas_id_sis_empresas_key" ON "tms_empresas"("id_sis_empresas");

-- AddForeignKey
ALTER TABLE "tms_empresas" ADD CONSTRAINT "tms_empresas_id_sis_empresas_fkey" FOREIGN KEY ("id_sis_empresas") REFERENCES "sis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_veiculos" ADD CONSTRAINT "tms_veiculos_id_centro_custos_fkey" FOREIGN KEY ("id_centro_custos") REFERENCES "con_centro_custos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
