-- CreateTable
CREATE TABLE "rh_cargo_nivel_senioridade_vigencia" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_fim" TIMESTAMP(3),
    "ds_salario_min" DECIMAL(10,2),
    "ds_salario_max" DECIMAL(10,2),
    "id_cargo_nivel_senioridade" TEXT,

    CONSTRAINT "rh_cargo_nivel_senioridade_vigencia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rh_cargo_nivel_senioridade_vigencia" ADD CONSTRAINT "rh_cargo_nivel_senioridade_vigencia_id_cargo_nivel_seniori_fkey" FOREIGN KEY ("id_cargo_nivel_senioridade") REFERENCES "rh_cargo_nivel_senioridade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
