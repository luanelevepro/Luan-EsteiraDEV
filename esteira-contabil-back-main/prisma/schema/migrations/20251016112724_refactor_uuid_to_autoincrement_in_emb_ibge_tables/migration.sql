/*
  Warnings:

  - The `id_ori_uf` column on the `emb_carga` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_ori_cidade` column on the `emb_carga` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_ibge_cidades` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_ibge_cidades` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_ibge_uf` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_ibge_uf` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `id_dest_uf` on the `emb_carga` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_dest_cidade` on the `emb_carga` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_ibge_cidade` on the `emb_estabelecimentos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_ibge_uf` on the `emb_frota` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_ibge_cidade` on the `emb_frota` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_uf` on the `emb_ibge_cidades` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_ibge_cidade` on the `emb_transportadoras` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_ibge_uf` on the `emb_transportadoras` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_id_dest_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_id_dest_uf_fkey";

-- DropForeignKey
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_id_ori_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_id_ori_uf_fkey";

-- DropForeignKey
ALTER TABLE "emb_estabelecimentos" DROP CONSTRAINT "emb_estabelecimentos_id_emb_ibge_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_ibge_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_ibge_uf_fkey";

-- DropForeignKey
ALTER TABLE "emb_ibge_cidades" DROP CONSTRAINT "emb_ibge_cidades_id_emb_uf_fkey";

-- DropForeignKey
ALTER TABLE "emb_transportadoras" DROP CONSTRAINT "emb_transportadoras_id_emb_ibge_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_transportadoras" DROP CONSTRAINT "emb_transportadoras_id_emb_ibge_uf_fkey";

-- AlterTable
ALTER TABLE "emb_carga" DROP COLUMN "id_ori_uf",
ADD COLUMN     "id_ori_uf" INTEGER,
DROP COLUMN "id_ori_cidade",
ADD COLUMN     "id_ori_cidade" INTEGER,
DROP COLUMN "id_dest_uf",
ADD COLUMN     "id_dest_uf" INTEGER NOT NULL,
DROP COLUMN "id_dest_cidade",
ADD COLUMN     "id_dest_cidade" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "emb_estabelecimentos" DROP COLUMN "id_emb_ibge_cidade",
ADD COLUMN     "id_emb_ibge_cidade" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "emb_frota" DROP COLUMN "id_emb_ibge_uf",
ADD COLUMN     "id_emb_ibge_uf" INTEGER NOT NULL,
DROP COLUMN "id_emb_ibge_cidade",
ADD COLUMN     "id_emb_ibge_cidade" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "emb_ibge_cidades" DROP CONSTRAINT "emb_ibge_cidades_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_uf",
ADD COLUMN     "id_emb_uf" INTEGER NOT NULL,
ADD CONSTRAINT "emb_ibge_cidades_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_ibge_uf" DROP CONSTRAINT "emb_ibge_uf_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_ibge_uf_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_transportadoras" DROP COLUMN "id_emb_ibge_cidade",
ADD COLUMN     "id_emb_ibge_cidade" INTEGER NOT NULL,
DROP COLUMN "id_emb_ibge_uf",
ADD COLUMN     "id_emb_ibge_uf" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "emb_ibge_cidades" ADD CONSTRAINT "emb_ibge_cidades_id_emb_uf_fkey" FOREIGN KEY ("id_emb_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_estabelecimentos" ADD CONSTRAINT "emb_estabelecimentos_id_emb_ibge_cidade_fkey" FOREIGN KEY ("id_emb_ibge_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_transportadoras" ADD CONSTRAINT "emb_transportadoras_id_emb_ibge_uf_fkey" FOREIGN KEY ("id_emb_ibge_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_transportadoras" ADD CONSTRAINT "emb_transportadoras_id_emb_ibge_cidade_fkey" FOREIGN KEY ("id_emb_ibge_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_dest_cidade_fkey" FOREIGN KEY ("id_dest_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_ori_cidade_fkey" FOREIGN KEY ("id_ori_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_dest_uf_fkey" FOREIGN KEY ("id_dest_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_ori_uf_fkey" FOREIGN KEY ("id_ori_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_ibge_uf_fkey" FOREIGN KEY ("id_emb_ibge_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_ibge_cidade_fkey" FOREIGN KEY ("id_emb_ibge_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
