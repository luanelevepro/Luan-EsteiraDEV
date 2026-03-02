-- CreateTable
CREATE TABLE "tms_segmentos" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cd_identificador" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "is_ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tms_segmentos_pkey" PRIMARY KEY ("id")
);
