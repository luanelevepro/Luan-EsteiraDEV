-- CreateTable
CREATE TABLE "fis_regras_entrada_nfe" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "ds_descricao" TEXT NOT NULL,
    "ds_origem_uf" TEXT NOT NULL,
    "ds_destino_uf" TEXT NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,
    "js_ncm_produto" JSONB,
    "id_segmento_destinatario" TEXT,
    "id_regime_destinatario" TEXT,
    "id_regime_emitente" TEXT,
    "id_cfop_entrada" TEXT,
    "id_cst_entrada" TEXT,
    "id_escritorio" TEXT NOT NULL,

    CONSTRAINT "fis_regras_entrada_nfe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_regras_entrada_nfe_cst_origem" (
    "id" TEXT NOT NULL,
    "id_fis_regras_entrada_nfe" TEXT NOT NULL,
    "id_sis_cst" TEXT NOT NULL,

    CONSTRAINT "fis_regras_entrada_nfe_cst_origem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_regras_entrada_nfe_cfop_origem" (
    "id" TEXT NOT NULL,
    "id_fis_regras_entrada_nfe" TEXT NOT NULL,
    "id_cfop" TEXT NOT NULL,

    CONSTRAINT "fis_regras_entrada_nfe_cfop_origem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_regras_entrada_nfe_tipos_produto" (
    "id" TEXT NOT NULL,
    "id_fis_regras_entrada_nfe" TEXT NOT NULL,
    "id_sis_tipos_produto" TEXT NOT NULL,

    CONSTRAINT "fis_regras_entrada_nfe_tipos_produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_regras_entrada_nfe_origem_trib" (
    "id" TEXT NOT NULL,
    "id_fis_regras_entrada_nfe" TEXT NOT NULL,
    "id_sis_origem_cst" TEXT NOT NULL,

    CONSTRAINT "fis_regras_entrada_nfe_origem_trib_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fis_regras_entrada_nfe_cst_origem_id_fis_regras_entrada_nfe_key" ON "fis_regras_entrada_nfe_cst_origem"("id_fis_regras_entrada_nfe", "id_sis_cst");

-- CreateIndex
CREATE UNIQUE INDEX "fis_regras_entrada_nfe_cfop_origem_id_fis_regras_entrada_nf_key" ON "fis_regras_entrada_nfe_cfop_origem"("id_fis_regras_entrada_nfe", "id_cfop");

-- CreateIndex
CREATE UNIQUE INDEX "fis_regras_entrada_nfe_tipos_produto_id_fis_regras_entrada__key" ON "fis_regras_entrada_nfe_tipos_produto"("id_fis_regras_entrada_nfe", "id_sis_tipos_produto");

-- CreateIndex
CREATE UNIQUE INDEX "fis_regras_entrada_nfe_origem_trib_id_fis_regras_entrada_nf_key" ON "fis_regras_entrada_nfe_origem_trib"("id_fis_regras_entrada_nfe", "id_sis_origem_cst");

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe" ADD CONSTRAINT "fis_regras_entrada_nfe_id_segmento_destinatario_fkey" FOREIGN KEY ("id_segmento_destinatario") REFERENCES "fis_segmentos_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe" ADD CONSTRAINT "fis_regras_entrada_nfe_id_regime_destinatario_fkey" FOREIGN KEY ("id_regime_destinatario") REFERENCES "sis_regimes_tributarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe" ADD CONSTRAINT "fis_regras_entrada_nfe_id_regime_emitente_fkey" FOREIGN KEY ("id_regime_emitente") REFERENCES "sis_regimes_tributarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe" ADD CONSTRAINT "fis_regras_entrada_nfe_id_cfop_entrada_fkey" FOREIGN KEY ("id_cfop_entrada") REFERENCES "sis_cfop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe" ADD CONSTRAINT "fis_regras_entrada_nfe_id_cst_entrada_fkey" FOREIGN KEY ("id_cst_entrada") REFERENCES "sis_cst"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe" ADD CONSTRAINT "fis_regras_entrada_nfe_id_escritorio_fkey" FOREIGN KEY ("id_escritorio") REFERENCES "fis_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe_cst_origem" ADD CONSTRAINT "fis_regras_entrada_nfe_cst_origem_id_fis_regras_entrada_nf_fkey" FOREIGN KEY ("id_fis_regras_entrada_nfe") REFERENCES "fis_regras_entrada_nfe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe_cst_origem" ADD CONSTRAINT "fis_regras_entrada_nfe_cst_origem_id_sis_cst_fkey" FOREIGN KEY ("id_sis_cst") REFERENCES "sis_cst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe_cfop_origem" ADD CONSTRAINT "fis_regras_entrada_nfe_cfop_origem_id_fis_regras_entrada_n_fkey" FOREIGN KEY ("id_fis_regras_entrada_nfe") REFERENCES "fis_regras_entrada_nfe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe_cfop_origem" ADD CONSTRAINT "fis_regras_entrada_nfe_cfop_origem_id_cfop_fkey" FOREIGN KEY ("id_cfop") REFERENCES "sis_cfop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe_tipos_produto" ADD CONSTRAINT "fis_regras_entrada_nfe_tipos_produto_id_fis_regras_entrada_fkey" FOREIGN KEY ("id_fis_regras_entrada_nfe") REFERENCES "fis_regras_entrada_nfe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe_tipos_produto" ADD CONSTRAINT "fis_regras_entrada_nfe_tipos_produto_id_sis_tipos_produto_fkey" FOREIGN KEY ("id_sis_tipos_produto") REFERENCES "sis_tipos_produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe_origem_trib" ADD CONSTRAINT "fis_regras_entrada_nfe_origem_trib_id_fis_regras_entrada_n_fkey" FOREIGN KEY ("id_fis_regras_entrada_nfe") REFERENCES "fis_regras_entrada_nfe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_regras_entrada_nfe_origem_trib" ADD CONSTRAINT "fis_regras_entrada_nfe_origem_trib_id_sis_origem_cst_fkey" FOREIGN KEY ("id_sis_origem_cst") REFERENCES "sis_origem_cst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
