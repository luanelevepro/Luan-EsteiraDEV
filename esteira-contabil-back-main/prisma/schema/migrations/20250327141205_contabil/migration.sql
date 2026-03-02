-- CreateTable
CREATE TABLE "con_empresas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_sis_empresas" TEXT NOT NULL,

    CONSTRAINT "con_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "con_tipo_grupo" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome_tipo" TEXT,
    "is_ativo" BOOLEAN,

    CONSTRAINT "con_tipo_grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "con_grupo_contas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_classificacao_grupo" TEXT,
    "ds_nome_grupo" TEXT,
    "ds_tipo" TEXT,
    "is_ativo" BOOLEAN,
    "id_tipo_grupo" TEXT,
    "id_con_empresas" TEXT,

    CONSTRAINT "con_grupo_contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "con_plano_contas" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_con_empresas" TEXT,
    "ds_classificacao_cta" TEXT,
    "ds_nome_cta" TEXT,
    "ds_tipo_cta" TEXT,
    "ds_nivel_cta" INTEGER,
    "ds_classificacao_pai" TEXT,
    "id_externo" TEXT,
    "id_conta_pai" TEXT,
    "is_ativo" BOOLEAN,
    "id_empresa_externo" TEXT,
    "id_grupo_contas" TEXT,

    CONSTRAINT "con_plano_contas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "con_empresas_id_sis_empresas_key" ON "con_empresas"("id_sis_empresas");

-- AddForeignKey
ALTER TABLE "con_empresas" ADD CONSTRAINT "con_empresas_id_sis_empresas_fkey" FOREIGN KEY ("id_sis_empresas") REFERENCES "sis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "con_grupo_contas" ADD CONSTRAINT "con_grupo_contas_id_tipo_grupo_fkey" FOREIGN KEY ("id_tipo_grupo") REFERENCES "con_tipo_grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "con_grupo_contas" ADD CONSTRAINT "con_grupo_contas_id_con_empresas_fkey" FOREIGN KEY ("id_con_empresas") REFERENCES "con_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "con_plano_contas" ADD CONSTRAINT "con_plano_contas_id_con_empresas_fkey" FOREIGN KEY ("id_con_empresas") REFERENCES "con_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "con_plano_contas" ADD CONSTRAINT "con_plano_contas_id_conta_pai_fkey" FOREIGN KEY ("id_conta_pai") REFERENCES "con_plano_contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "con_plano_contas" ADD CONSTRAINT "con_plano_contas_id_grupo_contas_fkey" FOREIGN KEY ("id_grupo_contas") REFERENCES "con_grupo_contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
