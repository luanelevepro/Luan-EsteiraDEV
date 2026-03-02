/*
  Warnings:

  - The primary key for the `_emb_tipo_veiculo_insumos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_area_segmento` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_caracteristicas_carroceria` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_carga` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_carga_auxiliar_verificador_extra` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_carga_verificador_extra` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_classificacao_carrocerias` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_classificacao_implementos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_classificacao_veiculos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_combinacao_carroceria_historico` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_combinacao_carroceria_orcamento` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_combustivel_estado` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_combustivel_mesorregiao` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_combustivel_microregiao` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_combustivel_municipio` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_custo_fixo_vigencia` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_custo_variavel_vigencia` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_dados_coleta_postos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_fornecedores_insumos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_frota` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_frota_reposicao` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_frota_vigencia` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_ibge_cidades` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_ibge_uf` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_implementos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_implementos_historico` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_insumos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_marcas_carroceria` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_orcamentos_carroceria_semireboque` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_parametros_apuracao_carga` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_postos_coleta` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_segmento_carga` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_taxa_juros_ano_modelo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_tipo_carga` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_tipos_carroceria` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_tipos_insumo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_tipos_porte_carroceria_semireboque` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_tipos_veiculo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_unidade_medida_minima` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_vigencia_insumos_estabelecimento` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sis_emb_marcas_carrocerias` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "_emb_tipo_veiculo_insumos" DROP CONSTRAINT "_emb_tipo_veiculo_insumos_A_fkey";

-- DropForeignKey
ALTER TABLE "_emb_tipo_veiculo_insumos" DROP CONSTRAINT "_emb_tipo_veiculo_insumos_B_fkey";

-- DropForeignKey
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_id_dest_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_id_dest_uf_fkey";

-- DropForeignKey
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_id_emb_tipo_carga_fkey";

-- DropForeignKey
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_id_ori_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_id_ori_uf_fkey";

-- DropForeignKey
ALTER TABLE "emb_carga_verificador_extra" DROP CONSTRAINT "emb_carga_verificador_extra_id_auxiliar_verificador_extra__fkey";

-- DropForeignKey
ALTER TABLE "emb_combinacao_carroceria_historico" DROP CONSTRAINT "emb_combinacao_carroceria_historico_id_emb_tipo_carroceria_fkey";

-- DropForeignKey
ALTER TABLE "emb_combinacao_carroceria_historico" DROP CONSTRAINT "emb_combinacao_carroceria_historico_id_emb_tipo_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_combinacao_carroceria_orcamento" DROP CONSTRAINT "emb_combinacao_carroceria_orcamento_id_emb_tipo_carroceria_fkey";

-- DropForeignKey
ALTER TABLE "emb_combinacao_carroceria_orcamento" DROP CONSTRAINT "emb_combinacao_carroceria_orcamento_id_emb_tipo_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" DROP CONSTRAINT "emb_custo_fixo_vigencia_emb_carga_auxiliar_verificador_ext_fkey";

-- DropForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" DROP CONSTRAINT "emb_custo_fixo_vigencia_id_emb_caracteristica_carroceria_fkey";

-- DropForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" DROP CONSTRAINT "emb_custo_fixo_vigencia_id_emb_segmento_carga_fkey";

-- DropForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" DROP CONSTRAINT "emb_custo_fixo_vigencia_id_emb_tipo_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" DROP CONSTRAINT "emb_custo_variavel_vigencia_emb_carga_auxiliar_verificador_fkey";

-- DropForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" DROP CONSTRAINT "emb_custo_variavel_vigencia_id_emb_caracteristica_carrocer_fkey";

-- DropForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" DROP CONSTRAINT "emb_custo_variavel_vigencia_id_emb_segmento_carga_fkey";

-- DropForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" DROP CONSTRAINT "emb_custo_variavel_vigencia_id_emb_tipo_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_dados_coleta_postos" DROP CONSTRAINT "emb_dados_coleta_postos_id_posto_fkey";

-- DropForeignKey
ALTER TABLE "emb_estabelecimentos" DROP CONSTRAINT "emb_estabelecimentos_id_emb_ibge_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_fipe_historico" DROP CONSTRAINT "emb_fipe_historico_id_emb_tipos_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_caracteristicas_carroceria_semi_2_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_caracteristicas_carroceria_semi_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_ibge_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_ibge_uf_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_marcas_carroceria_semi_2_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_marcas_carroceria_semi_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_marcas_carroceria_tracionador_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_portes_carroceria_semi_2_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_portes_carroceria_semi_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_tipos_carroceria_semi_2_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_tipos_carroceria_semi_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_tipos_veiculo_tracionador_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota_reposicao" DROP CONSTRAINT "emb_frota_reposicao_id_emb_tipo_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota_reposicao" DROP CONSTRAINT "emb_frota_reposicao_id_emg_segmento_carga_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota_vigencia" DROP CONSTRAINT "emb_frota_vigencia_id_emb_frota_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota_vigencia" DROP CONSTRAINT "emb_frota_vigencia_id_emb_tipos_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_ibge_cidades" DROP CONSTRAINT "emb_ibge_cidades_id_emb_uf_fkey";

-- DropForeignKey
ALTER TABLE "emb_implementos" DROP CONSTRAINT "emb_implementos_id_classificacao_implemento_fkey";

-- DropForeignKey
ALTER TABLE "emb_implementos_historico" DROP CONSTRAINT "emb_implementos_historico_id_emb_combinacao_orcamento_fkey";

-- DropForeignKey
ALTER TABLE "emb_insumos" DROP CONSTRAINT "emb_insumos_id_tipo_insumo_fkey";

-- DropForeignKey
ALTER TABLE "emb_orcamentos_carroceria_semireboque" DROP CONSTRAINT "emb_orcamentos_carroceria_semireboque_id_emb_caracteristic_fkey";

-- DropForeignKey
ALTER TABLE "emb_orcamentos_carroceria_semireboque" DROP CONSTRAINT "emb_orcamentos_carroceria_semireboque_id_emb_tipo_carrocer_fkey";

-- DropForeignKey
ALTER TABLE "emb_orcamentos_carroceria_semireboque" DROP CONSTRAINT "emb_orcamentos_carroceria_semireboque_id_emb_tipo_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_parametros_apuracao_carga" DROP CONSTRAINT "emb_parametros_apuracao_carga_id_emb_segmento_carga_fkey";

-- DropForeignKey
ALTER TABLE "emb_parametros_apuracao_carga" DROP CONSTRAINT "emb_parametros_apuracao_carga_id_emb_tipos_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_parametros_apuracao_carga" DROP CONSTRAINT "emb_parametros_apuracao_carga_id_unidade_medida_minima_fkey";

-- DropForeignKey
ALTER TABLE "emb_segmento_carga" DROP CONSTRAINT "emb_segmento_carga_id_area_segmento_fkey";

-- DropForeignKey
ALTER TABLE "emb_tabela_fipe" DROP CONSTRAINT "emb_tabela_fipe_id_emb_tipos_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_tipo_carga" DROP CONSTRAINT "emb_tipo_carga_id_segmento_fkey";

-- DropForeignKey
ALTER TABLE "emb_tipos_carroceria" DROP CONSTRAINT "emb_tipos_carroceria_id_emb_classificacao_carrocerias_fkey";

-- DropForeignKey
ALTER TABLE "emb_tipos_veiculo" DROP CONSTRAINT "emb_tipos_veiculo_id_emb_classificacao_veiculos_fkey";

-- DropForeignKey
ALTER TABLE "emb_tipos_veiculo" DROP CONSTRAINT "emb_tipos_veiculo_id_emb_insumo_combustivel_fkey";

-- DropForeignKey
ALTER TABLE "emb_tipos_veiculo" DROP CONSTRAINT "emb_tipos_veiculo_id_insumo_pneu_fkey";

-- DropForeignKey
ALTER TABLE "emb_transportadoras" DROP CONSTRAINT "emb_transportadoras_id_emb_ibge_cidade_fkey";

-- DropForeignKey
ALTER TABLE "emb_transportadoras" DROP CONSTRAINT "emb_transportadoras_id_emb_ibge_uf_fkey";

-- DropForeignKey
ALTER TABLE "emb_vigencia_insumos_estabelecimento" DROP CONSTRAINT "emb_vigencia_insumos_estabelecimento_id_emb_insumo_fkey";

-- AlterTable
ALTER TABLE "_emb_tipo_veiculo_insumos" DROP CONSTRAINT "_emb_tipo_veiculo_insumos_AB_pkey",
ALTER COLUMN "A" SET DATA TYPE TEXT,
ALTER COLUMN "B" SET DATA TYPE TEXT,
ADD CONSTRAINT "_emb_tipo_veiculo_insumos_AB_pkey" PRIMARY KEY ("A", "B");

-- AlterTable
ALTER TABLE "emb_area_segmento" DROP CONSTRAINT "emb_area_segmento_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_area_segmento_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_area_segmento_id_seq";

-- AlterTable
ALTER TABLE "emb_caracteristicas_carroceria" DROP CONSTRAINT "emb_caracteristicas_carroceria_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_caracteristicas_carroceria_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_caracteristicas_carroceria_id_seq";

-- AlterTable
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipo_carga" SET DATA TYPE TEXT,
ALTER COLUMN "id_ori_uf" SET DATA TYPE TEXT,
ALTER COLUMN "id_ori_cidade" SET DATA TYPE TEXT,
ALTER COLUMN "id_dest_uf" SET DATA TYPE TEXT,
ALTER COLUMN "id_dest_cidade" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_carga_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_carga_id_seq";

-- AlterTable
ALTER TABLE "emb_carga_auxiliar_verificador_extra" DROP CONSTRAINT "emb_carga_auxiliar_verificador_extra_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_carga_auxiliar_verificador_extra_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_carga_auxiliar_verificador_extra_id_seq";

-- AlterTable
ALTER TABLE "emb_carga_verificador_extra" DROP CONSTRAINT "emb_carga_verificador_extra_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_auxiliar_verificador_extra_carga" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_carga_verificador_extra_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_carga_verificador_extra_id_seq";

-- AlterTable
ALTER TABLE "emb_classificacao_carrocerias" DROP CONSTRAINT "emb_classificacao_carrocerias_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_classificacao_carrocerias_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_classificacao_carrocerias_id_seq";

-- AlterTable
ALTER TABLE "emb_classificacao_implementos" DROP CONSTRAINT "emb_classificacao_implementos_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_classificacao_implementos_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_classificacao_implementos_id_seq";

-- AlterTable
ALTER TABLE "emb_classificacao_veiculos" DROP CONSTRAINT "emb_classificacao_veiculos_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_classificacao_veiculos_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_classificacao_veiculos_id_seq";

-- AlterTable
ALTER TABLE "emb_combinacao_carroceria_historico" DROP CONSTRAINT "emb_combinacao_carroceria_historico_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipo_carroceria" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipo_veiculo" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_combinacao_carroceria_historico_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_combinacao_carroceria_historico_id_seq";

-- AlterTable
ALTER TABLE "emb_combinacao_carroceria_orcamento" DROP CONSTRAINT "emb_combinacao_carroceria_orcamento_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipo_carroceria" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipo_veiculo" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_combinacao_carroceria_orcamento_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_combinacao_carroceria_orcamento_id_seq";

-- AlterTable
ALTER TABLE "emb_combustivel_estado" DROP CONSTRAINT "emb_combustivel_estado_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_combustivel_estado_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_combustivel_estado_id_seq";

-- AlterTable
ALTER TABLE "emb_combustivel_mesorregiao" DROP CONSTRAINT "emb_combustivel_mesorregiao_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_combustivel_mesorregiao_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_combustivel_mesorregiao_id_seq";

-- AlterTable
ALTER TABLE "emb_combustivel_microregiao" DROP CONSTRAINT "emb_combustivel_microregiao_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_combustivel_microregiao_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_combustivel_microregiao_id_seq";

-- AlterTable
ALTER TABLE "emb_combustivel_municipio" DROP CONSTRAINT "emb_combustivel_municipio_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_combustivel_municipio_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_combustivel_municipio_id_seq";

-- AlterTable
ALTER TABLE "emb_custo_fixo_vigencia" DROP CONSTRAINT "emb_custo_fixo_vigencia_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipo_veiculo" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_segmento_carga" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_caracteristica_carroceria" SET DATA TYPE TEXT,
ALTER COLUMN "emb_carga_auxiliar_verificador_extraId" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_custo_fixo_vigencia_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_custo_fixo_vigencia_id_seq";

-- AlterTable
ALTER TABLE "emb_custo_variavel_vigencia" DROP CONSTRAINT "emb_custo_variavel_vigencia_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_segmento_carga" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipo_veiculo" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_caracteristica_carroceria" SET DATA TYPE TEXT,
ALTER COLUMN "emb_carga_auxiliar_verificador_extraId" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_custo_variavel_vigencia_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_custo_variavel_vigencia_id_seq";

-- AlterTable
ALTER TABLE "emb_dados_coleta_postos" DROP CONSTRAINT "emb_dados_coleta_postos_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_posto" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_dados_coleta_postos_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_dados_coleta_postos_id_seq";

-- AlterTable
ALTER TABLE "emb_estabelecimentos" ALTER COLUMN "id_emb_ibge_cidade" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "emb_fipe_historico" ALTER COLUMN "id_emb_tipos_veiculo" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "emb_fornecedores_insumos" DROP CONSTRAINT "emb_fornecedores_insumos_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_fornecedores_insumos_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_fornecedores_insumos_id_seq";

-- AlterTable
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_ibge_uf" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_ibge_cidade" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_marcas_carroceria_tracionador" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipos_veiculo_tracionador" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipos_carroceria_semi" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_marcas_carroceria_semi" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_caracteristicas_carroceria_semi" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_portes_carroceria_semi" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipos_carroceria_semi_2" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_marcas_carroceria_semi_2" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_caracteristicas_carroceria_semi_2" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_portes_carroceria_semi_2" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_frota_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_frota_id_seq";

-- AlterTable
ALTER TABLE "emb_frota_reposicao" DROP CONSTRAINT "emb_frota_reposicao_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emg_segmento_carga" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipo_veiculo" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_frota_reposicao_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_frota_reposicao_id_seq";

-- AlterTable
ALTER TABLE "emb_frota_vigencia" DROP CONSTRAINT "emb_frota_vigencia_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipos_veiculo" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_frota" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_frota_vigencia_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_frota_vigencia_id_seq";

-- AlterTable
ALTER TABLE "emb_ibge_cidades" DROP CONSTRAINT "emb_ibge_cidades_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_uf" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_ibge_cidades_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_ibge_cidades_id_seq";

-- AlterTable
ALTER TABLE "emb_ibge_uf" DROP CONSTRAINT "emb_ibge_uf_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_ibge_uf_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_ibge_uf_id_seq";

-- AlterTable
ALTER TABLE "emb_implementos" DROP CONSTRAINT "emb_implementos_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_classificacao_implemento" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_implementos_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_implementos_id_seq";

-- AlterTable
ALTER TABLE "emb_implementos_historico" DROP CONSTRAINT "emb_implementos_historico_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_combinacao_orcamento" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_implementos_historico_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_implementos_historico_id_seq";

-- AlterTable
ALTER TABLE "emb_insumos" DROP CONSTRAINT "emb_insumos_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_tipo_insumo" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_insumos_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_insumos_id_seq";

-- AlterTable
ALTER TABLE "emb_marcas_carroceria" DROP CONSTRAINT "emb_marcas_carroceria_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_marcas_carroceria_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_marcas_carroceria_id_seq";

-- AlterTable
ALTER TABLE "emb_orcamentos_carroceria_semireboque" DROP CONSTRAINT "emb_orcamentos_carroceria_semireboque_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipo_veiculo" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipo_carroceria" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_caracteristica_carroceria" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_orcamentos_carroceria_semireboque_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_orcamentos_carroceria_semireboque_id_seq";

-- AlterTable
ALTER TABLE "emb_parametros_apuracao_carga" DROP CONSTRAINT "emb_parametros_apuracao_carga_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_segmento_carga" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_tipos_veiculo" SET DATA TYPE TEXT,
ALTER COLUMN "id_unidade_medida_minima" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_parametros_apuracao_carga_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_parametros_apuracao_carga_id_seq";

-- AlterTable
ALTER TABLE "emb_postos_coleta" DROP CONSTRAINT "emb_postos_coleta_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_postos_coleta_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_postos_coleta_id_seq";

-- AlterTable
ALTER TABLE "emb_segmento_carga" DROP CONSTRAINT "emb_segmento_carga_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_area_segmento" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_segmento_carga_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_segmento_carga_id_seq";

-- AlterTable
ALTER TABLE "emb_tabela_fipe" ALTER COLUMN "id_emb_tipos_veiculo" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "emb_taxa_juros_ano_modelo" DROP CONSTRAINT "emb_taxa_juros_ano_modelo_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_taxa_juros_ano_modelo_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_taxa_juros_ano_modelo_id_seq";

-- AlterTable
ALTER TABLE "emb_tipo_carga" DROP CONSTRAINT "emb_tipo_carga_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_segmento" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_tipo_carga_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_tipo_carga_id_seq";

-- AlterTable
ALTER TABLE "emb_tipos_carroceria" DROP CONSTRAINT "emb_tipos_carroceria_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_classificacao_carrocerias" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_tipos_carroceria_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_tipos_carroceria_id_seq";

-- AlterTable
ALTER TABLE "emb_tipos_insumo" DROP CONSTRAINT "emb_tipos_insumo_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_tipos_insumo_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_tipos_insumo_id_seq";

-- AlterTable
ALTER TABLE "emb_tipos_porte_carroceria_semireboque" DROP CONSTRAINT "emb_tipos_porte_carroceria_semireboque_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_tipos_porte_carroceria_semireboque_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_tipos_porte_carroceria_semireboque_id_seq";

-- AlterTable
ALTER TABLE "emb_tipos_veiculo" DROP CONSTRAINT "emb_tipos_veiculo_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_insumo_pneu" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_insumo_combustivel" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_classificacao_veiculos" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_tipos_veiculo_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_tipos_veiculo_id_seq";

-- AlterTable
ALTER TABLE "emb_transportadoras" ALTER COLUMN "id_emb_ibge_cidade" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_ibge_uf" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "emb_unidade_medida_minima" DROP CONSTRAINT "emb_unidade_medida_minima_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_unidade_medida_minima_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_unidade_medida_minima_id_seq";

-- AlterTable
ALTER TABLE "emb_vigencia_insumos_estabelecimento" DROP CONSTRAINT "emb_vigencia_insumos_estabelecimento_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_emb_insumo" SET DATA TYPE TEXT,
ADD CONSTRAINT "emb_vigencia_insumos_estabelecimento_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emb_vigencia_insumos_estabelecimento_id_seq";

-- AlterTable
ALTER TABLE "sis_emb_marcas_carrocerias" DROP CONSTRAINT "sis_emb_marcas_carrocerias_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "sis_emb_marcas_carrocerias_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "sis_emb_marcas_carrocerias_id_seq";

-- AddForeignKey
ALTER TABLE "emb_ibge_cidades" ADD CONSTRAINT "emb_ibge_cidades_id_emb_uf_fkey" FOREIGN KEY ("id_emb_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_estabelecimentos" ADD CONSTRAINT "emb_estabelecimentos_id_emb_ibge_cidade_fkey" FOREIGN KEY ("id_emb_ibge_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_transportadoras" ADD CONSTRAINT "emb_transportadoras_id_emb_ibge_uf_fkey" FOREIGN KEY ("id_emb_ibge_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_transportadoras" ADD CONSTRAINT "emb_transportadoras_id_emb_ibge_cidade_fkey" FOREIGN KEY ("id_emb_ibge_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_emb_tipo_carga_fkey" FOREIGN KEY ("id_emb_tipo_carga") REFERENCES "emb_tipo_carga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_dest_cidade_fkey" FOREIGN KEY ("id_dest_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_ori_cidade_fkey" FOREIGN KEY ("id_ori_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_dest_uf_fkey" FOREIGN KEY ("id_dest_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_ori_uf_fkey" FOREIGN KEY ("id_ori_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipo_carga" ADD CONSTRAINT "emb_tipo_carga_id_segmento_fkey" FOREIGN KEY ("id_segmento") REFERENCES "emb_segmento_carga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_segmento_carga" ADD CONSTRAINT "emb_segmento_carga_id_area_segmento_fkey" FOREIGN KEY ("id_area_segmento") REFERENCES "emb_area_segmento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_carga_verificador_extra" ADD CONSTRAINT "emb_carga_verificador_extra_id_auxiliar_verificador_extra__fkey" FOREIGN KEY ("id_auxiliar_verificador_extra_carga") REFERENCES "emb_carga_auxiliar_verificador_extra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_parametros_apuracao_carga" ADD CONSTRAINT "emb_parametros_apuracao_carga_id_emb_segmento_carga_fkey" FOREIGN KEY ("id_emb_segmento_carga") REFERENCES "emb_segmento_carga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_parametros_apuracao_carga" ADD CONSTRAINT "emb_parametros_apuracao_carga_id_emb_tipos_veiculo_fkey" FOREIGN KEY ("id_emb_tipos_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_parametros_apuracao_carga" ADD CONSTRAINT "emb_parametros_apuracao_carga_id_unidade_medida_minima_fkey" FOREIGN KEY ("id_unidade_medida_minima") REFERENCES "emb_unidade_medida_minima"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" ADD CONSTRAINT "emb_custo_fixo_vigencia_id_emb_tipo_veiculo_fkey" FOREIGN KEY ("id_emb_tipo_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" ADD CONSTRAINT "emb_custo_fixo_vigencia_id_emb_segmento_carga_fkey" FOREIGN KEY ("id_emb_segmento_carga") REFERENCES "emb_segmento_carga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" ADD CONSTRAINT "emb_custo_fixo_vigencia_id_emb_caracteristica_carroceria_fkey" FOREIGN KEY ("id_emb_caracteristica_carroceria") REFERENCES "emb_caracteristicas_carroceria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_fixo_vigencia" ADD CONSTRAINT "emb_custo_fixo_vigencia_emb_carga_auxiliar_verificador_ext_fkey" FOREIGN KEY ("emb_carga_auxiliar_verificador_extraId") REFERENCES "emb_carga_auxiliar_verificador_extra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" ADD CONSTRAINT "emb_custo_variavel_vigencia_id_emb_segmento_carga_fkey" FOREIGN KEY ("id_emb_segmento_carga") REFERENCES "emb_segmento_carga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" ADD CONSTRAINT "emb_custo_variavel_vigencia_id_emb_tipo_veiculo_fkey" FOREIGN KEY ("id_emb_tipo_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" ADD CONSTRAINT "emb_custo_variavel_vigencia_id_emb_caracteristica_carrocer_fkey" FOREIGN KEY ("id_emb_caracteristica_carroceria") REFERENCES "emb_caracteristicas_carroceria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_custo_variavel_vigencia" ADD CONSTRAINT "emb_custo_variavel_vigencia_emb_carga_auxiliar_verificador_fkey" FOREIGN KEY ("emb_carga_auxiliar_verificador_extraId") REFERENCES "emb_carga_auxiliar_verificador_extra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tabela_fipe" ADD CONSTRAINT "emb_tabela_fipe_id_emb_tipos_veiculo_fkey" FOREIGN KEY ("id_emb_tipos_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_fipe_historico" ADD CONSTRAINT "emb_fipe_historico_id_emb_tipos_veiculo_fkey" FOREIGN KEY ("id_emb_tipos_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_veiculo" ADD CONSTRAINT "emb_tipos_veiculo_id_insumo_pneu_fkey" FOREIGN KEY ("id_insumo_pneu") REFERENCES "emb_insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_veiculo" ADD CONSTRAINT "emb_tipos_veiculo_id_emb_insumo_combustivel_fkey" FOREIGN KEY ("id_emb_insumo_combustivel") REFERENCES "emb_insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_veiculo" ADD CONSTRAINT "emb_tipos_veiculo_id_emb_classificacao_veiculos_fkey" FOREIGN KEY ("id_emb_classificacao_veiculos") REFERENCES "emb_classificacao_veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_tipos_carroceria" ADD CONSTRAINT "emb_tipos_carroceria_id_emb_classificacao_carrocerias_fkey" FOREIGN KEY ("id_emb_classificacao_carrocerias") REFERENCES "emb_classificacao_carrocerias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "emb_implementos_historico" ADD CONSTRAINT "emb_implementos_historico_id_emb_combinacao_orcamento_fkey" FOREIGN KEY ("id_emb_combinacao_orcamento") REFERENCES "emb_combinacao_carroceria_orcamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_ibge_uf_fkey" FOREIGN KEY ("id_emb_ibge_uf") REFERENCES "emb_ibge_uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_ibge_cidade_fkey" FOREIGN KEY ("id_emb_ibge_cidade") REFERENCES "emb_ibge_cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_marcas_carroceria_tracionador_fkey" FOREIGN KEY ("id_emb_marcas_carroceria_tracionador") REFERENCES "emb_marcas_carroceria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_tipos_veiculo_tracionador_fkey" FOREIGN KEY ("id_emb_tipos_veiculo_tracionador") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_tipos_carroceria_semi_fkey" FOREIGN KEY ("id_emb_tipos_carroceria_semi") REFERENCES "emb_tipos_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_marcas_carroceria_semi_fkey" FOREIGN KEY ("id_emb_marcas_carroceria_semi") REFERENCES "emb_marcas_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_caracteristicas_carroceria_semi_fkey" FOREIGN KEY ("id_emb_caracteristicas_carroceria_semi") REFERENCES "emb_caracteristicas_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_portes_carroceria_semi_fkey" FOREIGN KEY ("id_emb_portes_carroceria_semi") REFERENCES "emb_tipos_porte_carroceria_semireboque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_tipos_carroceria_semi_2_fkey" FOREIGN KEY ("id_emb_tipos_carroceria_semi_2") REFERENCES "emb_tipos_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_marcas_carroceria_semi_2_fkey" FOREIGN KEY ("id_emb_marcas_carroceria_semi_2") REFERENCES "emb_marcas_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_caracteristicas_carroceria_semi_2_fkey" FOREIGN KEY ("id_emb_caracteristicas_carroceria_semi_2") REFERENCES "emb_caracteristicas_carroceria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota" ADD CONSTRAINT "emb_frota_id_emb_portes_carroceria_semi_2_fkey" FOREIGN KEY ("id_emb_portes_carroceria_semi_2") REFERENCES "emb_tipos_porte_carroceria_semireboque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_vigencia" ADD CONSTRAINT "emb_frota_vigencia_id_emb_tipos_veiculo_fkey" FOREIGN KEY ("id_emb_tipos_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_vigencia" ADD CONSTRAINT "emb_frota_vigencia_id_emb_frota_fkey" FOREIGN KEY ("id_emb_frota") REFERENCES "emb_frota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_reposicao" ADD CONSTRAINT "emb_frota_reposicao_id_emg_segmento_carga_fkey" FOREIGN KEY ("id_emg_segmento_carga") REFERENCES "emb_segmento_carga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_reposicao" ADD CONSTRAINT "emb_frota_reposicao_id_emb_tipo_veiculo_fkey" FOREIGN KEY ("id_emb_tipo_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_insumos" ADD CONSTRAINT "emb_insumos_id_tipo_insumo_fkey" FOREIGN KEY ("id_tipo_insumo") REFERENCES "emb_tipos_insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_vigencia_insumos_estabelecimento" ADD CONSTRAINT "emb_vigencia_insumos_estabelecimento_id_emb_insumo_fkey" FOREIGN KEY ("id_emb_insumo") REFERENCES "emb_insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_dados_coleta_postos" ADD CONSTRAINT "emb_dados_coleta_postos_id_posto_fkey" FOREIGN KEY ("id_posto") REFERENCES "emb_postos_coleta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_emb_tipo_veiculo_insumos" ADD CONSTRAINT "_emb_tipo_veiculo_insumos_A_fkey" FOREIGN KEY ("A") REFERENCES "emb_insumos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_emb_tipo_veiculo_insumos" ADD CONSTRAINT "_emb_tipo_veiculo_insumos_B_fkey" FOREIGN KEY ("B") REFERENCES "emb_tipos_veiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
