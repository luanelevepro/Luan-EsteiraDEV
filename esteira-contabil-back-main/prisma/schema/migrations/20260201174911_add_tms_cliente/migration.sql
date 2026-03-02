-- CreateTable
CREATE TABLE "tms_clientes" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome" TEXT NOT NULL,
    "id_empresa" TEXT NOT NULL,
    "id_cidade" INTEGER NOT NULL,

    CONSTRAINT "tms_clientes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tms_clientes" ADD CONSTRAINT "tms_clientes_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "tms_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tms_clientes" ADD CONSTRAINT "tms_clientes_id_cidade_fkey" FOREIGN KEY ("id_cidade") REFERENCES "sis_igbe_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
