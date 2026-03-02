'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfDay, startOfMonth, endOfMonth, differenceInDays, addMonths, subMonths, getDate, setDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { TripBoardV2 } from '@/components/general/tms/viagens/kanban-view';
import { NewTripWizard } from '@/components/general/tms/viagens/modal-create-viagem';
import { CreateLoadModal } from '@/components/general/tms/viagens/modal-create-carga';
import { ScheduleLoadModal } from '@/components/general/tms/viagens/modal-schedule-carga';
import { ConfigureLoadModal } from '@/components/general/tms/viagens/modal-configure-carga';
import { LoadDetailsModal } from '@/components/general/tms/viagens/modal-details-carga';
import { LayoutGrid, Map, Search, Plus, ChartNoAxesGantt, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getCargas, getCarga } from '@/services/api/tms/cargas';
import { getViagens, updateViagemStatus, vincularCargaAViagem } from '@/services/api/tms/viagens';
import { reordenarEntregasCarga } from '@/services/api/tms/entregas';
import { toast } from 'sonner';
import { getVeiculos } from '@/services/api/tms/tms';
import type { Carga, Viagem } from '@/types/tms';
import { LoadBoard } from '@/components/general/tms/viagens/carga-kanban-view';
import { useCompanyContext } from '@/context/company-context';
import { mapStatusFromLegacy } from '@/utils/viagem-mapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { CronogramaTimeline } from '@/components/general/tms/cronograma/timeline-viagens';

/** Tipo de competência: mês inteiro (01→fim), primeira quinzena (01→15) ou segunda (15→fim). */
type PeriodType = 'full' | 'firstHalf' | 'secondHalf' | 'custom';

function getPeriodType(start: Date, end: Date): PeriodType {
	const startDay = getDate(start);
	const endDay = getDate(end);
	const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
	if (!sameMonth) return 'custom';
	const endOfStart = endOfMonth(start);
	if (startDay === 1 && end.getTime() === endOfStart.getTime()) return 'full';
	if (startDay === 1 && endDay === 15) return 'firstHalf';
	if (startDay === 15 && end.getTime() === endOfStart.getTime()) return 'secondHalf';
	return 'custom';
}

function getNextPeriod(start: Date, end: Date): { start: Date; end: Date } {
	const type = getPeriodType(start, end);
	const nextMonth = addMonths(start, 1);
	switch (type) {
		case 'full':
			return { start: startOfMonth(nextMonth), end: endOfMonth(nextMonth) };
		case 'firstHalf':
			return { start: startOfMonth(nextMonth), end: setDate(startOfMonth(nextMonth), 15) };
		case 'secondHalf': {
			const s = setDate(startOfMonth(nextMonth), 15);
			return { start: s, end: endOfMonth(nextMonth) };
		}
		default: {
			const days = differenceInDays(end, start) + 1;
			const newStart = addMonths(start, 1);
			return { start: newStart, end: addDays(newStart, days - 1) };
		}
	}
}

function getPrevPeriod(start: Date, end: Date): { start: Date; end: Date } {
	const type = getPeriodType(start, end);
	const prevMonth = subMonths(start, 1);
	switch (type) {
		case 'full':
			return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
		case 'firstHalf':
			return { start: startOfMonth(prevMonth), end: setDate(startOfMonth(prevMonth), 15) };
		case 'secondHalf': {
			const s = setDate(startOfMonth(prevMonth), 15);
			return { start: s, end: endOfMonth(prevMonth) };
		}
		default: {
			const days = differenceInDays(end, start) + 1;
			const newStart = subMonths(start, 1);
			return { start: newStart, end: addDays(newStart, days - 1) };
		}
	}
}

/** Retorna a competência que contém a data de hoje (mês inteiro ou quinzena). */
function getPeriodContainingToday(today: Date): { start: Date; end: Date } {
	const day = getDate(today);
	if (day <= 15) {
		return {
			start: setDate(startOfMonth(today), 1),
			end: setDate(startOfMonth(today), 15),
		};
	}
	return {
		start: setDate(startOfMonth(today), 15),
		end: endOfMonth(today),
	};
}

export default function TorreControlePage() {
	const queryClient = useQueryClient();
	const [viewMode, setViewMode] = useState<'TRIPS' | 'LOADS' | 'CRONOGRAMA'>('TRIPS');
	const [isWizardOpen, setIsWizardOpen] = useState(false);
	const [isCreateLoadOpen, setIsCreateLoadOpen] = useState(false);
	const [schedulingLoad, setSchedulingLoad] = useState<Carga | null>(null);
	const [configuringLoad, setConfiguringLoad] = useState<Carga | null>(null);
	const [viewingLoad, setViewingLoad] = useState<Carga | null>(null);
	const [editingLoad, setEditingLoad] = useState<Carga | null>(null);
	const [addCargaToViagemId, setAddCargaToViagemId] = useState<string | null>(null);
	const [createLoadOpenedFromWizard, setCreateLoadOpenedFromWizard] = useState(false);
	const [wizardRemountKey, setWizardRemountKey] = useState(0);
	const [searchTerm, setSearchTerm] = useState('');
	const todayDate = useMemo(() => startOfDay(new Date()), []);
	const [rangeStart, setRangeStart] = useState(() => startOfMonth(todayDate));
	const [rangeEnd, setRangeEnd] = useState(() => endOfMonth(todayDate));

	const handleDateRangeSelect = useCallback((range: DateRange | undefined) => {
		if (!range?.from) return;
		setRangeStart(startOfDay(range.from));
		setRangeEnd(range.to ? startOfDay(range.to) : startOfDay(range.from));
	}, []);

	const handleDateToday = useCallback(() => {
		const { start, end } = getPeriodContainingToday(todayDate);
		setRangeStart(start);
		setRangeEnd(end);
	}, [todayDate]);

	const handleDatePrev = useCallback(() => {
		const prev = getPrevPeriod(rangeStart, rangeEnd);
		setRangeStart(prev.start);
		setRangeEnd(prev.end);
	}, [rangeStart, rangeEnd]);

	const handleDateNext = useCallback(() => {
		const next = getNextPeriod(rangeStart, rangeEnd);
		setRangeStart(next.start);
		setRangeEnd(next.end);
	}, [rangeStart, rangeEnd]);

	const { state: empresaId } = useCompanyContext();
	// Buscar cargas da API
	const { data: cargasData = [] } = useQuery({
		queryKey: ['get-cargas-all'],
		queryFn: () => getCargas(),
		staleTime: 1000 * 60 * 5, // 5 minutos
	});

	// Buscar viagens da API
	const { data: viagensData = [] } = useQuery({
		queryKey: ['get-viagens-all'],
		queryFn: () => getViagens(),
		staleTime: 1000 * 60 * 5, // 5 minutos
	});

	// Buscar veículos da API
	const { data: veiculosData = [] } = useQuery({
		queryKey: ['get-veiculos-all'],
		queryFn: () => getVeiculos(empresaId, true),
		staleTime: 1000 * 60 * 5, // 5 minutos
	});

	const loads = useMemo(() => cargasData, [cargasData]);
	const trips = useMemo(() => viagensData, [viagensData]);
	const vehicles = useMemo(() => veiculosData, [veiculosData]);

	// Derived state to identify active trips for context logic (wizard/blockers)
	const activeTrips = useMemo(() => (trips ?? []).filter((t) => t.ds_status === 'EM_VIAGEM' || t.ds_status === 'EM_COLETA'), [trips]);

	// Helper: força refetch dos datasets principais do TMS após qualquer mutação (inclui cronograma)
	const refreshTmsData = useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] }),
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] }),
			queryClient.invalidateQueries({ queryKey: ['get-veiculos-all'] }),
			queryClient.invalidateQueries({ queryKey: ['cronograma'] }),
		]);
	}, [queryClient]);

	// Handler genérico para mudanças de status de viagem disparadas pelos boards/detalhes
	const handleUpdateStatus = useCallback(
		async (tripId: string, status: Viagem['ds_status']) => {
			try {
				await updateViagemStatus(tripId, status);
			} catch (error) {
				console.error('Erro ao atualizar status da viagem', error);
			} finally {
				await refreshTmsData();
			}
		},
		[refreshTmsData],
	);

	const handleReorderDeliveries = useCallback(
		async (
			_tripId: string,
			loadId: string,
			newOrder: Array<{ id: string; isLegacy?: boolean }>,
		) => {
			const realDeliveries = newOrder.filter((d) => !d.isLegacy);
			if (realDeliveries.length === 0) return;
			try {
				const payload = realDeliveries.map((d, i) => ({
					id: d.id,
					nr_sequencia: i + 1,
				}));
				await reordenarEntregasCarga(loadId, payload);
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] }),
					queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] }),
					queryClient.invalidateQueries({ queryKey: ['viagem-fluxo'] }),
				]);
				toast.success('Ordem das entregas atualizada');
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Erro ao reordenar entregas';
				toast.error(message);
			}
		},
		[queryClient],
	);

	// Wrapper para TripBoardV2 que aceita tipo legado e converte para novo formato
	const handleUpdateStatusLegacy = useCallback(
		(tripId: string, status: Viagem['status']) => {
			if (!status) return;
			const newStatus = mapStatusFromLegacy(status);
			handleUpdateStatus(tripId, newStatus).catch((error) => {
				console.error('Erro ao atualizar status da viagem (legacy)', error);
			});
		},
		[handleUpdateStatus],
	);

	// Filter Data Logic (não utilizado no momento, pois o TripBoardV2 filtra internamente)
	// const filteredTrips = useMemo(() => {
	// 	if (!searchTerm) return trips;
	// 	const lower = searchTerm.toLowerCase();
	// 	return trips.filter(
	// 		(t) =>
	// 			(t.ds_placa_cavalo?.toLowerCase() || '').includes(lower) ||
	// 			(t.ds_motorista?.toLowerCase() || '').includes(lower) ||
	// 			(t.id?.toLowerCase() || '').includes(lower),
	// 	);
	// }, [trips, searchTerm]);

	const handleSaveLoadWrapper = (loadData: unknown, vehicle: unknown, isEdit: boolean) => {
		console.log('Save load:', loadData, vehicle, isEdit);
	};

	return (
		<>
			<Head>
				<title>Torre de Controle | Esteira</title>
			</Head>
			<DashboardLayout
				title='Torre de Controle'
				description='Gerenciamento de viagens e cargas.'
				className='flex h-full min-h-0 flex-col'
			>
				<div className='flex h-full min-h-0 min-w-0 flex-col transition-all'>
					{/* GLOBAL HEADER: Controls View Mode, Filters & Main Actions */}
					<div className='bg-background relative z-20 flex shrink-0 items-center justify-between border-b border-border px-3 py-3 shadow-sm sm:px-4 lg:px-6 lg:py-4'>
						<div className='bg-muted flex items-center gap-1 rounded-xl p-1 shadow-inner'>
							<Button
								onClick={() => setViewMode('TRIPS')}
								variant='ghost'
								className={`h-auto rounded-lg px-6 py-2 text-xs font-black tracking-widest uppercase transition-all ${
									viewMode === 'TRIPS' ? 'bg-card text-foreground shadow-md ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<Map size={14} /> Viagens
							</Button>
							<Button
								onClick={() => setViewMode('LOADS')}
								variant='ghost'
								className={`h-auto rounded-lg px-6 py-2 text-xs font-black tracking-widest uppercase transition-all ${
									viewMode === 'LOADS' ? 'bg-card text-foreground shadow-md ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<LayoutGrid size={14} /> Cargas
							</Button>
							<Button
								onClick={() => setViewMode('CRONOGRAMA')}
								variant='ghost'
								className={`h-auto rounded-lg px-6 py-2 text-xs font-black tracking-widest uppercase transition-all ${
									viewMode === 'CRONOGRAMA' ? 'bg-card text-foreground shadow-md ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<ChartNoAxesGantt size={14} /> Cronograma
							</Button>
						</div>

						{/* Filtro de período (competência) — mesmo ícone e estilo do seletor fiscal/entradas e fechamento */}
						<div className='flex items-center gap-1'>
							<Button variant='outline' size='sm' onClick={handleDatePrev} className='h-8 w-8 p-0'>
								<ChevronLeft className='h-4 w-4' />
							</Button>
							<Button variant='outline' size='sm' onClick={handleDateNext} className='h-8 w-8 p-0'>
								<ChevronRight className='h-4 w-4' />
							</Button>
							<Button variant='secondary' size='sm' onClick={handleDateToday} className='h-8 text-xs'>
								Hoje
							</Button>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant='outline'
										className='h-9 min-w-[200px] justify-start truncate text-left font-normal'
									>
										<CalendarIcon className='mr-2 h-4 w-4' />
										{format(rangeStart, 'dd/MM/yyyy', { locale: ptBR })} — {format(rangeEnd, 'dd/MM/yyyy', { locale: ptBR })}
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-auto p-0' align='start'>
									<Calendar
										mode='range'
										selected={{ from: rangeStart, to: rangeEnd }}
										onSelect={handleDateRangeSelect}
										locale={ptBR}
										numberOfMonths={2}
									/>
								</PopoverContent>
							</Popover>
						</div>

						{/* Center: Search Bar */}
						<div className='group relative mx-3 max-w-md flex-1 sm:mx-4 lg:mx-6'>
							<Search
								className='text-muted-foreground group-hover:text-foreground absolute top-1/2 left-4 -translate-y-1/2 transition-colors'
								size={18}
							/>
							<Input
								type='text'
								placeholder={viewMode === 'TRIPS' ? 'Buscar viagem, placa, motorista...' : 'Buscar carga, cliente, cidade...'}
								className='bg-muted/40 h-11 rounded-2xl border-2 border-transparent pr-4 pl-12 text-sm font-bold placeholder:font-medium'
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>

						{/* Right: Actions — mesmo estilo (tema escuro) para todos os botões de função */}
						<div className='flex items-center gap-3'>
							{viewMode === 'TRIPS' ? (
								<>
									<Button
										onClick={() => setIsCreateLoadOpen(true)}
										variant='secondary'
										className='h-auto rounded-xl border border-border bg-muted/60 px-5 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
									>
										<Plus size={16} strokeWidth={3} /> Nova Carga
									</Button>
									<Button
										onClick={() => setIsWizardOpen(true)}
										variant='secondary'
										className='h-auto rounded-xl border border-border bg-muted/60 px-6 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
									>
										<Plus size={16} strokeWidth={3} /> Nova Viagem
									</Button>
								</>
							) : (
								<Button
									onClick={() => setIsCreateLoadOpen(true)}
									variant='secondary'
									className='h-auto rounded-xl border border-border bg-muted/60 px-6 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
								>
									<Plus size={16} strokeWidth={3} /> Nova Carga
								</Button>
							)}
						</div>
					</div>
					<div className='relative min-h-0 min-w-0 flex-1 overflow-hidden'>
						<div className='flex h-full min-h-0 w-full min-w-0 flex-col overflow-auto'>
							{viewMode === 'CRONOGRAMA' ? (
								<CronogramaTimeline
									searchFilter={searchTerm}
									dateRange={{ start: rangeStart, end: rangeEnd }}
									onDateRangeChange={(start, end) => {
										setRangeStart(start);
										setRangeEnd(end);
									}}
									onCreateCarga={() => setIsCreateLoadOpen(true)}
									onCreateViagem={() => setIsWizardOpen(true)}
									onRequestScheduleLoad={(load) => setSchedulingLoad(load as Carga)}
									onViewViagem={(viagemId) => {
										queryClient.invalidateQueries({ queryKey: ['get-viagem', viagemId] });
									}}
									onAddCargaToViagem={(viagemId) => setAddCargaToViagemId(viagemId)}
									onViewCarga={async (cargaId) => {
										const found = loads?.find((c: Carga) => c.id === cargaId);
										if (found) {
											setViewingLoad(found);
											return;
										}
										try {
											const carga = await getCarga(cargaId);
											setViewingLoad(carga as Carga);
										} catch {
											toast.error('Não foi possível carregar os detalhes da carga.');
										}
									}}
								/>
							) : viewMode === 'TRIPS' ? (
								<TripBoardV2
									availableDocs={[]}
									searchTerm={searchTerm}
									dateFilter={{ start: rangeStart, end: rangeEnd }}
									onCreateNew={() => setIsWizardOpen(true)}
									onCreateLoad={() => console.log('Create load')}
									onScheduleLoad={() => console.log('Schedule load')}
									onRequestScheduleLoad={(load) => {
										setSchedulingLoad(load);
									}}
									onUpdateStatus={handleUpdateStatusLegacy}
									onUpdateDeliveryStatus={() => console.log('Update delivery')}
									onReorderDeliveries={handleReorderDeliveries}
									onAddLeg={() => console.log('Add leg')}
									onAddDelivery={() => console.log('Add delivery')}
									onAddDocument={() => console.log('Add document')}
									onCreateTrip={() => console.log('Create trip')}
									onViewLoadDetails={(load) => setViewingLoad(load)}
								/>
							) : (
								<LoadBoard
									loads={loads}
									trips={trips}
									vehicles={vehicles}
									availableDocs={[]}
									searchTerm={searchTerm}
									dateFilter={{ start: rangeStart, end: rangeEnd }}
									onViewDetails={(load) => setViewingLoad(load)}
									onRequestScheduleLoad={(load) => {
										setSchedulingLoad(load);
									}}
									onUpdateStatus={handleUpdateStatus}
									onEmitFiscal={() => console.log('Emit fiscal')}
								/>
							)}
						</div>
					</div>{' '}
					{/* Global Wizard */}
					<NewTripWizard
						key={`wizard-${wizardRemountKey}`}
						isOpen={isWizardOpen}
						onClose={() => setIsWizardOpen(false)}
						cargas={loads}
						activeTrips={activeTrips}
						onCreateTrip={() => setIsWizardOpen(false)}
						onOpenCreateCarga={() => {
							setCreateLoadOpenedFromWizard(true);
							setIsWizardOpen(false);
							setIsCreateLoadOpen(true);
						}}
					/>
					<CreateLoadModal
						isOpen={isCreateLoadOpen || !!editingLoad}
						onClose={() => {
							setIsCreateLoadOpen(false);
							setEditingLoad(null);
							if (createLoadOpenedFromWizard) {
								setWizardRemountKey((k) => k + 1);
								setIsWizardOpen(true);
								setCreateLoadOpenedFromWizard(false);
							}
						}}
						editingLoad={editingLoad}
						onSaveLoad={handleSaveLoadWrapper}
						onCreated={(carga) => {
							queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
							queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
							if (carga?.id) {
								queryClient.invalidateQueries({ queryKey: ['get-carga', carga.id] });
							}
							queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
							queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
							setIsCreateLoadOpen(false);
							setEditingLoad(null);
							if (createLoadOpenedFromWizard) {
								setWizardRemountKey((k) => k + 1);
								setIsWizardOpen(true);
								setCreateLoadOpenedFromWizard(false);
							}
						}}
					/>
					<ScheduleLoadModal
						isOpen={!!schedulingLoad}
						onClose={() => setSchedulingLoad(null)}
						load={schedulingLoad}
						vehicles={vehicles}
						activeTrips={activeTrips}
						onConfirm={(load, vehicle) => {
							console.log('Schedule load:', load, vehicle);
							refreshTmsData();
							setSchedulingLoad(null);
						}}
						onBack={() => {
							setConfiguringLoad(schedulingLoad);
							setSchedulingLoad(null);
						}}
					/>
					<LoadDetailsModal
						load={viewingLoad}
						onClose={() => setViewingLoad(null)}
						onEdit={(load) => {
							setViewingLoad(null);
							setEditingLoad(load);
						}}
						onSchedule={(load) => {
							setViewingLoad(null);
							setSchedulingLoad(load);
						}}
					/>
					{/* Configuration Flow */}
					<ConfigureLoadModal
						isOpen={!!configuringLoad}
						onClose={() => setConfiguringLoad(null)}
						load={configuringLoad}
						onConfirm={(load, segment, vehicleType) => {
							console.log('Configure load:', load, segment, vehicleType);
							// After configuration, immediately move to scheduling
							const updatedLoad = { ...load, segment, vehicleTypeReq: vehicleType };
							setConfiguringLoad(null);
							setSchedulingLoad(updatedLoad);
						}}
						onBack={() => {
							setViewingLoad(configuringLoad);
							setConfiguringLoad(null);
						}}
					/>
					{/* Adicionar carga a viagem (a partir do cronograma) */}
					<Dialog open={!!addCargaToViagemId} onOpenChange={(open) => !open && setAddCargaToViagemId(null)}>
						<DialogContent className="max-w-md" showCloseButton>
							<DialogHeader>
								<DialogTitle>Adicionar carga à viagem</DialogTitle>
							</DialogHeader>
							<div className="max-h-[60vh] overflow-y-auto space-y-2 py-2">
								{(loads ?? [])
									.filter((c: Carga) => c.ds_status === 'PENDENTE')
									.map((c: Carga) => (
										<button
											key={c.id}
											type="button"
											className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
											onClick={async () => {
												if (!addCargaToViagemId) return;
												const trip = trips?.find((t) => t.id === addCargaToViagemId);
												const nextSeq = (trip?.js_viagens_cargas?.length ?? 0) + 1;
												try {
													await vincularCargaAViagem(addCargaToViagemId, {
														id_carga: c.id,
														nr_sequencia: nextSeq,
													});
													toast.success('Carga vinculada à viagem.');
													await refreshTmsData();
													setAddCargaToViagemId(null);
												} catch (err) {
													toast.error(err instanceof Error ? err.message : 'Erro ao vincular carga.');
												}
											}}
										>
											<span className="font-semibold text-sm text-foreground">{c.cd_carga ?? c.ds_nome ?? c.id}</span>
											{(c.sis_cidade_origem || c.sis_cidade_destino) && (
												<p className="text-xs text-muted-foreground mt-0.5">
													{c.sis_cidade_origem?.ds_city ?? '—'} → {c.sis_cidade_destino?.ds_city ?? '—'}
												</p>
											)}
										</button>
									))}
								{loads && loads.filter((c: Carga) => c.ds_status === 'PENDENTE').length === 0 && (
									<p className="text-sm text-muted-foreground text-center py-4">
										Nenhuma carga disponível (Pendente). Crie uma nova carga primeiro.
									</p>
								)}
							</div>
						</DialogContent>
					</Dialog>
				</div>
			</DashboardLayout>
		</>
	);
}
