import { prisma } from '../../prisma';

const cleanString = (input: string): string =>
  input
    // 1. Normaliza para separar letras de seus diacríticos (acentos)
    .normalize('NFD')
    // 2. Remove os diacríticos
    .replace(/[\u0300-\u036f]/g, '')
    // 3. Remove espaços em branco (todos os tipos de espaço)
    .replace(/\s+/g, '')
    // 4. Remove tudo que não for letra ou número
    .replace(/[^a-zA-Z0-9]/g, '')
    // 5. Converte para minúsculas
    .toLowerCase();

export const createIntegracao = async (
  ds_nome: string,
  ds_descricao: string,
  id_tipo_integracao: string,
  fl_is_para_escritorio: boolean,
  fl_is_para_sistema: boolean = false,
  fields: { id: string; name: string; placeholder: string; type: string }[]
) => {
  return prisma.sis_integracao.create({
    data: {
      ds_nome,
      ds_descricao,
      id_tipo_integracao,
      fl_is_para_escritorio,
      fl_is_para_sistema,
      sis_integracao_campos: {
        create: fields.map((f, index) => ({
          ds_campo_nome: f.name,
          ds_campo_placeholder: f.placeholder,
          ds_campo_tipo: f.type,
          ds_campo_ordem: index + 1,
        })),
      },
    },
    include: {
      sis_integracao_campos: true,
    },
  });
};

export const getIntegracao = async (
  empresaId: string,
  tipoConsulta: string
) => {
  const empresa = await prisma.sis_empresas.findUnique({
    where: {
      id: empresaId,
    },
    select: {
      is_escritorio: true,
      id_externo: true,
    },
  });
  if (empresa.is_escritorio) {
    const int = await prisma.sis_integracao.findMany({
      where: {
        fl_is_para_sistema: false,
      },
      include: {
        js_tipo_integracao: true,
      },
    });
    return int;
  } else if (empresa.id_externo === '0') {
    let int;
    if (tipoConsulta === 'gerencial') {
      int = await prisma.sis_integracao.findMany({
        include: {
          js_tipo_integracao: true,
        },
        orderBy: {
          ds_nome: 'asc',
        },
      });
    } else {
      int = await prisma.sis_integracao.findMany({
        where: {
          fl_is_para_sistema: true,
        },
        include: {
          js_tipo_integracao: true,
        },
        orderBy: {
          ds_nome: 'asc',
        },
      });
    }
    return int;
  } else {
    const int = await prisma.sis_integracao.findMany({
      where: {
        fl_is_para_escritorio: false,
      },
      include: {
        js_tipo_integracao: true,
      },
      orderBy: {
        ds_nome: 'asc',
      },
    });
    return int;
  }
};

export const getIntegracaoCompletaById = async (
  integracao_id: string,
  empresa_id: string
) => {
  const temConfiguracao = await prisma.sis_integracao_config.findFirst({
    where: {
      id_integracao: integracao_id,
      id_sis_empresas: empresa_id,
    },
  });
  if (temConfiguracao) {
    return prisma.sis_integracao.findUnique({
      where: {
        id: integracao_id,
      },
      include: {
        js_tipo_integracao: true,
        sis_integracao_campos: true,
        sis_integracao_config: {
          where: {
            id_sis_empresas: empresa_id,
          },
        },
      },
    });
  } else {
    return prisma.sis_integracao.findUnique({
      where: {
        id: integracao_id,
      },
      include: {
        js_tipo_integracao: true,
        sis_integracao_campos: true,
      },
    });
  }
};

export const deleteIntegracao = async (integracao_id: string) => {
  return prisma.sis_integracao.delete({
    where: {
      id: integracao_id,
    },
  });
};

export const upsertConfig = async (
  id_integracao: string,
  id_sis_empresas: string,
  ds_valores_config: Record<string, string>
) => {
  return prisma.sis_integracao_config.upsert({
    where: {
      ux_empresa_integracao: {
        id_sis_empresas,
        id_integracao,
      },
    },
    create: {
      id_integracao,
      id_sis_empresas,
      ds_valores_config,
    },
    update: {
      ds_valores_config,
    },
  });
};

/**
 * Testa conexão para integrações do tipo Dominio
 */
const testeDominio = async (
  baseUrl: string,
  config: Record<string, string>
): Promise<TestResult> => {
  const url = `${baseUrl}/verf-conexao-dominio`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!resp.ok) {
    let detail: string;
    try {
      const errJson = await resp.json();
      detail = errJson.detail || JSON.stringify(errJson);
    } catch {
      detail = await resp.text();
    }
    throw new Error(`Dominio: conexão falhou (${resp.status}): ${detail}`);
  }
  return (await resp.json()) as TestResult;
};

const testeSieg = async ({
  api_key,
  empresaId,
}: {
  api_key: string;
  empresaId: string;
}): Promise<TestResult> => {
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: { ds_documento: true },
  });
  if (!empresa) {
    throw new Error(`Empresa com ID ${empresaId} não encontrada.`);
  }
  const cnpj = empresa.ds_documento;
  const hoje = new Date().toISOString().slice(0, 10);
  const url = `https://api.sieg.com/BaixarXmls?api_key=${api_key}`;
  const payload = {
    XmlType: 1,
    Take: 1,
    Skip: 0,
    DataEmissaoInicio: hoje,
    DataEmissaoFim: hoje,
    CnpjDest: cnpj,
    Downloadevent: false,
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // se não achou XML, tratamos como "ok, mas vazio"
  if (resp.status === 404) {
    const msgs = (await resp.json()) as string[];
    return {
      success: 'true',
      message: msgs.join('; '),
    };
  }

  if (!resp.ok) {
    let detail: string;
    try {
      const errJson = await resp.json();
      detail = errJson.detail || JSON.stringify(errJson);
    } catch {
      detail = await resp.text();
    }
    throw new Error(`SIEG: conexão falhou (${resp.status}): ${detail}`);
  }

  // 3) Caso 200
  return (await resp.json()) as TestResult;
};

const testeTecnospeedTomados = async ({
  tokenSH,
  cnpjSH,
}: {
  tokenSH: string;
  cnpjSH: string;
}): Promise<TestResult> => {
  const BASE_URL = 'https://api.nfse.tecnospeed.com.br/v1';
  const resp = await fetch(`${BASE_URL}/cidades`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      token_sh: tokenSH,
      CpfCnpjSoftwareHouse: cnpjSH,
      cpfCnpjTomador: cnpjSH,
    } as any,
  });

  if (!resp.ok) {
    let detail: string;
    try {
      const errJson = (await resp.json()) as { message?: string };
      detail = errJson.message || JSON.stringify(errJson);
    } catch {
      detail = await resp.text();
    }
    throw new Error(`Tecnospeed: conexão falhou (${resp.status}): ${detail}`);
  }
  return (await resp.json()) as TestResult;
};

type TestResult = { success: string; message: string };

/**
 * Teste de conexão genérico, delega para o método correto
 */
export const testarConexaoIntegracao = async (
  id_integracao: string,
  id_sis_empresas: string
): Promise<TestResult> => {
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: id_sis_empresas },
    select: { is_escritorio: true, id_escritorio: true, ds_url: true },
  });
  if (!empresa) throw new Error(`Empresa ${id_sis_empresas} não encontrada`);
  const id_escritorio = empresa.is_escritorio
    ? id_sis_empresas
    : (empresa.id_escritorio ?? id_sis_empresas);
  const escritorio = empresa.is_escritorio
    ? empresa
    : await prisma.sis_empresas.findUnique({
        where: { id: id_escritorio },
        select: { ds_url: true },
      });
  if (!escritorio?.ds_url) {
    throw new Error(`URL não encontrada para escritório ${id_escritorio}`);
  }

  const record = await prisma.sis_integracao_config.findFirst({
    where: { id_integracao, id_sis_empresas },
    select: { ds_valores_config: true },
  });
  if (!record) {
    throw new Error(
      `Configuração não encontrada para integracao=${id_integracao} empresa=${id_sis_empresas}`
    );
  }

  const integracao = await prisma.sis_integracao.findUnique({
    where: { id: id_integracao },
    select: { ds_nome: true },
  });
  if (!integracao) {
    throw new Error(`Integração ${id_integracao} não encontrada`);
  }

  const rawConfig = record.ds_valores_config;
  const config = rawConfig as Record<string, string>;
  const chave = integracao.ds_nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  switch (cleanString(chave)) {
    case 'dominio':
      return await testeDominio(escritorio.ds_url, config);
    case 'sieg':
      return await testeSieg({
        api_key: config.api_key,
        empresaId: id_sis_empresas,
      });
    case 'tecnospeedtomados':
      return await testeTecnospeedTomados({
        tokenSH: config.Token_SH,
        cnpjSH: config.Cnpj_SH,
      });
    default:
      throw new Error(`Integração '${integracao.ds_nome}' não suportada`);
  }
};
