/*
  Warnings:

  - A unique constraint covering the columns `[id_adm_empresas,id_integracao,dt_competencia]` on the table `adm_consumo_integracao` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "adm_consumo_integracao_id_adm_empresas_id_integracao_dt_com_key" ON "adm_consumo_integracao"("id_adm_empresas", "id_integracao", "dt_competencia");
