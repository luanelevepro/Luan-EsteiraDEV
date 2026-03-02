-- CreateEnum
CREATE TYPE "CadastroTipo" AS ENUM ('REGIME_TRIBUTARIO', 'SEGMENTO_EMPRESA', 'PRODUTO_SEGMENTO', 'TIPO_PRODUTO', 'ORIGEM_CST', 'CST', 'CFOP');

-- CreateTable
CREATE TABLE "fis_cadastros" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "CadastroTipo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "codigo" TEXT,

    CONSTRAINT "fis_cadastros_pkey" PRIMARY KEY ("id")
);
