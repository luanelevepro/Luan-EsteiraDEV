/*
  Warnings:

  - You are about to drop the column `fl_ativo` on the `rh_cargo_nivel_competencia` table. All the data in the column will be lost.
  - You are about to drop the column `fl_ativo` on the `rh_cargos` table. All the data in the column will be lost.
  - You are about to drop the column `fl_gerencia_supervisao` on the `rh_cargos` table. All the data in the column will be lost.
  - The `ds_tipo` column on the `rh_centro_custos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `fl_ativo` on the `rh_competencias` table. All the data in the column will be lost.
  - You are about to drop the column `fl_ativo` on the `rh_niveis` table. All the data in the column will be lost.
  - You are about to drop the column `fl_ativo` on the `rh_senioridade` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoCentroCustos" AS ENUM ('SINTÉTICO', 'ANALÍTICO');

-- CreateEnum
CREATE TYPE "CadastroTipo" AS ENUM ('REGIME_TRIBUTARIO', 'SEGMENTO_EMPRESA', 'PRODUTO_SEGMENTO', 'TIPO_PRODUTO', 'ORIGEM_CST', 'CST', 'CFOP');

-- AlterTable
ALTER TABLE "rh_avaliacao_competencia" ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "ds_nota" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "rh_avaliacao_funcionario" ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "rh_cargo_nivel_competencia" DROP COLUMN "fl_ativo",
ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_ativo" BOOLEAN;

-- AlterTable
ALTER TABLE "rh_cargo_nivel_senioridade" ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "ds_salario_min" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "ds_salario_max" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "rh_cargos" DROP COLUMN "fl_ativo",
DROP COLUMN "fl_gerencia_supervisao",
ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_ativo" BOOLEAN,
ADD COLUMN     "is_gerencia_supervisao" BOOLEAN;

-- AlterTable
ALTER TABLE "rh_centro_custos" ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "ds_tipo",
ADD COLUMN     "ds_tipo" "TipoCentroCustos";

-- AlterTable
ALTER TABLE "rh_competencias" DROP COLUMN "fl_ativo",
ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_ativo" BOOLEAN DEFAULT true;

-- AlterTable
ALTER TABLE "rh_departamento" ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "rh_funcionarios" ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "ds_horas_dia" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "ds_horas_semana" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "ds_horas_mes" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "rh_niveis" DROP COLUMN "fl_ativo",
ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_ativo" BOOLEAN;

-- AlterTable
ALTER TABLE "rh_senioridade" DROP COLUMN "fl_ativo",
ADD COLUMN     "dt_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_ativo" BOOLEAN;
