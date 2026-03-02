'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ColunaPersonalizada, TabelasPersonalizadas } from '@/types/colunas-personalizadas';
import { getColunasPersonalizadas } from '@/services/api/tms/colunas-personalizadas';
import {
	importViagens,
	getImportLayoutsViagens,
	createImportLayoutViagens,
	type ViagensImportRequest,
	type ViagensImportResult,
	type FormatoDataImportViagem,
	type ImportLayoutViagem,
	type ImportLayoutViagemMapeamento,
} from '@/services/api/tms/viagens';
import { UploadCloud, FileSpreadsheet, ArrowRight, CheckCircle2, XCircle, Save } from 'lucide-react';

type Step = 'arquivo' | 'mapeamento' | 'preview_final' | 'resultado';

interface ImportViagensModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImported?: () => void;
}

interface PreviewRow {
	[key: string]: unknown;
}

const CAMPOS_VIAGEM: { key: string; label: string; helper?: string }[] = [
	{ key: 'cd_viagem', label: 'Código da viagem', helper: 'Opcional; se vazio, o sistema gera sequencial.' },
	{ key: 'ds_status', label: 'Status', helper: 'PLANEJADA, EM_COLETA, EM_VIAGEM, CONCLUIDA, ATRASADA, CANCELADA' },
	{ key: 'ds_motorista', label: 'Motorista', helper: 'Obrigatório' },
	{ key: 'ds_placa_cavalo', label: 'Placa cavalo', helper: 'Obrigatório' },
	{ key: 'ds_placa_carreta_1', label: 'Placa carreta 1' },
	{ key: 'ds_placa_carreta_2', label: 'Placa carreta 2' },
	{ key: 'ds_placa_carreta_3', label: 'Placa carreta 3' },
	{ key: 'dt_agendada', label: 'Data agendada' },
	{ key: 'dt_previsao_retorno', label: 'Data previsão retorno' },
];

const DATE_FIELD_KEYS = ['dt_agendada', 'dt_previsao_retorno'] as const;
const DATE_FIELD_LABELS: Record<string, string> = {
	dt_agendada: 'Data agendada',
	dt_previsao_retorno: 'Data previsão retorno',
};

const FORMATO_DATA_OPCOES: { value: FormatoDataImportViagem; label: string; hint: string }[] = [
	{ value: 'serial_excel', label: 'Data Serial (Excel)', hint: 'Ex.: 46077 → 24/02/2026' },
	{ value: 'dd-mm-yyyy', label: 'dd-mm-yyyy', hint: 'Ex.: 24-02-2026' },
	{ value: 'yyyy-mm-dd', label: 'yyyy-mm-dd', hint: 'Ex.: 2026-02-24' },
];

const MAPEAMENTO_TABS: { id: string; titulo: string; keys: string[] }[] = [
	{ id: 'config', titulo: 'Configurações', keys: ['cd_viagem', 'ds_status'] },
	{ id: 'recursos', titulo: 'Recursos', keys: ['ds_motorista', 'ds_placa_cavalo', 'ds_placa_carreta_1', 'ds_placa_carreta_2', 'ds_placa_carreta_3'] },
	{ id: 'prazos', titulo: 'Prazos', keys: ['dt_agendada', 'dt_previsao_retorno'] },
	{ id: 'colunas-personalizadas', titulo: 'Colunas Personalizadas', keys: [] },
];

function parseSheetFromBuffer(
	buffer: ArrayBuffer,
	sheetName: string,
): { hdrs: string[]; mappedRows: PreviewRow[] } | null {
	const workbook = XLSX.read(buffer, { type: 'array' });
	const sheet = workbook.Sheets[sheetName];
	if (!sheet) return null;
	const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
	if (!data.length) return null;
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

function parseDateForPreview(raw: unknown, format: FormatoDataImportViagem): string | null {
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

export function ImportViagensModal({ open, onOpenChange, onImported }: ImportViagensModalProps) {
	const queryClient = useQueryClient();
	const [step, setStep] = useState<Step>('arquivo');
	const [fileName, setFileName] = useState<string>('');
	const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
	const [allSheetNames, setAllSheetNames] = useState<string[]>([]);
	const [selectedSheetName, setSelectedSheetName] = useState<string>('');
	const [headers, setHeaders] = useState<string[]>([]);
	const [rows, setRows] = useState<PreviewRow[]>([]);
	const [mapColunas, setMapColunas] = useState<Record<string, string | undefined>>({});
	const [mapFormatoData, setMapFormatoData] = useState<Record<string, FormatoDataImportViagem>>({});
	const [mapPersonalizadas, setMapPersonalizadas] = useState<Record<string, string | undefined>>({});
	const [filtroColuna, setFiltroColuna] = useState<string>('');
	const [filtroValor, setFiltroValor] = useState<string>('');
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<ViagensImportResult | null>(null);
	const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
	const [saveLayoutOpen, setSaveLayoutOpen] = useState(false);
	const [saveLayoutNome, setSaveLayoutNome] = useState('');
	const [saveLayoutDescricao, setSaveLayoutDescricao] = useState('');
	const [savingLayout, setSavingLayout] = useState(false);

	// Corrige bug do Radix: ao fechar o Dialog com Selects abertos, pointer-events/overflow podem ficar bloqueando cliques (radix-ui/primitives#3645, #3445)
	useEffect(() => {
		if (open) return;
		const t = setTimeout(() => {
			document.body.style.pointerEvents = '';
			document.body.style.overflow = '';
			document.documentElement.style.pointerEvents = '';
			document.documentElement.style.overflow = '';
			// Remove bloqueio de overlays/portais do Radix que possam ter ficado no DOM (Dialog e Select)
			document.querySelectorAll('[data-slot="dialog-overlay"], [data-slot="dialog-portal"], [data-slot="select-content"]').forEach((el) => {
				(el as HTMLElement).style.pointerEvents = 'none';
			});
		}, 300);
		return () => clearTimeout(t);
	}, [open]);

	const { data: colunasPersonalizadas = [] } = useQuery<ColunaPersonalizada[]>({
		queryKey: ['colunas-personalizadas', 'VIAGENSLIST' as TabelasPersonalizadas],
		queryFn: () => getColunasPersonalizadas('VIAGENSLIST'),
		enabled: open,
		staleTime: 1000 * 60 * 2,
	});

	const { data: importLayouts = [], refetch: refetchLayouts } = useQuery<ImportLayoutViagem[]>({
		queryKey: ['tms', 'import-layouts-viagens'],
		queryFn: getImportLayoutsViagens,
		enabled: open && step === 'mapeamento',
		staleTime: 1000 * 60,
	});

	const applySheetData = (hdrs: string[], mappedRows: PreviewRow[]) => {
		setHeaders(hdrs);
		setRows(mappedRows);
		setMapColunas({});
		setMapFormatoData({});
		setMapPersonalizadas({});
		setSelectedLayoutId('');
	};

	const applyLayout = (layout: ImportLayoutViagem) => {
		const m = layout.js_mapeamento as ImportLayoutViagemMapeamento;
		if (m.mapColunas) setMapColunas({ ...m.mapColunas });
		if (m.mapFormatoData) setMapFormatoData({ ...m.mapFormatoData });
		if (m.mapPersonalizadas) setMapPersonalizadas({ ...(m.mapPersonalizadas ?? {}) });
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
			setFiltroColuna('');
			setFiltroValor('');
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
		setFiltroColuna('');
		setFiltroValor('');
	};

	const rowsFiltradas = useMemo(() => {
		const col = filtroColuna.trim();
		const val = filtroValor.trim();
		if (!col || !val) return rows;
		return rows.filter((row) => {
			const cell = String((row as Record<string, unknown>)[col] ?? '').trim().toUpperCase();
			return cell === val.toUpperCase();
		});
	}, [rows, filtroColuna, filtroValor]);

	const previewRowsToShow = useMemo(() => rowsFiltradas.slice(0, 10), [rowsFiltradas]);

	const previewFinalColumns = useMemo(() => {
		const cols: { planilhaHeader: string; systemLabel: string; fieldKey?: string }[] = [];
		CAMPOS_VIAGEM.forEach((d) => {
			const planilhaHeader = mapColunas[d.key]?.trim();
			if (planilhaHeader) {
				cols.push({ planilhaHeader, systemLabel: d.label, fieldKey: d.key });
			}
		});
		Object.entries(mapPersonalizadas).forEach(([colunaId, planilhaHeader]) => {
			if (!planilhaHeader?.trim()) return;
			const col = colunasPersonalizadas.find((c) => c.id === colunaId);
			cols.push({ planilhaHeader: planilhaHeader.trim(), systemLabel: col?.ds_nome_coluna ?? colunaId });
		});
		return cols;
	}, [mapColunas, mapPersonalizadas, colunasPersonalizadas]);

	const canSubmit = useMemo(() => {
		if (!rows.length) return false;
		if (rowsFiltradas.length === 0) return false;
		if (!mapColunas['ds_motorista']?.trim() || !mapColunas['ds_placa_cavalo']?.trim()) return false;
		for (const key of DATE_FIELD_KEYS) {
			if (mapColunas[key]?.trim() && !mapFormatoData[key]) return false;
		}
		return true;
	}, [rows.length, rowsFiltradas.length, mapColunas, mapFormatoData]);

	const handleSubmit = async () => {
		if (!canSubmit) {
			if (filtroColuna.trim() && filtroValor.trim() && rowsFiltradas.length === 0) {
				toast.error('Nenhum registro corresponde ao filtro. Ajuste o valor ou desative o filtro.');
			} else {
				const missingFormat = DATE_FIELD_KEYS.find((k) => mapColunas[k]?.trim() && !mapFormatoData[k]);
				if (missingFormat) {
					toast.error(`Selecione o formato da data para o campo "${DATE_FIELD_LABELS[missingFormat] ?? missingFormat}".`);
				} else {
					toast.error('Motorista e Placa cavalo são obrigatórios. Preencha o mapeamento antes de importar.');
				}
			}
			return;
		}
		setSubmitting(true);
		const toastId = 'import-viagens';
		toast.loading('Importação em processamento.', { id: toastId });
		try {
			const payload: ViagensImportRequest = {
				mapColunas,
				mapFormatoData,
				mapPersonalizadas,
				rows: rowsFiltradas,
			};
			const resp = await importViagens(payload);
			setResult(resp);
			setStep('resultado');
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
			if (onImported) onImported();
			if (resp.falhas.length === 0) {
				toast.success(`Importação concluída: ${resp.sucesso} viagens importadas.`, { id: toastId });
			} else {
				toast.warning(
					`Importação concluída com ${resp.sucesso} viagens e ${resp.falhas.length} falhas. Verifique os detalhes.`,
					{ id: toastId },
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erro ao importar viagens.';
			toast.error(message, { id: toastId });
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
			setFiltroColuna('');
			setFiltroValor('');
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
					<DialogTitle>Importar viagens via planilha (.xlsx)</DialogTitle>
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
									<label className='text-xs font-semibold text-muted-foreground'>Usar layout salvo</label>
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
										<SelectTrigger className='h-9 w-full min-w-0 text-xs'>
											<SelectValue placeholder='Nenhum' />
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
									<h4 className='text-xs font-semibold text-muted-foreground'>Filtro opcional</h4>
									<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
										<div className='min-w-0 space-y-2'>
											<span className='text-xs font-medium text-muted-foreground'>Coluna para filtrar</span>
											<Select
												value={filtroColuna}
												onValueChange={(v) => setFiltroColuna(v === '__none__' ? '' : v)}
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
												value={filtroValor}
												onChange={(e) => setFiltroValor(e.target.value)}
												className='h-9 min-w-0 text-xs'
											/>
										</div>
									</div>
									{filtroColuna.trim() && filtroValor.trim() && rowsFiltradas.length === 0 && (
										<p className='text-xs font-medium text-destructive'>
											Nenhum registro corresponde ao filtro.
										</p>
									)}
								</div>
								<h3 className='text-sm font-semibold'>Mapeamento de colunas</h3>
								<p className='mt-1 text-xs text-muted-foreground'>
									Selecione para cada campo do sistema a coluna correspondente na planilha. Motorista e Placa cavalo são obrigatórios.
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
														Campos sob medida (VIAGENSLIST). Defina qual coluna da planilha preenche cada um.
													</p>
													{colunasPersonalizadas.length === 0 ? (
														<p className='rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground'>
															Nenhum campo personalizado configurado. Configure em Cadastros → Colunas personalizadas (VIAGENSLIST).
														</p>
													) : (
														<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
															{colunasPersonalizadas.map((col) => (
																<div key={col.id} className='min-w-0 space-y-2 rounded-md border border-border bg-muted/20 p-3'>
																	<p className='text-xs font-medium'>{col.ds_nome_coluna}</p>
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
															))}
														</div>
													)}
												</TabsContent>
											);
										}
										const destinos = CAMPOS_VIAGEM.filter((d) => tab.keys.includes(d.key));
										if (!destinos.length) return null;
										return (
											<TabsContent key={tab.id} value={tab.id} className='mt-0 space-y-4'>
												<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
													{destinos.map((dest) => {
														const isDateField = DATE_FIELD_KEYS.includes(dest.key as (typeof DATE_FIELD_KEYS)[number]);
														return (
															<div key={dest.key} className='min-w-0 space-y-2 rounded-md border border-border bg-muted/20 p-3'>
																<span className='text-xs font-medium text-muted-foreground'>{dest.label}</span>
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
																			<SelectItem key={h} value={h}>{h}</SelectItem>
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
																					[dest.key]: val as FormatoDataImportViagem,
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
										{filtroColuna.trim() && filtroValor.trim()
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

				<Dialog open={saveLayoutOpen} onOpenChange={setSaveLayoutOpen}>
					<DialogContent className='sm:max-w-md'>
						<DialogHeader>
							<DialogTitle>Salvar como layout</DialogTitle>
						</DialogHeader>
						<div className='space-y-4 py-2'>
							<div className='space-y-2'>
								<label className='text-sm font-medium'>Nome do layout</label>
								<Input
									placeholder='Ex.: Planilha Viagens - BASE'
									value={saveLayoutNome}
									onChange={(e) => setSaveLayoutNome(e.target.value)}
								/>
							</div>
							<div className='space-y-2'>
								<label className='text-sm font-medium text-muted-foreground'>Descrição (opcional)</label>
								<Input
									placeholder='Ex.: Mapeamento padrão para viagens'
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
										await createImportLayoutViagens({
											ds_nome: saveLayoutNome.trim(),
											ds_descricao: saveLayoutDescricao.trim() || undefined,
											js_mapeamento: {
												mapColunas,
												mapFormatoData,
												mapPersonalizadas,
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
								Confira as colunas e os dados. No cabeçalho: nome na planilha e campo no sistema.
							</p>
						</div>
						<div className='min-h-0 flex-1 overflow-auto rounded-md border'>
							<table className='w-full min-w-max border-collapse text-xs'>
								<thead className='sticky top-0 z-10 bg-muted shadow-[0_1px_0_0_hsl(var(--border))]'>
									<tr>
										{previewFinalColumns.map((col) => (
											<th
												key={col.planilhaHeader + col.systemLabel}
												className='min-w-[10rem] border-b border-border px-3 py-2 text-left font-medium'
											>
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
												const format =
													col.fieldKey && DATE_FIELD_KEYS.includes(col.fieldKey as (typeof DATE_FIELD_KEYS)[number])
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
						<p className='text-[10px] text-muted-foreground'>
							{filtroColuna.trim() && filtroValor.trim()
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
								disabled={submitting}
							>
								{submitting ? 'Importando...' : 'Confirmar e importar'}
								<ArrowRight className='ml-2 h-4 w-4' />
							</Button>
						</div>
					</div>
				)}

				{step === 'resultado' && result && (
					<div className='space-y-5'>
						<div className='flex items-center gap-3'>
							{result.falhas.length === 0 ? (
								<CheckCircle2 className='h-6 w-6 text-green-600' />
							) : (
								<XCircle className='h-6 w-6 text-amber-500' />
							)}
							<div>
								<p className='text-sm font-semibold'>
									Importação concluída: {result.sucesso} viagens importadas de {result.total} linhas.
								</p>
								{result.falhas.length > 0 && (
									<p className='text-xs text-muted-foreground'>
										Houve {result.falhas.length} falha(s). Veja abaixo os detalhes.
									</p>
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
											<tr key={`${f.linha}-${idx}`} className='border-b last:border-0'>
												<td className='px-2 py-1'>{f.linha}</td>
												<td className='px-2 py-1'>{f.erro}</td>
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
								onClick={() => setStep('mapeamento')}
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
