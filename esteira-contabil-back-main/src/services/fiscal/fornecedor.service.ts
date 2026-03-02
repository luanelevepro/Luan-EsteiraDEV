import { fis_fornecedores, Prisma } from '@prisma/client';
import { getFiscalEmpresa } from './fiscal-empresa.service';
import { prisma } from '../prisma';
import { createConsumoIntegracao } from '../administrativo/consumo-integracao.service';
import { getCachedData } from '@/core/cache';

// Função para normalizar documento (CNPJ/CPF)
function normalizeDocumento(doc: string | null | undefined): string {
  if (!doc) return '';
  return doc.replace(/\D/g, ''); // Remove tudo que não for número
}

// Função auxiliar para validar campos obrigatórios do fornecedor
function validateRequiredFornecedorFields(fornecedor: any): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields = [
    { field: 'ds_documento', name: 'documento' },
    { field: 'ds_nome', name: 'nome' },
    { field: 'ds_inscricao_municipal', name: 'inscrição municipal' },
    { field: 'ds_ibge', name: 'código IBGE' },
  ];

  const missingFields = requiredFields
    .filter(({ field }) => !fornecedor[field])
    .map(({ name }) => name);

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

export const sincronizarFornecedoresByEmpresaId = async (
  empresaId: string
): Promise<any> => {
  const empresa = await prisma.sis_empresas.findFirst({
    where: {
      AND: [
        { id: empresaId },
        { js_access: { some: { js_modules: { has: 'FISCAL' } } } },
      ],
    },
    select: {
      id_externo: true,
      id_escritorio: true,
      id: true,
      fis_empresas: true,
    },
  });

  if (!empresa?.id_escritorio) {
    empresa.id_escritorio = empresa.id;
  }

  const patch = '/dados/fornecedores/empresa/';
  try {
    const escritorio = await prisma.sis_empresas.findUnique({
      where: {
        id: empresa.id_escritorio,
      },
      select: { ds_url: true, id: true },
    });

    const listaFornecedores: any[] = [];
    const urlPatch = `${escritorio.ds_url}${patch}${empresa.id_externo}`;
    createConsumoIntegracao({
      empresaId,
      dt_competencia: new Date().toString(),
      ds_consumo: 1,
      ds_tipo_consumo: 'API_DOMINIO',
      integracaoId: 'dominio',
    });
    console.log(`Sincronizando: ${urlPatch}`);

    try {
      const resposta = await fetch(urlPatch, {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });

      if (!resposta.ok) {
        throw new Error(`Erro HTTP: ${resposta.status}`);
      }

      const data: any[] = await resposta.json();
      listaFornecedores.push(...data);
    } catch (error: any) {
      throw new Error(`Erro ao obter dados dos fornecedores: ${error.message}`);
    }

    const resultados = await createOrUpdateFornecedores(
      listaFornecedores,
      empresa.id
    );
    return resultados;
  } catch (error: any) {
    throw new Error('Erro ao obter fornecedores: ' + error.message);
  }
};

export const sincronizarFornecedoresBlackList = async (
  empresaId: string,
  temFornecedores: { id_externo: string | null; ds_documento: string }[]
): Promise<any> => {
  const empresa = await prisma.sis_empresas.findFirst({
    where: {
      AND: [
        { id: empresaId },
        { js_access: { some: { js_modules: { has: 'FISCAL' } } } },
      ],
    },
    select: {
      id_externo: true,
      id_escritorio: true,
    },
  });
  if (!empresa)
    throw new Error('Empresa não encontrada ou sem permissão FISCAL');
  const idEscritorio = empresa.id_escritorio ?? empresaId;

  const escritorio = await prisma.sis_empresas.findUnique({
    where: { id: idEscritorio },
    select: { ds_url: true },
  });
  if (!escritorio) throw new Error('URL do escritório não configurada');

  const url = `${escritorio.ds_url}/dados/fornecedores/empresa/${empresa.id_externo}`;
  createConsumoIntegracao({
    empresaId,
    dt_competencia: new Date().toString(),
    ds_consumo: 1,
    ds_tipo_consumo: 'API_DOMINIO',
    integracaoId: 'dominio',
  });
  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'ngrok-skip-browser-warning': 'true' },
  });
  if (!resp.ok) {
    throw new Error(`Erro HTTP ao buscar fornecedores: ${resp.status}`);
  }
  const listaApi: Array<{
    id_externo: string;
    ds_documento: string;
    [key: string]: any;
  }> = await resp.json();

  // blacklist
  const listaFiltrada = listaApi.filter(
    (apiForn) =>
      !temFornecedores.some(
        (dbForn) =>
          dbForn.id_externo === apiForn.id_externo &&
          dbForn.ds_documento === apiForn.ds_documento
      )
  );

  const resultados = await createOrUpdateFornecedores(listaFiltrada, empresaId);
  return resultados;
};

export const createOrUpdateFornecedores = async (
  fornecedores: any[],
  empresaId: string
): Promise<any> => {
  try {
    const fis_empresa = await getFiscalEmpresa(empresaId);

    // Filtrar fornecedores com documento nulo ou vazio
    const fornecedoresValidos = fornecedores.filter((fornecedor) => {
      const doc = normalizeDocumento(
        fornecedor.ds_documento ?? fornecedor.cgce_for
      );
      return doc && doc.length > 0;
    });

    if (fornecedoresValidos.length === 0) {
      return { create: [], update: [] };
    }

    // Buscar fornecedores existentes para esta empresa
    const fornecedoresExistentes = await prisma.fis_fornecedores.findMany({
      where: { id_fis_empresas: fis_empresa.id },
    });

    // Criar um mapa de documentos para fornecedores existentes
    const documentosExistentes = new Map();
    fornecedoresExistentes.forEach((f) => {
      const doc = normalizeDocumento(f.ds_documento);
      if (doc && doc.length > 0) {
        documentosExistentes.set(doc, f);
      }
    });

    // Separar fornecedores em novos e para atualizar
    const novosFornecedores = [];
    const fornecedoresAtualizar = [];
    const documentosProcessados = new Set();

    for (const fornecedor of fornecedoresValidos) {
      const documentoNormalizado = normalizeDocumento(
        fornecedor.ds_documento ?? fornecedor.cgce_for
      );

      // Se já processamos este documento na mesma importação, pule
      if (documentosProcessados.has(documentoNormalizado)) {
        continue;
      }

      documentosProcessados.add(documentoNormalizado);

      if (documentosExistentes.has(documentoNormalizado)) {
        fornecedoresAtualizar.push(fornecedor);
      } else {
        novosFornecedores.push(fornecedor);
      }
    }

    // Criar novos fornecedores
    let resultadoCreate = [];
    if (novosFornecedores.length > 0) {
      resultadoCreate = await Promise.all(
        novosFornecedores.map((fornecedor) => {
          const documentoNormalizado = normalizeDocumento(
            fornecedor.ds_documento ?? fornecedor.cgce_for
          );
          return prisma.fis_fornecedores.create({
            data: {
              id_fis_empresas: fis_empresa.id,
              id_externo: fornecedor.id_externo,
              id_empresa_externo: fornecedor.id_empresa_externo,
              ds_nome: fornecedor.ds_nome ?? fornecedor.nome_for,
              ds_endereco: fornecedor.ds_endereco ?? fornecedor.ende_for,
              ds_cep: fornecedor.ds_cep ?? fornecedor.cepe_for,
              ds_inscricao: fornecedor.ds_inscricao ?? fornecedor.insc_for,
              ds_telefone: fornecedor.ds_telefone ?? fornecedor.fone_for,
              ds_inscricao_municipal:
                fornecedor.ds_inscricao_municipal ?? fornecedor.imun_for,
              ds_bairro: fornecedor.ds_bairro ?? fornecedor.bair_for,
              ds_email: fornecedor.ds_email ?? fornecedor.email_for,
              ds_codigo_municipio:
                fornecedor.ds_codigo_municipio ?? fornecedor.codigo_municipio,
              ds_complemento:
                fornecedor.ds_complemento ?? fornecedor.complemento_for,
              dt_cadastro:
                new Date(fornecedor.dt_cadastro) ??
                new Date(fornecedor.CADASTRO_FOR),
              ds_ibge: fornecedor.ds_ibge ?? fornecedor.codigo_ibge,
              ds_documento: documentoNormalizado,
              ds_codigo_uf: fornecedor.ds_codigo_uf,
              ds_status: 'ATIVO',
            },
          });
        })
      );
    }

    // Preparar array de operações de atualização
    const updates = fornecedoresAtualizar
      .map((fornecedor) => {
        const documentoNormalizado = normalizeDocumento(
          fornecedor.ds_documento ?? fornecedor.cgce_for
        );
        const existingFornecedor =
          documentosExistentes.get(documentoNormalizado);

        if (existingFornecedor) {
          return prisma.fis_fornecedores.update({
            where: { id: existingFornecedor.id },
            data: {
              id_externo: fornecedor.id_externo,
              id_empresa_externo: fornecedor.id_empresa_externo,
              ds_nome: fornecedor.ds_nome ?? fornecedor.nome_for,
              ds_endereco: fornecedor.ds_endereco ?? fornecedor.ende_for,
              ds_cep: fornecedor.ds_cep ?? fornecedor.cepe_for,
              ds_inscricao: fornecedor.ds_inscricao ?? fornecedor.insc_for,
              ds_telefone: fornecedor.ds_telefone ?? fornecedor.fone_for,
              ds_inscricao_municipal:
                fornecedor.ds_inscricao_municipal ?? fornecedor.imun_for,
              ds_bairro: fornecedor.ds_bairro ?? fornecedor.bair_for,
              ds_email: fornecedor.ds_email ?? fornecedor.email_for,
              ds_codigo_municipio:
                fornecedor.ds_codigo_municipio ?? fornecedor.codigo_municipio,
              ds_complemento:
                fornecedor.ds_complemento ?? fornecedor.complemento_for,
              dt_cadastro:
                new Date(fornecedor.dt_cadastro) ??
                new Date(fornecedor.CADASTRO_FOR),
              ds_ibge: fornecedor.ds_ibge ?? fornecedor.codigo_ibge,
              ds_documento: documentoNormalizado,
              ds_codigo_uf: fornecedor.ds_codigo_uf,
              ds_status: 'ATIVO',
            },
          });
        }
        return null;
      })
      .filter(Boolean); // Remove undefined values

    // Executar todas as atualizações em uma única transação
    let resultadoUpdate = [];
    if (updates.length > 0) {
      try {
        // console.log(`Iniciando atualização dos fornecedores...`);
        resultadoUpdate = await prisma.$transaction(updates);
        // console.log(`Atualização concluída com sucesso`, resultadoUpdate);
      } catch (error) {
        console.error(`Erro ao atualizar fornecedores:`, error.message);
        throw error;
      }
    }

    return { create: resultadoCreate, update: resultadoUpdate };
  } catch (error: any) {
    throw new Error(
      'Erro ao criar ou atualizar fornecedores: ' + error.message
    );
  }
};

export const getFornecedoresByEmpresaId = async (
  empresaId: string
): Promise<any> => {
  try {
    const fis_empresa = await getFiscalEmpresa(empresaId);
    return await prisma.fis_fornecedores.findMany({
      where: { id_fis_empresas: fis_empresa.id },
      orderBy: { ds_nome: 'asc' },
    });
  } catch (error: any) {
    throw new Error('Erro ao obter fornecedores: ' + error.message);
  }
};

export const getFornecedoresPaginacao = async (
  empresaId: string,
  page: number,
  pageSize: number,
  orderBy: 'asc' | 'desc',
  orderColumn: string,
  search: string
  // status: string | null
) => {
  const idEmpresa = await getFiscalEmpresa(empresaId);
  let whereClause: any = { id_fis_empresas: idEmpresa.id };

  // if (status === 'Ativos') {
  //   whereClause.is_ativo = true;
  // } else if (status === 'Inativos') {
  //   whereClause.is_ativo = false;
  // }
  if (search) {
    whereClause.ds_nome = { contains: search, mode: 'insensitive' };
  }

  const total = await prisma.fis_fornecedores.count({ where: whereClause });
  const totalPages = Math.ceil(total / pageSize);
  const parts = orderColumn.split('.');
  const orderByClause = parts.reduceRight(
    (accumulator: any, key: string) => ({ [key]: accumulator }),
    orderBy
  );
  let fornecedores = await prisma.fis_fornecedores.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    total,
    totalPages,
    page,
    pageSize,
    fornecedores,
  };
};

export const createFornecedor = async (
  empresaId: string,
  fornecedor: Prisma.fis_fornecedoresCreateInput
): Promise<any> => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  const documentoNormalizado = normalizeDocumento(fornecedor.ds_documento);

  // Primeiro verifica se já existe um fornecedor com o mesmo documento
  const fornecedorExistente = await prisma.fis_fornecedores.findFirst({
    where: {
      AND: [
        { ds_documento: documentoNormalizado },
        { id_fis_empresas: fis_empresa.id },
      ],
    },
  });
  if (fornecedorExistente) {
    throw new Error('Fornecedor já existe com o mesmo documento.');
  }

  // Depois valida os campos obrigatórios
  const { isValid, missingFields } =
    validateRequiredFornecedorFields(fornecedor);

  if (isValid) {
    return await prisma.fis_fornecedores.create({
      data: {
        ...fornecedor,
        ds_documento: documentoNormalizado,
        ds_status: 'NOVO',
        fis_empresas: {
          connect: { id: fis_empresa.id },
        },
      },
    });
  } else {
    throw new Error(
      `Campos obrigatórios faltando: ${missingFields.join(', ')}.`
    );
  }
};

export const updateFornecedor = async (
  fornecedorId: string,
  fornecedor: Prisma.fis_fornecedoresUpdateInput
): Promise<any> => {
  const fornecedorExistente = await prisma.fis_fornecedores.findUnique({
    where: { id: fornecedorId },
  });

  if (!fornecedorExistente) {
    throw new Error('Fornecedor não encontrado.');
  }

  const documentoNormalizado = normalizeDocumento(
    fornecedor.ds_documento as string
  );

  const { isValid, missingFields } =
    validateRequiredFornecedorFields(fornecedor);

  if (isValid) {
    // Verificar se já existe outro fornecedor com o mesmo documento
    const outroFornecedor = await prisma.fis_fornecedores.findFirst({
      where: {
        AND: [
          { ds_documento: documentoNormalizado },
          { id_fis_empresas: fornecedorExistente.id_fis_empresas },
          { id: { not: fornecedorId } }, // Excluir o próprio fornecedor da busca
        ],
      },
    });

    if (outroFornecedor) {
      throw new Error('Já existe outro fornecedor com o mesmo documento.');
    }

    return await prisma.fis_fornecedores.update({
      where: { id: fornecedorId },
      data: {
        ...fornecedor,
        ds_documento: documentoNormalizado,
      },
    });
  } else {
    throw new Error(
      `Campos obrigatórios faltando: ${missingFields.join(', ')}.`
    );
  }
};

export const deleteFornecedor = async (fornecedorId: string): Promise<any> => {
  const fornecedorExistente = await prisma.fis_fornecedores.findUnique({
    where: { id: fornecedorId },
  });
  if (!fornecedorExistente) {
    throw new Error('Fornecedor não encontrado.');
  }
  return await prisma.fis_fornecedores.delete({
    where: { id: fornecedorId },
  });
};

export const getFornecedoresCached = async (
  empresaId: string
): Promise<fis_fornecedores[]> => {
  return getCachedData(`fornecedores_empresa_${empresaId}`, async () => {
    let fornecedores = await prisma.fis_fornecedores.findMany({
      where: { id_fis_empresas: empresaId },
    });

    return fornecedores;
  });
};
