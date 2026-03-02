-- Remover duplicatas de id_viagem: manter uma linha por id_viagem (a de menor id)
DELETE FROM "tms_fechamento_viagens" a
USING "tms_fechamento_viagens" b
WHERE a.id_viagem = b.id_viagem AND a.id > b.id;

-- Criar índice único para garantir 1 viagem = 1 fechamento
CREATE UNIQUE INDEX "tms_fechamento_viagens_id_viagem_key" ON "tms_fechamento_viagens"("id_viagem");
