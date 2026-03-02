-- CreateTable
CREATE TABLE "viagens" (
    "id" TEXT NOT NULL,
    "id_viagem" TEXT NOT NULL,
    "id_motorista" TEXT NOT NULL,
    "dt_start_point" TEXT,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "carga" BOOLEAN NOT NULL DEFAULT false,
    "rota" TEXT[],

    CONSTRAINT "viagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viagens_nfe" (
    "id" TEXT NOT NULL,
    "id_nfe" TEXT NOT NULL,
    "id_viagem" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viagens_nfe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viagens_cte" (
    "id" TEXT NOT NULL,
    "id_cte" TEXT NOT NULL,
    "id_viagem" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viagens_cte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "viagens_id_viagem_key" ON "viagens"("id_viagem");

-- CreateIndex
CREATE UNIQUE INDEX "viagens_nfe_id_viagem_id_nfe_key" ON "viagens_nfe"("id_viagem", "id_nfe");

-- CreateIndex
CREATE UNIQUE INDEX "viagens_cte_id_viagem_id_cte_key" ON "viagens_cte"("id_viagem", "id_cte");

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_id_motorista_fkey" FOREIGN KEY ("id_motorista") REFERENCES "tms_motoristas_veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens_nfe" ADD CONSTRAINT "viagens_nfe_id_viagem_fkey" FOREIGN KEY ("id_viagem") REFERENCES "viagens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens_nfe" ADD CONSTRAINT "viagens_nfe_id_nfe_fkey" FOREIGN KEY ("id_nfe") REFERENCES "fis_nfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens_cte" ADD CONSTRAINT "viagens_cte_id_viagem_fkey" FOREIGN KEY ("id_viagem") REFERENCES "viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens_cte" ADD CONSTRAINT "viagens_cte_id_cte_fkey" FOREIGN KEY ("id_cte") REFERENCES "fis_cte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
