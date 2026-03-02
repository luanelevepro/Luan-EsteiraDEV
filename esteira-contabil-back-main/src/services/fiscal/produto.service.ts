import { fis_produtos, PrismaClient } from '@prisma/client';
import { getFiscalEmpresa } from './fiscal-empresa.service';
import { prisma } from '../prisma';
import { createConsumoIntegracao } from '../administrativo/consumo-integracao.service';
import { orderBy as naturalOrderBy } from 'natural-orderby';

const converteTiposProdutos = async (produtos?: fis_produtos[]) => {
  let tiposProdutos = await prisma.sis_tipos_produto.findMany({
    select: {
      ds_codigo: true,
      ds_descricao: true,
    },
  });

  const tiposMap = new Map(
    tiposProdutos.map((tp) => [
      tp.ds_codigo ? parseInt(tp.ds_codigo, 10) : null,
      tp.ds_descricao,
    ])
  );

  let produtosConvertidos = produtos.map((produto) => ({
    ...produto,
    // preserva o valor original de ds_tipo_item em cd_tipo_item
    cd_tipo_item: produto.ds_tipo_item,
    // converte ds_tipo_item para a descrição quando possível, suportando string/número
    ds_tipo_item: (() => {
      const original = produto.ds_tipo_item;
      if (original === null || original === undefined) return null;
      // tenta interpretar string numérica como número para lookup
      const key =
        typeof original === 'string' && /^\d+$/.test(original)
          ? parseInt(original, 10)
          : original;
      return tiposMap.get(key) ?? original;
    })(),
  }));

  return produtosConvertidos;
};

export const getProdutos = async (empresaId: string, tipo?: string) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);

  let whereClause: any = { id_fis_empresas: fis_empresa.id };

  if (tipo === 'produto') {
    whereClause.ds_tipo_item = { not: 9 };
  } else if (tipo === 'servico') {
    whereClause.ds_tipo_item = 9;
  }

  let produtos = await prisma.fis_produtos.findMany({
    where: whereClause,
    orderBy: { id_externo: 'asc' },
  });

  if (produtos.length === 0) {
    produtos = await sincronizarProdutos(empresaId, whereClause);
  }

  const produtosConvertidos = await converteTiposProdutos(produtos);

  return produtosConvertidos;
};

export const getProdutosAtivos = async (
  empresaId: string,
  tipo?: string,
  cd_ncm?: string
) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);

  let whereClause: any = {
    id_fis_empresas: fis_empresa.id,
    OR: [{ ds_status: 'ATIVO' }, { ds_status: 'NOVO' }],
    ...(cd_ncm && { cd_ncm: cd_ncm }),
  };

  if (tipo === 'produto') {
    whereClause.ds_tipo_item = { not: 9 };
  } else if (tipo === 'servico') {
    whereClause.ds_tipo_item = 9;
  }

  let produtos = await prisma.fis_produtos.findMany({
    where: whereClause,
    select: {
      id: true,
      id_externo: true,
      ds_nome: true,
      ds_unidade: true,
      cd_ncm: true,
      ds_tipo_item: true,
    },
    orderBy: { ds_nome: 'asc' },
  });

  const produtosExistentes = await prisma.fis_produtos.count({
    where: {
      id_fis_empresas: fis_empresa.id,
    },
  });
  if (produtosExistentes === 0) {
    produtos = await sincronizarProdutos(empresaId, whereClause);
  }

  const produtosPreparados = produtos.map((p) => ({
    ...p,
    ds_tipo_item:
      p.ds_tipo_item !== null && typeof p.ds_tipo_item === 'string'
        ? parseInt(p.ds_tipo_item, 10)
        : p.ds_tipo_item,
  }));

  const produtosConvertidos = await converteTiposProdutos(
    produtosPreparados as unknown as fis_produtos[]
  );

  // Aplicar ordenação natural em memória por `id_externo` para respeitar ordem como '1,2,10'
  try {
    // a função naturalOrderBy modifica/retorna novo array ordenado
    const ordenados = naturalOrderBy(produtosConvertidos, ['ds_nome'], ['asc']);
    return ordenados;
  } catch (err) {
    // se algo falhar, retornar a lista como veio do banco
    console.error('Erro aplicando ordenação natural em produtos:', err);
    return produtosConvertidos;
  }
};

export const updateProduto = async (empresaId: string, id: string, data) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);

  let produto = await prisma.fis_produtos.update({
    where: { id, id_fis_empresas: fis_empresa.id },
    data: data,
  });

  return produto;
};

export const createProduto = async (empresaId: string, data) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);

  // Verifica se já existe um produto com a mesma combinação de nome e NCM
  const produtoExistente = await prisma.fis_produtos.findFirst({
    where: {
      id_fis_empresas: fis_empresa.id,
      ds_nome: data.ds_nome,
      cd_ncm: data.cd_ncm || null,
    },
  });

  if (produtoExistente) {
    throw new Error(
      `Já existe um produto com o nome "${data.ds_nome}"${data.cd_ncm ? ` e NCM "${data.cd_ncm}"` : ''} cadastrado para esta empresa.`
    );
  }

  let produto = await prisma.fis_produtos.create({
    data: {
      id_fis_empresas: fis_empresa.id,
      ...data,
    },
  });

  return produto;
};

// const que possui o paginação correta, porém não está em uso pois precisamos ser capazes de selecionar todos os produtos de uma vez
// export const getProdutosPaginacao2 = async (
//   empresaId: string,
//   page: number,
//   pageSize: number,
//   orderBy: 'asc' | 'desc',
//   orderColumn: string,
//   search: string,
//   tipo?: string,
//   status?: string[]
// ) => {
//   const fis_empresa = await getFiscalEmpresa(empresaId);

//   let whereClause: any = { id_fis_empresas: fis_empresa.id };
//   if (status?.length) whereClause.ds_status = { in: status };
//   if (tipo === 'produto') {
//     whereClause.ds_tipo_item = { not: 9 };
//   } else if (tipo === 'servico') {
//     whereClause.ds_tipo_item = 9;
//   }

//   whereClause.ds_nome = search
//     ? { contains: search, mode: 'insensitive' }
//     : undefined;

//   const total = await prisma.fis_produtos.count({
//     where: whereClause,
//   });

//   const totalPages = Math.ceil(total / pageSize);
//   const parts = orderColumn.split('.');
//   const orderByClause = parts.reduceRight(
//     (accumulator: any, key: string) => ({ [key]: accumulator }),
//     orderBy
//   );
//   let produtosBrutos = await prisma.fis_produtos.findMany({
//     where: whereClause,
//     orderBy: orderByClause,
//     skip: (page - 1) * pageSize,
//     take: pageSize,
//   });

//   if (produtosBrutos.length === 0) {
//     produtosBrutos = await sincronizarProdutos(empresaId, whereClause);
//   }

//   const produtos = await converteTiposProdutos(produtosBrutos);

//   return { total, totalPages, page, pageSize, produtos };
// };

/**
 * Retorna produtos sem paginação nem parâmetros de ordenação/pesquisa.
 * Parâmetros opcionais: tipo ('produto' | 'servico') e status (array de status)
 */
export const getProdutosPaginacao = async (
  empresaId: string,
  tipo?: string,
  tipoProduto?: string[],
  status?: string[],
  cd_ncm?: string
) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  let whereClause: any = { id_fis_empresas: fis_empresa.id };
  if (status?.length) whereClause.ds_status = { in: status };
  if (cd_ncm) whereClause.cd_ncm = cd_ncm;

  if (tipoProduto?.length) {
    whereClause.ds_tipo_item = { in: tipoProduto.map(Number) };
  } else if (tipo === 'produto') {
    whereClause.ds_tipo_item = { not: 9 };
  } else if (tipo === 'servico') {
    whereClause.ds_tipo_item = 9;
  }

  let produtos = await prisma.fis_produtos.findMany({ where: whereClause });

  if (
    produtos.length === 0 &&
    tipoProduto?.length === 0 &&
    status?.length === 0
  ) {
    produtos = await sincronizarProdutos(empresaId, whereClause);
  }

  const produtosConvertidos = await converteTiposProdutos(produtos);
  return { produtos: produtosConvertidos };
};

export const updateProdutos = async (
  empresaId: string,
  produtos: { id: string; [key: string]: any }[]
) => {
  if (!Array.isArray(produtos)) {
    throw new Error("O parâmetro 'produtos' deve ser um array.");
  }
  const mapInativos = produtos
    .filter((p) => p.ds_status === 'INATIVO')
    .map((p) => p.id);
  const fis_empresa = await getFiscalEmpresa(empresaId);

  const updates = produtos.map(({ id, ...data }) =>
    prisma.fis_produtos.update({
      where: { id, id_fis_empresas: fis_empresa.id },
      data,
    })
  );
  await prisma.fis_nfe_produto_fornecedor.deleteMany({
    where: {
      id_fis_produto: { in: mapInativos },
    },
  });
  const resultados = await Promise.all(updates);
  return resultados;
};

export const deleteProdutos = async (empresaId: string, t) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);

  let produtos = await prisma.fis_produtos.deleteMany({
    where: { id_fis_empresas: fis_empresa.id },
  });
  return produtos;
};

export const inativarTodosProdutos = async (
  empresaId: string,
  tipo: string
) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  if (tipo === 'produto') {
    const produtos = await prisma.fis_produtos.updateMany({
      where: { id_fis_empresas: fis_empresa.id, ds_tipo_item: { not: 9 } },
      data: { ds_status: 'INATIVO' },
    });
    return produtos;
  } else if (tipo === 'servico') {
    const produtos = await prisma.fis_produtos.updateMany({
      where: { id_fis_empresas: fis_empresa.id, ds_tipo_item: 9 },
      data: { ds_status: 'INATIVO' },
    });
    return produtos;
  }
};

export const ativarTodosProdutos = async (empresaId: string, tipo: string) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  if (tipo === 'produto') {
    const produtos = await prisma.fis_produtos.updateMany({
      where: { id_fis_empresas: fis_empresa.id, ds_tipo_item: { not: 9 } },
      data: { ds_status: 'ATIVO' },
    });
    return produtos;
  } else if (tipo === 'servico') {
    const produtos = await prisma.fis_produtos.updateMany({
      where: { id_fis_empresas: fis_empresa.id, ds_tipo_item: 9 },
      data: { ds_status: 'ATIVO' },
    });
    return produtos;
  }
};

export const sincronizarProdutos = async (
  empresaId: string,
  whereClause?: any
): Promise<fis_produtos[]> => {
  console.log('Sincronizando produtos...');
  const fis_empresa = await getFiscalEmpresa(empresaId);
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
  });

  if (!empresa?.id_externo) {
    throw new Error('Empresa não possui dados externos.');
  }

  if (!empresa.id_escritorio) {
    throw new Error('Empresa não possui vínculo com nenhum escritório.');
  }

  const escritorio = await prisma.sis_empresas.findUnique({
    where: { id: empresa.id_escritorio, is_escritorio: true },
  });

  if (!escritorio?.ds_url && !empresa.ds_url) {
    throw new Error('Escritório não possui URL cadastrada.');
  }

  const urlPatch = `${escritorio.ds_url ? escritorio.ds_url : empresa.ds_url}/dados/produtos/empresa/${empresa.id_externo}`;
  console.log(`Sincronizando: ${urlPatch}`);
  createConsumoIntegracao({
    empresaId,
    dt_competencia: new Date().toString(),
    ds_consumo: 1,
    ds_tipo_consumo: 'API_DOMINIO',
    integracaoId: 'dominio',
  });

  try {
    const resposta = await fetch(urlPatch, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });

    if (!resposta.ok) {
      if (resposta.status === 530)
        throw new Error('Túnel não está disponível.');
      throw new Error(`Erro ao obter produtos: ${resposta.statusText}`);
    }

    const produtosExternos: any[] = await resposta.json();

    // Primeiro, vamos buscar os produtos existentes fora da transação
    const produtosExistentes = await prisma.fis_produtos.findMany({
      where: { id_fis_empresas: fis_empresa.id },
      select: {
        id_externo: true,
        cd_identificador: true,
        ds_nome: true,
        id: true,
        ds_status: true,
        ds_unidade: true,
        cd_ncm: true,
        cd_cest: true,
        ds_codigo_barras: true,
        ds_tipo_item: true,
      },
    });

    const normalizeKey = (idExterno: any, nome: any) =>
      `${String(idExterno ?? '').trim()}|${String(nome ?? '')
        .trim()
        .toLowerCase()}`;

    const produtosMap = new Map(
      produtosExistentes.map((p) => [
        normalizeKey(p.id_externo, p.ds_nome),
        p.id,
      ])
    );

    // Promover e atualizar produtos locais com status 'NOVO' quando o serviço
    // externo retornar dados correspondentes. Match será feito apenas por
    // `id_externo` (trimmed) para evitar associação ambígua por nome.
    const existingByExternal = new Map(
      produtosExistentes.map((p) => [String(p.id_externo).trim(), p])
    );

    const updates: Array<any> = [];
    const itemUpdates: Array<any> = [];
    const processedExternalIds = new Set<string>();

    for (const produto of produtosExternos) {
      const externalId = String(produto.id_externo || '').trim();

      // Match apenas por id_externo (trimmed). Não utilizar correspondência por nome.
      let local = existingByExternal.get(externalId);

      if (local) {
        // Atualizar produtos NOVO (promovendo para ATIVO)
        if (local.ds_status === 'NOVO') {
          // tenta resolver tipo de serviço apenas com o campo correto
          const tipo = await formatTipoServico(produto.ds_tipo_servico);
          updates.push(
            prisma.fis_produtos.update({
              where: { id: local.id },
              data: {
                id_empresa_externo: produto.id_empresa,
                id_externo: externalId || local.id_externo, // mantém id_externo anterior se não houver novo
                cd_identificador: produto.cd_identificador,
                ds_unidade: produto.ds_unidade || local.ds_unidade,
                cd_cest: produto.cd_cest || null,
                ds_codigo_barras: produto.ds_codigo_barras || null,
                ds_status: 'ATIVO',
                ds_tipo_item: produto.ds_tipo_item,
                // sincronizar nome caso tenha sido alterado no sistema externo
                ...(produto.ds_nome && produto.ds_nome.trim().length
                  ? { ds_nome: produto.ds_nome }
                  : {}),
                // sincronizar NCM quando disponível no feed externo (campo pode vir como `cd_cncm`)
                ...(produto.cd_cncm ? { cd_ncm: produto.cd_cncm } : {}),
                ...(produto.dt_cadastro
                  ? { dt_cadastro: new Date(produto.dt_cadastro) }
                  : {}),
              },
            })
          );

          processedExternalIds.add(externalId);
        }
        // Atualizar produtos ATIVO/INATIVO quando houver diferenças relevantes
        else if (local.ds_status === 'ATIVO' || local.ds_status === 'INATIVO') {
          const updateData: any = {};

          // atualizar tipo de item quando mudou
          if (local.ds_tipo_item !== produto.ds_tipo_item) {
            console.log(
              `Atualizando ds_tipo_item do produto "${local.ds_nome}": ${local.ds_tipo_item} -> ${produto.ds_tipo_item}`
            );
            updateData.ds_tipo_item = produto.ds_tipo_item;
          }

          // atualizar cd_identificador quando vier diferente do feed
          if (
            String(local.cd_identificador ?? '') !==
            String(produto.cd_identificador ?? '')
          ) {
            console.log(
              `Atualizando cd_identificador do produto "${local.ds_nome}": ${local.cd_identificador} -> ${produto.cd_identificador}`
            );
            updateData.cd_identificador = produto.cd_identificador;
          }

          // sincronizar nome (comparação insensível a maiúsculas / espaços)
          if (
            produto.ds_nome &&
            String(produto.ds_nome).trim().toLowerCase() !==
              String(local.ds_nome || '')
                .trim()
                .toLowerCase()
          ) {
            updateData.ds_nome = produto.ds_nome;
          }

          // outras correções/atualizações comuns
          if ((local.ds_unidade || '') !== (produto.ds_unidade || '')) {
            updateData.ds_unidade = produto.ds_unidade || null;
          }

          // o feed externo pode usar a chave `cd_cncm` (observado em alguns feeds)
          if ((local.cd_ncm || '') !== (produto.cd_cncm || '')) {
            updateData.cd_ncm = produto.cd_cncm || null;
          }

          if ((local.cd_cest || '') !== (produto.cd_cest || '')) {
            updateData.cd_cest = produto.cd_cest || null;
          }

          if (
            (local.ds_codigo_barras || '') !== (produto.ds_codigo_barras || '')
          ) {
            updateData.ds_codigo_barras = produto.ds_codigo_barras || null;
          }

          if (Object.keys(updateData).length > 0) {
            console.log(
              `Atualizando produto "${local.ds_nome}" (id=${local.id}) com campos: ${Object.keys(
                updateData
              ).join(', ')}`
            );
            updates.push(
              prisma.fis_produtos.update({
                where: { id: local.id },
                data: updateData,
              })
            );
            processedExternalIds.add(externalId);
          }
        }
      }
    }

    if (updates.length > 0 || itemUpdates.length > 0) {
      const txOps = [...updates, ...itemUpdates];
      try {
        await prisma.$transaction(txOps);
      } catch (err) {
        console.error(
          'Erro ao atualizar produtos NOVO durante sincronização:',
          err
        );
      }
    }

    const novosProdutos = await Promise.all(
      produtosExternos
        .filter((produto) => {
          const idExtTrim = String(produto.id_externo || '').trim();
          return (
            !processedExternalIds.has(idExtTrim) &&
            !existingByExternal.has(idExtTrim)
          );
        })
        .map(async (produto) => ({
          id_fis_empresas: fis_empresa.id,
          id_empresa_externo: produto.id_empresa,
          id_externo: produto.id_externo.trim(),
          cd_identificador: produto.cd_identificador,
          ds_nome: produto.ds_nome,
          ds_unidade: produto.ds_unidade || null,
          cd_ncm: produto.cd_cncm || null,
          cd_cest: produto.cd_cest || null,
          dt_cadastro: new Date(produto.dt_cadastro),
          ds_tipo_item: produto.ds_tipo_item,
          ds_codigo_barras: produto.ds_codigo_barras || null,
          id_sis_tipos_servico:
            produto.ds_tipo_item === 9
              ? (await formatTipoServico(produto.id_externo))?.id || null
              : null,
        }))
    );
    // Dedupe entries by normalized key to avoid near-duplicates from the feed
    const uniqueMap = new Map<string, (typeof novosProdutos)[0]>();
    for (const p of novosProdutos) {
      const k = normalizeKey(p.id_externo, p.ds_nome);
      if (!uniqueMap.has(k)) uniqueMap.set(k, p);
    }
    const uniqueNovos = Array.from(uniqueMap.values());

    // Agora fazemos a transação apenas para inserir os novos produtos
    if (uniqueNovos.length > 0) {
      await prisma.$transaction(
        async (tx) => {
          await tx.fis_produtos.createMany({
            data: uniqueNovos,
            skipDuplicates: true,
          });
        },
        { maxWait: 10000, timeout: 60000 } // Aumentando o timeout para 60 segundos
      );
    }

    // Por fim, retornamos todos os produtos atualizados
    return await prisma.fis_produtos.findMany({
      where: whereClause || { id_fis_empresas: fis_empresa.id },
    });
  } catch (error) {
    console.error('Erro na sincronização:', error);
    throw new Error(error.message);
  }
};

/**
 * Converte um código “achatado” de tipo de serviço (ex: 103 ou "1715"),
 * formata em duas casas decimais com ponto (ex: "1.03" ou "17.15")
 * e retorna o `id` do primeiro registro em `sis_tipos_servicos`
 * cujo `ds_codigo` case com esse valor.
 *
 * @param valor - Código do tipo de serviço vindo do sistema externo.
 *                Aceita `number` (ex: 103) ou `string` numérica (ex: "1715").
 * @returns Um objeto `{ id: string }` com o `id` do primeiro registro encontrado;
 *          retorna `null` se:
 *          - `valor` não for um inteiro válido, ou
 *          - não houver nenhum registro com o `ds_codigo` correspondente.
 */
export async function formatTipoServico(
  valor: string | number
): Promise<{ id: string } | null> {
  if (valor === undefined || valor === null) return null;

  // Normaliza: remove qualquer caractere não numérico (ex.: 'S1401' -> '1401')
  let digits: string;
  if (typeof valor === 'number') {
    digits = String(valor);
  } else {
    digits = String(valor).replace(/\D+/g, '');
  }

  if (!digits) return null;

  const n = parseInt(digits, 10);
  if (!Number.isInteger(n)) return null;

  // formata com duas casas decimais (ex: 1401 -> 14.01)
  const codigoFormatado = (n / 100).toFixed(2);

  // busca no banco pelo ds_codigo formatado
  const tiposEncontrados = await prisma.sis_tipos_servicos.findMany({
    where: { ds_codigo: codigoFormatado },
    select: { id: true, ds_codigo: true },
  });

  if (tiposEncontrados.length === 0) return null;
  return { id: tiposEncontrados[0].id };
}

export const classifyExistingProductsIds = async (
  empresaId: string,
  listaIdProdutos: string[]
) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  if (listaIdProdutos.length === 0) return;
  const produtosEmpresa = await prisma.fis_produtos.findMany({
    where: {
      id_fis_empresas: fis_empresa.id,
      id_externo: { in: listaIdProdutos },
    },
    select: { id_externo: true, id: true },
  });
  if (produtosEmpresa.length === 0) return listaIdProdutos;

  const idsNaoExistentes = listaIdProdutos.filter((idExterno) =>
    produtosEmpresa.every((p) => p.id_externo !== idExterno)
  );

  return idsNaoExistentes;
};
