-- CreateEnum
CREATE TYPE "StatusAlteracaoSubcontratacao" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'REVERTIDO');

-- CreateTable
CREATE TABLE "fis_cte_subcontratacao_alter" (
    "id" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,
    "id_fis_cte" TEXT NOT NULL,
    "ds_documento_subcontratada_original" TEXT,
    "ds_razao_social_subcontratada_original" TEXT,
    "id_fis_empresa_subcontratada_original" TEXT,
    "ds_documento_subcontratada_alterada" TEXT,
    "ds_razao_social_subcontratada_alterada" TEXT,
    "id_fis_empresa_subcontratada_alterada" TEXT,
    "ds_status_alteracao" "StatusAlteracaoSubcontratacao" NOT NULL DEFAULT 'PENDENTE',
    "id_usuario_solicitante" TEXT,
    "id_usuario_aprovador" TEXT,
    "ds_motivo" TEXT,
    "ds_observacao_aprovador" TEXT,

    CONSTRAINT "fis_cte_subcontratacao_alter_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fis_cte_subcontratacao_alter" ADD CONSTRAINT "fis_cte_subcontratacao_alter_id_fis_cte_fkey" FOREIGN KEY ("id_fis_cte") REFERENCES "fis_cte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_cte_subcontratacao_alter" ADD CONSTRAINT "fis_cte_subcontratacao_alter_id_usuario_solicitante_fkey" FOREIGN KEY ("id_usuario_solicitante") REFERENCES "sis_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_cte_subcontratacao_alter" ADD CONSTRAINT "fis_cte_subcontratacao_alter_id_usuario_aprovador_fkey" FOREIGN KEY ("id_usuario_aprovador") REFERENCES "sis_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
