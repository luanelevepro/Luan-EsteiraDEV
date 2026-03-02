/*
  Warnings:

  - A unique constraint covering the columns `[ds_combustivel,id_estado,dt_vigencia]` on the table `emb_combustivel_estado` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ds_combustivel,id_mesorregiao,dt_vigencia]` on the table `emb_combustivel_mesorregiao` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ds_combustivel,id_microregiao,dt_vigencia]` on the table `emb_combustivel_microregiao` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ds_combustivel,id_municipio,dt_vigencia]` on the table `emb_combustivel_municipio` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "emb_combustivel_estado_ds_combustivel_id_estado_dt_vigencia_key" ON "emb_combustivel_estado"("ds_combustivel", "id_estado", "dt_vigencia");

-- CreateIndex
CREATE UNIQUE INDEX "emb_combustivel_mesorregiao_ds_combustivel_id_mesorregiao_d_key" ON "emb_combustivel_mesorregiao"("ds_combustivel", "id_mesorregiao", "dt_vigencia");

-- CreateIndex
CREATE UNIQUE INDEX "emb_combustivel_microregiao_ds_combustivel_id_microregiao_d_key" ON "emb_combustivel_microregiao"("ds_combustivel", "id_microregiao", "dt_vigencia");

-- CreateIndex
CREATE UNIQUE INDEX "emb_combustivel_municipio_ds_combustivel_id_municipio_dt_vi_key" ON "emb_combustivel_municipio"("ds_combustivel", "id_municipio", "dt_vigencia");
