-- CreateEnum
CREATE TYPE "StatusApi" AS ENUM ('ABERTO', 'ERRO', 'ENVIO', 'COLETA', 'CONCLUIDO');

-- AlterTable
ALTER TABLE "fis_empresas_tecnospeed" ADD COLUMN     "ds_status_consulta" "StatusApi" DEFAULT 'ABERTO';
