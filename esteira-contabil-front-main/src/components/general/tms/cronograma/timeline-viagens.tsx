'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays, startOfDay, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Truck, Loader2, Package, Route, Pencil, X, Calendar as CalendarIcon } from 'lucide-react';
import { getCronograma, type CronogramaLinhaDTO, type CronogramaEventoDTO } from '@/services/api/tms/cronograma';
import { updateViagem } from '@/services/api/tms/viagens';
import { Button } from '@/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import type { DateRange } from 'react-day-picker';

// Padrão Torre de Controle: Pendente=azul, Agendada=amarela, Em Coleta=laranja, Em Rota/Em Trânsito=roxo, Entregue=verde, Cancelada=vermelho
// O backend do cronograma envia EM_TRANSITO (mapeado de EM_VIAGEM), então precisamos de ambos para a cor aparecer
const STATUS_LEGEND: { status: string; label: string; color: string; border: string }[] = [
	{ status: 'PENDENTE', label: 'Pendente', color: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-500 dark:border-blue-400' },
	{ status: 'AGENDADA', label: 'Agendada', color: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-400 dark:border-blue-500' },
	{ status: 'EM_COLETA', label: 'Em Coleta', color: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-orange-500 dark:border-orange-400' },
	{ status: 'EM_VIAGEM', label: 'Em Rota', color: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-500 dark:border-violet-400' },
	{ status: 'EM_TRANSITO', label: 'Em Trânsito', color: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-500 dark:border-violet-400' },
	{ status: 'ENTREGUE', label: 'Entregue', color: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-500 dark:border-emerald-400' },
	{ status: 'CANCELADA', label: 'Cancelada', color: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-500 dark:border-red-400' },
];

function getStatusStyle(ds_status: string): { color: string; border: string } {
	const found = STATUS_LEGEND.find((s) => s.status === ds_status);
	return found
		? { color: found.color, border: found.border }
		: { color: 'bg-muted', border: 'border-border' };
}

type ZoomLevel = 'S' | 'M' | 'L';
const DAY_W_BY_ZOOM: Record<ZoomLevel, number> = { S: 56, M: 44, L: 28 };
const LABEL_W = 200;
const ROW_H = 60;
const HDR_H = 56;

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface CronogramaTimelineProps {
	searchFilter?: string;
	/** Período controlado pelo pai (ex.: header da Torre de Controle). Quando definido, o filtro de datas não é exibido aqui. */
	dateRange?: { start: Date; end: Date };
	/** Chamado quando o usuário altera o período (ex.: ao editar no cronograma). Opcional quando dateRange é controlado pelo pai. */
	onDateRangeChange?: (start: Date, end: Date) => void;
	onCreateCarga?: () => void;
	onCreateViagem?: () => void;
	onRequestScheduleLoad?: (load: { id: string }) => void;
	onViewViagem?: (viagemId: string) => void;
	onAddCargaToViagem?: (viagemId: string) => void;
	/** Abre os detalhes da carga visualizada (só para eventos tipo CARGA com id_carga). */
	onViewCarga?: (cargaId: string) => void;
}

export function CronogramaTimeline({
	searchFilter,
	dateRange: controlledDateRange,
	onAddCargaToViagem,
	onViewViagem,
	onViewCarga,
	onRequestScheduleLoad,
}: CronogramaTimelineProps) {
	const queryClient = useQueryClient();
	const todayDate = startOfDay(new Date());
	const isControlled = controlledDateRange != null;
	const [internalStart, setInternalStart] = useState(() => startOfMonth(todayDate));
	const [internalEnd, setInternalEnd] = useState(() => endOfMonth(todayDate));
	const rangeStart = isControlled ? controlledDateRange.start : internalStart;
	const rangeEnd = isControlled ? controlledDateRange.end : internalEnd;
	const setRangeStart = isControlled ? (() => {}) as React.Dispatch<React.SetStateAction<Date>> : setInternalStart;
	const setRangeEnd = isControlled ? (() => {}) as React.Dispatch<React.SetStateAction<Date>> : setInternalEnd;
	const [zoom, setZoom] = useState<ZoomLevel>('M');
	const [editBar, setEditBar] = useState<{
		evento: CronogramaEventoDTO;
		linha: CronogramaLinhaDTO;
		editDtInicio: string;
		editDtFim: string;
	} | null>(null);
	const [dragging, setDragging] = useState<{
		type: 'move' | 'left' | 'right';
		evento: CronogramaEventoDTO;
		startX: number;
		origStart: string;
		origEnd: string;
		dx: number;
	} | null>(null);
	const [hovBar, setHovBar] = useState<string | null>(null);
	const justDraggedIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (!justDraggedIdRef.current) return;
		const t = setTimeout(() => {
			justDraggedIdRef.current = null;
		}, 150);
		return () => clearTimeout(t);
	}, [dragging]);

	const rangeDays = Math.max(1, differenceInDays(rangeEnd, rangeStart) + 1);
	const dayW = DAY_W_BY_ZOOM[zoom];
	const dataInicio = rangeStart.toISOString();
	const dataFim = rangeEnd.toISOString();
	const today = format(todayDate, 'yyyy-MM-dd');

	const { data, isLoading, error } = useQuery({
		queryKey: ['cronograma', dataInicio, dataFim, searchFilter ?? ''],
		queryFn: () =>
			getCronograma(dataInicio, dataFim, searchFilter?.trim() || undefined),
		staleTime: 60 * 1000,
	});

	const linhas = useMemo(() => {
		const raw = data?.linhas ?? [];
		if (!searchFilter?.trim()) return raw;
		const lower = searchFilter.trim().toLowerCase();
		return raw.filter(
			(l) =>
				l.ds_placa_cavalo.toLowerCase().includes(lower) ||
				(l.ds_motorista ?? '').toLowerCase().includes(lower) ||
				(l.ds_placa_carretas ?? '').toLowerCase().includes(lower),
		);
	}, [data?.linhas, searchFilter]);

	const dates = useMemo(() => {
		const out: string[] = [];
		for (let i = 0; i < rangeDays; i++) {
			out.push(format(addDays(rangeStart, i), 'yyyy-MM-dd'));
		}
		return out;
	}, [rangeStart, rangeDays]);

	const monthGroups = useMemo(() => {
		const groups: { month: string; startIdx: number; count: number }[] = [];
		let cur: string | null = null;
		dates.forEach((d, i) => {
			const m = d.slice(0, 7);
			if (m !== cur) {
				groups.push({ month: m, startIdx: i, count: 0 });
				cur = m;
			}
			groups[groups.length - 1].count++;
		});
		return groups;
	}, [dates]);

	const dayX = useCallback(
		(dateStr: string) => {
			const d = new Date(dateStr + 'T00:00:00').getTime();
			const start = rangeStart.getTime();
			const diff = Math.round((d - start) / 86400000);
			return diff * dayW + LABEL_W;
		},
		[rangeStart, dayW],
	);
	const todayX = dayX(today);
	const totalW = rangeDays * dayW + LABEL_W;

	const invalidateCronograma = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['cronograma'] });
		queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
		queryClient.invalidateQueries({ queryKey: ['viagem-fluxo'] });
	}, [queryClient]);

	const handleSaveDates = useCallback(
		async (viagemId: string, _itemId: string, dtInicio: string, dtFim: string) => {
			try {
				const dtInicioISO = new Date(dtInicio + 'T12:00:00').toISOString();
				const dtFimISO = new Date(dtFim + 'T18:00:00').toISOString();
				await updateViagem(viagemId, {
					dt_agendada: dtInicioISO,
					dt_previsao_retorno: dtFimISO,
				});
				invalidateCronograma();
				toast.success('Datas atualizadas.');
				setEditBar(null);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Erro ao atualizar datas.');
			}
		},
		[invalidateCronograma],
	);

	const handleMoveBar = useCallback(
		async (viagemId: string, newDtInicio: string, newDtFim: string) => {
			try {
				await updateViagem(viagemId, {
					dt_agendada: new Date(newDtInicio + 'T12:00:00').toISOString(),
					dt_previsao_retorno: new Date(newDtFim + 'T18:00:00').toISOString(),
				});
				invalidateCronograma();
				toast.success('Datas atualizadas.');
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Erro ao atualizar datas.');
			}
		},
		[invalidateCronograma],
	);

	const step = Math.max(1, Math.floor(rangeDays / 2));
	const handlePrev = () => {
		setRangeStart((d) => subDays(d, step));
		setRangeEnd((d) => subDays(d, step));
	};
	const handleNext = () => {
		setRangeStart((d) => addDays(d, step));
		setRangeEnd((d) => addDays(d, step));
	};
	const handleToday = () => {
		const newStart = subDays(todayDate, Math.floor(rangeDays / 2));
		setRangeStart(newStart);
		setRangeEnd(addDays(newStart, rangeDays - 1));
	};
	const handleRangeSelect = (range: DateRange | undefined) => {
		if (!range?.from) return;
		const from = startOfDay(range.from);
		const to = range.to ? startOfDay(range.to) : from;
		setRangeStart(from);
		setRangeEnd(to);
	};

	const onMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!dragging) return;
			const deltaPx = e.clientX - dragging.startX;
			const dx = Math.round(deltaPx / dayW);
			setDragging((d) => (d ? { ...d, dx } : null));
		},
		[dragging, dayW],
	);
	const onMouseUp = useCallback(() => {
		if (!dragging) return;
		let newStart = dragging.origStart;
		let newEnd = dragging.origEnd;
		if (dragging.type === 'move' && dragging.dx !== 0) {
			newStart = format(addDays(new Date(dragging.origStart + 'T00:00:00'), dragging.dx), 'yyyy-MM-dd');
			newEnd = format(addDays(new Date(dragging.origEnd + 'T00:00:00'), dragging.dx), 'yyyy-MM-dd');
		} else if (dragging.type === 'left' && dragging.dx !== 0) {
			newStart = format(addDays(new Date(dragging.origStart + 'T00:00:00'), dragging.dx), 'yyyy-MM-dd');
		} else if (dragging.type === 'right' && dragging.dx !== 0) {
			newEnd = format(addDays(new Date(dragging.origEnd + 'T00:00:00'), dragging.dx), 'yyyy-MM-dd');
		}
		if (newStart < newEnd && (newStart !== dragging.origStart || newEnd !== dragging.origEnd)) {
			handleMoveBar(dragging.evento.id_viagem, newStart, newEnd);
			justDraggedIdRef.current = dragging.evento.id_item;
		}
		setDragging(null);
	}, [dragging, handleMoveBar]);
	const onMouseLeave = useCallback(() => setDragging(null), []);

	const isWeekend = (d: string) => {
		const dow = new Date(d + 'T00:00:00').getDay();
		return dow === 0 || dow === 6;
	};
	const isToday = (d: string) => d === today;

	return (
		<TooltipProvider delayDuration={300}>
			<div
				className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card overflow-hidden"
				onMouseMove={onMouseMove}
				onMouseUp={onMouseUp}
				onMouseLeave={onMouseLeave}
			>
				{/* Toolbar */}
				<div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-3">
					<h2 className="text-base font-bold text-foreground mr-2">Cronograma de Frotas</h2>
					{!isControlled && (
						<div className="flex items-center gap-1">
							<Button variant="outline" size="sm" onClick={handlePrev} className="h-8 w-8 p-0">
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button variant="outline" size="sm" onClick={handleNext} className="h-8 w-8 p-0">
								<ChevronRight className="h-4 w-4" />
							</Button>
							<Button variant="secondary" size="sm" onClick={handleToday} className="h-8 text-xs">
								Hoje
							</Button>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="h-8 text-xs font-normal text-muted-foreground hover:text-foreground min-w-[200px] justify-start"
									>
										<CalendarIcon className="mr-2 h-3.5 w-3.5" />
										{format(rangeStart, 'dd/MM/yyyy', { locale: ptBR })} — {format(rangeEnd, 'dd/MM/yyyy', { locale: ptBR })}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="range"
										selected={{ from: rangeStart, to: rangeEnd }}
										onSelect={handleRangeSelect}
										locale={ptBR}
										numberOfMonths={2}
									/>
								</PopoverContent>
							</Popover>
						</div>
					)}
					<div className="flex gap-1">
						{(['S', 'M', 'L'] as const).map((z) => (
							<Button
								key={z}
								variant={zoom === z ? 'default' : 'ghost'}
								size="sm"
								className="h-7 w-7 p-0 font-mono text-xs"
								onClick={() => setZoom(z)}
							>
								{z}
							</Button>
						))}
					</div>
					<div className="flex-1" />
					<div className="flex flex-wrap items-center gap-3 text-xs">
						{STATUS_LEGEND.map((s) => (
							<span key={s.status} className="flex items-center gap-1.5">
								<span className={`h-2 w-2 rounded-full ${s.color} border ${s.border}`} />
								{s.label}
							</span>
						))}
						<span className="text-muted-foreground flex items-center gap-1">
							<Pencil className="h-3 w-3" /> Arraste ou clique para editar
						</span>
					</div>
				</div>

				{isLoading && (
					<div className="flex flex-1 items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				)}
				{error && (
					<div className="rounded-lg border border-destructive/50 bg-destructive/10 mx-4 mt-4 px-4 py-3 text-sm text-destructive">
						{(error as Error).message}
					</div>
				)}
				{!isLoading && !error && (
					<div className="min-h-0 flex-1 overflow-auto" data-cronograma-grid>
						<div className="min-w-max" style={{ width: totalW }}>
							{/* Header: meses + dias */}
							<div
								className="sticky top-0 z-20 flex border-b-2 border-border bg-card"
								style={{ height: HDR_H }}
							>
								<div
									className="shrink-0 border-r-2 border-border flex items-center px-3 bg-muted/50"
									style={{ width: LABEL_W }}
								>
									<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
										Veículo
									</span>
								</div>
								<div className="flex-1 flex flex-col overflow-hidden">
									<div className="flex h-6 border-b border-border bg-muted/30">
										{monthGroups.map(({ month, count }) => (
											<div
												key={month}
												className="shrink-0 flex items-center pl-2 text-[11px] font-bold text-muted-foreground border-r border-border"
												style={{ width: count * dayW }}
											>
												{MESES[parseInt(month.slice(5, 7), 10) - 1]} {month.slice(0, 4)}
											</div>
										))}
									</div>
									<div className="flex h-8 bg-card">
										{dates.map((d) => (
											<div
												key={d}
												className={`relative shrink-0 flex items-center justify-center text-[10px] font-medium border-r border-border transition-colors ${
													isToday(d)
														? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold'
														: isWeekend(d)
															? 'bg-muted/30 dark:bg-muted/50 text-muted-foreground'
															: 'text-muted-foreground'
												}`}
												style={{ width: dayW }}
											>
												{d.slice(8, 10)}
												{isToday(d) && (
													<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500 dark:bg-red-400" />
												)}
											</div>
										))}
									</div>
								</div>
							</div>

							{linhas.length === 0 && (
								<div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
									<Truck className="h-10 w-10 opacity-50" />
									<p className="text-sm font-medium">Nenhuma viagem no período.</p>
								</div>
							)}

							{linhas.map((linha, rowIdx) => (
								<CronogramaRow
									key={linha.chave}
									linha={linha}
									rangeStart={rangeStart}
									rangeEnd={rangeEnd}
									dates={dates}
									rowIdx={rowIdx}
									dayWidth={dayW}
									dragging={dragging}
									onBarClick={(evento) => {
										if (justDraggedIdRef.current === evento.id_item) return;
										setEditBar({
											evento,
											linha,
											editDtInicio: evento.dt_inicio.slice(0, 10),
											editDtFim: evento.dt_fim.slice(0, 10),
										});
									}}
									onBarDragStart={(type, evento, startX) =>
										setDragging({
											type,
											evento,
											startX,
											origStart: evento.dt_inicio.slice(0, 10),
											origEnd: evento.dt_fim.slice(0, 10),
											dx: 0,
										})
									}
									hovBar={hovBar}
									setHovBar={setHovBar}
									today={today}
									todayX={todayX}
									totalW={totalW}
									isWeekend={isWeekend}
									isToday={isToday}
									onViewViagem={onViewViagem}
									onRequestScheduleLoad={onRequestScheduleLoad}
								/>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Modal edição de datas */}
			{editBar && (
				<ModalEditDatas
					editBar={editBar}
					onClose={() => setEditBar(null)}
					onSave={(dtInicio, dtFim) =>
						handleSaveDates(editBar.evento.id_viagem, editBar.evento.id_item, dtInicio, dtFim)
					}
					getStatusStyle={getStatusStyle}
					onViewViagem={onViewViagem}
					onAddCargaToViagem={onAddCargaToViagem}
					onViewCarga={onViewCarga}
				/>
			)}
		</TooltipProvider>
	);
}

function ModalEditDatas({
	editBar,
	onClose,
	onSave,
	getStatusStyle,
	onViewViagem,
	onAddCargaToViagem,
	onViewCarga,
}: {
	editBar: { evento: CronogramaEventoDTO; linha: CronogramaLinhaDTO; editDtInicio: string; editDtFim: string };
	onClose: () => void;
	onSave: (dtInicio: string, dtFim: string) => void;
	getStatusStyle: (s: string) => { color: string; border: string };
	onViewViagem?: (viagemId: string) => void;
	onAddCargaToViagem?: (viagemId: string) => void;
	onViewCarga?: (cargaId: string) => void;
}) {
	const [editDtInicio, setEditDtInicio] = useState(editBar.editDtInicio);
	const [editDtFim, setEditDtFim] = useState(editBar.editDtFim);
	const style = getStatusStyle(editBar.evento.ds_status);
	const statusLabel = STATUS_LEGEND.find((s) => s.status === editBar.evento.ds_status)?.label ?? editBar.evento.ds_status;

	React.useEffect(() => {
		setEditDtInicio(editBar.editDtInicio);
		setEditDtFim(editBar.editDtFim);
	}, [editBar.editDtInicio, editBar.editDtFim]);

	const dur =
		editDtInicio && editDtFim
			? Math.max(0, differenceInDays(new Date(editDtFim), new Date(editDtInicio))) + 1
			: 0;

	return (
		<div
			className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
			onClick={onClose}
		>
			<div
				className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex justify-between items-start mb-4">
					<div>
						<p className="text-[10px] font-semibold uppercase text-muted-foreground mb-0.5">
							Editar datas do evento
						</p>
						<p className="font-bold text-foreground">{editBar.evento.cd_viagem}</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							{editBar.linha.ds_placa_cavalo} · {editBar.linha.ds_motorista ?? '—'}
						</p>
					</div>
					<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
						<X className="h-4 w-4" />
					</Button>
				</div>
				<span
					className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.color} border ${style.border}`}
				>
					{statusLabel}
				</span>
				<div className="grid grid-cols-2 gap-3 mt-4">
					<div>
						<label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
							Início
						</label>
						<input
							type="date"
							value={editDtInicio}
							onChange={(e) => setEditDtInicio(e.target.value)}
							className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
						/>
					</div>
					<div>
						<label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
							Fim
						</label>
						<input
							type="date"
							value={editDtFim}
							min={editDtInicio}
							onChange={(e) => setEditDtFim(e.target.value)}
							className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
						/>
					</div>
				</div>
				{dur > 0 && (
					<p className="text-xs text-muted-foreground mt-2">Duração: {dur} dia(s)</p>
				)}
				{(onViewViagem || onAddCargaToViagem || (onViewCarga && editBar.evento.tipo === 'CARGA' && editBar.evento.id_carga)) && (
					<div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
						{onViewViagem && (
							<Button
								variant="outline"
								size="sm"
								className="text-xs"
								onClick={() => {
									onViewViagem(editBar.evento.id_viagem);
									onClose();
								}}
							>
								Abrir viagem
							</Button>
						)}
						{onViewCarga && editBar.evento.tipo === 'CARGA' && editBar.evento.id_carga && (
							<Button
								variant="outline"
								size="sm"
								className="text-xs"
								onClick={() => {
									onViewCarga(editBar.evento.id_carga!);
									onClose();
								}}
							>
								Ver detalhes da carga
							</Button>
						)}
						{onAddCargaToViagem && (
							<Button
								variant="outline"
								size="sm"
								className="text-xs"
								onClick={() => {
									onAddCargaToViagem(editBar.evento.id_viagem);
									onClose();
								}}
							>
								Adicionar carga a esta viagem
							</Button>
						)}
					</div>
				)}
				<div className="flex gap-2 justify-end mt-4">
					<Button variant="outline" size="sm" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						size="sm"
						onClick={() => onSave(editDtInicio, editDtFim)}
						disabled={!editDtInicio || !editDtFim || editDtInicio > editDtFim}
					>
						Salvar datas
					</Button>
				</div>
			</div>
		</div>
	);
}

function CronogramaRow({
	linha,
	rangeStart,
	dates,
	rowIdx,
	dayWidth,
	dragging,
	onBarClick,
	onBarDragStart,
	hovBar,
	setHovBar,
	todayX,
	totalW,
	isWeekend,
	isToday,
}: {
	linha: CronogramaLinhaDTO;
	rangeStart: Date;
	rangeEnd: Date;
	dates: string[];
	rowIdx: number;
	dayWidth: number;
	dragging: {
		type: 'move' | 'left' | 'right';
		evento: CronogramaEventoDTO;
		startX: number;
		origStart: string;
		origEnd: string;
		dx: number;
	} | null;
	onBarClick: (evento: CronogramaEventoDTO) => void;
	onBarDragStart: (type: 'move' | 'left' | 'right', evento: CronogramaEventoDTO, startX: number) => void;
	hovBar: string | null;
	setHovBar: (id: string | null) => void;
	today: string;
	todayX: number;
	totalW: number;
	isWeekend: (d: string) => boolean;
	isToday: (d: string) => boolean;
	onViewViagem?: (viagemId: string) => void;
	onRequestScheduleLoad?: (load: { id: string }) => void;
}) {
	return (
		<div
			className={`flex border-b border-border/50 min-h-[60px] transition-colors ${rowIdx % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}
			style={{ height: ROW_H }}
		>
			<div
				className="shrink-0 border-r-2 border-border flex items-center gap-2 px-3 sticky left-0 z-10 bg-inherit"
				style={{ width: LABEL_W }}
			>
				<span
					className={`w-2 h-2 rounded-full shrink-0 ${
						linha.eventos[0]
							? getStatusStyle(linha.eventos[0].ds_status).border.replace('border-', 'bg-')
							: 'bg-muted'
					}`}
				/>
				<div className="min-w-0">
					<p className="font-bold text-sm text-foreground font-mono tracking-wide">
						{linha.ds_placa_cavalo}
					</p>
					<p className="text-[10px] text-muted-foreground truncate">
						{linha.ds_placa_carretas ?? linha.ds_motorista ?? '—'}
					</p>
				</div>
				{linha.eventos.length > 0 && (
					<span className="ml-auto text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
						{linha.eventos.length}
					</span>
				)}
			</div>
			<div className="relative flex-1 min-w-0">
				{/* Fundo: células por dia */}
				{dates.map((d, i) => (
					<div
						key={d}
						className={`absolute top-0 border-r border-border/50 transition-colors ${
							isToday(d) ? 'bg-red-50/30 dark:bg-red-950/40' : isWeekend(d) ? 'bg-slate-100 dark:bg-muted/40' : ''
						}`}
						style={{
							left: i * dayWidth,
							width: dayWidth,
							height: '100%',
						}}
					/>
				))}
				{/* Linha hoje */}
				{todayX >= LABEL_W && todayX <= totalW && (
					<div
						className="absolute top-0 w-0.5 h-full bg-red-500/60 dark:bg-red-400/50 z-[5] pointer-events-none"
						style={{ left: todayX - LABEL_W }}
					/>
				)}
				{/* Barras */}
				{linha.eventos.map((ev) => {
					const isDraggingThis = dragging?.evento.id_item === ev.id_item;
					const displayDtInicio =
						isDraggingThis && dragging
							? dragging.type === 'right'
								? dragging.origStart
								: format(addDays(new Date(dragging.origStart + 'T00:00:00'), dragging.dx), 'yyyy-MM-dd')
							: undefined;
					const displayDtFim =
						isDraggingThis && dragging
							? dragging.type === 'left'
								? dragging.origEnd
								: format(addDays(new Date(dragging.origEnd + 'T00:00:00'), dragging.dx), 'yyyy-MM-dd')
							: undefined;
					return (
						<EventBar
							key={ev.id_item}
							evento={ev}
							rangeStart={rangeStart}
							rangeDays={dates.length}
							dayWidth={dayWidth}
							displayDtInicio={displayDtInicio}
							displayDtFim={displayDtFim}
							isDragging={isDraggingThis}
							onClick={() => onBarClick(ev)}
							onDragStart={onBarDragStart}
							isHov={hovBar === ev.id_item}
							onHov={(v) => setHovBar(v ? ev.id_item : null)}
							getStatusStyle={getStatusStyle}
						/>
					);
				})}
				{linha.eventos.length === 0 && (
					<div className="absolute top-1/2 -translate-y-1/2 left-2 text-[10px] text-muted-foreground italic">
						Nenhuma viagem agendada
					</div>
				)}
			</div>
		</div>
	);
}

function EventBar({
	evento,
	rangeStart,
	rangeDays,
	dayWidth,
	displayDtInicio,
	displayDtFim,
	isDragging,
	onClick,
	onDragStart,
	isHov,
	onHov,
	getStatusStyle,
}: {
	evento: CronogramaEventoDTO;
	rangeStart: Date;
	rangeDays: number;
	dayWidth: number;
	displayDtInicio?: string;
	displayDtFim?: string;
	isDragging?: boolean;
	onClick: () => void;
	onDragStart: (type: 'move' | 'left' | 'right', evento: CronogramaEventoDTO, startX: number) => void;
	isHov: boolean;
	onHov: (v: boolean) => void;
	getStatusStyle: (s: string) => { color: string; border: string };
}) {
	const startStr = displayDtInicio ?? evento.dt_inicio.slice(0, 10);
	const endStr = displayDtFim ?? evento.dt_fim.slice(0, 10);
	const start = new Date(startStr + 'T00:00:00').getTime();
	let end = new Date(endStr + 'T00:00:00').getTime();
	if (end < start) end = start + 86400000;
	const rangeStartMs = rangeStart.getTime();
	const timeAreaW = rangeDays * dayWidth;
	const leftPxRaw = ((start - rangeStartMs) / 86400000) * dayWidth;
	const widthPxRaw = Math.max(1, (end - start) / 86400000) * dayWidth;
	if (leftPxRaw + widthPxRaw < 0 || leftPxRaw > timeAreaW) return null;
	const leftPx = Math.max(0, leftPxRaw);
	const widthPx = Math.min(timeAreaW - leftPx, Math.max(24, widthPxRaw));
	const style = getStatusStyle(evento.ds_status);
	const dur = Math.max(1, Math.ceil((end - start) / 86400000));
	const tooltipContent = `${evento.cd_viagem}${evento.label ? ` · ${evento.label}` : ''} · ${evento.ds_status} · ${dur}d`;

	const handleBodyMouseDown = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
		e.preventDefault();
		onDragStart('move', evento, e.clientX);
	};

	return (
		<Tooltip open={isDragging ? false : undefined}>
			<TooltipTrigger asChild>
				<div
					className={`absolute top-1/2 -translate-y-1/2 h-[34px] rounded-md border-2 flex items-center overflow-hidden select-none animate-in fade-in duration-200 ${
						style.color
					} ${style.border} ${
						isDragging
							? 'z-[20] cursor-grabbing shadow-lg scale-[1.02]'
							: isHov
								? 'shadow-md z-[15] scale-[1.02] cursor-grab'
								: 'z-[8] shadow-sm cursor-grab'
					}`}
					style={{
						left: leftPx,
						width: widthPx,
						minWidth: 48,
						transition: isDragging
							? 'none'
							: 'left 0.2s ease-out, width 0.2s ease-out, box-shadow 0.15s ease, transform 0.15s ease',
					}}
					onClick={(e) => {
						if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
						onClick();
					}}
					onMouseDown={handleBodyMouseDown}
					onMouseEnter={() => onHov(true)}
					onMouseLeave={() => onHov(false)}
				>
					{/* Handle esquerdo */}
					<div
						data-resize-handle
						className="w-2 h-full shrink-0 cursor-col-resize flex items-center justify-center bg-black/10 hover:bg-black/20 border-r border-border/50"
						onMouseDown={(e) => {
							e.stopPropagation();
							onDragStart('left', evento, e.clientX);
						}}
					>
						<div className="w-0.5 h-3 rounded-full bg-current opacity-70" />
					</div>
					{/* Conteúdo */}
					<div className="flex-1 flex items-center gap-1.5 px-1.5 min-w-0">
						{evento.tipo === 'CARGA' ? (
							<Package className="h-3 w-3 shrink-0 text-foreground/70" />
						) : (
							<Route className="h-3 w-3 shrink-0 text-foreground/70" />
						)}
						<span className="text-[9px] font-bold truncate text-foreground" title={evento.cd_viagem}>
							{evento.cd_viagem}
						</span>
						{widthPx >= 80 && (
							<span className="text-[8px] text-muted-foreground shrink-0">{dur}d</span>
						)}
						{widthPx >= 120 && evento.label && (
							<span className="text-[8px] truncate text-muted-foreground">· {evento.label}</span>
						)}
					</div>
					{/* Handle direito */}
					<div
						data-resize-handle
						className="w-2 h-full shrink-0 cursor-col-resize flex items-center justify-center bg-black/10 hover:bg-black/20 border-l border-border/50"
						onMouseDown={(e) => {
							e.stopPropagation();
							onDragStart('right', evento, e.clientX);
						}}
					>
						<div className="w-0.5 h-3 rounded-full bg-current opacity-70" />
					</div>
				</div>
			</TooltipTrigger>
			<TooltipContent side="top" className="text-xs max-w-xs">
				{tooltipContent}
			</TooltipContent>
		</Tooltip>
	);
}
