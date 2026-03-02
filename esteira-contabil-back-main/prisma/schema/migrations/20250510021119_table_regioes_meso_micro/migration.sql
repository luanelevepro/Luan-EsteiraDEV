-- AlterTable
ALTER TABLE "sis_ibge_uf" ADD COLUMN     "id_microregion" INTEGER;

-- CreateTable
CREATE TABLE "sis_regions" (
    "id" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_region" VARCHAR(255) NOT NULL,
    "ds_region_clean" VARCHAR(255),

    CONSTRAINT "sis_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_mesoregions" (
    "id" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_mesoregion" VARCHAR(255) NOT NULL,
    "ds_mesoregion_clean" VARCHAR(255),
    "id_region" INTEGER NOT NULL,

    CONSTRAINT "sis_mesoregions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_microregions" (
    "id" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_microregion" VARCHAR(255) NOT NULL,
    "ds_microregion_clean" VARCHAR(255),
    "id_mesoregion" INTEGER NOT NULL,

    CONSTRAINT "sis_microregions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sis_mesoregions" ADD CONSTRAINT "sis_mesoregions_id_region_fkey" FOREIGN KEY ("id_region") REFERENCES "sis_regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_microregions" ADD CONSTRAINT "sis_microregions_id_mesoregion_fkey" FOREIGN KEY ("id_mesoregion") REFERENCES "sis_mesoregions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_ibge_uf" ADD CONSTRAINT "sis_ibge_uf_id_microregion_fkey" FOREIGN KEY ("id_microregion") REFERENCES "sis_microregions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
