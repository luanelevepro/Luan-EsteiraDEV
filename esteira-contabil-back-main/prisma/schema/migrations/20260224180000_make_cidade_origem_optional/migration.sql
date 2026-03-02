-- AlterTable: cidade origem opcional na importação; usuário preenche antes de iniciar trajeto se vazio
ALTER TABLE "tms_cargas" ALTER COLUMN "id_cidade_origem" DROP NOT NULL;
