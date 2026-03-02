-- CreateEnum
CREATE TYPE "StatusFechamento" AS ENUM ('ABERTO', 'PENDENTE', 'FECHADO', 'REABERTO');

-- CreateTable
CREATE TABLE "tms_fechamentos" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_tms_empresa" TEXT NOT NULL,
    "id_tms_motoristas" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "ds_status" "StatusFechamento" NOT NULL DEFAULT 'ABERTO',
    "vl_total_frete" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vl_total_adiantamentos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vl_total_despesas" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vl_total_descontos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vl_total_proventos" DECIMAL(14,2),
    "vl_liquido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dt_fechamento" TIMESTAMP(3),
    "id_sis_profile_aprovador" TEXT,

    CONSTRAINT "tms_fechamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_fechamento_viagens" (
    "id" TEXT NOT NULL,
    "id_fechamento" TEXT NOT NULL,
    "id_viagem" TEXT NOT NULL,
    "dt_vinculacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tms_fechamento_viagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tms_fechamentos_titulos" (
    "id" TEXT NOT NULL,
    "id_fechamento" TEXT NOT NULL,
    "id_tms_viagem_despesa" TEXT NOT NULL,
    "id_viagem" TEXT,
    "nr_sequencia" INTEGER,

    CONSTRAINT "tms_fechamentos_titulos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tms_fechamentos_id_tms_empresa_idx" ON "tms_fechamentos"("id_tms_empresa");

-- CreateIndex
CREATE INDEX "tms_fechamentos_competencia_idx" ON "tms_fechamentos"("competencia");

-- CreateIndex
CREATE INDEX "tms_fechamentos_ds_status_idx" ON "tms_fechamentos"("ds_status");

-- CreateIndex
CREATE UNIQUE INDEX "tms_fechamentos_id_tms_empresa_id_tms_motoristas_competenci_key" ON "tms_fechamentos"("id_tms_empresa", "id_tms_motoristas", "competencia");

-- CreateIndex
CREATE INDEX "tms_fechamento_viagens_id_fechamento_idx" ON "tms_fechamento_viagens"("id_fechamento");

-- CreateIndex
CREATE INDEX "tms_fechamento_viagens_id_viagem_idx" ON "tms_fechamento_viagens"("id_viagem");

-- CreateIndex
CREATE UNIQUE INDEX "tms_fechamento_viagens_id_fechamento_id_viagem_key" ON "tms_fechamento_viagens"("id_fechamento", "id_viagem");

-- CreateIndex
CREATE INDEX "tms_fechamentos_titulos_id_fechamento_idx" ON "tms_fechamentos_titulos"("id_fechamento");

-- CreateIndex
CREATE UNIQUE INDEX "tms_fechamentos_titulos_id_fechamento_id_tms_viagem_despesa_key" ON "tms_fechamentos_titulos"("id_fechamento", "id_tms_viagem_despesa");

-- AddForeignKey
ALTER TABLE "tms_fechamentos" ADD CONSTRAINT "tms_fechamentos_id_tms_empresa_fkey" FOREIGN KEY ("id_tms_empresa") REFERENCES "tms_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_fechamentos" ADD CONSTRAINT "tms_fechamentos_id_tms_motoristas_fkey" FOREIGN KEY ("id_tms_motoristas") REFERENCES "tms_motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_fechamentos" ADD CONSTRAINT "tms_fechamentos_id_sis_profile_aprovador_fkey" FOREIGN KEY ("id_sis_profile_aprovador") REFERENCES "sis_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_fechamento_viagens" ADD CONSTRAINT "tms_fechamento_viagens_id_fechamento_fkey" FOREIGN KEY ("id_fechamento") REFERENCES "tms_fechamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_fechamento_viagens" ADD CONSTRAINT "tms_fechamento_viagens_id_viagem_fkey" FOREIGN KEY ("id_viagem") REFERENCES "tms_viagens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_fechamentos_titulos" ADD CONSTRAINT "tms_fechamentos_titulos_id_fechamento_fkey" FOREIGN KEY ("id_fechamento") REFERENCES "tms_fechamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_fechamentos_titulos" ADD CONSTRAINT "tms_fechamentos_titulos_id_tms_viagem_despesa_fkey" FOREIGN KEY ("id_tms_viagem_despesa") REFERENCES "tms_viagem_despesas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_fechamentos_titulos" ADD CONSTRAINT "tms_fechamentos_titulos_id_viagem_fkey" FOREIGN KEY ("id_viagem") REFERENCES "tms_viagens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
