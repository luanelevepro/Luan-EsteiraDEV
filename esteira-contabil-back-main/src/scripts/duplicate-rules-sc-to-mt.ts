import { prisma } from '@/services/prisma';

/**
 * Script para duplicar regras de entrada NFe de SC para MT
 * Executa na inicialização da aplicação
 *
 * O que faz:
 * 1. Busca todas as regras com ds_destino_uf = 'SC'
 * 2. Duplica cada regra alterando:
 *    - ds_destino_uf: SC → MT
 *    - ds_descricao: SC → MT
 * 3. Copia todas as relações (tipos_produto, cfops_origem, csts_origem, origens_trib)
 */

export const duplicateRulesSCtoMT = async () => {
  try {
    console.log('[RulesDuplication] Iniciando duplicação de regras SC → MT...');

    // 1. Buscar todas as regras com destino SC
    const regrasSC = await prisma.fis_regras_entrada_nfe.findMany({
      where: {
        ds_destino_uf: 'SC',
      },
      include: {
        js_tipos_produto: true,
        js_cfop_origem: true,
        js_cst_origem: true,
        js_origem_trib: true,
      },
    });

    console.log(
      `[RulesDuplication] Encontradas ${regrasSC.length} regras com destino SC`
    );

    if (regrasSC.length === 0) {
      console.log(
        '[RulesDuplication] Nenhuma regra encontrada para duplicação'
      );
      return { created: 0, duplicated: [] };
    }

    const duplicated = [];

    for (const regraSC of regrasSC) {
      try {
        // 2. Verificar se já existe regra MT com mesma configuração
        const regraExistente = await prisma.fis_regras_entrada_nfe.findFirst({
          where: {
            ds_destino_uf: 'MT',
            ds_origem_uf: regraSC.ds_origem_uf,
            id_segmento_destinatario: regraSC.id_segmento_destinatario,
            id_regime_destinatario: regraSC.id_regime_destinatario,
            id_regime_emitente: regraSC.id_regime_emitente,
            id_cfop_entrada: regraSC.id_cfop_entrada,
            id_cst_entrada: regraSC.id_cst_entrada,
            id_empresa: regraSC.id_empresa,
          },
        });

        if (regraExistente) {
          console.log(
            `[RulesDuplication] Regra MT já existe para: ${regraSC.ds_descricao}`
          );
          continue;
        }

        // 3. Criar nova regra alterando SC → MT
        const novaDescricao = regraSC.ds_descricao.replace(/SC/g, 'MT');

        const novaRegra = await prisma.fis_regras_entrada_nfe.create({
          data: {
            ds_descricao: novaDescricao,
            ds_origem_uf: regraSC.ds_origem_uf,
            ds_destino_uf: 'MT', // Alterado para MT
            dt_vigencia: regraSC.dt_vigencia,
            js_ncm_produto: regraSC.js_ncm_produto,
            id_segmento_destinatario: regraSC.id_segmento_destinatario,
            id_regime_destinatario: regraSC.id_regime_destinatario,
            id_regime_emitente: regraSC.id_regime_emitente,
            id_cfop_entrada: regraSC.id_cfop_entrada,
            id_cst_entrada: regraSC.id_cst_entrada,
            id_cfop_gerado: regraSC.id_cfop_gerado,
            id_cst_gerado: regraSC.id_cst_gerado,
            id_empresa: regraSC.id_empresa,
          },
        });

        console.log(
          `[RulesDuplication] Regra criada: ${novaDescricao} (${novaRegra.id})`
        );

        // 4. Duplicar tipos de produto
        if (regraSC.js_tipos_produto && regraSC.js_tipos_produto.length > 0) {
          for (const tipoProducto of regraSC.js_tipos_produto) {
            await prisma.fis_regras_entrada_nfe_tipos_produto.create({
              data: {
                id_fis_regras_entrada_nfe: novaRegra.id,
                id_sis_tipos_produto: tipoProducto.id_sis_tipos_produto,
              },
            });
          }
          console.log(
            `[RulesDuplication]   → ${regraSC.js_tipos_produto.length} tipos de produto copiados`
          );
        }

        // 5. Duplicar CFOPs de origem
        if (regraSC.js_cfop_origem && regraSC.js_cfop_origem.length > 0) {
          for (const cfopOrigem of regraSC.js_cfop_origem) {
            await prisma.fis_regras_entrada_nfe_cfop_origem.create({
              data: {
                id_fis_regras_entrada_nfe: novaRegra.id,
                id_cfop: cfopOrigem.id_cfop,
              },
            });
          }
          console.log(
            `[RulesDuplication]   → ${regraSC.js_cfop_origem.length} CFOPs de origem copiados`
          );
        }

        // 6. Duplicar CSTs de origem
        if (regraSC.js_cst_origem && regraSC.js_cst_origem.length > 0) {
          for (const cstOrigem of regraSC.js_cst_origem) {
            await prisma.fis_regras_entrada_nfe_cst_origem.create({
              data: {
                id_fis_regras_entrada_nfe: novaRegra.id,
                id_sis_cst: cstOrigem.id_sis_cst,
              },
            });
          }
          console.log(
            `[RulesDuplication]   → ${regraSC.js_cst_origem.length} CSTs de origem copiados`
          );
        }

        // 7. Duplicar origens tributárias
        if (regraSC.js_origem_trib && regraSC.js_origem_trib.length > 0) {
          for (const origemTrib of regraSC.js_origem_trib) {
            await prisma.fis_regras_entrada_nfe_origem_trib.create({
              data: {
                id_fis_regras_entrada_nfe: novaRegra.id,
                id_sis_origem_cst: origemTrib.id_sis_origem_cst,
              },
            });
          }
          console.log(
            `[RulesDuplication]   → ${regraSC.js_origem_trib.length} origens tributárias copiadas`
          );
        }

        duplicated.push({
          original: regraSC.id,
          copia: novaRegra.id,
          descricao: novaDescricao,
        });
      } catch (err) {
        console.error(
          `[RulesDuplication] Erro ao duplicar regra ${regraSC.id}:`,
          (err as any)?.message || err
        );
      }
    }

    console.log(
      `[RulesDuplication] Duplicação concluída: ${duplicated.length} regras criadas para MT`
    );

    return {
      created: duplicated.length,
      duplicated,
    };
  } catch (err) {
    console.error(
      '[RulesDuplication] Erro crítico na duplicação de regras:',
      (err as any)?.message || err
    );
    throw err;
  }
};

/**
 * Executar o script
 * Descomente a linha abaixo para testar manualmente
 */
// duplicateRulesSCtoMT();
