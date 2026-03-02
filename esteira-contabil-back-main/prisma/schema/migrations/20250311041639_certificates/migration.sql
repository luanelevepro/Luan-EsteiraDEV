-- CreateTable
CREATE TABLE "sis_certificados" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_nome" TEXT NOT NULL,
    "ds_arquivo" TEXT NOT NULL,
    "ds_senha" TEXT NOT NULL,
    "dt_expiracao" TIMESTAMP(3) NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "ds_pfx" TEXT NOT NULL,
    "id_empresa" TEXT,

    CONSTRAINT "sis_certificados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sis_certificados_id_empresa_key" ON "sis_certificados"("id_empresa");

-- AddForeignKey
ALTER TABLE "sis_certificados" ADD CONSTRAINT "sis_certificados_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "sis_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
