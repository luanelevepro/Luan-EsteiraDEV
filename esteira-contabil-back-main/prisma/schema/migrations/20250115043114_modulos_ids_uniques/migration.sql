/*
  Warnings:

  - A unique constraint covering the columns `[id_profiles]` on the table `sis_access` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_empresas]` on the table `sis_access` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "sis_access_id_profiles_key" ON "sis_access"("id_profiles");

-- CreateIndex
CREATE UNIQUE INDEX "sis_access_id_empresas_key" ON "sis_access"("id_empresas");
