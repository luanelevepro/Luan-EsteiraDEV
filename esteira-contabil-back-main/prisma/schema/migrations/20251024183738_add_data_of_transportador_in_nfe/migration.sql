/*
  Warnings:

  - The primary key for the `_emb_tipo_veiculo_insumos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emb_area_segmento` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_area_segmento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_caracteristicas_carroceria` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_caracteristicas_carroceria` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_carga` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_carga` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_tipo_carga` column on the `emb_carga` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_carga_auxiliar_verificador_extra` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_carga_auxiliar_verificador_extra` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_carga_verificador_extra` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_carga_verificador_extra` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_auxiliar_verificador_extra_carga` column on the `emb_carga_verificador_extra` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_classificacao_carrocerias` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_classificacao_carrocerias` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_classificacao_implementos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_classificacao_implementos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_classificacao_veiculos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_classificacao_veiculos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_combinacao_carroceria_historico` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_combinacao_carroceria_historico` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_combinacao_carroceria_orcamento` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_combinacao_carroceria_orcamento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_combustivel_estado` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_combustivel_estado` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_combustivel_mesorregiao` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_combustivel_mesorregiao` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_combustivel_microregiao` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_combustivel_microregiao` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_combustivel_municipio` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_combustivel_municipio` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_custo_fixo_vigencia` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_custo_fixo_vigencia` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `emb_carga_auxiliar_verificador_extraId` column on the `emb_custo_fixo_vigencia` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_custo_variavel_vigencia` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_custo_variavel_vigencia` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `emb_carga_auxiliar_verificador_extraId` column on the `emb_custo_variavel_vigencia` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_dados_coleta_postos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_dados_coleta_postos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_posto` column on the `emb_dados_coleta_postos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_fipe_historico` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_fipe_historico` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_tipos_veiculo` column on the `emb_fipe_historico` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_fornecedores_insumos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_fornecedores_insumos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_frota` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id_tabela_fipe` on the `emb_frota` table. All the data in the column will be lost.
  - You are about to drop the column `id_tabela_fipe_carroceria_semi` on the `emb_frota` table. All the data in the column will be lost.
  - You are about to drop the column `id_tabela_fipe_carroceria_semi_2` on the `emb_frota` table. All the data in the column will be lost.
  - The `id` column on the `emb_frota` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_tipos_carroceria_semi` column on the `emb_frota` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_marcas_carroceria_semi` column on the `emb_frota` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_caracteristicas_carroceria_semi` column on the `emb_frota` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_portes_carroceria_semi` column on the `emb_frota` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_tipos_carroceria_semi_2` column on the `emb_frota` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_marcas_carroceria_semi_2` column on the `emb_frota` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_caracteristicas_carroceria_semi_2` column on the `emb_frota` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_portes_carroceria_semi_2` column on the `emb_frota` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_frota_reposicao` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_frota_reposicao` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emg_segmento_carga` column on the `emb_frota_reposicao` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_frota_vigencia` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_frota_vigencia` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_implementos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_implementos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_implementos_historico` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_implementos_historico` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_insumos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_insumos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_marcas_carroceria` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_marcas_carroceria` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_orcamentos_carroceria_semireboque` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_orcamentos_carroceria_semireboque` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_parametros_apuracao_carga` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_parametros_apuracao_carga` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_postos_coleta` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_postos_coleta` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_segmento_carga` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_segmento_carga` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_area_segmento` column on the `emb_segmento_carga` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_tabela_fipe` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cd_tipo_veiculo` on the `emb_tabela_fipe` table. All the data in the column will be lost.
  - The `id` column on the `emb_tabela_fipe` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_tipos_veiculo` column on the `emb_tabela_fipe` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_taxa_juros_ano_modelo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_taxa_juros_ano_modelo` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_tipo_carga` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_tipo_carga` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_segmento` column on the `emb_tipo_carga` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_tipos_carroceria` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_tipos_carroceria` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_tipos_insumo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_tipos_insumo` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_tipos_porte_carroceria_semireboque` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_tipos_porte_carroceria_semireboque` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_tipos_veiculo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_tipos_veiculo` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_insumo_pneu` column on the `emb_tipos_veiculo` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `id_emb_insumo_combustivel` column on the `emb_tipos_veiculo` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_unidade_medida_minima` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_unidade_medida_minima` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `emb_vigencia_insumos_estabelecimento` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `emb_vigencia_insumos_estabelecimento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `sis_emb_marcas_carrocerias` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `sis_emb_marcas_carrocerias` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `id_microregion` on the `sis_igbe_city` table. All the data in the column will be lost.
  - You are about to drop the column `id_sis_simples_nacional_faixa` on the `sis_simples_nacional_divisao_taxas_prm_vigencia` table. All the data in the column will be lost.
  - You are about to drop the column `id_sis_simples_nacional_faixa` on the `sis_simples_nacional_vigencia` table. All the data in the column will be lost.
  - You are about to drop the `sis_simples_nacional_faixa` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cd_fipe]` on the table `emb_tabela_fipe` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_sis_simples_nacional,dt_vigencia]` on the table `sis_simples_nacional_divisao_taxas_prm_vigencia` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_sis_simples_nacional]` on the table `sis_simples_nacional_vigencia` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_sis_simples_nacional,dt_vigencia]` on the table `sis_simples_nacional_vigencia` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `A` on the `_emb_tipo_veiculo_insumos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `B` on the `_emb_tipo_veiculo_insumos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipo_carroceria` on the `emb_combinacao_carroceria_historico` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipo_veiculo` on the `emb_combinacao_carroceria_historico` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipo_carroceria` on the `emb_combinacao_carroceria_orcamento` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipo_veiculo` on the `emb_combinacao_carroceria_orcamento` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipo_veiculo` on the `emb_custo_fixo_vigencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_segmento_carga` on the `emb_custo_fixo_vigencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_caracteristica_carroceria` on the `emb_custo_fixo_vigencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_segmento_carga` on the `emb_custo_variavel_vigencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipo_veiculo` on the `emb_custo_variavel_vigencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_caracteristica_carroceria` on the `emb_custo_variavel_vigencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_fipe` on the `emb_fipe_historico` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_marcas_carroceria_tracionador` on the `emb_frota` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipos_veiculo_tracionador` on the `emb_frota` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tabela_fipe` on the `emb_frota_reposicao` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipo_veiculo` on the `emb_frota_reposicao` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipos_veiculo` on the `emb_frota_vigencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_frota` on the `emb_frota_vigencia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_classificacao_implemento` on the `emb_implementos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_combinacao_orcamento` on the `emb_implementos_historico` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_tipo_insumo` on the `emb_insumos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipo_veiculo` on the `emb_orcamentos_carroceria_semireboque` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipo_carroceria` on the `emb_orcamentos_carroceria_semireboque` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_caracteristica_carroceria` on the `emb_orcamentos_carroceria_semireboque` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_segmento_carga` on the `emb_parametros_apuracao_carga` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_tipos_veiculo` on the `emb_parametros_apuracao_carga` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_unidade_medida_minima` on the `emb_parametros_apuracao_carga` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_classificacao_carrocerias` on the `emb_tipos_carroceria` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_classificacao_veiculos` on the `emb_tipos_veiculo` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id_emb_insumo` on the `emb_vigencia_insumos_estabelecimento` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `id_sis_simples_nacional` to the `sis_simples_nacional_divisao_taxas_prm_vigencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_sis_simples_nacional` to the `sis_simples_nacional_vigencia` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_emb_tipo_veiculo_insumos" DROP CONSTRAINT "_emb_tipo_veiculo_insumos_A_fkey";

-- DropForeignKey
ALTER TABLE "_emb_tipo_veiculo_insumos" DROP CONSTRAINT "_emb_tipo_veiculo_insumos_B_fkey";

-- DropForeignKey
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_id_emb_tipo_carga_fkey";

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
ALTER TABLE "emb_fipe_historico" DROP CONSTRAINT "emb_fipe_historico_id_emb_fipe_fkey";

-- DropForeignKey
ALTER TABLE "emb_fipe_historico" DROP CONSTRAINT "emb_fipe_historico_id_emb_tipos_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_caracteristicas_carroceria_semi_2_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_emb_caracteristicas_carroceria_semi_fkey";

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
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_tabela_fipe_carroceria_semi_2_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_tabela_fipe_carroceria_semi_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_id_tabela_fipe_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota_reposicao" DROP CONSTRAINT "emb_frota_reposicao_id_emb_tabela_fipe_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota_reposicao" DROP CONSTRAINT "emb_frota_reposicao_id_emb_tipo_veiculo_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota_reposicao" DROP CONSTRAINT "emb_frota_reposicao_id_emg_segmento_carga_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota_vigencia" DROP CONSTRAINT "emb_frota_vigencia_id_emb_frota_fkey";

-- DropForeignKey
ALTER TABLE "emb_frota_vigencia" DROP CONSTRAINT "emb_frota_vigencia_id_emb_tipos_veiculo_fkey";

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
ALTER TABLE "emb_vigencia_insumos_estabelecimento" DROP CONSTRAINT "emb_vigencia_insumos_estabelecimento_id_emb_insumo_fkey";

-- DropForeignKey
ALTER TABLE "sis_igbe_city" DROP CONSTRAINT "sis_igbe_city_id_microregion_fkey";

-- DropForeignKey
ALTER TABLE "sis_simples_nacional_divisao_taxas_prm_vigencia" DROP CONSTRAINT "sis_simples_nacional_divisao_taxas_prm_vigencia_id_sis_sim_fkey";

-- DropForeignKey
ALTER TABLE "sis_simples_nacional_faixa" DROP CONSTRAINT "sis_simples_nacional_faixa_id_sis_simples_nacional_fkey";

-- DropForeignKey
ALTER TABLE "sis_simples_nacional_vigencia" DROP CONSTRAINT "sis_simples_nacional_vigencia_id_sis_simples_nacional_faix_fkey";

-- DropIndex
DROP INDEX "emb_combustivel_estado_ds_combustivel_id_estado_dt_vigencia_key";

-- DropIndex
DROP INDEX "emb_combustivel_mesorregiao_ds_combustivel_id_mesorregiao_d_key";

-- DropIndex
DROP INDEX "emb_combustivel_microregiao_ds_combustivel_id_microregiao_d_key";

-- DropIndex
DROP INDEX "emb_combustivel_municipio_ds_combustivel_id_municipio_dt_vi_key";

-- DropIndex
DROP INDEX "emb_tabela_fipe_cd_fipe_vl_ano_modelo_key";

-- DropIndex
DROP INDEX "sis_simples_nacional_divisao_taxas_prm_vigencia_id_sis_simp_key";

-- DropIndex
DROP INDEX "sis_simples_nacional_vigencia_id_sis_simples_nacional_faixa_key";

-- AlterTable
ALTER TABLE "_emb_tipo_veiculo_insumos" DROP CONSTRAINT "_emb_tipo_veiculo_insumos_AB_pkey",
DROP COLUMN "A",
ADD COLUMN     "A" INTEGER NOT NULL,
DROP COLUMN "B",
ADD COLUMN     "B" INTEGER NOT NULL,
ADD CONSTRAINT "_emb_tipo_veiculo_insumos_AB_pkey" PRIMARY KEY ("A", "B");

-- AlterTable
ALTER TABLE "emb_area_segmento" DROP CONSTRAINT "emb_area_segmento_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_area_segmento_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_caracteristicas_carroceria" DROP CONSTRAINT "emb_caracteristicas_carroceria_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_caracteristicas_carroceria_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_carga" DROP CONSTRAINT "emb_carga_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_tipo_carga",
ADD COLUMN     "id_emb_tipo_carga" INTEGER,
ADD CONSTRAINT "emb_carga_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_carga_auxiliar_verificador_extra" DROP CONSTRAINT "emb_carga_auxiliar_verificador_extra_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_carga_auxiliar_verificador_extra_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_carga_verificador_extra" DROP CONSTRAINT "emb_carga_verificador_extra_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_auxiliar_verificador_extra_carga",
ADD COLUMN     "id_auxiliar_verificador_extra_carga" INTEGER,
ADD CONSTRAINT "emb_carga_verificador_extra_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_classificacao_carrocerias" DROP CONSTRAINT "emb_classificacao_carrocerias_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_classificacao_carrocerias_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_classificacao_implementos" DROP CONSTRAINT "emb_classificacao_implementos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_classificacao_implementos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_classificacao_veiculos" DROP CONSTRAINT "emb_classificacao_veiculos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_classificacao_veiculos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_combinacao_carroceria_historico" DROP CONSTRAINT "emb_combinacao_carroceria_historico_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_tipo_carroceria",
ADD COLUMN     "id_emb_tipo_carroceria" INTEGER NOT NULL,
DROP COLUMN "id_emb_tipo_veiculo",
ADD COLUMN     "id_emb_tipo_veiculo" INTEGER NOT NULL,
ADD CONSTRAINT "emb_combinacao_carroceria_historico_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_combinacao_carroceria_orcamento" DROP CONSTRAINT "emb_combinacao_carroceria_orcamento_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_tipo_carroceria",
ADD COLUMN     "id_emb_tipo_carroceria" INTEGER NOT NULL,
DROP COLUMN "id_emb_tipo_veiculo",
ADD COLUMN     "id_emb_tipo_veiculo" INTEGER NOT NULL,
ADD CONSTRAINT "emb_combinacao_carroceria_orcamento_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_combustivel_estado" DROP CONSTRAINT "emb_combustivel_estado_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_combustivel_estado_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_combustivel_mesorregiao" DROP CONSTRAINT "emb_combustivel_mesorregiao_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_combustivel_mesorregiao_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_combustivel_microregiao" DROP CONSTRAINT "emb_combustivel_microregiao_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_combustivel_microregiao_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_combustivel_municipio" DROP CONSTRAINT "emb_combustivel_municipio_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_combustivel_municipio_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_custo_fixo_vigencia" DROP CONSTRAINT "emb_custo_fixo_vigencia_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
DROP COLUMN "id_emb_tipo_veiculo",
ADD COLUMN     "id_emb_tipo_veiculo" INTEGER NOT NULL,
DROP COLUMN "id_emb_segmento_carga",
ADD COLUMN     "id_emb_segmento_carga" INTEGER NOT NULL,
DROP COLUMN "id_emb_caracteristica_carroceria",
ADD COLUMN     "id_emb_caracteristica_carroceria" INTEGER NOT NULL,
DROP COLUMN "emb_carga_auxiliar_verificador_extraId",
ADD COLUMN     "emb_carga_auxiliar_verificador_extraId" INTEGER,
ADD CONSTRAINT "emb_custo_fixo_vigencia_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_custo_variavel_vigencia" DROP CONSTRAINT "emb_custo_variavel_vigencia_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
DROP COLUMN "id_emb_segmento_carga",
ADD COLUMN     "id_emb_segmento_carga" INTEGER NOT NULL,
DROP COLUMN "id_emb_tipo_veiculo",
ADD COLUMN     "id_emb_tipo_veiculo" INTEGER NOT NULL,
DROP COLUMN "id_emb_caracteristica_carroceria",
ADD COLUMN     "id_emb_caracteristica_carroceria" INTEGER NOT NULL,
DROP COLUMN "emb_carga_auxiliar_verificador_extraId",
ADD COLUMN     "emb_carga_auxiliar_verificador_extraId" INTEGER,
ADD CONSTRAINT "emb_custo_variavel_vigencia_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_dados_coleta_postos" DROP CONSTRAINT "emb_dados_coleta_postos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_posto",
ADD COLUMN     "id_posto" INTEGER,
ADD CONSTRAINT "emb_dados_coleta_postos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_fipe_historico" DROP CONSTRAINT "emb_fipe_historico_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_fipe",
ADD COLUMN     "id_emb_fipe" INTEGER NOT NULL,
DROP COLUMN "id_emb_tipos_veiculo",
ADD COLUMN     "id_emb_tipos_veiculo" INTEGER,
ADD CONSTRAINT "emb_fipe_historico_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_fornecedores_insumos" DROP CONSTRAINT "emb_fornecedores_insumos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_fornecedores_insumos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_frota" DROP CONSTRAINT "emb_frota_pkey",
DROP COLUMN "id_tabela_fipe",
DROP COLUMN "id_tabela_fipe_carroceria_semi",
DROP COLUMN "id_tabela_fipe_carroceria_semi_2",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_marcas_carroceria_tracionador",
ADD COLUMN     "id_emb_marcas_carroceria_tracionador" INTEGER NOT NULL,
DROP COLUMN "id_emb_tipos_veiculo_tracionador",
ADD COLUMN     "id_emb_tipos_veiculo_tracionador" INTEGER NOT NULL,
DROP COLUMN "id_emb_tipos_carroceria_semi",
ADD COLUMN     "id_emb_tipos_carroceria_semi" INTEGER,
DROP COLUMN "id_emb_marcas_carroceria_semi",
ADD COLUMN     "id_emb_marcas_carroceria_semi" INTEGER,
DROP COLUMN "id_emb_caracteristicas_carroceria_semi",
ADD COLUMN     "id_emb_caracteristicas_carroceria_semi" INTEGER,
DROP COLUMN "id_emb_portes_carroceria_semi",
ADD COLUMN     "id_emb_portes_carroceria_semi" INTEGER,
DROP COLUMN "id_emb_tipos_carroceria_semi_2",
ADD COLUMN     "id_emb_tipos_carroceria_semi_2" INTEGER,
DROP COLUMN "id_emb_marcas_carroceria_semi_2",
ADD COLUMN     "id_emb_marcas_carroceria_semi_2" INTEGER,
DROP COLUMN "id_emb_caracteristicas_carroceria_semi_2",
ADD COLUMN     "id_emb_caracteristicas_carroceria_semi_2" INTEGER,
DROP COLUMN "id_emb_portes_carroceria_semi_2",
ADD COLUMN     "id_emb_portes_carroceria_semi_2" INTEGER,
ALTER COLUMN "cd_fipe_tracionador" DROP NOT NULL,
ADD CONSTRAINT "emb_frota_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_frota_reposicao" DROP CONSTRAINT "emb_frota_reposicao_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emg_segmento_carga",
ADD COLUMN     "id_emg_segmento_carga" INTEGER,
DROP COLUMN "id_emb_tabela_fipe",
ADD COLUMN     "id_emb_tabela_fipe" INTEGER NOT NULL,
DROP COLUMN "id_emb_tipo_veiculo",
ADD COLUMN     "id_emb_tipo_veiculo" INTEGER NOT NULL,
ADD CONSTRAINT "emb_frota_reposicao_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_frota_vigencia" DROP CONSTRAINT "emb_frota_vigencia_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_tipos_veiculo",
ADD COLUMN     "id_emb_tipos_veiculo" INTEGER NOT NULL,
DROP COLUMN "id_emb_frota",
ADD COLUMN     "id_emb_frota" INTEGER NOT NULL,
ADD CONSTRAINT "emb_frota_vigencia_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_implementos" DROP CONSTRAINT "emb_implementos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_classificacao_implemento",
ADD COLUMN     "id_classificacao_implemento" INTEGER NOT NULL,
ADD CONSTRAINT "emb_implementos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_implementos_historico" DROP CONSTRAINT "emb_implementos_historico_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_combinacao_orcamento",
ADD COLUMN     "id_emb_combinacao_orcamento" INTEGER NOT NULL,
ADD CONSTRAINT "emb_implementos_historico_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_insumos" DROP CONSTRAINT "emb_insumos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_tipo_insumo",
ADD COLUMN     "id_tipo_insumo" INTEGER NOT NULL,
ADD CONSTRAINT "emb_insumos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_marcas_carroceria" DROP CONSTRAINT "emb_marcas_carroceria_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_marcas_carroceria_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_orcamentos_carroceria_semireboque" DROP CONSTRAINT "emb_orcamentos_carroceria_semireboque_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_tipo_veiculo",
ADD COLUMN     "id_emb_tipo_veiculo" INTEGER NOT NULL,
DROP COLUMN "id_emb_tipo_carroceria",
ADD COLUMN     "id_emb_tipo_carroceria" INTEGER NOT NULL,
DROP COLUMN "id_emb_caracteristica_carroceria",
ADD COLUMN     "id_emb_caracteristica_carroceria" INTEGER NOT NULL,
ADD CONSTRAINT "emb_orcamentos_carroceria_semireboque_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_parametros_apuracao_carga" DROP CONSTRAINT "emb_parametros_apuracao_carga_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_segmento_carga",
ADD COLUMN     "id_emb_segmento_carga" INTEGER NOT NULL,
DROP COLUMN "id_emb_tipos_veiculo",
ADD COLUMN     "id_emb_tipos_veiculo" INTEGER NOT NULL,
DROP COLUMN "id_unidade_medida_minima",
ADD COLUMN     "id_unidade_medida_minima" INTEGER NOT NULL,
ADD CONSTRAINT "emb_parametros_apuracao_carga_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_postos_coleta" DROP CONSTRAINT "emb_postos_coleta_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_postos_coleta_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_segmento_carga" DROP CONSTRAINT "emb_segmento_carga_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_area_segmento",
ADD COLUMN     "id_area_segmento" INTEGER,
ADD CONSTRAINT "emb_segmento_carga_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_tabela_fipe" DROP CONSTRAINT "emb_tabela_fipe_pkey",
DROP COLUMN "cd_tipo_veiculo",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_tipos_veiculo",
ADD COLUMN     "id_emb_tipos_veiculo" INTEGER,
ADD CONSTRAINT "emb_tabela_fipe_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_taxa_juros_ano_modelo" DROP CONSTRAINT "emb_taxa_juros_ano_modelo_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_taxa_juros_ano_modelo_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_tipo_carga" DROP CONSTRAINT "emb_tipo_carga_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_segmento",
ADD COLUMN     "id_segmento" INTEGER,
ADD CONSTRAINT "emb_tipo_carga_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_tipos_carroceria" DROP CONSTRAINT "emb_tipos_carroceria_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_classificacao_carrocerias",
ADD COLUMN     "id_emb_classificacao_carrocerias" INTEGER NOT NULL,
ADD CONSTRAINT "emb_tipos_carroceria_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_tipos_insumo" DROP CONSTRAINT "emb_tipos_insumo_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_tipos_insumo_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_tipos_porte_carroceria_semireboque" DROP CONSTRAINT "emb_tipos_porte_carroceria_semireboque_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_tipos_porte_carroceria_semireboque_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_tipos_veiculo" DROP CONSTRAINT "emb_tipos_veiculo_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_insumo_pneu",
ADD COLUMN     "id_insumo_pneu" INTEGER,
DROP COLUMN "id_emb_insumo_combustivel",
ADD COLUMN     "id_emb_insumo_combustivel" INTEGER,
DROP COLUMN "id_emb_classificacao_veiculos",
ADD COLUMN     "id_emb_classificacao_veiculos" INTEGER NOT NULL,
ADD CONSTRAINT "emb_tipos_veiculo_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_unidade_medida_minima" DROP CONSTRAINT "emb_unidade_medida_minima_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "emb_unidade_medida_minima_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emb_vigencia_insumos_estabelecimento" DROP CONSTRAINT "emb_vigencia_insumos_estabelecimento_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "id_emb_insumo",
ADD COLUMN     "id_emb_insumo" INTEGER NOT NULL,
ADD CONSTRAINT "emb_vigencia_insumos_estabelecimento_pkey" PRIMARY KEY ("id");

-- AlterTable
-- ALTER TABLE "fis_nfe" ADD COLUMN     "ds_documento_transportador" TEXT,
-- ADD COLUMN     "ds_razao_social_transportador" TEXT,
-- ADD COLUMN     "id_fis_empresa_transportadora" TEXT;

-- AlterTable
ALTER TABLE "sis_emb_marcas_carrocerias" DROP CONSTRAINT "sis_emb_marcas_carrocerias_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "sis_emb_marcas_carrocerias_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sis_ibge_uf" ADD COLUMN     "id_microregion" INTEGER;

-- AlterTable
ALTER TABLE "sis_igbe_city" DROP COLUMN "id_microregion";

-- AlterTable
ALTER TABLE "sis_simples_nacional_divisao_taxas_prm_vigencia" DROP COLUMN "id_sis_simples_nacional_faixa",
ADD COLUMN     "id_sis_simples_nacional" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sis_simples_nacional_vigencia" DROP COLUMN "id_sis_simples_nacional_faixa",
ADD COLUMN     "id_sis_simples_nacional" TEXT NOT NULL;

-- DropTable
DROP TABLE "sis_simples_nacional_faixa";

-- CreateIndex
CREATE INDEX "_emb_tipo_veiculo_insumos_B_index" ON "_emb_tipo_veiculo_insumos"("B");

-- CreateIndex
CREATE UNIQUE INDEX "emb_frota_vigencia_dt_vigencia_id_emb_frota_key" ON "emb_frota_vigencia"("dt_vigencia", "id_emb_frota");

-- CreateIndex
CREATE UNIQUE INDEX "emb_orcamentos_carroceria_semireboque_id_emb_empresas_id_em_key" ON "emb_orcamentos_carroceria_semireboque"("id_emb_empresas", "id_emb_tipo_veiculo", "id_emb_tipo_carroceria", "id_emb_caracteristica_carroceria");

-- CreateIndex
CREATE UNIQUE INDEX "emb_parametros_apuracao_carga_id_emb_segmento_carga_id_emb__key" ON "emb_parametros_apuracao_carga"("id_emb_segmento_carga", "id_emb_estabelecimento", "id_emb_tipos_veiculo", "id_unidade_medida_minima");

-- CreateIndex
CREATE UNIQUE INDEX "emb_tabela_fipe_cd_fipe_key" ON "emb_tabela_fipe"("cd_fipe");

-- CreateIndex
CREATE UNIQUE INDEX "sis_simples_nacional_divisao_taxas_prm_vigencia_id_sis_simp_key" ON "sis_simples_nacional_divisao_taxas_prm_vigencia"("id_sis_simples_nacional", "dt_vigencia");

-- CreateIndex
CREATE UNIQUE INDEX "sis_simples_nacional_vigencia_id_sis_simples_nacional_key" ON "sis_simples_nacional_vigencia"("id_sis_simples_nacional");

-- CreateIndex
CREATE UNIQUE INDEX "sis_simples_nacional_vigencia_id_sis_simples_nacional_dt_vi_key" ON "sis_simples_nacional_vigencia"("id_sis_simples_nacional", "dt_vigencia");

-- AddForeignKey
ALTER TABLE "emb_carga" ADD CONSTRAINT "emb_carga_id_emb_tipo_carga_fkey" FOREIGN KEY ("id_emb_tipo_carga") REFERENCES "emb_tipo_carga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "emb_fipe_historico" ADD CONSTRAINT "emb_fipe_historico_id_emb_fipe_fkey" FOREIGN KEY ("id_emb_fipe") REFERENCES "emb_tabela_fipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "emb_frota_vigencia" ADD CONSTRAINT "emb_frota_vigencia_id_emb_tipos_veiculo_fkey" FOREIGN KEY ("id_emb_tipos_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_vigencia" ADD CONSTRAINT "emb_frota_vigencia_id_emb_frota_fkey" FOREIGN KEY ("id_emb_frota") REFERENCES "emb_frota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_reposicao" ADD CONSTRAINT "emb_frota_reposicao_id_emg_segmento_carga_fkey" FOREIGN KEY ("id_emg_segmento_carga") REFERENCES "emb_segmento_carga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_reposicao" ADD CONSTRAINT "emb_frota_reposicao_id_emb_tabela_fipe_fkey" FOREIGN KEY ("id_emb_tabela_fipe") REFERENCES "emb_tabela_fipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_frota_reposicao" ADD CONSTRAINT "emb_frota_reposicao_id_emb_tipo_veiculo_fkey" FOREIGN KEY ("id_emb_tipo_veiculo") REFERENCES "emb_tipos_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_insumos" ADD CONSTRAINT "emb_insumos_id_tipo_insumo_fkey" FOREIGN KEY ("id_tipo_insumo") REFERENCES "emb_tipos_insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_vigencia_insumos_estabelecimento" ADD CONSTRAINT "emb_vigencia_insumos_estabelecimento_id_emb_insumo_fkey" FOREIGN KEY ("id_emb_insumo") REFERENCES "emb_insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emb_dados_coleta_postos" ADD CONSTRAINT "emb_dados_coleta_postos_id_posto_fkey" FOREIGN KEY ("id_posto") REFERENCES "emb_postos_coleta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
-- ALTER TABLE "fis_nfe" ADD CONSTRAINT "fis_nfe_id_fis_empresa_transportadora_fkey" FOREIGN KEY ("id_fis_empresa_transportadora") REFERENCES "fis_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_simples_nacional_vigencia" ADD CONSTRAINT "sis_simples_nacional_vigencia_id_sis_simples_nacional_fkey" FOREIGN KEY ("id_sis_simples_nacional") REFERENCES "sis_simples_nacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_simples_nacional_divisao_taxas_prm_vigencia" ADD CONSTRAINT "sis_simples_nacional_divisao_taxas_prm_vigencia_id_sis_sim_fkey" FOREIGN KEY ("id_sis_simples_nacional") REFERENCES "sis_simples_nacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_ibge_uf" ADD CONSTRAINT "sis_ibge_uf_id_microregion_fkey" FOREIGN KEY ("id_microregion") REFERENCES "sis_microregions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_emb_tipo_veiculo_insumos" ADD CONSTRAINT "_emb_tipo_veiculo_insumos_A_fkey" FOREIGN KEY ("A") REFERENCES "emb_insumos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_emb_tipo_veiculo_insumos" ADD CONSTRAINT "_emb_tipo_veiculo_insumos_B_fkey" FOREIGN KEY ("B") REFERENCES "emb_tipos_veiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
