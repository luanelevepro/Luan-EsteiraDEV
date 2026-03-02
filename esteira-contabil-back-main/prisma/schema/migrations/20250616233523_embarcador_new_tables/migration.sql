/*
  Warnings:

  - The primary key for the `emb_taxa_juros_ano_modelo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cd_ano` on the `emb_taxa_juros_ano_modelo` table. All the data in the column will be lost.
  - You are about to drop the column `dt_created` on the `emb_taxa_juros_ano_modelo` table. All the data in the column will be lost.
  - You are about to drop the column `dt_updated` on the `emb_taxa_juros_ano_modelo` table. All the data in the column will be lost.
  - You are about to alter the column `vl_taxa_juros` on the `emb_taxa_juros_ano_modelo` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(6,2)`.
  - You are about to drop the column `id_emb_empresas` on the `sis_grupos_tributarios` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ds_classificacao]` on the table `emb_classificacao_implementos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_emb_empresas]` on the table `emb_classificacao_implementos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[vl_ano_modelo]` on the table `emb_taxa_juros_ano_modelo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dt_updated_at` to the `emb_taxa_juros_ano_modelo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vl_ano_modelo` to the `emb_taxa_juros_ano_modelo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EMB_INSUMO_UNIDADE_MEDIDA" AS ENUM ('LITROS', 'METROS', 'UNIDADE', 'QUILOS', 'TONELADAS', 'GRAMAS', 'MILILITROS', 'CENTIMETROS');

-- DropIndex
DROP INDEX "emb_classificacao_implementos_ds_classificacao_id_emb_empre_key";

-- DropIndex
DROP INDEX "emb_taxa_juros_ano_modelo_cd_ano_key";

-- AlterTable
ALTER TABLE "emb_taxa_juros_ano_modelo" DROP CONSTRAINT "emb_taxa_juros_ano_modelo_pkey",
DROP COLUMN "cd_ano",
DROP COLUMN "dt_created",
DROP COLUMN "dt_updated",
ADD COLUMN     "dt_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dt_updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "vl_ano_modelo" INTEGER NOT NULL,
ALTER COLUMN "vl_taxa_juros" SET DATA TYPE DECIMAL(6,2),
ADD CONSTRAINT "emb_taxa_juros_ano_modelo_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sis_grupos_tributarios" DROP COLUMN "id_emb_empresas";

-- CreateTable
CREATE TABLE "emb_carga" (
    "id" SERIAL NOT NULL,
    "cd_carga" TEXT NOT NULL,
    "dt_saida" TIMESTAMP(3) NOT NULL,
    "dt_entrega" TIMESTAMP(3),
    "id_emb_estabelecimento" TEXT,
    "ds_estabelecimento" TEXT,
    "id_emb_tipo_carga" INTEGER,
    "ds_tipo_carga" TEXT,
    "id_emb_frota" TEXT NOT NULL,
    "cd_placa_trac" TEXT,
    "ds_transportador_nome" TEXT,
    "id_ori_uf" INTEGER,
    "id_ori_cidade" INTEGER,
    "id_dest_uf" INTEGER NOT NULL,
    "id_dest_cidade" INTEGER NOT NULL,
    "vl_distancia_carga" DECIMAL(20,2) NOT NULL,
    "vl_dist_km_chao" DECIMAL(20,2),
    "vl_frete" DECIMAL(20,2) NOT NULL,
    "vl_frete_mun" DECIMAL(20,2),
    "vl_frete_est" DECIMAL(20,2),
    "vl_pedagio" DECIMAL(20,2),
    "id_status_carga" INTEGER,
    "fl_processado" INTEGER DEFAULT 0,
    "dt_competencia" TIMESTAMP(3),
    "vl_litros_combustivel" DECIMAL(8,2),
    "id_origem_combustivel" INTEGER,
    "id_emb_origem_combustivel" INTEGER,
    "vl_litro_combustivel" DECIMAL(8,2),
    "vl_km_litro" DECIMAL(8,2),
    "vl_dias_competencia_atual" INTEGER,
    "vl_dias_competencia_posterior" INTEGER,
    "dt_corte_inicial" TIMESTAMP(3),
    "dt_corte_final" TIMESTAMP(3),
    "vl_icms" DECIMAL(20,2),
    "vl_dsp_extras" DECIMAL(20,2),
    "dt_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated_at" TIMESTAMP(3) NOT NULL,
    "id_emb_transportadora" TEXT NOT NULL,
    "id_emb_estabelecimento_fat" TEXT NOT NULL,
    "id_emb_estabelecimento_destino" TEXT NOT NULL,
    "id_emb_empresa" TEXT NOT NULL,

    CONSTRAINT "emb_carga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_tipo_carga" (
    "id" SERIAL NOT NULL,
    "cd_tipo_carga" TEXT NOT NULL,
    "ds_tipo_carga" TEXT NOT NULL,
    "id_segmento" INTEGER,
    "fl_coleta" BOOLEAN NOT NULL DEFAULT false,
    "ds_un_medida_carga" TEXT,
    "dt_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated_at" TIMESTAMP(3) NOT NULL,
    "id_emb_empresa" TEXT NOT NULL,

    CONSTRAINT "emb_tipo_carga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_segmento_carga" (
    "id" SERIAL NOT NULL,
    "cd_segmento_carga" TEXT NOT NULL,
    "ds_segmento_carga" TEXT NOT NULL,
    "id_area_segmento" INTEGER,
    "id_verificador_extra" INTEGER,
    "ds_unidade" TEXT,
    "ds_faturamento" TEXT,
    "dt_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated_at" TIMESTAMP(3) NOT NULL,
    "id_grupo_tributario" TEXT NOT NULL,
    "id_emb_empresa" TEXT NOT NULL,

    CONSTRAINT "emb_segmento_carga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_area_segmento" (
    "id" SERIAL NOT NULL,
    "cd_area" INTEGER NOT NULL,
    "ds_area" TEXT NOT NULL,
    "dt_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated_at" TIMESTAMP(3) NOT NULL,
    "id_emb_empresa" TEXT NOT NULL,

    CONSTRAINT "emb_area_segmento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_carga_verificador_extra" (
    "id" SERIAL NOT NULL,
    "cd_codigo_verificador" INTEGER NOT NULL,
    "ds_descricao_verificador" VARCHAR(255) NOT NULL,
    "id_auxiliar_verificador_extra_carga" INTEGER,
    "dt_createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updatedAt" TIMESTAMP(3) NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,

    CONSTRAINT "emb_carga_verificador_extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_carga_auxiliar_verificador_extra" (
    "id" SERIAL NOT NULL,
    "ds_nome_tabela" VARCHAR(100) NOT NULL,
    "ds_nome_tabela_banco_dados" VARCHAR(100) NOT NULL,
    "ds_nome_campo" VARCHAR(100),
    "ds_nome_campo_banco_dados" VARCHAR(100),
    "ds_nome_campo_carga_relacao_tabela_banco_dados" VARCHAR(100),
    "ds_nome_tabela_origem_dados" VARCHAR(100),
    "ds_nome_campo_origem_descricao" VARCHAR(100),
    "fl_multiplos_relacionamentos" BOOLEAN,
    "dt_data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_carga_auxiliar_verificador_extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_unidade_medida_minima" (
    "id" SERIAL NOT NULL,
    "cd_codigo" TEXT NOT NULL,
    "ds_medida" TEXT NOT NULL,
    "id_emb_empresa" TEXT NOT NULL,

    CONSTRAINT "emb_unidade_medida_minima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_parametros_apuracao_carga" (
    "id" SERIAL NOT NULL,
    "id_emb_segmento_carga" INTEGER NOT NULL,
    "id_emb_estabelecimento" TEXT NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_emb_tipos_veiculo" INTEGER NOT NULL,
    "vl_minimo" INTEGER NOT NULL,
    "id_unidade_medida_minima" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_parametros_apuracao_carga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_custo_fixo_vigencia" (
    "id" BIGSERIAL NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,
    "vl_seguro" DECIMAL(10,2) NOT NULL,
    "vl_rastreador" DECIMAL(10,2) NOT NULL,
    "vl_administrativo" DECIMAL(10,2) NOT NULL,
    "vl_salario_motorista" DECIMAL(10,2) NOT NULL,
    "vl_encargos_motorista" DECIMAL(10,2) NOT NULL,
    "vl_parcelas" INTEGER NOT NULL,
    "vl_percentual_financiado" DECIMAL(5,2) NOT NULL,
    "vl_residual_semireboque" DECIMAL(10,2) NOT NULL,
    "vl_residual_tracionador" DECIMAL(10,2) NOT NULL,
    "vl_encargos_ajudante" DECIMAL(10,2) NOT NULL,
    "vl_salario_ajudante" DECIMAL(10,2) NOT NULL,
    "ds_idade_veicular" TEXT NOT NULL,
    "vl_quantidade_ajudantes" INTEGER NOT NULL,
    "vl_quantidade_motoristas" INTEGER NOT NULL,
    "id_emb_tipo_veiculo" INTEGER NOT NULL,
    "id_emb_estabelecimento" TEXT NOT NULL,
    "id_emb_segmento_carga" INTEGER NOT NULL,
    "id_emb_caracteristica_carroceria" INTEGER NOT NULL,
    "id_auxiliar_verificador_extra_carga" INTEGER,
    "id_emb_empresas" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emb_custo_fixo_vigencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_custo_variavel_vigencia" (
    "id" BIGSERIAL NOT NULL,
    "vl_quantidade_lavagem" INTEGER NOT NULL,
    "vl_preco_lavagem" DECIMAL(10,2) NOT NULL,
    "vl_diaria_motorista" DECIMAL(10,2) NOT NULL,
    "vl_quantidade_recapagem_pneu" INTEGER NOT NULL,
    "vl_preco_recapagem_pneu" DECIMAL(10,2) NOT NULL,
    "vl_km_total_pneu" DECIMAL(10,2) NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,
    "id_emb_estabelecimento" TEXT NOT NULL,
    "id_emb_segmento_carga" INTEGER NOT NULL,
    "ds_verificador_extra" TEXT,
    "id_auxiliar_verificador_extra_carga" INTEGER,
    "id_emb_tipo_veiculo" INTEGER NOT NULL,
    "id_emb_caracteristica_carroceria" INTEGER NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "js_custo_variavel" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emb_custo_variavel_vigencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_tabela_fipe" (
    "id" SERIAL NOT NULL,
    "ds_marca" TEXT NOT NULL,
    "ds_modelo" TEXT NOT NULL,
    "cd_fipe" VARCHAR(50) NOT NULL,
    "vl_ano_modelo" VARCHAR(4) NOT NULL,
    "vl_valor" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3),
    "id_emb_tipos_veiculo" INTEGER,

    CONSTRAINT "emb_tabela_fipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_fipe_historico" (
    "id" SERIAL NOT NULL,
    "id_emb_fipe" INTEGER NOT NULL,
    "ds_marca" TEXT NOT NULL,
    "ds_modelo" TEXT NOT NULL,
    "cd_fipe" VARCHAR(50) NOT NULL,
    "id_emb_tipos_veiculo" INTEGER,
    "cd_tipo_veiculo" INTEGER DEFAULT 0,
    "vl_mes" VARCHAR(50) NOT NULL,
    "vl_ano" VARCHAR(50) NOT NULL,
    "vl_ano_modelo" VARCHAR(50) NOT NULL,
    "vl_valor" DECIMAL(14,2),

    CONSTRAINT "emb_fipe_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_tipos_veiculo" (
    "id" SERIAL NOT NULL,
    "cd_veiculo" TEXT NOT NULL,
    "ds_veiculo" VARCHAR(35) NOT NULL,
    "vc_quantidade_pneus" INTEGER NOT NULL DEFAULT 4,
    "vl_quantidade_carrocerias" VARCHAR(1),
    "vl_quantidade_eixos_tracionadores" INTEGER NOT NULL DEFAULT 1,
    "js_composicao_eixo_tracionador" JSONB NOT NULL,
    "id_insumo_pneu" INTEGER,
    "id_emb_insumo_combustivel" INTEGER,
    "id_emb_empresas" TEXT NOT NULL,
    "id_emb_classificacao_veiculos" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_tipos_veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_tipos_carroceria" (
    "id" SERIAL NOT NULL,
    "cd_carroceria" TEXT NOT NULL,
    "ds_carroceria" TEXT NOT NULL,
    "vl_quantidade_eixos" INTEGER NOT NULL,
    "js_composicao_eixo" JSONB NOT NULL,
    "vc_quantidade_pneus" INTEGER NOT NULL,
    "id_emb_classificacao_carrocerias" INTEGER NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_tipos_carroceria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_caracteristicas_carroceria" (
    "id" SERIAL NOT NULL,
    "cd_caracteristica" VARCHAR(10) NOT NULL,
    "ds_caracteristica" VARCHAR(50) NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_caracteristicas_carroceria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_marcas_carroceria" (
    "id" SERIAL NOT NULL,
    "cd_marca" VARCHAR(10) NOT NULL,
    "ds_marca" VARCHAR(25) NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_marcas_carroceria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_tipos_porte_carroceria_semireboque" (
    "id" SERIAL NOT NULL,
    "cd_porte" VARCHAR(10) NOT NULL,
    "ds_porte" VARCHAR(50) NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_tipos_porte_carroceria_semireboque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_orcamentos_carroceria_semireboque" (
    "id" SERIAL NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "id_emb_tipo_veiculo" INTEGER NOT NULL,
    "id_emb_tipo_carroceria" INTEGER NOT NULL,
    "id_emb_caracteristica_carroceria" INTEGER NOT NULL,

    CONSTRAINT "emb_orcamentos_carroceria_semireboque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_combinacao_carroceria_orcamento" (
    "id" SERIAL NOT NULL,
    "id_emb_tipo_carroceria" INTEGER NOT NULL,
    "id_emb_tipo_veiculo" INTEGER NOT NULL,
    "js_implemento" JSONB,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_combinacao_carroceria_orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_combinacao_carroceria_historico" (
    "id" SERIAL NOT NULL,
    "id_emb_tipo_carroceria" INTEGER NOT NULL,
    "id_emb_tipo_veiculo" INTEGER NOT NULL,
    "js_implemento" JSONB,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_combinacao_carroceria_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_implementos" (
    "id" SERIAL NOT NULL,
    "cd_implemento" VARCHAR(10) NOT NULL,
    "ds_implemento" VARCHAR(50) NOT NULL,
    "id_classificacao_implemento" INTEGER NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "vl_quantidade_eixos_adicional" INTEGER,
    "vl_quantidade_pneus" INTEGER NOT NULL,
    "js_composicao_eixo" JSONB NOT NULL,
    "fl_ativo" BOOLEAN DEFAULT true,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_implementos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_implementos_historico" (
    "id" SERIAL NOT NULL,
    "vl_ano" INTEGER NOT NULL,
    "vl_soma" MONEY NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "id_emb_combinacao_orcamento" INTEGER NOT NULL,

    CONSTRAINT "emb_implementos_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_frota" (
    "id" SERIAL NOT NULL,
    "cd_frota" TEXT NOT NULL,
    "id_emb_ibge_uf" INTEGER NOT NULL,
    "id_emb_ibge_cidade" INTEGER NOT NULL,
    "vl_qtde_motoristas" INTEGER,
    "vl_qtde_ajudantes" INTEGER,
    "id_estabelecimento" TEXT NOT NULL,
    "cd_transportador" TEXT NOT NULL,
    "vc_quantidade_carrocerias" INTEGER NOT NULL DEFAULT 1,
    "fl_status" BOOLEAN DEFAULT false,
    "ds_situacao" TEXT,
    "vl_valor_frota" DOUBLE PRECISION,
    "vl_valor_implementos" DOUBLE PRECISION,
    "vl_valor_carrocerias" DOUBLE PRECISION,
    "vl_valor_fipe" DOUBLE PRECISION,
    "id_emb_empresas" TEXT NOT NULL,
    "js_trac_implemento" JSONB,
    "ds_placa_tracionador" TEXT NOT NULL,
    "id_emb_marcas_carroceria_tracionador" INTEGER NOT NULL,
    "ds_modelo_tracionador" TEXT NOT NULL,
    "vl_ano_modelo_tracionador" INTEGER NOT NULL,
    "cd_fipe_tracionador" TEXT,
    "dt_compra_tracionador" TIMESTAMP(3),
    "id_emb_tipos_veiculo_tracionador" INTEGER NOT NULL,
    "ds_placa_carroceria_semi" TEXT,
    "cd_fipe_carroceria_semi" TEXT,
    "id_emb_tipos_carroceria_semi" INTEGER,
    "id_emb_marcas_carroceria_semi" INTEGER,
    "id_emb_caracteristicas_carroceria_semi" INTEGER,
    "id_emb_portes_carroceria_semi" INTEGER,
    "js_implemento_carroceria_semi" JSONB,
    "ds_modelo_carroceria_semi" TEXT,
    "vl_ano_modelo_carroceria_semi" INTEGER,
    "ds_placa_carroceria_semi_2" TEXT,
    "cd_fipe_carroceria_semi_2" TEXT,
    "id_emb_tipos_carroceria_semi_2" INTEGER,
    "id_emb_marcas_carroceria_semi_2" INTEGER,
    "id_emb_caracteristicas_carroceria_semi_2" INTEGER,
    "id_emb_portes_carroceria_semi_2" INTEGER,
    "js_implementos_carroceria_semi_2" JSONB,
    "ds_modelo_carroceria_semi_2" TEXT,
    "vl_ano_modelo_carroceria_semi_2" INTEGER,
    "dt_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_frota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_frota_vigencia" (
    "id" SERIAL NOT NULL,
    "dt_vigencia" DATE NOT NULL,
    "vl_quantidade_motoristas" DECIMAL(8,3),
    "vl_quantidade_ajudantes" DECIMAL(8,3),
    "fl_status" TEXT,
    "id_emb_estabelecimento" TEXT NOT NULL,
    "cd_transportadora" TEXT NOT NULL,
    "id_emb_tipos_veiculo" INTEGER NOT NULL,
    "id_emb_frota" INTEGER NOT NULL,
    "dt_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_frota_vigencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_frota_reposicao" (
    "id" SERIAL NOT NULL,
    "id_emg_segmento_carga" INTEGER,
    "id_emb_tabela_fipe" INTEGER NOT NULL,
    "ds_modelo" TEXT NOT NULL,
    "ds_marca" TEXT NOT NULL,
    "vl_ano_modelo" TEXT NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "id_emb_tipo_veiculo" INTEGER NOT NULL,

    CONSTRAINT "emb_frota_reposicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_tipos_insumo" (
    "id" SERIAL NOT NULL,
    "ds_insumo" TEXT NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_tipos_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_insumos" (
    "id" SERIAL NOT NULL,
    "cd_insumo" TEXT NOT NULL,
    "ds_insumo" VARCHAR(50) NOT NULL,
    "ds_unidade_medida" "EMB_INSUMO_UNIDADE_MEDIDA" NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "id_tipo_insumo" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_vigencia_insumos_estabelecimento" (
    "id" SERIAL NOT NULL,
    "dt_vigencia" TIMESTAMP(3),
    "id_estabelecimento" INTEGER,
    "cd_segmento_id" TEXT,
    "cd_fornecedor_id" TEXT,
    "vl_valor" DECIMAL(10,2),
    "dt_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated_at" TIMESTAMP(3) NOT NULL,
    "id_emb_insumo" INTEGER NOT NULL,

    CONSTRAINT "emb_vigencia_insumos_estabelecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_fornecedores_insumos" (
    "id" SERIAL NOT NULL,
    "cd_fornecedor" TEXT NOT NULL,
    "ds_nome" TEXT NOT NULL,
    "id_emb_empresas" TEXT NOT NULL,
    "dt_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_fornecedores_insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_postos_coleta" (
    "id" SERIAL NOT NULL,
    "cd_posto" INTEGER NOT NULL,
    "ds_cnpj" VARCHAR(255) NOT NULL,
    "ds_razao_social" VARCHAR(255) NOT NULL,
    "ds_nome_fantasia" VARCHAR(255) NOT NULL,
    "ds_logradouro" VARCHAR(255) NOT NULL,
    "ds_bairro" VARCHAR(255) NOT NULL,
    "id_cidade" INTEGER NOT NULL,
    "dt_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dt_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_postos_coleta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_dados_coleta_postos" (
    "id" SERIAL NOT NULL,
    "id_posto" INTEGER,
    "dt_coleta" TIMESTAMP(3) NOT NULL,
    "vl_valor" DECIMAL(6,2) NOT NULL,
    "ds_combustivel" VARCHAR(255) NOT NULL,

    CONSTRAINT "emb_dados_coleta_postos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_combustivel_municipio" (
    "id" SERIAL NOT NULL,
    "ds_combustivel" VARCHAR(255) NOT NULL,
    "id_municipio" INTEGER NOT NULL,
    "vl_valor" DECIMAL(6,2) NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_combustivel_municipio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_combustivel_microregiao" (
    "id" SERIAL NOT NULL,
    "ds_combustivel" VARCHAR(255) NOT NULL,
    "id_microregiao" INTEGER NOT NULL,
    "vl_valor" DECIMAL(6,2) NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_combustivel_microregiao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_combustivel_mesorregiao" (
    "id" SERIAL NOT NULL,
    "ds_combustivel" VARCHAR(255) NOT NULL,
    "id_mesorregiao" INTEGER NOT NULL,
    "vl_valor" DECIMAL(6,2) NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_combustivel_mesorregiao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emb_combustivel_estado" (
    "id" SERIAL NOT NULL,
    "ds_combustivel" VARCHAR(255) NOT NULL,
    "id_estado" INTEGER NOT NULL,
    "vl_valor" DECIMAL(6,2) NOT NULL,
    "dt_vigencia" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emb_combustivel_estado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_emb_tipo_veiculo_insumos" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_emb_tipo_veiculo_insumos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "emb_carga_cd_carga_id_emb_empresa_key" ON "emb_carga"("cd_carga", "id_emb_empresa");

-- CreateIndex
CREATE UNIQUE INDEX "emb_area_segmento_cd_area_id_emb_empresa_key" ON "emb_area_segmento"("cd_area", "id_emb_empresa");

-- CreateIndex
CREATE UNIQUE INDEX "emb_carga_verificador_extra_cd_codigo_verificador_id_emb_em_key" ON "emb_carga_verificador_extra"("cd_codigo_verificador", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_unidade_medida_minima_cd_codigo_id_emb_empresa_key" ON "emb_unidade_medida_minima"("cd_codigo", "id_emb_empresa");

-- CreateIndex
CREATE UNIQUE INDEX "emb_parametros_apuracao_carga_id_emb_segmento_carga_id_emb__key" ON "emb_parametros_apuracao_carga"("id_emb_segmento_carga", "id_emb_estabelecimento", "id_emb_tipos_veiculo", "id_unidade_medida_minima");

-- CreateIndex
CREATE UNIQUE INDEX "emb_tabela_fipe_cd_fipe_key" ON "emb_tabela_fipe"("cd_fipe");

-- CreateIndex
CREATE UNIQUE INDEX "emb_tipos_veiculo_cd_veiculo_id_emb_empresas_key" ON "emb_tipos_veiculo"("cd_veiculo", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_tipos_carroceria_cd_carroceria_id_emb_empresas_key" ON "emb_tipos_carroceria"("cd_carroceria", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_caracteristicas_carroceria_cd_caracteristica_id_emb_emp_key" ON "emb_caracteristicas_carroceria"("cd_caracteristica", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_marcas_carroceria_cd_marca_id_emb_empresas_key" ON "emb_marcas_carroceria"("cd_marca", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_tipos_porte_carroceria_semireboque_cd_porte_id_emb_empr_key" ON "emb_tipos_porte_carroceria_semireboque"("cd_porte", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_orcamentos_carroceria_semireboque_id_emb_empresas_id_em_key" ON "emb_orcamentos_carroceria_semireboque"("id_emb_empresas", "id_emb_tipo_veiculo", "id_emb_tipo_carroceria", "id_emb_caracteristica_carroceria");

-- CreateIndex
CREATE UNIQUE INDEX "emb_implementos_cd_implemento_key" ON "emb_implementos"("cd_implemento");

-- CreateIndex
CREATE UNIQUE INDEX "emb_frota_cd_frota_id_emb_empresas_key" ON "emb_frota"("cd_frota", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_frota_vigencia_dt_vigencia_id_emb_frota_key" ON "emb_frota_vigencia"("dt_vigencia", "id_emb_frota");

-- CreateIndex
CREATE UNIQUE INDEX "emb_tipos_insumo_ds_insumo_id_emb_empresas_key" ON "emb_tipos_insumo"("ds_insumo", "id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_insumos_cd_insumo_id_emb_empresas_key" ON "emb_insumos"("cd_insumo", "id_emb_empresas");

-- CreateIndex
CREATE INDEX "_emb_tipo_veiculo_insumos_B_index" ON "_emb_tipo_veiculo_insumos"("B");

-- CreateIndex
CREATE UNIQUE INDEX "emb_classificacao_implementos_ds_classificacao_key" ON "emb_classificacao_implementos"("ds_classificacao");

-- CreateIndex
CREATE UNIQUE INDEX "emb_classificacao_implementos_id_emb_empresas_key" ON "emb_classificacao_implementos"("id_emb_empresas");

-- CreateIndex
CREATE UNIQUE INDEX "emb_taxa_juros_ano_modelo_vl_ano_modelo_key" ON "emb_taxa_juros_ano_modelo"("vl_ano_modelo");

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_emb_tipo_carga_fkey" FOREIGN KEY ("id_emb_tipo_carga") REFERENCES "emb_tipo_carga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_emb_transportadora_fkey" FOREIGN KEY ("id_emb_transportadora") REFERENCES "emb_transportadoras"("cd_transportadora") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_emb_estabelecimento_fat_fkey" FOREIGN KEY ("id_emb_estabelecimento_fat") REFERENCES "emb_estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_emb_estabelecimento_destino_fkey" FOREIGN KEY ("id_emb_estabelecimento_destino") REFERENCES "emb_estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_emb_empresa_fkey" FOREIGN KEY ("id_emb_empresa") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_dest_cidade_fkey" FOREIGN KEY ("id_dest_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_ori_cidade_fkey" FOREIGN KEY ("id_ori_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_dest_uf_fkey" FOREIGN KEY ("id_dest_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_ori_uf_fkey" FOREIGN KEY ("id_ori_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipo_carga" ADD CONSTRAINT "emb_tipo_carga_id_emb_empresa_fkey" FOREIGN KEY ("id_emb_empresa") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipo_carga" ADD CONSTRAINT "emb_tipo_carga_id_segmento_fkey" FOREIGN KEY ("id_segmento") REFERENCES "emb_segmento_carga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_segmento_carga" ADD CONSTRAINT "emb_segmento_carga_id_area_segmento_fkey" FOREIGN KEY ("id_area_segmento") REFERENCES "emb_area_segmento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_segmento_carga" ADD CONSTRAINT "emb_segmento_carga_id_grupo_tributario_fkey" FOREIGN KEY ("id_grupo_tributario") REFERENCES "sis_grupos_tributarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_segmento_carga" ADD CONSTRAINT "emb_segmento_carga_id_emb_empresa_fkey" FOREIGN KEY ("id_emb_empresa") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_area_segmento" ADD CONSTRAINT "emb_area_segmento_id_emb_empresa_fkey" FOREIGN KEY ("id_emb_empresa") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga_verificador_extra" ADD CONSTRAINT "emb_carga_verificador_extra_id_auxiliar_verificador_extra__fkey" FOREIGN KEY ("id_auxiliar_verificador_extra_carga") REFERENCES "emb_carga_auxiliar_verificador_extra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga_verificador_extra" ADD CONSTRAINT "emb_carga_verificador_extra_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_unidade_medida_minima" ADD CONSTRAINT "emb_unidade_medida_minima_id_emb_empresa_fkey" FOREIGN KEY ("id_emb_empresa") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_parametros_apuracao_carga" ADD CONSTRAINT "emb_parametros_apuracao_carga_id_emb_segmento_carga_fkey" FOREIGN KEY ("id_emb_segmento_carga") REFERENCES "emb_segmento_carga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_parametros_apuracao_carga" ADD CONSTRAINT "emb_parametros_apuracao_carga_id_emb_estabelecimento_fkey" FOREIGN KEY ("id_emb_estabelecimento") REFERENCES "emb_estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_parametros_apuracao_carga" ADD CONSTRAINT "emb_parametros_apuracao_carga_id_emb_tipos_veiculo_fkey" FOREIGN KEY ("id_emb_tipos_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_parametros_apuracao_carga" ADD CONSTRAINT "emb_parametros_apuracao_carga_id_unidade_medida_minima_fkey" FOREIGN KEY ("id_unidade_medida_minima") REFERENCES "emb_unidade_medida_minima"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" ADD CONSTRAINT "emb_custo_fixo_vigencia_id_emb_tipo_veiculo_fkey" FOREIGN KEY ("id_emb_tipo_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" ADD CONSTRAINT "emb_custo_fixo_vigencia_id_emb_estabelecimento_fkey" FOREIGN KEY ("id_emb_estabelecimento") REFERENCES "emb_estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" ADD CONSTRAINT "emb_custo_fixo_vigencia_id_emb_segmento_carga_fkey" FOREIGN KEY ("id_emb_segmento_carga") REFERENCES "emb_segmento_carga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" ADD CONSTRAINT "emb_custo_fixo_vigencia_id_emb_caracteristica_carroceria_fkey" FOREIGN KEY ("id_emb_caracteristica_carroceria") REFERENCES "emb_caracteristicas_carroceria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" ADD CONSTRAINT "emb_custo_fixo_vigencia_id_auxiliar_verificador_extra_carg_fkey" FOREIGN KEY ("id_auxiliar_verificador_extra_carga") REFERENCES "emb_carga_auxiliar_verificador_extra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" ADD CONSTRAINT "emb_custo_fixo_vigencia_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" ADD CONSTRAINT "emb_custo_variavel_vigencia_id_emb_estabelecimento_fkey" FOREIGN KEY ("id_emb_estabelecimento") REFERENCES "emb_estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" ADD CONSTRAINT "emb_custo_variavel_vigencia_id_emb_segmento_carga_fkey" FOREIGN KEY ("id_emb_segmento_carga") REFERENCES "emb_segmento_carga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" ADD CONSTRAINT "emb_custo_variavel_vigencia_id_auxiliar_verificador_extra__fkey" FOREIGN KEY ("id_auxiliar_verificador_extra_carga") REFERENCES "emb_carga_auxiliar_verificador_extra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" ADD CONSTRAINT "emb_custo_variavel_vigencia_id_emb_tipo_veiculo_fkey" FOREIGN KEY ("id_emb_tipo_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" ADD CONSTRAINT "emb_custo_variavel_vigencia_id_emb_caracteristica_carrocer_fkey" FOREIGN KEY ("id_emb_caracteristica_carroceria") REFERENCES "emb_caracteristicas_carroceria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" ADD CONSTRAINT "emb_custo_variavel_vigencia_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tabela_fipe" ADD CONSTRAINT "emb_tabela_fipe_id_emb_tipos_veiculo_fkey" FOREIGN KEY ("id_emb_tipos_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_fipe_historico" ADD CONSTRAINT "emb_fipe_historico_id_emb_fipe_fkey" FOREIGN KEY ("id_emb_fipe") REFERENCES "emb_tabela_fipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_fipe_historico" ADD CONSTRAINT "emb_fipe_historico_id_emb_tipos_veiculo_fkey" FOREIGN KEY ("id_emb_tipos_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_veiculo" ADD CONSTRAINT "emb_tipos_veiculo_id_insumo_pneu_fkey" FOREIGN KEY ("id_insumo_pneu") REFERENCES "emb_insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_veiculo" ADD CONSTRAINT "emb_tipos_veiculo_id_emb_insumo_combustivel_fkey" FOREIGN KEY ("id_emb_insumo_combustivel") REFERENCES "emb_insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_veiculo" ADD CONSTRAINT "emb_tipos_veiculo_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_veiculo" ADD CONSTRAINT "emb_tipos_veiculo_id_emb_classificacao_veiculos_fkey" FOREIGN KEY ("id_emb_classificacao_veiculos") REFERENCES "emb_classificacao_veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_carroceria" ADD CONSTRAINT "emb_tipos_carroceria_id_emb_classificacao_carrocerias_fkey" FOREIGN KEY ("id_emb_classificacao_carrocerias") REFERENCES "emb_classificacao_carrocerias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_carroceria" ADD CONSTRAINT "emb_tipos_carroceria_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_caracteristicas_carroceria" ADD CONSTRAINT "emb_caracteristicas_carroceria_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_marcas_carroceria" ADD CONSTRAINT "emb_marcas_carroceria_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_porte_carroceria_semireboque" ADD CONSTRAINT "emb_tipos_porte_carroceria_semireboque_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_orcamentos_carroceria_semireboque" ADD CONSTRAINT "emb_orcamentos_carroceria_semireboque_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_orcamentos_carroceria_semireboque" ADD CONSTRAINT "emb_orcamentos_carroceria_semireboque_id_emb_tipo_veiculo_fkey" FOREIGN KEY ("id_emb_tipo_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_orcamentos_carroceria_semireboque" ADD CONSTRAINT "emb_orcamentos_carroceria_semireboque_id_emb_tipo_carrocer_fkey" FOREIGN KEY ("id_emb_tipo_carroceria") REFERENCES "emb_tipos_carroceria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_orcamentos_carroceria_semireboque" ADD CONSTRAINT "emb_orcamentos_carroceria_semireboque_id_emb_caracteristic_fkey" FOREIGN KEY ("id_emb_caracteristica_carroceria") REFERENCES "emb_caracteristicas_carroceria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_combinacao_carroceria_orcamento" ADD CONSTRAINT "emb_combinacao_carroceria_orcamento_id_emb_tipo_carroceria_fkey" FOREIGN KEY ("id_emb_tipo_carroceria") REFERENCES "emb_tipos_carroceria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_combinacao_carroceria_orcamento" ADD CONSTRAINT "emb_combinacao_carroceria_orcamento_id_emb_tipo_veiculo_fkey" FOREIGN KEY ("id_emb_tipo_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_combinacao_carroceria_historico" ADD CONSTRAINT "emb_combinacao_carroceria_historico_id_emb_tipo_carroceria_fkey" FOREIGN KEY ("id_emb_tipo_carroceria") REFERENCES "emb_tipos_carroceria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_combinacao_carroceria_historico" ADD CONSTRAINT "emb_combinacao_carroceria_historico_id_emb_tipo_veiculo_fkey" FOREIGN KEY ("id_emb_tipo_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_implementos" ADD CONSTRAINT "emb_implementos_id_classificacao_implemento_fkey" FOREIGN KEY ("id_classificacao_implemento") REFERENCES "emb_classificacao_implementos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_implementos" ADD CONSTRAINT "emb_implementos_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_implementos_historico" ADD CONSTRAINT "emb_implementos_historico_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_implementos_historico" ADD CONSTRAINT "emb_implementos_historico_id_emb_combinacao_orcamento_fkey" FOREIGN KEY ("id_emb_combinacao_orcamento") REFERENCES "emb_combinacao_carroceria_orcamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_ibge_uf_fkey" FOREIGN KEY ("id_emb_ibge_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_ibge_cidade_fkey" FOREIGN KEY ("id_emb_ibge_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_estabelecimento_fkey" FOREIGN KEY ("id_estabelecimento") REFERENCES "emb_estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_cd_transportador_fkey" FOREIGN KEY ("cd_transportador") REFERENCES "emb_transportadoras"("cd_transportadora") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_marcas_carroceria_tracionador_fkey" FOREIGN KEY ("id_emb_marcas_carroceria_tracionador") REFERENCES "emb_marcas_carroceria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_cd_fipe_tracionador_fkey" FOREIGN KEY ("cd_fipe_tracionador") REFERENCES "emb_tabela_fipe"("cd_fipe") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_tipos_veiculo_tracionador_fkey" FOREIGN KEY ("id_emb_tipos_veiculo_tracionador") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_cd_fipe_carroceria_semi_fkey" FOREIGN KEY ("cd_fipe_carroceria_semi") REFERENCES "emb_tabela_fipe"("cd_fipe") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_tipos_carroceria_semi_fkey" FOREIGN KEY ("id_emb_tipos_carroceria_semi") REFERENCES "emb_tipos_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_marcas_carroceria_semi_fkey" FOREIGN KEY ("id_emb_marcas_carroceria_semi") REFERENCES "emb_marcas_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_caracteristicas_carroceria_semi_fkey" FOREIGN KEY ("id_emb_caracteristicas_carroceria_semi") REFERENCES "emb_caracteristicas_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_portes_carroceria_semi_fkey" FOREIGN KEY ("id_emb_portes_carroceria_semi") REFERENCES "emb_tipos_porte_carroceria_semireboque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_cd_fipe_carroceria_semi_2_fkey" FOREIGN KEY ("cd_fipe_carroceria_semi_2") REFERENCES "emb_tabela_fipe"("cd_fipe") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_tipos_carroceria_semi_2_fkey" FOREIGN KEY ("id_emb_tipos_carroceria_semi_2") REFERENCES "emb_tipos_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_marcas_carroceria_semi_2_fkey" FOREIGN KEY ("id_emb_marcas_carroceria_semi_2") REFERENCES "emb_marcas_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_caracteristicas_carroceria_semi_2_fkey" FOREIGN KEY ("id_emb_caracteristicas_carroceria_semi_2") REFERENCES "emb_caracteristicas_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_portes_carroceria_semi_2_fkey" FOREIGN KEY ("id_emb_portes_carroceria_semi_2") REFERENCES "emb_tipos_porte_carroceria_semireboque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_vigencia" ADD CONSTRAINT "emb_frota_vigencia_id_emb_estabelecimento_fkey" FOREIGN KEY ("id_emb_estabelecimento") REFERENCES "emb_estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_vigencia" ADD CONSTRAINT "emb_frota_vigencia_cd_transportadora_fkey" FOREIGN KEY ("cd_transportadora") REFERENCES "emb_transportadoras"("cd_transportadora") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_vigencia" ADD CONSTRAINT "emb_frota_vigencia_id_emb_tipos_veiculo_fkey" FOREIGN KEY ("id_emb_tipos_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_vigencia" ADD CONSTRAINT "emb_frota_vigencia_id_emb_frota_fkey" FOREIGN KEY ("id_emb_frota") REFERENCES "emb_frota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_reposicao" ADD CONSTRAINT "emb_frota_reposicao_id_emg_segmento_carga_fkey" FOREIGN KEY ("id_emg_segmento_carga") REFERENCES "emb_segmento_carga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_reposicao" ADD CONSTRAINT "emb_frota_reposicao_id_emb_tabela_fipe_fkey" FOREIGN KEY ("id_emb_tabela_fipe") REFERENCES "emb_tabela_fipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_reposicao" ADD CONSTRAINT "emb_frota_reposicao_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_reposicao" ADD CONSTRAINT "emb_frota_reposicao_id_emb_tipo_veiculo_fkey" FOREIGN KEY ("id_emb_tipo_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_insumo" ADD CONSTRAINT "emb_tipos_insumo_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_insumos" ADD CONSTRAINT "emb_insumos_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_insumos" ADD CONSTRAINT "emb_insumos_id_tipo_insumo_fkey" FOREIGN KEY ("id_tipo_insumo") REFERENCES "emb_tipos_insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_vigencia_insumos_estabelecimento" ADD CONSTRAINT "emb_vigencia_insumos_estabelecimento_id_emb_insumo_fkey" FOREIGN KEY ("id_emb_insumo") REFERENCES "emb_insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_fornecedores_insumos" ADD CONSTRAINT "emb_fornecedores_insumos_id_emb_empresas_fkey" FOREIGN KEY ("id_emb_empresas") REFERENCES "emb_empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_postos_coleta" ADD CONSTRAINT "emb_postos_coleta_id_cidade_fkey" FOREIGN KEY ("id_cidade") REFERENCES "sis_igbe_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_dados_coleta_postos" ADD CONSTRAINT "emb_dados_coleta_postos_id_posto_fkey" FOREIGN KEY ("id_posto") REFERENCES "emb_postos_coleta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_combustivel_municipio" ADD CONSTRAINT "emb_combustivel_municipio_id_municipio_fkey" FOREIGN KEY ("id_municipio") REFERENCES "sis_igbe_city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_combustivel_microregiao" ADD CONSTRAINT "emb_combustivel_microregiao_id_microregiao_fkey" FOREIGN KEY ("id_microregiao") REFERENCES "sis_microregions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_combustivel_mesorregiao" ADD CONSTRAINT "emb_combustivel_mesorregiao_id_mesorregiao_fkey" FOREIGN KEY ("id_mesorregiao") REFERENCES "sis_mesoregions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_combustivel_estado" ADD CONSTRAINT "emb_combustivel_estado_id_estado_fkey" FOREIGN KEY ("id_estado") REFERENCES "sis_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_emb_tipo_veiculo_insumos" ADD CONSTRAINT "_emb_tipo_veiculo_insumos_A_fkey" FOREIGN KEY ("A") REFERENCES "emb_insumos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_emb_tipo_veiculo_insumos" ADD CONSTRAINT "_emb_tipo_veiculo_insumos_B_fkey" FOREIGN KEY ("B") REFERENCES "emb_tipos_veiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
