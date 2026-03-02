/*
  Warnings:

  - You are about to drop the `sis_uf` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sis_uf_historico` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sis_uf_historico" DROP CONSTRAINT "sis_uf_historico_cd_uf_fkey";

-- DropTable
DROP TABLE "sis_uf";

-- DropTable
DROP TABLE "sis_uf_historico";

-- CreateTable
CREATE TABLE "sis_ibge_uf" (
    "id" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_state" VARCHAR(255) NOT NULL,
    "ds_uf" TEXT NOT NULL,

    CONSTRAINT "sis_ibge_uf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_igbe_city" (
    "id" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ds_city" TEXT NOT NULL,
    "id_ibge_uf" INTEGER NOT NULL,

    CONSTRAINT "sis_igbe_city_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sis_igbe_city" ADD CONSTRAINT "sis_igbe_city_id_ibge_uf_fkey" FOREIGN KEY ("id_ibge_uf") REFERENCES "sis_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
