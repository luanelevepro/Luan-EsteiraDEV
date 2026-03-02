import { getEmbarcadorEmpresa } from '@/services/embarcador/embarcador-empresa.service';
import { prisma } from '@/services/prisma';
import { getCachedData } from '@/core/cache';
import { limparTexto } from '@/services/sistema/sincronizar/ibge.service';
import { ensureEmbarcadorCity } from '@/services/embarcador/core/embarcador-functions';

export interface SessionData {
  userId: string;
  empresaId: string;
}

export type ColumnTypeMapping = {
  string: string;
  date: Date;
  number: number;
  boolean: boolean;
};

type ColumnType = keyof ColumnTypeMapping;

/**
 * Definição de colunas para importação.
 *
 * Define o nome da coluna no banco de dados, o nome da tabela para o usuário e faz validações básicas baseados na configuração do objeto.
 *
 * Aceita objeto `customResolver` para resolver relações e providenciar forma de requisitar dados de apoio direto no CSV do cliente.
 * @see {@link customResolver}
 * @example
 * // Esta coluna não será exibida para o cliente no CSV modelo.
 * // Executará a função `customResolver` para obter o valor correto.
 * // Falhará se customResolver não retornar um valor válido já que não é `nullable`. O memso acontece caso customResolver não esteja definido, porém o valor seja `null` ou `undefined`.
 * {
 *  name: 'id_emb_empresas',
 *  type: 'string',
 *  nullable: false,
 *  display: false,
 *  customResolver: async ({ empresaId }, row) => {
 *   const emb_empresaId = getEmbarcadorEmpresaId(empresaId)
 *   return emb_empresaId
 *  }
 */
interface ColumnDefinition<T extends ColumnType> {
  /**
   * Se ausente, é uma coluna estática.
   * Colunas estáticas não são inseridas no banco de dados e servem apenas para exibição ou tratamento especial através da propriedade `customResolver`.
   * @see {@link customResolver}
   */
  name?: string;
  /**
   * Tipo da coluna como o usuário deve preencher (SQL).
   */
  type: T;
  /**
   * Se true, a coluna pode ser nula/vazia
   */
  nullable: boolean;
  /**
   * Se falso, a coluna é omitida do CSV modelo, não é exibida na interface mas é chamada o callback `customResolver` que por sua vez recebem sempre os mesmos argumentos:
   * - `sessionData`: dados da sessão do usuário
   * - `data`: o valor da linha que está sendo processada
   * O tipo retornado deve ser o mesmo informado na propriedade `type` da coluna.
   * @see {@link customResolver}
   *
   * Se string, o valor é exibido na interface, no CSV e inserido no banco de dados.
   */
  display: string | false;
  /**
   * Callback para resolução dinâmica dos campos CSV.
   * @param sessionData ID's da sessão do usuário (empresaId, userId)
   * @param row - O objeto que representa a linha do CSV que está sendo processada. Lembre-se que o nome das colunas não são os mesmos do banco de dados, mas sim os definidos na propriedade `display` da coluna já que o CSV escrito pelo cliente possui os display names nas colunas.
   */
  customResolver?: (
    sessionData: SessionData,
    row: any
  ) => Promise<ColumnTypeMapping[T]>;
}

/**
 * Definição de tabela para importação.
 * @see {@link ColumnDefinition}
 */
interface TableDefinition {
  tableName: string;
  columns: Array<ColumnDefinition<ColumnType>>;
}

type ImportableTables = Array<TableDefinition>;

export default [
  // {
  //   "tableName": "emb_classificacao_carrocerias",
  //   "columns": [
  //     {
  //       "name": "ds_classificacao",
  //       "type": "string",
  //       "nullable": false,
  //       "display": "Classificação"
  //     },
  //     {
  //       "name": "id_emb_empresas",
  //       "type": "string",
  //       "nullable": false,
  //       "display": false,
  //       "customResolver": async ({ empresaId }, row) => {
  //         const emb_empresa = await getEmbarcadorEmpresa(empresaId)
  //         return emb_empresa.id
  //       }
  //     }
  //   ]
  // },
  // {
  //   "tableName": "emb_classificacao_implementos",
  //   "columns": [
  //     {
  //       "name": "ds_classificacao",
  //       "type": "string",
  //       "nullable": false,
  //       "display": "Classificação"
  //     },
  //     {
  //       "name": "fl_acrescimo_eixo",
  //       "type": "boolean",
  //       "nullable": true
  //     },
  //     {
  //       "name": "id_emb_empresas",
  //       "type": "string",
  //       "nullable": false,
  //       "display": false,
  //       "customResolver": async ({ empresaId }, row) => {
  //         const emb_empresa = await getEmbarcadorEmpresa(empresaId)
  //         return emb_empresa.id
  //       }
  //     }
  //   ]
  // },
  // {
  //   "tableName": "emb_classificacao_veiculos",
  //   "columns": [
  //     {
  //       "name": "ds_classificacao",
  //       "type": "string",
  //       "nullable": false,
  //       "display": "Classificação"
  //     },
  //     {
  //       "name": "fl_carroceria_um_independente",
  //       "type": "boolean",
  //       "nullable": true,
  //       "display": "Carroceria 01 Independente"
  //     },
  //     {
  //       "name": "fl_carroceria_dois_independente",
  //       "type": "boolean",
  //       "nullable": true,
  //       "display": "Carroceria 02 Independente"
  //     },
  //     {
  //       "name": "id_emb_empresas",
  //       "type": "string",
  //       "nullable": false,
  //       "display": false,
  //       "customResolver": async ({ empresaId }, row) => {
  //         const emb_empresa = await getEmbarcadorEmpresa(empresaId)
  //         return emb_empresa.id
  //       }
  //     }
  //   ]
  // },
  // {
  //   "tableName": "emb_empresas",
  //   "columns": [
  //     {
  //       "name": "id",
  //       "type": "string",
  //       "nullable": false
  //     },
  //     {
  //       "name": "id_sis_empresas",
  //       "type": "string",
  //       "nullable": false
  //     }
  //   ]
  // },
  // {
  //   "tableName": "emb_estabelecimentos",
  //   "columns": [
  //     {
  //       "name": "id",
  //       "type": "string",
  //       "nullable": false
  //     },
  //     {
  //       "name": "ds_nome",
  //       "type": "string",
  //       "nullable": false
  //     },
  //     {
  //       "name": "id_emb_empresas",
  //       "type": "string",
  //       "nullable": false,
  //       "display": false,
  //       "customResolver": async ({ empresaId }, row) => {
  //         const emb_empresa = await getEmbarcadorEmpresa(empresaId)
  //         return emb_empresa.id
  //       }
  //     },
  //     {
  //       "name": "id_emb_ibge_cidade",
  //       "type": "string",
  //       "nullable": false,
  //       "display": "Cidade",
  //       "customResolver": async ({ userId, empresaId }, row) => {
  //         const foundCity = await prisma.sis_igbe_city.findFirst({
  //           where: {
  //             id: row.id_emb_ibge_cidade,
  //             id_ibge_uf: row.id_emb_ibge_uf
  //           }
  //         })

  //         return foundCity.id
  //       }
  //     },
  //     {
  //       "type": "string",
  //       "nullable": false,
  //       "display": "UF",
  //     }
  //   ]
  // },
  // {
  //   "tableName": "emb_ibge_cidades",
  //   "columns": [
  //     {
  //       "name": "id_sis_cidade",
  //       "type": "number",
  //       "nullable": false
  //     },
  //     {
  //       "name": "id_emb_uf",
  //       "type": "number",
  //       "nullable": false
  //     }
  //   ]
  // },
  // {
  //   "tableName": "emb_ibge_uf",
  //   "columns": [
  //     {
  //       "name": "id_sis_ibge_uf",
  //       "type": "number",
  //       "nullable": false
  //     }
  //   ]
  // },
  // {
  //   "tableName": "emb_taxa_juros_ano_modelo",
  //   "columns": [
  //     {
  //       "name": "cd_ano",
  //       "type": "number",
  //       "nullable": false
  //     },
  //     {
  //       "name": "vl_taxa_juros",
  //       "type": "double precision",
  //       "nullable": false
  //     }
  //   ]
  // },
  {
    tableName: 'emb_transportadoras',
    columns: [
      {
        name: 'cd_transportadora',
        type: 'string',
        display: 'Cód',
        nullable: false,
      },
      {
        name: 'ds_cnpj',
        type: 'string',
        display: 'CNPJ',
        nullable: false,
        customResolver: async ({ userId, empresaId }, row) => {
          return row.CNPJ.replace(/\D/g, '');
        },
      },
      {
        name: 'ds_nome_fantasia',
        type: 'string',
        display: 'Nome Fantasia',
        nullable: false,
      },
      {
        name: 'ds_razao_social',
        type: 'string',
        nullable: false,
        display: 'Razão Social',
      },
      {
        name: 'id_emb_empresas',
        type: 'string',
        nullable: false,
        display: false,
        customResolver: async ({ empresaId }, row) => {
          const emb_empresa = await getEmbarcadorEmpresa(empresaId);
          return emb_empresa.id;
        },
      },
      {
        name: 'id_emb_ibge_uf',
        type: 'string',
        display: 'UF',
        nullable: false,
        customResolver: async ({ userId, empresaId }, row) => {
          // Vamos usar este UF na validação da cidade, se não quisessemos inserir ele na query, bastaria remover a propriedade `name`. Colunas sem nome são ignoradas no insert.
          const cityName = limparTexto(row.Cidade);
          const ufName = limparTexto(row.UF);
          const cacheKey = `${cityName}-${ufName}`;
          try {
            const foundCity = await getCachedData(cacheKey, async () => {
              return prisma.sis_igbe_city.findFirst({
                where: {
                  ds_city_clean: {
                    mode: 'insensitive',
                    equals: cityName,
                  },
                  js_uf: {
                    ds_uf: {
                      mode: 'insensitive',
                      equals: ufName,
                    },
                  },
                },
              });
            });

            const ensuredCity = await ensureEmbarcadorCity({
              id_sis_ibge_cidade: foundCity.id,
            });

            return ensuredCity.id_emb_uf;
          } catch (error) {
            if ((error.message as string).includes('properties of null')) {
              throw new Error(
                `Combinação Cidade + UF não encontrada na tebela de referência ao IBGE: ${cityName} - ${ufName}`
              );
            }
            throw new Error(`Erro ao resolver cidade: ${error.message}`);
          }
        },
      },
      {
        display: 'Cidade',
        name: 'id_emb_ibge_cidade',
        type: 'string',
        nullable: false,
        customResolver: async ({ userId, empresaId }, row) => {
          // O cliente preenche como string com o nome da cidade.
          // Nós buscamos essa cidade no banco de dados, pra garantir, também recebemos o UF.
          // Se a cidade não for encontrada, o Prisma retorna null e a validação falha.
          const cityName = limparTexto(row.Cidade);
          const ufName = limparTexto(row.UF);
          const cacheKey = `${cityName}-${ufName}`;
          const foundCity = await getCachedData(cacheKey, async () => {
            return prisma.sis_igbe_city.findFirst({
              where: {
                ds_city_clean: {
                  mode: 'insensitive',
                  equals: cityName,
                },
                js_uf: {
                  ds_uf: {
                    mode: 'insensitive',
                    equals: ufName,
                  },
                },
              },
            });
          });

          const ensuredCity = await ensureEmbarcadorCity({
            id_sis_ibge_cidade: foundCity.id,
          });

          return ensuredCity.id;
        },
      },
    ],
  },
  // {
  //   "tableName": "emb_transportadoras_historico",
  //   "columns": [
  //     {
  //       "name": "cd_transportadora",
  //       "type": "string",
  //       "nullable": false
  //     },
  //     {
  //       "name": "dt_vigencia",
  //       "type": "date",
  //       "nullable": false
  //     },
  //     {
  //       "name": "id_regime_tributario",
  //       "type": "string",
  //       "nullable": true
  //     },
  //     {
  //       "name": "sis_regimes_tributariosId",
  //       "type": "string",
  //       "nullable": true
  //     }
  //   ]
  // }
] as ImportableTables;
