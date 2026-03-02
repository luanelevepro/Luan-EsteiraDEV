import { adm_consumo_integracao, TipoConsumoIntegracao } from '@prisma/client';
import { prisma } from '../prisma';
import { getAdmEmpresa } from './administrativo-empresa.service';

interface ConsumoAggregated {
  ds_limite: number;
  ds_consumo: string;
}

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

export function helperMesLocal(dt_competencia: string | Date) {
  // Converte string -> Date (ou usa Date que já vier)
  if (/^\d{4}-\d{2}$/.test(dt_competencia as string)) {
    dt_competencia = new Date(`${dt_competencia}-01T00:00:00`);
  }
  const base =
    typeof dt_competencia === 'string'
      ? new Date(dt_competencia)
      : dt_competencia;

  if (isNaN(base.getTime())) {
    throw new Error('dt_competencia inválida');
  }

  // Mês/ano no fuso LOCAL
  const ano = base.getFullYear();
  const mes = base.getMonth(); // 0‑based

  // 1º dia 00:00:00.000
  const primeiroDia = new Date(ano, mes, 1, -3, 0, 0, 0);

  // Último dia 23:59:59.999
  const ultimoDia = new Date(ano, mes + 1, 0, 20, 59, 59, 999);

  return { primeiroDia, ultimoDia };
}

export interface ConsumoAPI {
  id: string;
  dt_competencia: string;
  ds_consumo: string;
  id_integracao: string;
  id_adm_empresas: string | string[];
  ds_limite: number;
  js_integracao: {
    id: string;
    ds_nome: string;
    ds_descricao: string;
    fl_is_para_escritorio: boolean;
    id_tipo_integracao: string;
  };
}

export const createConsumoIntegracao = async ({
  empresaId,
  dt_competencia,
  ds_consumo,
  ds_tipo_consumo,
  integracaoId,
}: {
  empresaId: string;
  dt_competencia: string;
  ds_consumo: number;
  ds_tipo_consumo: TipoConsumoIntegracao;
  integracaoId: string;
}): Promise<adm_consumo_integracao> => {
  const admEmp = await getAdmEmpresa(empresaId);
  const sisEmp = await prisma.sis_empresas.findFirst({
    where: { id: admEmp.id_sis_empresas },
  });
  switch (cleanString(integracaoId)) {
    case 'sieg':
      if (!sisEmp.is_escritorio && sisEmp.id_escritorio) {
        const integracaoConfig = await prisma.sis_integracao_config.findFirst({
          where: {
            id_sis_empresas: sisEmp.id_escritorio!,
            js_integracao: {
              ds_nome: 'SIEG',
            },
          },
          select: { id_integracao: true },
        });
        integracaoId = integracaoConfig?.id_integracao;
      } else {
        const integracaoConfig = await prisma.sis_integracao_config.findFirst({
          where: {
            id_sis_empresas: sisEmp.id!,
            js_integracao: {
              ds_nome: 'SIEG',
            },
          },
          select: { id_integracao: true },
        });
        integracaoId = integracaoConfig?.id_integracao;
      }
      break;
    case 'tomadostecnospeed':
      const sistema = await prisma.sis_empresas.findFirst({
        where: {
          id_externo: '0',
        },
      });
      const integracaoConfig = await prisma.sis_integracao_config.findFirst({
        where: {
          id_sis_empresas: sistema.id!,
          js_integracao: {
            ds_nome: 'TecnoSpeed - Tomados',
          },
        },
        select: { id_integracao: true },
      });
      integracaoId = integracaoConfig?.id_integracao;

      break;
    case 'dominio':
      if (!sisEmp.is_escritorio && sisEmp.id_escritorio) {
        const integracaoConfig = await prisma.sis_integracao_config.findFirst({
          where: {
            id_sis_empresas: sisEmp.id_escritorio,
            js_integracao: {
              ds_nome: 'Domínio',
            },
          },
          select: { id_integracao: true },
        });
        integracaoId = integracaoConfig?.id_integracao;
      } else {
        const integracaoConfig = await prisma.sis_integracao_config.findFirst({
          where: {
            id_sis_empresas: sisEmp.id!,
            js_integracao: {
              ds_nome: 'Domínio',
            },
          },
          select: { id_integracao: true },
        });
        integracaoId = integracaoConfig?.id_integracao;
      }
      break;
    default:
      break;
  }
  const { primeiroDia, ultimoDia } = helperMesLocal(dt_competencia);

  return await prisma.adm_consumo_integracao.upsert({
    where: {
      empresa_integracao_por_tipo_competencia: {
        id_adm_empresas: admEmp.id,
        id_integracao: integracaoId,
        dt_competencia: primeiroDia,
        ds_tipo_consumo: ds_tipo_consumo,
      },
    },
    create: {
      id_adm_empresas: admEmp.id,
      id_integracao: integracaoId,
      dt_competencia: primeiroDia,
      ds_consumo: ds_consumo,
      ds_tipo_consumo,
    },
    update: {
      ds_consumo: {
        increment: ds_consumo,
      },
    },
  });
};

export const getConsumoIntegracaoByEmpresaIdAndCompt = async (
  empresaId: string, // id na tabela SIS_EMPRESAS
  dt_competencia: string // "YYYY-MM" ou ISO
): Promise<ConsumoAPI[]> => {
  // datas da competência
  const { primeiroDia, ultimoDia } = helperMesLocal(dt_competencia);

  // empresa ADM corrrespondente ao "empresaId" recebido
  const admEmp = await getAdmEmpresa(empresaId);

  // identifica categoria: escritório, sistema-mãe ou empresa comum
  const [escritorio, sistema] = await Promise.all([
    prisma.sis_empresas.findFirst({
      where: { is_escritorio: true, id: empresaId },
      select: { id: true },
    }),
    prisma.sis_empresas.findFirst({
      where: { id_externo: '0', id: empresaId },
      select: { id: true },
    }),
  ]);

  let consumo: any[] = [];
  let empresasComConsumo = 1; // usado p/ calcular limite dinâmico

  // CASO "escritório"  ➜  pegar filiais e o próprio escritório
  if (escritorio) {
    // filiais vinculadas
    const filiais = await prisma.sis_empresas.findMany({
      where: { id_escritorio: empresaId },
      select: { id: true },
    });

    const sisIds = [empresaId, ...filiais.map((f) => f.id)];

    // converte tudo para IDs da tabela ADM_EMPRESAS em **uma** query
    const admIds = await prisma.adm_empresas
      .findMany({
        where: { id_sis_empresas: { in: sisIds } },
        select: { id: true },
      })
      .then((r) => r.map((a) => a.id));

    // busca TODO o consumo desses IDs na competência
    consumo = await prisma.adm_consumo_integracao.findMany({
      where: {
        id_adm_empresas: { in: admIds },
        dt_competencia: { gte: primeiroDia, lte: ultimoDia },
      },
      include: { js_integracao: true },
    });

    // Nº de empresas (filiais) **que realmente consumiram algo**
    empresasComConsumo = new Set(
      consumo
        .filter((c) => c.id_adm_empresas !== admEmp.id) // exclui o próprio escritório
        .map((c) => c.id_adm_empresas)
    ).size;

    // CASO "sistema"
  } else if (sistema) {
    consumo = await prisma.adm_consumo_integracao.findMany({
      where: {
        js_integracao: {
          sis_integracao_config: {
            some: { id_sis_empresas: admEmp.id_sis_empresas },
          },
        },
        dt_competencia: { gte: primeiroDia, lte: ultimoDia },
      },
      include: { js_integracao: true },
    });

    empresasComConsumo =
      (await prisma.adm_consumo_integracao.count({
        where: {
          js_integracao: {
            sis_integracao_config: {
              some: { id_sis_empresas: admEmp.id_sis_empresas },
            },
          },
          dt_competencia: { gte: primeiroDia, lte: ultimoDia },
        },
      })) - 1; // desconta o sistema

    // CASO "empresa comum"
  } else {
    consumo = await prisma.adm_consumo_integracao.findMany({
      where: {
        id_adm_empresas: admEmp.id,
        dt_competencia: { gte: primeiroDia, lte: ultimoDia },
      },
      include: { js_integracao: true },
    });
  }

  // Ajusta nomes e limites
  for (const item of consumo) {
    const cleanedName = cleanString(item.js_integracao.ds_nome);

    // consumo originado por FILIAL (≠ escritório)
    if (admEmp.id !== item.id_adm_empresas) {
      switch (cleanedName) {
        case 'sieg':
          item.js_integracao.ds_nome = 'NFSE Ambiente Nacional - Geral';
          break;
        case 'dominio':
          item.js_integracao.ds_nome = 'Chamadas API - Geral';
          break;
        case 'tecnospeedtomados':
          item.js_integracao.ds_nome = 'NFSE Tomados Prefeituras - Geral';
          break;
      }
      item.ds_limite = empresasComConsumo * 2000;

      // consumo do próprio escritório (ou empresa comum)
    } else {
      switch (cleanedName) {
        case 'sieg':
          item.js_integracao.ds_nome = 'NFSE Ambiente Nacional';
          break;
        case 'dominio':
          item.js_integracao.ds_nome = 'Chamadas Integração Contábil';
          break;
        case 'tecnospeedtomados':
          item.js_integracao.ds_nome = 'NFSE Tomados Prefeituras';
          break;
      }
      item.ds_limite = 2000;
    }
  }

  // Agrupa integrações “- Geral”   (mesma lógica anterior)
  const agregados: ConsumoAPI[] = [];
  const mapGeral = new Map<string, ConsumoAPI>();

  for (const item of consumo) {
    const nome = item.js_integracao.ds_nome;

    if (nome.endsWith(' - Geral')) {
      const existente = mapGeral.get(nome);
      if (existente) {
        existente.ds_consumo = String(
          Number(existente.ds_consumo) + Number(item.ds_consumo)
        );

        existente.id_adm_empresas = Array.isArray(existente.id_adm_empresas)
          ? [...existente.id_adm_empresas, item.id_adm_empresas as string]
          : [
              existente.id_adm_empresas as string,
              item.id_adm_empresas as string,
            ];
      } else {
        mapGeral.set(nome, {
          ...item,
          id_adm_empresas: [item.id_adm_empresas as string],
        });
      }
    } else {
      agregados.push(item);
    }
  }

  agregados.push(...mapGeral.values());
  return agregados;
};

export const getConsumoIntegracaoByEmpresaList = async (
  empresaSisIds: string[], // IDs da tabela SIS_EMPRESAS
  integracaoId: string,
  dt_competencia: string
): Promise<ConsumoAggregated> => {
  const { primeiroDia, ultimoDia } = helperMesLocal(dt_competencia);

  if (empresaSisIds.length === 0) {
    return { ds_limite: 0, ds_consumo: '0' };
  }

  /* ------------------------------------------------------------------
   * 1) Converte todos os IDs do sistema para seus correspondentes
   *    IDs da tabela ADM_EMPRESAS em **uma** query.
   * ------------------------------------------------------------------ */
  const admIds = await prisma.adm_empresas
    .findMany({
      where: { id_sis_empresas: { in: empresaSisIds } },
      select: { id: true },
    })
    .then((rows) => rows.map((r) => r.id));

  if (admIds.length === 0) {
    return { ds_limite: 0, ds_consumo: '0' };
  }

  /* ------------------------------------------------------------------
   * 2) Soma o consumo da integração na competência, também
   *    em **uma** query.
   * ------------------------------------------------------------------ */
  const consumos = await prisma.adm_consumo_integracao.findMany({
    where: {
      id_adm_empresas: { in: admIds },
      id_integracao: integracaoId,
      dt_competencia: {
        gte: primeiroDia,
        lte: ultimoDia,
      },
    },
    select: { id_adm_empresas: true, ds_consumo: true },
  });

  const totalConsumo = consumos.reduce(
    (sum, rec) => sum + Number(rec.ds_consumo),
    0
  );

  const empresasComConsumo = new Set(consumos.map((rec) => rec.id_adm_empresas))
    .size;

  const baseLimit = 2_000; // regra de negócio
  const ds_limite = empresasComConsumo * baseLimit;

  return {
    ds_limite,
    ds_consumo: String(totalConsumo),
  };
};
