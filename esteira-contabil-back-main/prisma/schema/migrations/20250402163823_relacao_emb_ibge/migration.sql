/*
  Warnings:

  - You are about to drop the column `id_cidade` on the `emb_estabelecimentos` table. All the data in the column will be lost.
  - The primary key for the `emb_ibge_cidades` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cd_cidade` on the `emb_ibge_cidades` table. All the data in the column will be lost.
  - You are about to drop the column `cd_uf` on the `emb_ibge_cidades` table. All the data in the column will be lost.
  - The primary key for the `emb_ibge_uf` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cd_uf` on the `emb_ibge_uf` table. All the data in the column will be lost.
  - You are about to drop the column `cd_cidade` on the `emb_transportadoras` table. All the data in the column will be lost.
  - You are about to drop the column `cd_uf` on the `emb_transportadoras` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id_sis_cidade]` on the table `emb_ibge_cidades` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_sis_ibge_uf]` on the table `emb_ibge_uf` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_emb_ibge_cidade` to the `emb_estabelecimentos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_emb_uf` to the `emb_ibge_cidades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_sis_cidade` to the `emb_ibge_cidades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_sis_ibge_uf` to the `emb_ibge_uf` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_emb_ibge_cidade` to the `emb_transportadoras` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_emb_ibge_uf` to the `emb_transportadoras` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "emb_estabelecimentos" DROP CONSTRAINT "emb_estabelecimentos_id_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_ibge_cidades" DROP CONSTRAINT "emb_ibge_cidades_cd_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_ibge_cidades" DROP CONSTRAINT "emb_ibge_cidades_cd_uf_fkey";

-- DropForeignKey
ALTER TABLE "emb_ibge_uf" DROP CONSTRAINT "emb_ibge_uf_cd_uf_fkey";

-- DropForeignKey
ALTER TABLE "emb_transportadoras" DROP CONSTRAINT "emb_transportadoras_cd_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_transportadoras" DROP CONSTRAINT "emb_transportadoras_cd_uf_fkey";

-- AlterTable
ALTER TABLE "emb_estabelecimentos" DROP COLUMN "id_cidade",
ADD COLUMN     "id_emb_ibge_cidade" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "emb_ibge_cidades" DROP CONSTRAINT "emb_ibge_cidades_pkey",
DROP COLUMN "cd_cidade",
DROP COLUMN "cd_uf",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "id_emb_uf" INTEGER NOT NULL,
ADD COLUMN     "id_sis_cidade" INTEGER NOT NULL,
ADD CONSTRAINT "emb_ibge_cidades_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_ibge_uf" DROP CONSTRAINT "emb_ibge_uf_pkey",
DROP COLUMN "cd_uf",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "id_sis_ibge_uf" INTEGER NOT NULL,
ADD CONSTRAINT "emb_ibge_uf_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_transportadoras" DROP COLUMN "cd_cidade",
DROP COLUMN "cd_uf",
ADD COLUMN     "id_emb_ibge_cidade" INTEGER NOT NULL,
ADD COLUMN     "id_emb_ibge_uf" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "emb_ibge_cidades_id_sis_cidade_key" ON "emb_ibge_cidades"("id_sis_cidade");

-- CreateIndex
CREATE UNIQUE INDEX "emb_ibge_uf_id_sis_ibge_uf_key" ON "emb_ibge_uf"("id_sis_ibge_uf");

-- AddForeignKey
ALTER TABLE "emb_ibge_uf" ADD CONSTRAINT "emb_ibge_uf_id_sis_ibge_uf_fkey" FOREIGN KEY ("id_sis_ibge_uf") REFERENCES "sis_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_ibge_cidades" ADD CONSTRAINT "emb_ibge_cidades_id_sis_cidade_fkey" FOREIGN KEY ("id_sis_cidade") REFERENCES "sis_igbe_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_ibge_cidades" ADD CONSTRAINT "emb_ibge_cidades_id_emb_uf_fkey" FOREIGN KEY ("id_emb_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_estabelecimentos" ADD CONSTRAINT "emb_estabelecimentos_id_emb_ibge_cidade_fkey" FOREIGN KEY ("id_emb_ibge_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_transportadoras" ADD CONSTRAINT "emb_transportadoras_id_emb_ibge_uf_fkey" FOREIGN KEY ("id_emb_ibge_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_transportadoras" ADD CONSTRAINT "emb_transportadoras_id_emb_ibge_cidade_fkey" FOREIGN KEY ("id_emb_ibge_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
