import { prisma } from '../prisma';
import { getTmsEmpresa } from './tms-empresa.service';
import { getRhEmpresa } from '../rh/rh-empresa.service';
import * as ViagensService from './viagens.service';
import * as ColunasPersonalizadasService from './colunas-personalizadas.service';

type ImportMapColunas = Record<string, string | undefined>;
type ImportMapPersonalizadas = Record<string, string | undefined>;

export type FormatoDataImport = 'serial_excel' | 'dd-mm-yyyy' | 'yyyy-mm-dd';

export interface ViagensImportRequest {
  mapColunas: ImportMapColunas;
  mapFormatoData?: Record<string, FormatoDataImport>;
  mapPersonalizadas?: ImportMapPersonalizadas;
  rows: Array<Record<string, unknown>>;
}

export interface ViagensImportResult {
  total: number;
  sucesso: number;
  falhas: { linha: number; erro: string }[];
  primeiraFalha?: { linha: number; erro: string };
}

const DATE_FIELD_KEYS_VIAGEM = ['dt_agendada', 'dt_previsao_retorno'] as const;
const DATE_FIELD_LABELS: Record<string, string> = {
  dt_agendada: 'Data agendada',
  dt_previsao_retorno: 'Data previsão retorno',
};

function getCell(row: Record<string, unknown>, header?: string): string {
  if (!header) return '';
  const raw = row[header];
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number') return String(raw);
  if (raw instanceof Date) return raw.toISOString();
  return String(raw).trim();
}

function normalizeOpcaoComparacao(value: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function getOpcoesFromJsValores(jsValores: unknown): string[] {
  if (
    jsValores == null ||
    typeof jsValores !== 'object' ||
    Array.isArray(jsValores)
  ) {
    return [];
  }
  return Object.keys(jsValores as Record<string, unknown>);
}

function resolveValorPersonalizadoParaImportacao(
  linhaPlanilha: number,
  colunaMeta: {
    id: string;
    ds_nome_coluna: string;
    ds_tipo: string;
    js_valores: unknown;
  },
  valorBruto: string
): string {
  if (colunaMeta.ds_tipo !== 'OPCAO') return valorBruto;

  const opcoes = getOpcoesFromJsValores(colunaMeta.js_valores);
  if (opcoes.length === 0) return valorBruto;

  const valorNormalizado = normalizeOpcaoComparacao(valorBruto);
  const opcaoCanonica = opcoes.find(
    (opcao) => normalizeOpcaoComparacao(opcao) === valorNormalizado
  );

  if (opcaoCanonica) return opcaoCanonica;

  throw new Error(
    `Linha ${linhaPlanilha} — Coluna personalizada "${colunaMeta.ds_nome_coluna}": valor "${valorBruto}" inválido. Opções permitidas: ${opcoes.join(', ')}`
  );
}

function parseDateByFormat(
  raw: string,
  format: FormatoDataImport,
  fieldLabel: string,
  linhaPlanilha: number
): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const formatLabel =
    format === 'serial_excel'
      ? 'Data Serial (Excel)'
      : format === 'dd-mm-yyyy'
        ? 'dd-mm-yyyy'
        : 'yyyy-mm-dd';

  if (format === 'serial_excel') {
    const num = Number(trimmed);
    if (Number.isNaN(num) || !Number.isInteger(num)) {
      throw new Error(
        `Linha ${linhaPlanilha} — Campo "${fieldLabel}": valor "${trimmed}" inválido para o formato "${formatLabel}". Informe um número serial (ex.: 46077).`
      );
    }
    const excelEpoch = new Date(1899, 11, 30).getTime();
    const date = new Date(excelEpoch + num * 86400000);
    if (Number.isNaN(date.getTime())) {
      throw new Error(
        `Linha ${linhaPlanilha} — Campo "${fieldLabel}": valor "${trimmed}" não representa uma data válida.`
      );
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T00:00:00.000`;
  }

  if (format === 'dd-mm-yyyy') {
    const match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!match) {
      throw new Error(
        `Linha ${linhaPlanilha} — Campo "${fieldLabel}": valor "${trimmed}" inválido para o formato "${formatLabel}".`
      );
    }
    const [, dayStr, monthStr, yearStr] = match;
    const day = parseInt(dayStr!, 10);
    const month = parseInt(monthStr!, 10);
    const year = parseInt(yearStr!, 10);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new Error(
        `Linha ${linhaPlanilha} — Campo "${fieldLabel}": valor "${trimmed}" não representa uma data válida.`
      );
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T00:00:00.000`;
  }

  if (format === 'yyyy-mm-dd') {
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) {
      throw new Error(
        `Linha ${linhaPlanilha} — Campo "${fieldLabel}": valor "${trimmed}" inválido para o formato "${formatLabel}".`
      );
    }
    const [, yearStr, monthStr, dayStr] = match;
    const year = parseInt(yearStr!, 10);
    const month = parseInt(monthStr!, 10);
    const day = parseInt(dayStr!, 10);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new Error(
        `Linha ${linhaPlanilha} — Campo "${fieldLabel}": valor "${trimmed}" não representa uma data válida.`
      );
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T00:00:00.000`;
  }

  throw new Error(`Formato de data não suportado: ${format}`);
}

const STATUS_VIAGEM_VALIDOS = [
  'PLANEJADA',
  'EM_COLETA',
  'EM_VIAGEM',
  'CONCLUIDA',
  'ATRASADA',
  'CANCELADA',
] as const;

function normalizePlaca(val: string): string {
  return val.replace(/[\s-]/g, '').toUpperCase();
}

/** Resolve motorista: nome na planilha -> rh_funcionarios.ds_nome -> tms_motoristas.id */
async function resolveMotoristaId(
  empresaId: string,
  nomePlanilha: string
): Promise<string | undefined> {
  const trimmed = nomePlanilha.trim();
  if (!trimmed) return undefined;
  const rhEmpresa = await getRhEmpresa(empresaId);
  const funcionario = await prisma.rh_funcionarios.findFirst({
    where: {
      id_rh_empresas: rhEmpresa.id,
      ds_nome: { equals: trimmed, mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (!funcionario) return undefined;
  const motorista = await prisma.tms_motoristas.findFirst({
    where: {
      id_rh_funcionarios: funcionario.id,
      is_ativo: true,
    },
    select: { id: true },
  });
  return motorista?.id;
}

/** Resolve cavalo (tracionador): placa na planilha -> tms_veiculos is_tracionador=true. Retorna id do veículo se encontrado. */
async function resolveCavaloVeiculoId(
  empresaId: string,
  placaPlanilha: string
): Promise<string | undefined> {
  const trimmed = placaPlanilha.trim();
  if (!trimmed) return undefined;
  const tmsEmpresa = await getTmsEmpresa(empresaId);
  const placaNorm = normalizePlaca(trimmed);
  const veiculos = await prisma.tms_veiculos.findMany({
    where: {
      id_tms_empresas: tmsEmpresa.id,
      ds_tipo_unidade: 'TRACIONADOR',
    },
    select: { id: true, ds_placa: true },
  });
  const found = veiculos.find(
    (v) => v.ds_placa && normalizePlaca(v.ds_placa) === placaNorm
  );
  return found?.id;
}

/** Resolve carreta: placa na planilha -> tms_veiculos 'CARROCERIA'. Retorna placa para preencher ds_placa_carreta_N se encontrado. */
async function resolveCarretaPlacaOrUndefined(
  empresaId: string,
  placaPlanilha: string
): Promise<string | undefined> {
  const trimmed = placaPlanilha.trim();
  if (!trimmed) return undefined;
  const tmsEmpresa = await getTmsEmpresa(empresaId);
  const placaNorm = normalizePlaca(trimmed);
  const veiculos = await prisma.tms_veiculos.findMany({
    where: {
      id_tms_empresas: tmsEmpresa.id,
      ds_tipo_unidade: 'CARROCERIA',
    },
    select: { ds_placa: true },
  });
  const found = veiculos.find(
    (v) => v.ds_placa && normalizePlaca(v.ds_placa) === placaNorm
  );
  return found ? trimmed : undefined;
}

/** Resolve par motorista+cavalo -> id de tms_motoristas_veiculos para id_motorista_veiculo na viagem. */
async function resolveIdMotoristaVeiculo(
  _empresaId: string,
  idTmsMotorista: string,
  idTmsVeiculoCavalo: string
): Promise<string | undefined> {
  const par = await prisma.tms_motoristas_veiculos.findFirst({
    where: {
      id_tms_motoristas: idTmsMotorista,
      id_tms_veiculos: idTmsVeiculoCavalo,
      is_ativo: true,
    },
    select: { id: true },
  });
  return par?.id;
}

export async function importViagens(
  empresaId: string,
  payload: ViagensImportRequest
): Promise<ViagensImportResult> {
  const {
    mapColunas,
    mapFormatoData = {},
    mapPersonalizadas = {},
    rows,
  } = payload;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new Error('Nenhuma linha de dados para importar.');
  }

  const personalizadaEntries = Object.entries(mapPersonalizadas).filter(
    ([, header]) => header && header.trim().length > 0
  );
  const colunasPersonalizadasMap = new Map<
    string,
    {
      id: string;
      ds_nome_coluna: string;
      ds_tipo: string;
      js_valores: unknown;
    }
  >();
  if (personalizadaEntries.length > 0) {
    const idsPersonalizadas = personalizadaEntries.map(
      ([colunaId]) => colunaId
    );
    const colunasPersonalizadas =
      await prisma.sis_colunas_personalizadas.findMany({
        where: {
          id_sis_empresa: empresaId,
          id: { in: idsPersonalizadas },
        },
        select: {
          id: true,
          ds_nome_coluna: true,
          ds_tipo: true,
          js_valores: true,
        },
      });
    colunasPersonalizadas.forEach((coluna) => {
      colunasPersonalizadasMap.set(coluna.id, coluna);
    });

    const faltantes = idsPersonalizadas.filter(
      (id) => !colunasPersonalizadasMap.has(id)
    );
    if (faltantes.length > 0) {
      throw new Error(
        `Colunas personalizadas não encontradas para esta empresa: ${faltantes.join(', ')}`
      );
    }
  }

  const allFalhas: { linha: number; erro: string }[] = [];
  let totalSucesso = 0;
  let primeiraFalha: { linha: number; erro: string } | undefined;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown>;
    const linhaPlanilha = i + 2;

    try {
      const ds_motorista = mapColunas['ds_motorista']?.trim()
        ? getCell(row, mapColunas['ds_motorista'])
        : '';
      const ds_placa_cavalo = mapColunas['ds_placa_cavalo']?.trim()
        ? getCell(row, mapColunas['ds_placa_cavalo'])
        : '';

      if (!ds_motorista.trim()) {
        throw new Error('Motorista é obrigatório.');
      }
      if (!ds_placa_cavalo.trim()) {
        throw new Error('Placa do cavalo mecânico é obrigatória.');
      }

      const parseDateField = (
        key: (typeof DATE_FIELD_KEYS_VIAGEM)[number]
      ): string | undefined => {
        const header = mapColunas[key];
        if (!header || !header.trim()) return undefined;
        const format = mapFormatoData[key];
        if (!format) {
          throw new Error(
            `Selecione o formato da data para o campo "${DATE_FIELD_LABELS[key] ?? key}".`
          );
        }
        const raw = getCell(row, header);
        return parseDateByFormat(
          raw,
          format,
          DATE_FIELD_LABELS[key] ?? key,
          linhaPlanilha
        );
      };

      const dt_agendada = mapColunas['dt_agendada']?.trim()
        ? parseDateField('dt_agendada')
        : undefined;
      const dt_previsao_retorno = mapColunas['dt_previsao_retorno']?.trim()
        ? parseDateField('dt_previsao_retorno')
        : undefined;

      let ds_status: string | undefined;
      if (mapColunas['ds_status']?.trim()) {
        const statusRaw = getCell(row, mapColunas['ds_status'])
          .toUpperCase()
          .trim();
        if (
          statusRaw &&
          STATUS_VIAGEM_VALIDOS.includes(
            statusRaw as (typeof STATUS_VIAGEM_VALIDOS)[number]
          )
        ) {
          ds_status = statusRaw;
        } else {
          ds_status = 'PLANEJADA';
        }
      }

      const cd_viagem = mapColunas['cd_viagem']?.trim()
        ? getCell(row, mapColunas['cd_viagem']).trim() || undefined
        : undefined;

      // Resolução motorista (rh_funcionarios.ds_nome -> tms_motoristas)
      const idTmsMotorista = await resolveMotoristaId(empresaId, ds_motorista);

      // Resolução cavalo (tms_veiculos is_tracionador=true); texto da planilha sempre em ds_placa_cavalo
      const idVeiculoCavalo = await resolveCavaloVeiculoId(
        empresaId,
        ds_placa_cavalo
      );

      // Resolução carretas: só preencher ds_placa_carreta_N se placa existir em tms_veiculos e for CARROCERIA
      const rawCarreta1 = mapColunas['ds_placa_carreta_1']?.trim()
        ? getCell(row, mapColunas['ds_placa_carreta_1'])
        : '';
      const rawCarreta2 = mapColunas['ds_placa_carreta_2']?.trim()
        ? getCell(row, mapColunas['ds_placa_carreta_2'])
        : '';
      const rawCarreta3 = mapColunas['ds_placa_carreta_3']?.trim()
        ? getCell(row, mapColunas['ds_placa_carreta_3'])
        : '';
      const ds_placa_carreta_1 = rawCarreta1
        ? await resolveCarretaPlacaOrUndefined(empresaId, rawCarreta1)
        : undefined;
      const ds_placa_carreta_2 = rawCarreta2
        ? await resolveCarretaPlacaOrUndefined(empresaId, rawCarreta2)
        : undefined;
      const ds_placa_carreta_3 = rawCarreta3
        ? await resolveCarretaPlacaOrUndefined(empresaId, rawCarreta3)
        : undefined;

      // Par motorista+cavalo -> id_motorista_veiculo na viagem
      let id_motorista_veiculo: string | undefined;
      if (idTmsMotorista && idVeiculoCavalo) {
        id_motorista_veiculo = await resolveIdMotoristaVeiculo(
          empresaId,
          idTmsMotorista,
          idVeiculoCavalo
        );
      }

      const viagem = await ViagensService.createViagem(empresaId, {
        cd_viagem,
        ds_motorista: ds_motorista.trim(),
        ds_placa_cavalo: ds_placa_cavalo.trim(),
        ds_placa_carreta_1: ds_placa_carreta_1 ?? undefined,
        ds_placa_carreta_2: ds_placa_carreta_2 ?? undefined,
        ds_placa_carreta_3: ds_placa_carreta_3 ?? undefined,
        dt_agendada: dt_agendada
          ? new Date(dt_agendada).toISOString()
          : undefined,
        dt_previsao_retorno: dt_previsao_retorno
          ? new Date(dt_previsao_retorno).toISOString()
          : undefined,
        ds_status: ds_status ?? 'PLANEJADA',
        id_motorista_veiculo: id_motorista_veiculo ?? undefined,
      });

      const viagemId = viagem.id as string;

      for (const [colunaId, header] of personalizadaEntries) {
        const valorBruto = getCell(row, header);
        if (!valorBruto) continue;

        const colunaMeta = colunasPersonalizadasMap.get(colunaId);
        if (!colunaMeta) {
          throw new Error(`Coluna personalizada "${colunaId}" não encontrada.`);
        }
        const valor = resolveValorPersonalizadoParaImportacao(
          linhaPlanilha,
          colunaMeta,
          valorBruto
        );

        await ColunasPersonalizadasService.upsertDado(empresaId, {
          id_sis_colunas_personalizadas: colunaId,
          id_referencia: viagemId,
          ds_valor: valor,
        });
      }

      totalSucesso += 1;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro desconhecido ao importar linha.';
      const isFirstFailure = allFalhas.length === 0;
      if (isFirstFailure) {
        primeiraFalha = { linha: linhaPlanilha, erro: message };
      }
      allFalhas.push({ linha: linhaPlanilha, erro: message });
    }
  }

  return {
    total: rows.length,
    sucesso: totalSucesso,
    falhas: allFalhas,
    ...(primeiraFalha && { primeiraFalha }),
  };
}
