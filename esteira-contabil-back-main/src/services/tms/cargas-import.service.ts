import type { Prisma, TipoCarroceria } from '@prisma/client';
import { prisma } from '../prisma';
import { getTmsEmpresa } from './tms-empresa.service';
import * as CargasService from './cargas.service';
import * as ColunasPersonalizadasService from './colunas-personalizadas.service';

type ImportMapColunas = Record<string, string | undefined>;

type ImportMapPersonalizadas = Record<string, string | undefined>;

type ImportContainerMap = {
  id_armador?: string;
  nr_container?: string;
  nr_lacre_container?: string;
  ds_destino_pais?: string;
  ds_setor_container?: string;
};

export type FormatoDataImport = 'serial_excel' | 'dd-mm-yyyy' | 'yyyy-mm-dd';

export interface CargasImportRequest {
  operacaoContainer?: boolean;
  mapColunas: ImportMapColunas;
  mapFormatoData?: Record<string, FormatoDataImport>;
  mapPersonalizadas?: ImportMapPersonalizadas;
  mapContainer?: ImportContainerMap;
  rows: Array<Record<string, unknown>>;
}

const DATE_FIELD_KEYS = [
  'dt_coleta_inicio',
  'dt_coleta',
  'dt_coleta_fim',
  'dt_limite_entrega',
] as const;
const DATE_FIELD_LABELS: Record<string, string> = {
  dt_coleta_inicio: 'Janela coleta início',
  dt_coleta: 'Data coleta',
  dt_coleta_fim: 'Janela coleta fim',
  dt_limite_entrega: 'Data limite entrega',
};

export interface CargasImportResult {
  total: number;
  sucesso: number;
  falhas: { linha: number; erro: string }[];
}

function getCell(row: Record<string, unknown>, header?: string): string {
  if (!header) return '';
  const raw = row[header];
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number') return String(raw);
  if (raw instanceof Date) return raw.toISOString();
  return String(raw).trim();
}

function parseNumber(value: string): number | undefined {
  const v = value.replace(/\./g, '').replace(',', '.').trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function parseIntSafe(value: string): number | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

function parseBoolean(value: string): boolean | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  if (['1', 'true', 'sim', 's', 'y', 'yes'].includes(v)) return true;
  if (['0', 'false', 'nao', 'não', 'n'].includes(v)) return false;
  return undefined;
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

/** Converte valor bruto para YYYY-MM-DD 00:00:00.000 conforme formato. Célula vazia retorna undefined. Erro lança com mensagem para linha/campo. */
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

async function resolveCidadeId(
  empresaId: string,
  raw: string
): Promise<number> {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Cidade obrigatória não informada');
  }

  const maybeId = parseIntSafe(trimmed);
  if (maybeId != null) {
    const c = await prisma.sis_igbe_city.findUnique({ where: { id: maybeId } });
    if (!c) throw new Error(`Cidade com ID ${maybeId} não encontrada`);
    return maybeId;
  }

  const parts = trimmed.split('-').map((p) => p.trim());
  const cidade = parts[0];
  const uf = parts[1] ?? '';

  const found = await prisma.sis_igbe_city.findFirst({
    where: uf
      ? {
          ds_city: { equals: cidade, mode: 'insensitive' },
          js_uf: {
            ds_uf: { equals: uf, mode: 'insensitive' },
          },
        }
      : {
          ds_city: { equals: cidade, mode: 'insensitive' },
        },
  });

  if (!found) {
    throw new Error(`Cidade "${trimmed}" não encontrada`);
  }

  return found.id;
}

/** Normaliza documento (CNPJ/CPF) para busca: só dígitos. */
function normalizeDoc(value: string): string {
  return value.replace(/\D/g, '');
}

/** Resolve cliente por nome ou documento usando fis_clientes (cadastro fiscal). Não usar tms_clientes. */
async function resolveFisClienteId(
  empresaId: string,
  raw: string
): Promise<string | undefined> {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const { getFiscalEmpresa } = await import('../fiscal/fiscal-empresa.service');
  const fisEmpresa = await getFiscalEmpresa(empresaId);
  const whereBase = { id_fis_empresas: fisEmpresa.id };

  const onlyDigits = normalizeDoc(trimmed);
  if (onlyDigits.length >= 11 && onlyDigits.length <= 14) {
    const byDoc =
      (await prisma.fis_clientes.findFirst({
        where: { ...whereBase, ds_documento: trimmed },
        select: { id: true },
      })) ??
      (await prisma.fis_clientes.findFirst({
        where: { ...whereBase, ds_documento: onlyDigits },
        select: { id: true },
      }));
    if (byDoc) return byDoc.id;
  }

  const byNome = await prisma.fis_clientes.findFirst({
    where: {
      ...whereBase,
      ds_nome: { equals: trimmed, mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (byNome) return byNome.id;

  const byNomeContains = await prisma.fis_clientes.findFirst({
    where: {
      ...whereBase,
      ds_nome: { contains: trimmed, mode: 'insensitive' },
    },
    select: { id: true },
  });
  return byNomeContains?.id;
}

async function resolveEmbarcadorId(
  empresaId: string,
  raw: string
): Promise<string | undefined> {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const tmsEmpresa = await getTmsEmpresa(empresaId);

  const byDoc = await prisma.tms_embarcadores.findFirst({
    where: {
      id_tms_empresa: tmsEmpresa.id,
      ds_documento: trimmed,
    },
  });
  if (byDoc) return byDoc.id;

  const byNome = await prisma.tms_embarcadores.findFirst({
    where: {
      id_tms_empresa: tmsEmpresa.id,
      ds_nome: { equals: trimmed, mode: 'insensitive' },
    },
  });
  if (byNome) return byNome.id;

  return undefined;
}

async function resolveSegmentoId(
  empresaId: string,
  raw: string
): Promise<string | undefined> {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const tmsEmpresa = await getTmsEmpresa(empresaId);

  const byCodigo = await prisma.tms_segmentos.findFirst({
    where: {
      id_tms_empresas: tmsEmpresa.id,
      cd_identificador: trimmed,
    },
  });
  if (byCodigo) return byCodigo.id;

  const byNome = await prisma.tms_segmentos.findFirst({
    where: {
      id_tms_empresas: tmsEmpresa.id,
      ds_nome: { equals: trimmed, mode: 'insensitive' },
    },
  });
  if (byNome) return byNome.id;

  return undefined;
}

async function resolveArmadorId(raw: string): Promise<string | undefined> {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const existing = await prisma.sis_armadores.findFirst({
    where: {
      ds_nome: { equals: trimmed, mode: 'insensitive' },
    },
  });
  if (existing) return existing.id;

  // Create-if-not-exists: cadastra o armador pelo nome para alimentar o campo na importação
  const created = await prisma.sis_armadores.create({
    data: { ds_nome: trimmed },
  });
  return created.id;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizePlaca(val: string): string {
  return val.replace(/[\s-]/g, '').toUpperCase();
}

async function resolveCarroceriaPlanejadaId(
  empresaId: string,
  raw: string
): Promise<string | undefined> {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const tmsEmpresa = await getTmsEmpresa(empresaId);
  const baseWhere = {
    id_tms_empresas: tmsEmpresa.id,
    ds_tipo_unidade: 'CARROCERIA' as const,
  };

  if (UUID_REGEX.test(trimmed)) {
    const byId = await prisma.tms_veiculos.findFirst({
      where: { ...baseWhere, id: trimmed },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  const placaNorm = normalizePlaca(trimmed);
  if (placaNorm) {
    const carrocerias = await prisma.tms_veiculos.findMany({
      where: baseWhere,
      select: { id: true, ds_placa: true, cd_identificador: true },
    });
    const byPlaca = carrocerias.find(
      (v) => v.ds_placa && normalizePlaca(v.ds_placa) === placaNorm
    );
    if (byPlaca) return byPlaca.id;

    const byCd = carrocerias.find(
      (v) =>
        v.cd_identificador &&
        v.cd_identificador.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (byCd) return byCd.id;
  }

  return undefined;
}

export async function importCargas(
  empresaId: string,
  payload: CargasImportRequest
): Promise<CargasImportResult> {
  const {
    operacaoContainer = false,
    mapColunas,
    mapFormatoData = {},
    mapPersonalizadas = {},
    mapContainer = {},
    rows,
  } = payload;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new Error('Nenhuma linha de dados para importar.');
  }

  for (const key of DATE_FIELD_KEYS) {
    const header = mapColunas[key]?.trim();
    if (header && !mapFormatoData[key]) {
      const label = DATE_FIELD_LABELS[key] ?? key;
      throw new Error(
        `Selecione o formato da data para o campo "${label}" antes de importar.`
      );
    }
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

  const CHUNK_SIZE = 30;
  const CHUNK_TIMEOUT_MS = 90_000;

  const allFalhas: { linha: number; erro: string }[] = [];
  let totalSucesso = 0;
  let primeiraFalha: { linha: number; erro: string } | undefined;

  const processChunk = async (
    chunk: Array<Record<string, unknown>>,
    startIndex: number,
    tx: Prisma.TransactionClient
  ): Promise<{
    falhas: { linha: number; erro: string }[];
    sucesso: number;
  }> => {
    const falhasTx: { linha: number; erro: string }[] = [];
    let sucessoTx = 0;
    const tmsEmpresa = await getTmsEmpresa(empresaId);
    const tmsEmpresaId = tmsEmpresa.id;

    for (let i = 0; i < chunk.length; i++) {
      const row = chunk[i] as Record<string, unknown>;
      const linhaPlanilha = startIndex + i + 2;

      try {
        const cd_cargaRaw = mapColunas['cd_carga']?.trim()
          ? getCell(row, mapColunas['cd_carga'])
          : '';
        const cd_carga =
          cd_cargaRaw?.trim() ||
          (await CargasService.getProximoNumeroCarga(tmsEmpresaId, tx));
        const tryUpsert = !!(
          mapColunas['cd_carga']?.trim() && cd_cargaRaw?.trim()
        );

        let id_cidade_origem: number | undefined;
        if (mapColunas['id_cidade_origem']?.trim()) {
          const cidadeOrigemRaw = getCell(row, mapColunas['id_cidade_origem']);
          if (cidadeOrigemRaw) {
            id_cidade_origem = await resolveCidadeId(
              empresaId,
              cidadeOrigemRaw
            );
          }
        }

        let id_cidade_destino: number | undefined;
        if (mapColunas['id_cidade_destino']?.trim()) {
          const cidadeDestinoRaw = getCell(
            row,
            mapColunas['id_cidade_destino']
          );
          if (cidadeDestinoRaw) {
            id_cidade_destino = await resolveCidadeId(
              empresaId,
              cidadeDestinoRaw
            );
          }
        }

        const ds_observacoes = mapColunas['ds_observacoes']?.trim()
          ? getCell(row, mapColunas['ds_observacoes']) || undefined
          : undefined;
        const ds_tipo_carroceria = mapColunas['ds_tipo_carroceria']?.trim()
          ? getCell(row, mapColunas['ds_tipo_carroceria']) || undefined
          : undefined;
        const ds_prioridade = mapColunas['ds_prioridade']?.trim()
          ? getCell(row, mapColunas['ds_prioridade']) || undefined
          : undefined;
        const ds_status = mapColunas['ds_status']?.trim()
          ? getCell(row, mapColunas['ds_status']) || undefined
          : undefined;

        const vl_peso_bruto = mapColunas['vl_peso_bruto']?.trim()
          ? parseNumber(getCell(row, mapColunas['vl_peso_bruto']) || '')
          : undefined;
        const vl_cubagem = mapColunas['vl_cubagem']?.trim()
          ? parseNumber(getCell(row, mapColunas['vl_cubagem']) || '')
          : undefined;
        const vl_qtd_volumes = mapColunas['vl_qtd_volumes']?.trim()
          ? parseIntSafe(getCell(row, mapColunas['vl_qtd_volumes']) || '')
          : undefined;
        const vl_limite_empilhamento = mapColunas[
          'vl_limite_empilhamento'
        ]?.trim()
          ? parseIntSafe(
              getCell(row, mapColunas['vl_limite_empilhamento']) || ''
            )
          : undefined;

        const fl_requer_seguro = mapColunas['fl_requer_seguro']?.trim()
          ? parseBoolean(getCell(row, mapColunas['fl_requer_seguro']) || '')
          : undefined;
        const fl_carroceria_desacoplada = mapColunas[
          'fl_carroceria_desacoplada'
        ]?.trim()
          ? parseBoolean(
              getCell(row, mapColunas['fl_carroceria_desacoplada']) || ''
            )
          : undefined;

        let id_fis_cliente: string | undefined;
        if (
          mapColunas['id_cliente']?.trim() ||
          mapColunas['id_fis_cliente']?.trim()
        ) {
          const header =
            mapColunas['id_fis_cliente']?.trim() ||
            mapColunas['id_cliente']?.trim();
          const clienteRaw = header ? getCell(row, header) : '';
          if (clienteRaw?.trim())
            id_fis_cliente = await resolveFisClienteId(empresaId, clienteRaw);
        }

        let id_embarcador: string | undefined;
        if (mapColunas['id_embarcador']?.trim()) {
          const embarcadorRaw = getCell(row, mapColunas['id_embarcador']);
          if (embarcadorRaw)
            id_embarcador = await resolveEmbarcadorId(empresaId, embarcadorRaw);
        }

        let id_segmento: string | undefined;
        if (mapColunas['id_segmento']?.trim()) {
          const segmentoRaw = getCell(row, mapColunas['id_segmento']);
          if (segmentoRaw)
            id_segmento = await resolveSegmentoId(empresaId, segmentoRaw);
        }

        let id_carroceria_planejada: string | undefined;
        if (mapColunas['id_carroceria_planejada']?.trim()) {
          const carroceriaRaw = getCell(
            row,
            mapColunas['id_carroceria_planejada']
          );
          if (carroceriaRaw) {
            id_carroceria_planejada = await resolveCarroceriaPlanejadaId(
              empresaId,
              carroceriaRaw
            );
          }
        }

        const parseDateField = (
          key: (typeof DATE_FIELD_KEYS)[number]
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

        const dt_coleta = mapColunas['dt_coleta']?.trim()
          ? parseDateField('dt_coleta')
          : undefined;
        const dt_coleta_inicio = mapColunas['dt_coleta_inicio']?.trim()
          ? parseDateField('dt_coleta_inicio')
          : undefined;
        const dt_coleta_fim = mapColunas['dt_coleta_fim']?.trim()
          ? parseDateField('dt_coleta_fim')
          : undefined;
        const dt_limite_entrega = mapColunas['dt_limite_entrega']?.trim()
          ? parseDateField('dt_limite_entrega')
          : undefined;

        const ds_produto_predominante = mapColunas[
          'ds_produto_predominante'
        ]?.trim()
          ? getCell(row, mapColunas['ds_produto_predominante']).trim() ||
            undefined
          : undefined;

        let container:
          | {
              id_armador?: string | null;
              nr_container?: string | null;
              nr_lacre_container?: string | null;
              ds_destino_pais?: string | null;
              ds_setor_container?: string | null;
            }
          | undefined;

        const ds_tipo_carroceria_carga = mapColunas[
          'ds_tipo_carroceria_carga'
        ]?.trim()
          ? getCell(row, mapColunas['ds_tipo_carroceria_carga']) || undefined
          : undefined;

        let finalTipoCarroceria: TipoCarroceria | undefined =
          ds_tipo_carroceria_carga as TipoCarroceria | undefined;

        if (operacaoContainer && mapContainer.nr_container?.trim()) {
          const nrContainerRaw = getCell(row, mapContainer.nr_container);
          if (nrContainerRaw && nrContainerRaw.trim()) {
            const armadorRaw = mapContainer.id_armador?.trim()
              ? getCell(row, mapContainer.id_armador)
              : '';
            const nrControleRaw = mapContainer.nr_lacre_container?.trim()
              ? getCell(row, mapContainer.nr_lacre_container)
              : '';
            const destinoPaisRaw = mapContainer.ds_destino_pais?.trim()
              ? getCell(row, mapContainer.ds_destino_pais)
              : '';
            const setorRaw = mapContainer.ds_setor_container?.trim()
              ? getCell(row, mapContainer.ds_setor_container)
              : '';

            let id_armador: string | null | undefined;
            if (armadorRaw) {
              id_armador = (await resolveArmadorId(armadorRaw)) ?? null;
            } else {
              id_armador = null;
            }

            container = {
              id_armador: id_armador ?? null,
              nr_container: nrContainerRaw.trim() || null,
              nr_lacre_container: nrControleRaw || null,
              ds_destino_pais: destinoPaisRaw || null,
              ds_setor_container: setorRaw || null,
            };

            if (!finalTipoCarroceria) {
              finalTipoCarroceria = 'PORTA_CONTAINER' as TipoCarroceria;
            }
          }
        }

        const payload = {
          cd_carga,
          ds_status,
          dt_coleta_inicio,
          dt_coleta_fim,
          dt_coleta,
          ds_observacoes,
          ds_tipo_carroceria: finalTipoCarroceria,
          ds_prioridade,
          vl_peso_bruto,
          vl_cubagem,
          vl_qtd_volumes,
          vl_limite_empilhamento,
          fl_requer_seguro,
          fl_carroceria_desacoplada,
          id_cidade_origem,
          id_cidade_destino,
          id_motorista_veiculo: undefined as string | undefined,
          id_fis_cliente,
          id_segmento,
          id_embarcador,
          id_carroceria_planejada,
          ds_produto_predominante: ds_produto_predominante ?? undefined,
          fl_deslocamento_vazio: false,
          container,
        };

        let cargaId: string;

        if (tryUpsert) {
          const cargaExistente = await tx.tms_cargas.findFirst({
            where: {
              id_tms_empresa: tmsEmpresaId,
              cd_carga,
            },
            orderBy: { dt_updated: 'desc' },
          });

          if (cargaExistente) {
            await CargasService.updateCarga(
              empresaId,
              cargaExistente.id,
              payload,
              { tx }
            );
            cargaId = cargaExistente.id;

            const primeiraEntrega = await tx.tms_entregas.findFirst({
              where: { id_carga: cargaId },
              orderBy: { nr_sequencia: 'asc' },
            });

            if (id_cidade_destino != null) {
              if (primeiraEntrega) {
                await tx.tms_entregas.update({
                  where: { id: primeiraEntrega.id },
                  data: {
                    id_cidade_destino,
                    dt_limite_entrega: dt_limite_entrega
                      ? new Date(dt_limite_entrega)
                      : undefined,
                    js_produtos:
                      ds_produto_predominante != null
                        ? [ds_produto_predominante]
                        : [],
                  },
                });
              } else {
                await tx.tms_entregas.create({
                  data: {
                    id_carga: cargaId,
                    id_cidade_destino,
                    nr_sequencia: 1,
                    dt_limite_entrega: dt_limite_entrega
                      ? new Date(dt_limite_entrega)
                      : undefined,
                    js_produtos:
                      ds_produto_predominante != null
                        ? [ds_produto_predominante]
                        : [],
                  },
                });
              }
            }

            for (const [colunaId, header] of personalizadaEntries) {
              const valorBruto = getCell(row, header);
              if (!valorBruto) continue;

              const colunaMeta = colunasPersonalizadasMap.get(colunaId);
              if (!colunaMeta) {
                throw new Error(
                  `Coluna personalizada "${colunaId}" não encontrada.`
                );
              }
              const valor = resolveValorPersonalizadoParaImportacao(
                linhaPlanilha,
                colunaMeta,
                valorBruto
              );

              await ColunasPersonalizadasService.upsertDado(
                empresaId,
                {
                  id_sis_colunas_personalizadas: colunaId,
                  id_referencia: cargaId,
                  ds_valor: valor,
                },
                { tx }
              );
            }

            sucessoTx += 1;
            continue;
          }
        }

        const created = await CargasService.createCarga(empresaId, payload, {
          tx,
        });

        cargaId = created.id as string;

        if (id_cidade_destino != null) {
          await tx.tms_entregas.create({
            data: {
              id_carga: cargaId,
              id_cidade_destino,
              nr_sequencia: 1,
              dt_limite_entrega: dt_limite_entrega
                ? new Date(dt_limite_entrega)
                : undefined,
              js_produtos:
                ds_produto_predominante != null
                  ? [ds_produto_predominante]
                  : [],
            },
          });
        }

        for (const [colunaId, header] of personalizadaEntries) {
          const valorBruto = getCell(row, header);
          if (!valorBruto) continue;

          const colunaMeta = colunasPersonalizadasMap.get(colunaId);
          if (!colunaMeta) {
            throw new Error(
              `Coluna personalizada "${colunaId}" não encontrada.`
            );
          }
          const valor = resolveValorPersonalizadoParaImportacao(
            linhaPlanilha,
            colunaMeta,
            valorBruto
          );

          await ColunasPersonalizadasService.upsertDado(
            empresaId,
            {
              id_sis_colunas_personalizadas: colunaId,
              id_referencia: cargaId,
              ds_valor: valor,
            },
            { tx }
          );
        }

        sucessoTx += 1;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erro desconhecido ao importar linha.';
        const isFirstFailure = falhasTx.length === 0;
        if (isFirstFailure) {
          console.error('Primeira falha na importação:', {
            linha: linhaPlanilha,
            erro: err,
            code: (err as { code?: unknown })?.code,
            meta: (err as { meta?: unknown })?.meta,
            stack: err instanceof Error ? err.stack : undefined,
          });
          falhasTx.push({
            linha: linhaPlanilha,
            erro: message,
            ...((err as { code?: unknown })?.code != null && {
              code: String((err as { code?: unknown }).code),
            }),
            ...((err as { meta?: unknown })?.meta != null && {
              meta: (err as { meta?: unknown }).meta,
            }),
          });
        } else {
          falhasTx.push({ linha: linhaPlanilha, erro: message });
        }
      }
    }

    return { falhas: falhasTx, sucesso: sucessoTx };
  };

  for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
    const chunk = rows.slice(start, start + CHUNK_SIZE) as Array<
      Record<string, unknown>
    >;
    const chunkResult = await prisma.$transaction(
      async (tx) => processChunk(chunk, start, tx),
      { timeout: CHUNK_TIMEOUT_MS }
    );
    totalSucesso += chunkResult.sucesso;
    for (const f of chunkResult.falhas) {
      allFalhas.push(f);
      if (!primeiraFalha) primeiraFalha = f;
    }
  }

  return {
    total: rows.length,
    sucesso: totalSucesso,
    falhas: allFalhas,
    ...(primeiraFalha && { primeiraFalha }),
  };
}
