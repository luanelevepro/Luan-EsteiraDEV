-- CreateTable
CREATE TABLE "rh_empresas" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_sis_empresas" TEXT NOT NULL,

    CONSTRAINT "rh_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_funcionarios" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_externo" TEXT,
    "id_empresa_externo" TEXT,
    "ds_nome_empresa_externo" TEXT,
    "ds_nome" TEXT NOT NULL,
    "ds_documento" TEXT,
    "dt_admissao" TIMESTAMP(3),
    "cd_situacao" TEXT,
    "ds_situacao" TEXT,
    "ds_categoria" TEXT,
    "ds_salario" DECIMAL(10,2),
    "ds_sexo" TEXT,
    "ds_horas_dia" DECIMAL(5,2),
    "ds_horas_semana" DECIMAL(5,2),
    "ds_horas_mes" DECIMAL(5,2),
    "ds_data_nascimento" TEXT,
    "ds_jornada_descricao" TEXT,
    "ds_venc_ferias" TEXT,
    "id_cargo" TEXT,
    "id_cargo_nivel_senioridade" TEXT,
    "id_rh_empresas" TEXT,
    "id_centro_custos" TEXT,
    "id_departamento" TEXT,

    CONSTRAINT "rh_funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_cargos" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome" TEXT,
    "fl_ativo" BOOLEAN,
    "fl_gerencia_supervisao" BOOLEAN,
    "dt_inativacao" TIMESTAMP(3),
    "id_empresa_externo" TEXT,
    "ds_nome_empresa" TEXT,
    "id_externo" TEXT,
    "id_rh_empresas" TEXT,

    CONSTRAINT "rh_cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_niveis" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome" TEXT,
    "fl_ativo" BOOLEAN,
    "dt_inativacao" TIMESTAMP(3),
    "id_rh_empresas" TEXT,

    CONSTRAINT "rh_niveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_senioridade" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome" TEXT,
    "fl_ativo" BOOLEAN,
    "dt_inativacao" TIMESTAMP(3),
    "id_rh_empresas" TEXT,

    CONSTRAINT "rh_senioridade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_cargo_nivel_senioridade" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_salario_min" DECIMAL(5,2),
    "ds_salario_max" DECIMAL(5,2),
    "id_cargo" TEXT,
    "id_senioridade" TEXT,
    "id_nivel" TEXT,
    "id_rh_empresas" TEXT,

    CONSTRAINT "rh_cargo_nivel_senioridade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_competencias" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome" TEXT,
    "fl_ativo" BOOLEAN DEFAULT true,
    "dt_inativacao" TIMESTAMP(3),
    "ds_descricao" TEXT,

    CONSTRAINT "rh_competencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_cargo_nivel_competencia" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fl_ativo" BOOLEAN,
    "id_cargo_nivel_senioridade" TEXT,
    "id_competencia" TEXT,
    "id_rh_empresas" TEXT,

    CONSTRAINT "rh_cargo_nivel_competencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_avaliacao_funcionario" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_funcionario" TEXT,

    CONSTRAINT "rh_avaliacao_funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_avaliacao_competencia" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_avaliacao" TEXT,
    "ds_nota" DECIMAL(5,2),
    "id_cargo_nivel_competencia" TEXT,

    CONSTRAINT "rh_avaliacao_competencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_departamento" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome" TEXT,
    "ds_endereco" TEXT,
    "id_empresa_externo" TEXT,
    "ds_numero" INTEGER,
    "id_externo" TEXT,
    "ds_nome_empresa" TEXT,
    "ds_bairro" TEXT,
    "ds_cidade" TEXT,
    "ds_estado" TEXT,
    "cd_cep" TEXT,
    "id_rh_empresas" TEXT,

    CONSTRAINT "rh_departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_centro_custos" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome" TEXT,
    "id_empresa_externo" TEXT,
    "id_externo" TEXT,
    "ds_tipo" INTEGER,
    "ds_nome_empresa" TEXT,
    "cd_centro_custos_sintetico" INTEGER,
    "ds_mascara" TEXT,
    "id_rh_empresas" TEXT,

    CONSTRAINT "rh_centro_custos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rh_empresas_id_sis_empresas_key" ON "rh_empresas"("id_sis_empresas");

-- AddForeignKey
ALTER TABLE "rh_empresas" ADD CONSTRAINT "rh_empresas_id_sis_empresas_fkey" FOREIGN KEY ("id_sis_empresas") REFERENCES "sis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_id_cargo_fkey" FOREIGN KEY ("id_cargo") REFERENCES "rh_cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_id_cargo_nivel_senioridade_fkey" FOREIGN KEY ("id_cargo_nivel_senioridade") REFERENCES "rh_cargo_nivel_senioridade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_id_rh_empresas_fkey" FOREIGN KEY ("id_rh_empresas") REFERENCES "rh_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_id_centro_custos_fkey" FOREIGN KEY ("id_centro_custos") REFERENCES "rh_centro_custos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_id_departamento_fkey" FOREIGN KEY ("id_departamento") REFERENCES "rh_departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_cargos" ADD CONSTRAINT "rh_cargos_id_rh_empresas_fkey" FOREIGN KEY ("id_rh_empresas") REFERENCES "rh_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_niveis" ADD CONSTRAINT "rh_niveis_id_rh_empresas_fkey" FOREIGN KEY ("id_rh_empresas") REFERENCES "rh_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_senioridade" ADD CONSTRAINT "rh_senioridade_id_rh_empresas_fkey" FOREIGN KEY ("id_rh_empresas") REFERENCES "rh_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_cargo_nivel_senioridade" ADD CONSTRAINT "rh_cargo_nivel_senioridade_id_cargo_fkey" FOREIGN KEY ("id_cargo") REFERENCES "rh_cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_cargo_nivel_senioridade" ADD CONSTRAINT "rh_cargo_nivel_senioridade_id_senioridade_fkey" FOREIGN KEY ("id_senioridade") REFERENCES "rh_senioridade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_cargo_nivel_senioridade" ADD CONSTRAINT "rh_cargo_nivel_senioridade_id_nivel_fkey" FOREIGN KEY ("id_nivel") REFERENCES "rh_niveis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_cargo_nivel_senioridade" ADD CONSTRAINT "rh_cargo_nivel_senioridade_id_rh_empresas_fkey" FOREIGN KEY ("id_rh_empresas") REFERENCES "rh_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_cargo_nivel_competencia" ADD CONSTRAINT "rh_cargo_nivel_competencia_id_cargo_nivel_senioridade_fkey" FOREIGN KEY ("id_cargo_nivel_senioridade") REFERENCES "rh_cargo_nivel_senioridade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_cargo_nivel_competencia" ADD CONSTRAINT "rh_cargo_nivel_competencia_id_competencia_fkey" FOREIGN KEY ("id_competencia") REFERENCES "rh_competencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_cargo_nivel_competencia" ADD CONSTRAINT "rh_cargo_nivel_competencia_id_rh_empresas_fkey" FOREIGN KEY ("id_rh_empresas") REFERENCES "rh_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_avaliacao_funcionario" ADD CONSTRAINT "rh_avaliacao_funcionario_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "rh_funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_avaliacao_competencia" ADD CONSTRAINT "rh_avaliacao_competencia_id_avaliacao_fkey" FOREIGN KEY ("id_avaliacao") REFERENCES "rh_avaliacao_funcionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_avaliacao_competencia" ADD CONSTRAINT "rh_avaliacao_competencia_id_cargo_nivel_competencia_fkey" FOREIGN KEY ("id_cargo_nivel_competencia") REFERENCES "rh_cargo_nivel_competencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_departamento" ADD CONSTRAINT "rh_departamento_id_rh_empresas_fkey" FOREIGN KEY ("id_rh_empresas") REFERENCES "rh_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_centro_custos" ADD CONSTRAINT "rh_centro_custos_id_rh_empresas_fkey" FOREIGN KEY ("id_rh_empresas") REFERENCES "rh_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
