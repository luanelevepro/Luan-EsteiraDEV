'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ColunaPersonalizada, TabelasPersonalizadas } from '@/types/colunas-personalizadas';
import { getColunasPersonalizadas } from '@/services/api/tms/colunas-personalizadas';
import {
	importCargas,
	getImportLayouts,
	createImportLayout,
	type CargasImportRequest,
	type CargasImportResult,
	type FormatoDataImport,
	type ImportLayout,
	type ImportLayoutMapeamento,
} from '@/services/api/tms/cargas';
import { UploadCloud, FileSpreadsheet, ArrowRight, CheckCircle2, XCircle, Save } from 'lucide-react';

type Step = 'arquivo' | 'mapeamento' | 'preview_final' | 'resultado';

interface ImportCargasModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImported?: () => void;
}

interface PreviewRow {
	[key: string]: unknown;
}

const DESTINOS_FIXOS: { key: string; label: string; helper?: string }[] = [
	{ key: 'cd_carga', label: 'Código da carga', helper: 'Ex.: CARGA-123 ou OC' },
	{ key: 'dt_coleta_inicio', label: 'Janela coleta início', helper: 'Ex.: COLETA' },
	{ key: 'dt_coleta', label: 'Data coleta (dt_coleta)' },
	{ key: 'dt_coleta_fim', label: 'Janela coleta fim' },
	{ key: 'dt_limite_entrega', label: 'Data limite entrega' },
	{ key: 'ds_produto_predominante', label: 'Produto predominante', helper: 'Ex.: PRODUTO, xProd' },
	{ key: 'id_cidade_origem', label: 'Cidade origem', helper: 'Ex.: LOCAL COLETA, Cidade - UF' },
	{ key: 'id_cidade_destino', label: 'Cidade destino', helper: 'Formato: Cidade - UF' },
	{ key: 'ds_status', label: 'Status', helper: 'PENDENTE/AGENDADA/EM_COLETA/EM_TRANSITO/ENTREGUE' },
	{ key: 'ds_tipo_carroceria', label: 'Tipo de carroceria' },
	{ key: 'ds_prioridade', label: 'Prioridade (BAIXA/NORMAL/ALTA/URGENTE)' },
	{ key: 'vl_peso_bruto', label: 'Peso bruto (kg)' },
	{ key: 'vl_cubagem', label: 'Cubagem (m³)' },
	{ key: 'vl_qtd_volumes', label: 'Qtd volumes' },
	{ key: 'vl_limite_empilhamento', label: 'Limite empilhamento' },
	{ key: 'fl_requer_seguro', label: 'Requer seguro? (S/N)' },
	{ key: 'fl_carroceria_desacoplada', label: 'Carroceria desacoplada? (S/N)' },
	{ key: 'id_carroceria_planejada', label: 'Carreta/Carroceria planejada', helper: 'Placa ou identificador da carroceria cadastrada' },
	{ key: 'id_embarcador', label: 'Embarcador (nome ou documento)' },
	{ key: 'id_fis_cliente', label: 'Cliente (nome)' },
	{ key: 'id_segmento', label: 'Segmento (código ou nome)' },
	{ key: 'ds_observacoes', label: 'Observações' },
];

/** Campos de data que exigem formato na planilha */
const DATE_FIELD_KEYS = ['dt_coleta_inicio', 'dt_coleta', 'dt_coleta_fim', 'dt_limite_entrega'] as const;
const DATE_FIELD_LABELS: Record<string, string> = {
	dt_coleta_inicio: 'Janela coleta início',
	dt_coleta: 'Data coleta',
	dt_coleta_fim: 'Janela coleta fim',
	dt_limite_entrega: 'Data limite entrega',
};

const FORMATO_DATA_OPCOES: { value: FormatoDataImport; label: string; hint: string }[] = [
	{ value: 'serial_excel', label: 'Data Serial (Excel)', hint: 'Ex.: 46077 → 24/02/2026' },
	{ value: 'dd-mm-yyyy', label: 'dd-mm-yyyy', hint: 'Ex.: 24-02-2026' },
	{ value: 'yyyy-mm-dd', label: 'yyyy-mm-dd', hint: 'Ex.: 2026-02-24' },
];

/** Tab id para o mapeamento por abas (igual ao modal de nova carga) */
const MAPEAMENTO_TABS: { id: string; titulo: string; keys: string[] }[] = [
	{ id: 'config', titulo: 'Configurações', keys: ['cd_carga', 'ds_status', 'ds_tipo_carroceria', 'ds_prioridade'] },
	{ id: 'prazos', titulo: 'Prazos', keys: ['dt_coleta_inicio', 'dt_coleta', 'dt_coleta_fim', 'dt_limite_entrega'] },
	{ id: 'dados-basicos', titulo: 'Dados básicos', keys: ['id_cidade_origem', 'id_cidade_destino', 'ds_produto_predominante', 'ds_observacoes'] },
	{ id: 'caracteristicas', titulo: 'Características', keys: ['vl_peso_bruto', 'vl_cubagem', 'vl_qtd_volumes', 'vl_limite_empilhamento', 'fl_requer_seguro', 'fl_carroceria_desacoplada', 'id_carroceria_planejada'] },
	{ id: 'cliente-embarcador', titulo: 'Cliente e embarcador', keys: ['id_embarcador', 'id_fis_cliente', 'id_segmento'] },
	{ id: 'colunas-personalizadas', titulo: 'Colunas Personalizadas', keys: [] },
];

/** Rótulos dos campos de container para a prévia final */
const CONTAINER_LABELS: Record<string, string> = {
	id_armador: 'Armador',
	nr_container: 'Nº Container',
	nr_lacre_container: 'Nº Lacre Container',
	ds_destino_pais: 'Destino (País)',
	ds_setor_container: 'Setor Container',
};

function parseSheetFromBuffer(
	buffer: ArrayBuffer,
	sheetName: string,
): { hdrs: string[]; mappedRows: PreviewRow[] } | null {
	const workbook = XLSX.read(buffer, { type: 'array' });
	const sheet = workbook.Sheets[sheetName];
	if (!sheet) return null;
	const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
	if (!data.length) return null;
	// Usar todas as colunas: se o cabeçalho estiver vazio, usar "Coluna N" para não perder dados
	const rawFirstRow = data[0] as unknown[];
	const bodyLengths = data.slice(1).map((r) => (r as unknown[]).length) as number[];
	const maxCols = bodyLengths.length > 0
		? Math.max(rawFirstRow.length, ...bodyLengths)
		: rawFirstRow.length;
	const hdrs: string[] = [];
	const seen = new Map<string, number>();
	for (let idx = 0; idx < maxCols; idx++) {
		const cell = rawFirstRow[idx];
		let label = String(cell ?? '').trim();
		if (!label) label = `Coluna ${idx + 1}`;
		// Evitar chaves duplicadas: se já existe, acrescentar sufixo
		const count = seen.get(label) ?? 0;
		seen.set(label, count + 1);
		const key = count === 0 ? label : `${label} (${count + 1})`;
		hdrs.push(key);
	}
	const bodyRows = data.slice(1);
	const mappedRows: PreviewRow[] = bodyRows
		.map((row) => {
			const arr = row as unknown[];
			const obj: PreviewRow = {};
			hdrs.forEach((header, idx) => {
				obj[header] = arr[idx] ?? '';
			});
			return obj;
		})
		.filter((r) => Object.values(r).some((v) => v !== '' && v != null));
	return { hdrs, mappedRows };
}

function pickInitialSheetName(sheetNames: string[]): string {
	if (!sheetNames.length) return '';
	const base = sheetNames.find((s) => s.trim().toUpperCase() === 'BASE');
	return base ?? sheetNames[0] ?? '';
}

/** Converte valor bruto para dd/mm/yyyy para exibição na prévia. Retorna null se inválido. */
function parseDateForPreview(raw: unknown, format: FormatoDataImport): string | null {
	const trimmed = String(raw ?? '').trim();
	if (!trimmed) return null;

	if (format === 'serial_excel') {
		const num = Number(trimmed);
		if (Number.isNaN(num) || !Number.isInteger(num)) return null;
		const excelEpoch = new Date(1899, 11, 30).getTime();
		const date = new Date(excelEpoch + num * 86400000);
		if (Number.isNaN(date.getTime())) return null;
		return date.toLocaleDateString('pt-BR');
	}
	if (format === 'dd-mm-yyyy') {
		const match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
		if (!match) return null;
		const [, d, m, y] = match;
		const date = new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
		if (date.getDate() !== parseInt(d!, 10) || date.getMonth() !== parseInt(m!, 10) - 1) return null;
		return date.toLocaleDateString('pt-BR');
	}
	if (format === 'yyyy-mm-dd') {
		const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
		if (!match) return null;
		const [, y, m, d] = match;
		const date = new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
		if (date.getDate() !== parseInt(d!, 10) || date.getMonth() !== parseInt(m!, 10) - 1) return null;
		return date.toLocaleDateString('pt-BR');
	}
	return null;
}

export function ImportCargasModal({ open, onOpenChange, onImported }: ImportCargasModalProps) {
	const [step, setStep] = useState<Step>('arquivo');
	const [fileName, setFileName] = useState<string>('');
	const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
	const [allSheetNames, setAllSheetNames] = useState<string[]>([]);
	const [selectedSheetName, setSelectedSheetName] = useState<string>('');
	const [headers, setHeaders] = useState<string[]>([]);
	const [rows, setRows] = useState<PreviewRow[]>([]);
	const [mapColunas, setMapColunas] = useState<Record<string, string | undefined>>({});
	const [mapFormatoData, setMapFormatoData] = useState<Record<string, FormatoDataImport>>({});
	const [mapPersonalizadas, setMapPersonalizadas] = useState<Record<string, string | undefined>>({});
	const [mapContainer, setMapContainer] = useState<{
		id_armador?: string;
		nr_container?: string;
		nr_lacre_container?: string;
		ds_destino_pais?: string;
		ds_setor_container?: string;
	}>({});
	const [operacaoContainer, setOperacaoContainer] = useState(false);
	const [filtroTransportadoraColuna, setFiltroTransportadoraColuna] = useState<string>('');
	const [filtroTransportadoraValor, setFiltroTransportadoraValor] = useState<string>('');
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<CargasImportResult | null>(null);
	const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
	const [saveLayoutOpen, setSaveLayoutOpen] = useState(false);
	const [saveLayoutNome, setSaveLayoutNome] = useState('');
	const [saveLayoutDescricao, setSaveLayoutDescricao] = useState('');
	const [savingLayout, setSavingLayout] = useState(false);

	// Corrige bug do Radix: ao fechar o Dialog com Selects abertos, pointer-events/overflow podem ficar bloqueando cliques
	useEffect(() => {
		if (open) return;
		const t = setTimeout(() => {
			document.body.style.pointerEvents = '';
			document.body.style.overflow = '';
			document.documentElement.style.pointerEvents = '';
			document.documentElement.style.overflow = '';
			document.querySelectorAll('[data-slot="dialog-overlay"], [data-slot="dialog-portal"], [data-slot="select-content"]').forEach((el) => {
				(el as HTMLElement).style.pointerEvents = 'none';
			});
		}, 300);
		return () => clearTimeout(t);
	}, [open]);

	const { data: colunasPersonalizadas = [] } = useQuery<ColunaPersonalizada[]>({
		queryKey: ['colunas-personalizadas', 'CARGASLIST' as TabelasPersonalizadas],
		queryFn: () => getColunasPersonalizadas('CARGASLIST'),
		enabled: open,
		staleTime: 1000 * 60 * 2,
	});

	const { data: importLayouts = [], refetch: refetchLayouts } = useQuery<ImportLayout[]>({
		queryKey: ['tms', 'import-layouts'],
		queryFn: getImportLayouts,
		enabled: open && step === 'mapeamento',
		staleTime: 1000 * 60,
	});

	const applySheetData = (hdrs: string[], mappedRows: PreviewRow[]) => {
		setHeaders(hdrs);
		setRows(mappedRows);
		setMapColunas({});
		setMapFormatoData({});
		setMapContainer({});
		setOperacaoContainer(false);
		setMapPersonalizadas({});
		setSelectedLayoutId('');
	};

	const applyLayout = (layout: ImportLayout) => {
		const m = layout.js_mapeamento as ImportLayoutMapeamento;
		if (m.mapColunas) setMapColunas({ ...m.mapColunas });
		if (m.mapFormatoData) setMapFormatoData({ ...m.mapFormatoData });
		if (m.mapPersonalizadas) setMapPersonalizadas({ ...(m.mapPersonalizadas ?? {}) });
		if (m.mapContainer) setMapContainer({ ...m.mapContainer });
		if (m.operacaoContainer !== undefined) setOperacaoContainer(m.operacaoContainer);
	};

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		try {
			const buffer = await file.arrayBuffer();
			const workbook = XLSX.read(buffer, { type: 'array' });
			const sheetNames = workbook.SheetNames ?? [];
			if (!sheetNames.length) {
				toast.error('Nenhuma aba encontrada na planilha.');
				return;
			}
			const initialSheet = pickInitialSheetName(sheetNames);
			const parsed = parseSheetFromBuffer(buffer, initialSheet);
			if (!parsed || !parsed.mappedRows.length) {
				toast.error('Nenhuma linha de dados encontrada na aba.');
				return;
			}
			setFileBuffer(buffer);
			setAllSheetNames(sheetNames);
			setSelectedSheetName(initialSheet);
			setFileName(file.name);
			applySheetData(parsed.hdrs, parsed.mappedRows);
			setFiltroTransportadoraColuna('');
			setFiltroTransportadoraValor('');
			setStep('mapeamento');
		} catch (err) {
			console.error(err);
			toast.error('Erro ao ler planilha. Verifique o arquivo .xlsx.');
		}
	};

	const handleSheetChange = (sheetName: string) => {
		if (!fileBuffer || !sheetName) return;
		const parsed = parseSheetFromBuffer(fileBuffer, sheetName);
		if (!parsed) {
			toast.error('Não foi possível ler a aba.');
			return;
		}
		if (!parsed.mappedRows.length) {
			toast.error('Nenhuma linha de dados na aba selecionada.');
			return;
		}
		setSelectedSheetName(sheetName);
		applySheetData(parsed.hdrs, parsed.mappedRows);
		setFiltroTransportadoraColuna('');
		setFiltroTransportadoraValor('');
	};

	const rowsFiltradas = useMemo(() => {
		const col = filtroTransportadoraColuna.trim();
		const val = filtroTransportadoraValor.trim();
		if (!col || !val) return rows;
		return rows.filter((row) => {
			const cell = String((row as Record<string, unknown>)[col] ?? '').trim().toUpperCase();
			return cell === val.toUpperCase();
		});
	}, [rows, filtroTransportadoraColuna, filtroTransportadoraValor]);

	const previewRowsToShow = useMemo(() => rowsFiltradas.slice(0, 10), [rowsFiltradas]);

	/** Colunas da prévia final: planilha → sistema (só mapeadas) */
	const previewFinalColumns = useMemo(() => {
		const cols: { planilhaHeader: string; systemLabel: string; fieldKey?: string }[] = [];
		DESTINOS_FIXOS.forEach((d) => {
			const planilhaHeader = mapColunas[d.key]?.trim();
			if (planilhaHeader) {
				cols.push({ planilhaHeader, systemLabel: d.label, fieldKey: d.key });
			}
		});
		if (operacaoContainer) {
			(Object.keys(CONTAINER_LABELS) as (keyof typeof CONTAINER_LABELS)[]).forEach((key) => {
				const planilhaHeader = mapContainer[key as keyof typeof mapContainer]?.trim();
				if (planilhaHeader) {
					cols.push({ planilhaHeader, systemLabel: CONTAINER_LABELS[key] ?? key });
				}
			});
		}
		Object.entries(mapPersonalizadas).forEach(([colunaId, planilhaHeader]) => {
			if (!planilhaHeader?.trim()) return;
			const col = colunasPersonalizadas.find((c) => c.id === colunaId);
			cols.push({ planilhaHeader: planilhaHeader.trim(), systemLabel: col?.ds_nome_coluna ?? colunaId });
		});
		return cols;
	}, [mapColunas, mapContainer, operacaoContainer, mapPersonalizadas, colunasPersonalizadas]);

	const canSubmit = useMemo(() => {
		if (!rows.length) return false;
		if (rowsFiltradas.length === 0) return false;
		if (operacaoContainer && !mapContainer.nr_container) return false;
		for (const key of DATE_FIELD_KEYS) {
			if (mapColunas[key]?.trim() && !mapFormatoData[key]) return false;
		}
		return true;
	}, [rows.length, rowsFiltradas.length, mapColunas, mapFormatoData, operacaoContainer, mapContainer.nr_container]);

	const handleSubmit = async () => {
		if (!canSubmit) {
			if (filtroTransportadoraColuna.trim() && filtroTransportadoraValor.trim() && rowsFiltradas.length === 0) {
				toast.error('Nenhum registro corresponde ao filtro. Ajuste o valor ou desative o filtro.');
			} else {
				const missingFormat = DATE_FIELD_KEYS.find((k) => mapColunas[k]?.trim() && !mapFormatoData[k]);
				if (missingFormat) {
					toast.error(`Selecione o formato da data para o campo "${DATE_FIELD_LABELS[missingFormat] ?? missingFormat}".`);
				} else {
					toast.error('Preencha o mapeamento mínimo obrigatório antes de importar.');
				}
			}
			return;
		}

		setSubmitting(true);
		try {
			const payload: CargasImportRequest = {
				operacaoContainer,
				mapColunas,
				mapFormatoData,
				mapPersonalizadas,
				mapContainer,
				rows: rowsFiltradas,
			};

			const resp = await importCargas(payload);
			setResult(resp);
			setStep('resultado');
			if (onImported) {
				onImported();
			}
			if (resp.falhas.length === 0) {
				toast.success(`Importação concluída com sucesso (${resp.sucesso} cargas).`);
			} else {
				toast.warning(
					`Importação concluída com ${resp.sucesso} cargas e ${resp.falhas.length} falhas. Verifique os detalhes.`,
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erro ao importar cargas.';
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleClose = () => {
		onOpenChange(false);
		setTimeout(() => {
			setStep('arquivo');
			setFileName('');
			setFileBuffer(null);
			setAllSheetNames([]);
			setSelectedSheetName('');
			setHeaders([]);
			setRows([]);
			setMapColunas({});
			setMapFormatoData({});
			setMapPersonalizadas({});
			setMapContainer({});
			setOperacaoContainer(false);
			setFiltroTransportadoraColuna('');
			setFiltroTransportadoraValor('');
			setSubmitting(false);
			setResult(null);
			setSelectedLayoutId('');
			setSaveLayoutOpen(false);
			setSaveLayoutNome('');
			setSaveLayoutDescricao('');
		}, 200);
	};

	return (
		<Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}>
			<DialogContent className='max-h-[90vh] max-w-[92vw] w-full overflow-x-hidden overflow-y-auto sm:max-w-[92vw]'>
				<DialogHeader>
					<DialogTitle>Importar cargas via planilha (.xlsx)</DialogTitle>
				</DialogHeader>

				{step === 'arquivo' && (
					<div className='space-y-6'>
						<div className='rounded-xl border border-dashed p-6 text-center'>
							<div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
								<UploadCloud className='h-6 w-6 text-muted-foreground' />
							</div>
							<p className='text-sm text-muted-foreground'>
								Selecione uma planilha .xlsx com o cabeçalho na primeira linha.
							</p>
							<div className='mt-4 flex items-center justify-center gap-3'>
								<Input
									type='file'
									accept='.xlsx'
									onChange={handleFileChange}
									className='max-w-xs cursor-pointer'
								/>
								{fileName && (
									<span className='text-xs text-muted-foreground flex items-center gap-1'>
										<FileSpreadsheet className='h-4 w-4' />
										{fileName}
									</span>
								)}
							</div>
						</div>
						<div className='flex justify-end'>
							<Button
								type='button'
								variant='secondary'
								disabled={!headers.length}
								onClick={() => setStep('mapeamento')}
							>
								Continuar
								<ArrowRight className='ml-2 h-4 w-4' />
							</Button>
						</div>
					</div>
				)}

				{step === 'mapeamento' && (
					<div className='flex max-h-[85vh] min-w-0 flex-col'>
						<div className='grid min-h-0 min-w-0 flex-1 gap-6 lg:grid-cols-[1fr,1fr]'>
							<div className='flex min-w-0 max-w-full flex-col overflow-y-auto'>
								{allSheetNames.length > 0 && (
									<div className='mb-4 space-y-2'>
										<label htmlFor='sheet-select' className='text-xs font-semibold text-muted-foreground'>
											Aba da planilha
										</label>
										<Select value={selectedSheetName} onValueChange={handleSheetChange}>
											<SelectTrigger id='sheet-select' className='h-9 w-full min-w-0 text-xs'>
												<SelectValue placeholder='Selecione uma aba' />
											</SelectTrigger>
											<SelectContent>
												{allSheetNames.map((name) => (
													<SelectItem key={name} value={name}>
														{name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
								<div className='mb-4 space-y-2'>
									<label htmlFor='layout-select' className='text-xs font-semibold text-muted-foreground'>
										Usar layout salvo
									</label>
									<Select
										value={selectedLayoutId || '__none__'}
										onValueChange={(id) => {
											if (id === '__none__') {
												setSelectedLayoutId('');
												return;
											}
											setSelectedLayoutId(id);
											const layout = importLayouts.find((l) => l.id === id);
											if (layout) applyLayout(layout);
										}}
									>
										<SelectTrigger id='layout-select' className='h-9 w-full min-w-0 text-xs'>
											<SelectValue placeholder='Nenhum — mapear manualmente' />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='__none__'>— Nenhum</SelectItem>
											{importLayouts.map((l) => (
												<SelectItem key={l.id} value={l.id}>
													{l.ds_nome}
													{l.ds_descricao ? ` — ${l.ds_descricao}` : ''}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className='mb-4 space-y-4 border-b border-border pb-4'>
									<h4 className='text-xs font-semibold text-muted-foreground'>Filtro por transportadora (opcional)</h4>
									<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
										<div className='min-w-0 space-y-2'>
											<span className='text-xs font-medium text-muted-foreground'>Coluna para filtrar</span>
											<Select
												value={filtroTransportadoraColuna}
												onValueChange={(v) => setFiltroTransportadoraColuna(v === '__none__' ? '' : v)}
											>
												<SelectTrigger className='h-9 w-full min-w-0 text-xs'>
													<SelectValue placeholder="Ex.: TRANSPORTADORA" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='__none__'>— Não filtrar</SelectItem>
													{headers.map((h) => (
														<SelectItem key={h} value={h}>{h}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className='min-w-0 space-y-2'>
											<span className='text-xs font-medium text-muted-foreground'>Valor para filtrar</span>
											<Input
												placeholder='Ex.: TOMAZI'
												value={filtroTransportadoraValor}
												onChange={(e) => setFiltroTransportadoraValor(e.target.value)}
												className='h-9 min-w-0 text-xs'
											/>
										</div>
									</div>
									<p className='text-[10px] text-muted-foreground'>
										Apenas os registros em que a coluna selecionada for igual ao valor informado serão importados.
									</p>
									{filtroTransportadoraColuna.trim() && filtroTransportadoraValor.trim() && rowsFiltradas.length === 0 && (
										<p className='text-xs font-medium text-destructive'>
											Nenhum registro corresponde ao filtro. Ajuste o valor ou desative o filtro.
										</p>
									)}
								</div>
								<h3 className='text-sm font-semibold'>Mapeamento de colunas</h3>
								<p className='mt-1 text-xs text-muted-foreground'>
									Selecione para cada campo do sistema a coluna correspondente na planilha. Nenhum campo é preenchido automaticamente, para evitar mapeamentos incorretos.
								</p>
								<p className='mt-1 text-xs text-amber-600 dark:text-amber-400'>
									O que não for mapeado permanece em branco; o usuário deve preencher antes de iniciar o trajeto.
								</p>
								<Tabs defaultValue={MAPEAMENTO_TABS[0].id} className='mt-4 w-full'>
									<TabsList className='mb-3 flex h-auto w-full flex-wrap gap-1 bg-muted/50 p-1'>
										{MAPEAMENTO_TABS.map((tab) => (
											<TabsTrigger key={tab.id} value={tab.id} className='text-xs'>
												{tab.titulo}
											</TabsTrigger>
										))}
									</TabsList>
									{MAPEAMENTO_TABS.map((tab) => {
										if (tab.id === 'colunas-personalizadas') {
											return (
												<TabsContent key={tab.id} value={tab.id} className='mt-0 space-y-4'>
													<p className='text-[10px] text-muted-foreground'>
														Campos sob medida configurados em Colunas personalizadas (CARGASLIST). Defina qual coluna da planilha preenche cada um.
													</p>
													{colunasPersonalizadas.length === 0 ? (
														<p className='rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground'>
															Nenhum campo personalizado configurado para esta empresa. Configure em Cadastros → Colunas personalizadas (CARGASLIST) para criar campos sob medida e mapeá-los na importação.
														</p>
													) : (
														<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
															{colunasPersonalizadas.map((col) => (
																<div key={col.id} className='min-w-0 space-y-2 rounded-md border border-border bg-muted/20 p-3'>
																	<div>
																		<p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
																			Campo no sistema (dado da empresa)
																		</p>
																		<p className='text-xs font-medium'>
																			{col.ds_nome_coluna}
																			{col.ds_descricao ? (
																				<span className='ml-1 font-normal text-muted-foreground'>
																					— {col.ds_descricao}
																				</span>
																			) : null}
																		</p>
																	</div>
																	<div className='space-y-1'>
																		<label className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
																			Coluna na planilha (a definir)
																		</label>
																		<Select
																			value={mapPersonalizadas[col.id] ?? ''}
																			onValueChange={(val) =>
																				setMapPersonalizadas((prev) => ({
																					...prev,
																					[col.id]: val === '__none__' ? undefined : val,
																				}))
																			}
																		>
																			<SelectTrigger className='h-9 w-full min-w-0 text-xs'>
																				<SelectValue placeholder='Selecione a coluna da planilha (opcional)' />
																			</SelectTrigger>
																			<SelectContent>
																				<SelectItem value='__none__'>— Não mapear</SelectItem>
																				{headers.map((h) => (
																					<SelectItem key={h} value={h}>
																						{h}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	</div>
																</div>
															))}
														</div>
													)}
												</TabsContent>
											);
										}
										const destinos = DESTINOS_FIXOS.filter((d) => tab.keys.includes(d.key));
										if (!destinos.length) return null;
										return (
											<TabsContent key={tab.id} value={tab.id} className='mt-0 space-y-4'>
												<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
													{destinos.map((dest) => {
														const isDateField = DATE_FIELD_KEYS.includes(dest.key as (typeof DATE_FIELD_KEYS)[number]);
														return (
															<div key={dest.key} className='min-w-0 space-y-2 rounded-md border border-border bg-muted/20 p-3'>
																<div className='flex items-center justify-between'>
																	<span className='text-xs font-medium text-muted-foreground'>
																		{dest.label}
																	</span>
																</div>
																<Select
																	value={mapColunas[dest.key] ?? ''}
																	onValueChange={(val) =>
																		setMapColunas((prev) => ({
																			...prev,
																			[dest.key]: val === '__none__' ? undefined : val,
																		}))
																	}
																>
																	<SelectTrigger className='h-9 w-full min-w-0 text-xs'>
																		<SelectValue placeholder='Selecione a coluna da planilha' />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value='__none__'>— Não mapear</SelectItem>
																		{headers.map((h) => (
																			<SelectItem key={h} value={h}>
																				{h}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
																{isDateField && (mapColunas[dest.key] ?? '').trim() && (
																	<>
																		<label className='block text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
																			Formato da data na planilha
																		</label>
																		<Select
																			value={mapFormatoData[dest.key] ?? ''}
																			onValueChange={(val) =>
																				setMapFormatoData((prev) => ({
																					...prev,
																					[dest.key]: val as FormatoDataImport,
																				}))
																			}
																		>
																			<SelectTrigger className='h-9 w-full min-w-0 text-xs'>
																				<SelectValue placeholder='Selecione o formato' />
																			</SelectTrigger>
																			<SelectContent>
																				{FORMATO_DATA_OPCOES.map((opt) => (
																					<SelectItem key={opt.value} value={opt.value}>
																						{opt.label}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																		{mapFormatoData[dest.key] && (
																			<p className='text-[10px] text-muted-foreground'>
																				{FORMATO_DATA_OPCOES.find((o) => o.value === mapFormatoData[dest.key])?.hint}
																			</p>
																		)}
																	</>
																)}
																{dest.helper && !isDateField && (
																	<p className='text-[10px] text-muted-foreground'>{dest.helper}</p>
																)}
															</div>
														);
													})}
												</div>
												{tab.id === 'dados-basicos' && (
													<div className='space-y-4 rounded-md border border-border bg-muted/20 p-4'>
														<h4 className='text-xs font-semibold text-muted-foreground'>Operação Container</h4>
														<div className='flex items-center gap-2 rounded-md border px-3 py-2'>
															<Checkbox
																checked={operacaoContainer}
																onCheckedChange={(val) => setOperacaoContainer(val === true)}
																id='operacao-container'
															/>
															<label htmlFor='operacao-container' className='text-xs'>
																Habilita mapeamento de Armador e Nº Container (igual à criação de carga)
															</label>
														</div>
														{operacaoContainer && (
															<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
																<div className='min-w-0 space-y-2'>
																	<span className='text-xs font-medium text-muted-foreground'>Armador (nome)</span>
																	<Select
																		value={mapContainer.id_armador ?? ''}
																		onValueChange={(val) =>
																			setMapContainer((prev) => ({
																				...prev,
																				id_armador: val === '__none__' ? undefined : val,
																			}))
																		}
																	>
																		<SelectTrigger className='h-9 w-full min-w-0 text-xs'>
																			<SelectValue placeholder='Coluna da planilha (opcional)' />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value='__none__'>— Não mapear</SelectItem>
																			{headers.map((h) => (
																				<SelectItem key={h} value={h}>{h}</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																</div>
																<div className='min-w-0 space-y-2'>
																	<div className='flex items-center justify-between'>
																		<span className='text-xs font-medium text-muted-foreground'>Nº Container</span>
																		<span className='text-[10px] font-bold uppercase text-red-500'>Obrigatório</span>
																	</div>
																	<Select
																		value={mapContainer.nr_container ?? ''}
																		onValueChange={(val) =>
																			setMapContainer((prev) => ({
																				...prev,
																				nr_container: val === '__none__' ? undefined : val,
																			}))
																		}
																	>
																		<SelectTrigger className='h-9 w-full min-w-0 text-xs'>
																			<SelectValue placeholder='Selecione a coluna da planilha' />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value='__none__'>— Não mapear</SelectItem>
																			{headers.map((h) => (
																				<SelectItem key={h} value={h}>{h}</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																</div>
																<div className='min-w-0 space-y-2'>
																	<span className='text-xs font-medium text-muted-foreground'>Nº Lacre Container</span>
																	<Select
																		value={mapContainer.nr_lacre_container ?? ''}
																		onValueChange={(val) =>
																			setMapContainer((prev) => ({
																				...prev,
																				nr_lacre_container: val === '__none__' ? undefined : val,
																			}))
																		}
																	>
																		<SelectTrigger className='h-9 w-full min-w-0 text-xs'>
																			<SelectValue placeholder='Coluna da planilha (opcional)' />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value='__none__'>— Não mapear</SelectItem>
																			{headers.map((h) => (
																				<SelectItem key={h} value={h}>{h}</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																</div>
																<div className='min-w-0 space-y-2'>
																	<span className='text-xs font-medium text-muted-foreground'>Destino (País)</span>
																	<Select
																		value={mapContainer.ds_destino_pais ?? ''}
																		onValueChange={(val) =>
																			setMapContainer((prev) => ({
																				...prev,
																				ds_destino_pais: val === '__none__' ? undefined : val,
																			}))
																		}
																	>
																		<SelectTrigger className='h-9 w-full min-w-0 text-xs'>
																			<SelectValue placeholder='Coluna da planilha (opcional)' />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value='__none__'>— Não mapear</SelectItem>
																			{headers.map((h) => (
																				<SelectItem key={h} value={h}>{h}</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																</div>
																<div className='min-w-0 space-y-2'>
																	<span className='text-xs font-medium text-muted-foreground'>Setor Container</span>
																	<Select
																		value={mapContainer.ds_setor_container ?? ''}
																		onValueChange={(val) =>
																			setMapContainer((prev) => ({
																				...prev,
																				ds_setor_container: val === '__none__' ? undefined : val,
																			}))
																		}
																	>
																		<SelectTrigger className='h-9 w-full min-w-0 text-xs'>
																			<SelectValue placeholder='Coluna da planilha (opcional)' />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value='__none__'>— Não mapear</SelectItem>
																			{headers.map((h) => (
																				<SelectItem key={h} value={h}>{h}</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																</div>
															</div>
														)}
													</div>
												)}
											</TabsContent>
										);
									})}
								</Tabs>
							</div>
							<div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden space-y-3'>
								<h3 className='text-sm font-semibold shrink-0'>Prévia da planilha</h3>
								<div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border'>
									<div className='max-h-60 min-h-0 min-w-0 overflow-auto rounded-b-md'>
											<table className='w-full min-w-max border-collapse text-xs'>
												<thead className='sticky top-0 z-10 bg-muted shadow-[0_1px_0_0_hsl(var(--border))]'>
													<tr>
														{headers.map((h) => (
															<th
																key={h}
																className='min-w-[8rem] border-b border-border px-3 py-2 text-left font-semibold whitespace-nowrap'
															>
																{h}
															</th>
														))}
													</tr>
												</thead>
												<tbody>
													{previewRowsToShow.map((row, idx) => (
														<tr key={idx} className='border-t border-border last:border-b'>
															{headers.map((h) => {
																const rawVal = (row as Record<string, unknown>)[h];
																const rawStr = String(rawVal ?? '');
																const dateKey = DATE_FIELD_KEYS.find((k) => mapColunas[k] === h && mapFormatoData[k]);
																const format = dateKey ? mapFormatoData[dateKey] : undefined;
																const interpreted = format ? parseDateForPreview(rawVal, format) : null;
																const display =
																	format && rawStr.trim()
																		? interpreted
																			? `${rawStr} (${interpreted})`
																			: `${rawStr} (formato inválido)`
																		: rawStr;
																return (
																	<td
																		key={h}
																		className='min-w-[8rem] whitespace-nowrap px-3 py-2 align-top'
																		title={display}
																	>
																		{display}
																	</td>
																);
															})}
														</tr>
													))}
												</tbody>
											</table>
										</div>
									<p className='shrink-0 border-t border-border px-3 py-2 text-[10px] text-muted-foreground'>
										{filtroTransportadoraColuna.trim() && filtroTransportadoraValor.trim()
											? `Mostrando até 10 de ${rowsFiltradas.length} linhas (após filtro). Total de ${rows.length} linhas na aba.`
											: `Mostrando até 10 linhas. Total de ${rows.length} linhas de dados.`}
									</p>
								</div>
							</div>
						</div>
						<div className='mt-4 flex flex-shrink-0 items-center justify-between border-t border-border pt-4'>
							<div className='flex items-center gap-2'>
								<Button type='button' variant='ghost' size='sm' onClick={() => setStep('arquivo')}>
									Voltar
								</Button>
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={() => {
										setSaveLayoutNome('');
										setSaveLayoutDescricao('');
										setSaveLayoutOpen(true);
									}}
								>
									<Save className='mr-2 h-4 w-4' />
									Salvar como layout
								</Button>
							</div>
							<Button
								type='button'
								variant='secondary'
								onClick={() => setStep('preview_final')}
								disabled={!canSubmit}
							>
								Ver prévia final
								<ArrowRight className='ml-2 h-4 w-4' />
							</Button>
						</div>
					</div>
				)}

				{/* Modal interno: Salvar como layout */}
				<Dialog open={saveLayoutOpen} onOpenChange={setSaveLayoutOpen}>
					<DialogContent className='sm:max-w-md'>
						<DialogHeader>
							<DialogTitle>Salvar como layout</DialogTitle>
						</DialogHeader>
						<div className='space-y-4 py-2'>
							<div className='space-y-2'>
								<label className='text-sm font-medium'>Nome do layout</label>
								<Input
									placeholder='Ex.: Planilha TOMAZI - BASE'
									value={saveLayoutNome}
									onChange={(e) => setSaveLayoutNome(e.target.value)}
								/>
							</div>
							<div className='space-y-2'>
								<label className='text-sm font-medium text-muted-foreground'>Descrição (opcional)</label>
								<Input
									placeholder='Ex.: Mapeamento padrão para planilhas da transportadora X'
									value={saveLayoutDescricao}
									onChange={(e) => setSaveLayoutDescricao(e.target.value)}
								/>
							</div>
						</div>
						<div className='flex justify-end gap-2'>
							<Button type='button' variant='ghost' onClick={() => setSaveLayoutOpen(false)}>
								Cancelar
							</Button>
							<Button
								type='button'
								disabled={!saveLayoutNome.trim() || savingLayout}
								onClick={async () => {
									if (!saveLayoutNome.trim()) return;
									setSavingLayout(true);
									try {
										await createImportLayout({
											ds_nome: saveLayoutNome.trim(),
											ds_descricao: saveLayoutDescricao.trim() || undefined,
											js_mapeamento: {
												operacaoContainer,
												mapColunas,
												mapFormatoData,
												mapPersonalizadas,
												mapContainer,
											},
										});
										toast.success('Layout salvo com sucesso.');
										setSaveLayoutOpen(false);
										refetchLayouts();
									} catch (err) {
										toast.error(err instanceof Error ? err.message : 'Erro ao salvar layout.');
									} finally {
										setSavingLayout(false);
									}
								}}
							>
								{savingLayout ? 'Salvando...' : 'Salvar'}
							</Button>
						</div>
					</DialogContent>
				</Dialog>

				{step === 'preview_final' && (
					<div className='flex max-h-[85vh] min-w-0 flex-col space-y-4'>
						<div>
							<h3 className='text-sm font-semibold'>Prévia final — dados que serão importados</h3>
							<p className='mt-1 text-xs text-muted-foreground'>
								Confira as colunas e os dados. No cabeçalho: nome na planilha e campo no sistema que receberá o valor.
							</p>
						</div>
						<div className='min-h-0 flex-1 overflow-auto rounded-md border'>
							<table className='w-full min-w-max border-collapse text-xs'>
								<thead className='sticky top-0 z-10 bg-muted shadow-[0_1px_0_0_hsl(var(--border))]'>
									<tr>
										{previewFinalColumns.map((col) => (
											<th
												key={col.planilhaHeader + col.systemLabel}
												className='min-w-[10rem] border-b border-border px-3 py-2 text-left font-medium'>
												<div className='font-semibold text-foreground'>{col.planilhaHeader}</div>
												<div className='mt-0.5 text-[10px] font-normal text-muted-foreground'>
													→ {col.systemLabel}
												</div>
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{previewRowsToShow.map((row, idx) => (
										<tr key={idx} className='border-t border-border last:border-b'>
											{previewFinalColumns.map((col) => {
												const rawVal = (row as Record<string, unknown>)[col.planilhaHeader];
												const rawStr = String(rawVal ?? '');
												const format = col.fieldKey && DATE_FIELD_KEYS.includes(col.fieldKey as (typeof DATE_FIELD_KEYS)[number])
													? mapFormatoData[col.fieldKey]
													: undefined;
												const interpreted = format ? parseDateForPreview(rawVal, format) : null;
												const display =
													format && rawStr.trim()
														? interpreted
															? `${rawStr} (${interpreted})`
															: `${rawStr} (formato inválido)`
														: rawStr;
												return (
													<td
														key={col.planilhaHeader + col.systemLabel}
														className='min-w-[10rem] max-w-[20rem] truncate whitespace-nowrap px-3 py-2 align-top'
														title={display}>
														{display}
													</td>
												);
											})}
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<p className='text-[10px] text-muted-foreground'>
							{filtroTransportadoraColuna.trim() && filtroTransportadoraValor.trim()
								? `Mostrando até 10 de ${rowsFiltradas.length} linhas (após filtro). Total de ${rows.length} linhas na aba.`
								: `Mostrando até 10 de ${rowsFiltradas.length} linhas. Total de ${rows.length} linhas na aba.`}
						</p>
						<div className='flex flex-shrink-0 items-center justify-between border-t border-border pt-4'>
							<Button type='button' variant='ghost' size='sm' onClick={() => setStep('mapeamento')}>
								Voltar ao mapeamento
							</Button>
							<Button
								type='button'
								variant='secondary'
								onClick={handleSubmit}
								disabled={submitting}>
								{submitting ? 'Importando...' : 'Confirmar e importar'}
								<ArrowRight className='ml-2 h-4 w-4' />
							</Button>
						</div>
					</div>
				)}

				{step === 'resultado' && result && (
					<div className='space-y-5'>
						{result.primeiraFalha && (
							<div className='rounded-lg border border-amber-500/50 bg-amber-500/10 p-3'>
								<p className='text-xs font-semibold text-amber-700 dark:text-amber-400'>
									Primeira falha (linha {result.primeiraFalha.linha}):
								</p>
								<p className='mt-1 text-sm text-foreground'>{result.primeiraFalha.erro}</p>
								{(result.primeiraFalha as { code?: string }).code != null && (
									<p className='mt-1 text-xs text-muted-foreground'>
										Código: {(result.primeiraFalha as { code?: string }).code}
									</p>
								)}
							</div>
						)}
						<div className='flex items-center gap-3'>
							{result.falhas.length === 0 ? (
								<CheckCircle2 className='h-6 w-6 text-green-600' />
							) : (
								<XCircle className='h-6 w-6 text-amber-500' />
							)}
							<div>
								<p className='text-sm font-semibold'>
									Importação concluída: {result.sucesso} cargas importadas de {result.total} linhas.
								</p>
								{result.falhas.length > 0 && (
									<>
										<p className='text-xs text-muted-foreground'>
											Houve {result.falhas.length} falha(s). Veja abaixo os detalhes para corrigir na planilha.
										</p>
										<p className='mt-1 text-xs text-amber-600 dark:text-amber-400'>
											A primeira falha (em destaque acima) é geralmente a causa; as demais podem ter falhado em cascata.
										</p>
									</>
								)}
							</div>
						</div>
						{result.falhas.length > 0 && (
							<div className='max-h-64 overflow-auto rounded-md border bg-muted/40 p-3'>
								<table className='w-full border-collapse text-xs'>
									<thead>
										<tr className='border-b'>
											<th className='px-2 py-1 text-left font-semibold'>Linha</th>
											<th className='px-2 py-1 text-left font-semibold'>Erro</th>
										</tr>
									</thead>
									<tbody>
										{result.falhas.map((f, idx) => (
											<tr
												key={`${f.linha}-${idx}`}
												className={`border-b last:border-0 ${idx === 0 ? 'bg-amber-500/10 font-medium' : ''}`}
											>
												<td className='px-2 py-1'>{f.linha}</td>
												<td className='px-2 py-1'>
													<div>{f.erro}</div>
													{idx === 0 && (f.code != null || f.meta != null) && (
														<div className='mt-1 text-muted-foreground'>
															{f.code != null && <span className='mr-2'>Código: {f.code}</span>}
															{f.meta != null && (
																<span>Detalhes: {typeof f.meta === 'object' ? JSON.stringify(f.meta) : String(f.meta)}</span>
															)}
														</div>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
						<div className='flex justify-end gap-2'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => {
									setStep('mapeamento');
								}}
							>
								Voltar ao mapeamento
							</Button>
							<Button type='button' size='sm' onClick={handleClose}>
								Fechar
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

