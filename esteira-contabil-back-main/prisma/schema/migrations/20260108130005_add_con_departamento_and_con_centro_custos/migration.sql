-- CreateTable
CREATE TABLE "con_departamentos" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome_depart" TEXT,
    "id_depart_externo" TEXT,
    "is_ativo" BOOLEAN,
    "ds_origem_registro" TEXT,
    "id_con_empresas" TEXT,

    CONSTRAINT "con_departamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "con_centro_custos" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_cadastro" TIMESTAMP(3),
    "ds_nome_centro" TEXT,
    "ds_codigo_centro" TEXT,
    "is_ativo" BOOLEAN,
    "ds_origem_registro" TEXT,
    "id_con_departamentos" TEXT,
    "id_con_empresas" TEXT,

    CONSTRAINT "con_centro_custos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "con_departamentos" ADD CONSTRAINT "con_departamentos_id_con_empresas_fkey" FOREIGN KEY ("id_con_empresas") REFERENCES "con_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "con_centro_custos" ADD CONSTRAINT "con_centro_custos_id_con_departamentos_fkey" FOREIGN KEY ("id_con_departamentos") REFERENCES "con_departamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "con_centro_custos" ADD CONSTRAINT "con_centro_custos_id_con_empresas_fkey" FOREIGN KEY ("id_con_empresas") REFERENCES "con_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
