/*
  Warnings:

  - Changed the type of `cd_uf` on the `emb_transportadoras` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "emb_transportadoras" DROP COLUMN "cd_uf",
ADD COLUMN     "cd_uf" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "emb_transportadoras_historico" ADD COLUMN     "sis_regimes_tributariosId" TEXT;

-- CreateTable
CREATE TABLE "emb_ibge_uf" (
    "cd_uf" INTEGER NOT NULL,

    CONSTRAINT "emb_ibge_uf_pkey" PRIMARY KEY ("cd_uf")
);

-- CreateTable
CREATE TABLE "emb_ibge_cidades" (
    "cd_cidade" INTEGER NOT NULL,
    "cd_uf" INTEGER NOT NULL,

    CONSTRAINT "emb_ibge_cidades_pkey" PRIMARY KEY ("cd_cidade")
);

-- AddForeignKey
ALTER TABLE "emb_ibge_uf" ADD CONSTRAINT "emb_ibge_uf_cd_uf_fkey" FOREIGN KEY ("cd_uf") REFERENCES "sis_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_ibge_cidades" ADD CONSTRAINT "emb_ibge_cidades_cd_cidade_fkey" FOREIGN KEY ("cd_cidade") REFERENCES "sis_igbe_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_ibge_cidades" ADD CONSTRAINT "emb_ibge_cidades_cd_uf_fkey" FOREIGN KEY ("cd_uf") REFERENCES "emb_ibge_uf"("cd_uf") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_estabelecimentos" ADD CONSTRAINT "emb_estabelecimentos_id_cidade_fkey" FOREIGN KEY ("id_cidade") REFERENCES "emb_ibge_cidades"("cd_cidade") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_transportadoras" ADD CONSTRAINT "emb_transportadoras_cd_uf_fkey" FOREIGN KEY ("cd_uf") REFERENCES "emb_ibge_uf"("cd_uf") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_transportadoras" ADD CONSTRAINT "emb_transportadoras_cd_cidade_fkey" FOREIGN KEY ("cd_cidade") REFERENCES "emb_ibge_cidades"("cd_cidade") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_transportadoras_historico" ADD CONSTRAINT "emb_transportadoras_historico_sis_regimes_tributariosId_fkey" FOREIGN KEY ("sis_regimes_tributariosId") REFERENCES "sis_regimes_tributarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
