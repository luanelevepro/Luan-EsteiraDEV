import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfDay } from 'date-fns';
import { Viagem, AvailableDocument, Veiculo, Carga } from '@/types/tms';
import { LoadCard } from '@/components/general/tms/viagens/carga-card';
import { VehicleCard } from '@/components/general/tms/viagens/veiculo-card';
import { ViagemCard } from '@/components/general/tms/viagens/viagem-card'; // Novo componente padronizado
import { ViagemActionButtons } from '@/components/general/tms/viagens/viagem-action-buttons';

import { Filter, X } from 'lucide-react';
import { TripDetails } from '@/components/general/tms/viagens/viagem-details';
import { ErrorBoundary } from '@/components/ui/errorBoundary';
import { BoardColumn as Column, BoardCard as Card, EmptyState } from '@/components/ui/boardUi';
import { getCargas } from '@/services/api/tms/cargas';
import { getVeiculos } from '@/services/api/tms/tms';
import { getCidades } from '@/services/api/sistema';
import { getViagens } from '@/services/api/tms/viagens';
import { useCompanyContext } from '@/context/company-context';

// --- Filter Lists ---

interface TripBoardV2Props {
	availableDocs: AvailableDocument[];
	searchTerm?: string;
	onCreateNew: () => void;
	// Handlers
	onCreateLoad: (loadData: Omit<Carga, 'id' | 'status'>) => void;
	onScheduleLoad: (load: Carga, vehicle: Veiculo, segment: string, customOrigin: string, controlNumber: string) => void;
	onRequestScheduleLoad?: (load: Carga) => void; // abre o modal padrão (evita modal duplicado/bugado)
	onUpdateStatus: (tripId: string, status: Viagem['status'], pod?: string) => void;
	onUpdateDeliveryStatus: (
		tripId: string,
		legId: string,
		deliveryId: string,
		status: 'Pendente' | 'Agendada' | 'Emitida' | 'Entregue' | undefined,
		pod?: string,
	) => void;
	// Others
	onAddLeg: (tripId: string, leg: Record<string, unknown>) => void;
	onAddDelivery: (tripId: string, legId: string, selectedDocs: AvailableDocument[]) => void;
	onAddDocument: (tripId: string, legId: string, deliveryId: string, doc: Record<string, unknown>) => void;
	onCreateTrip: (tripData: Record<string, unknown>) => void;
	onAddLoadWithDeliveries?: (tripId: string, payload: Record<string, unknown>) => void;
	onAttachLoadsToTrip?: (tripId: string, payload: { loads: Array<{ loadId: string; cargaId: string }>; vehicleTypeReq: string }) => void;
	onReorderDeliveries?: (tripId: string, loadId: string, newOrder: Array<{ id: string; isLegacy?: boolean }>) => void;
	showFilters?: boolean;
	onCloseFilters?: () => void;
	onEmitFiscal?: (loadId: string) => void; // Handler para "emitir" CT-e e MDF-e da Carga
	onViewLoadDetails?: (load: Carga) => void; // Unificado
	/** Filtro por período: exibe apenas viagens cuja dt_agendada (ou dt_created) está no intervalo. */
	dateFilter?: { start: Date; end: Date };
}

// Constantes removidas - não utilizadas neste componente

interface FilterState {
	urgency: string;
	destinationCity: string;
	segment: string;
	vehicleType: string;
}

// Painel de Filtros estilo Popover/Overlay
const FilterPanel = ({
	filters,
	onFilterChange,
	cities,
	isOpen,
	onClose,
}: {
	filters: FilterState;
	onFilterChange: (filters: FilterState) => void;
	cities: { ds_city: string }[];
	isOpen: boolean;
	onClose: () => void;
}) => {
	if (!isOpen) return null;

	return (
		<div className='animate-in slide-in-from-top-2 border-border/70 bg-card absolute top-4 right-6 z-50 w-80 rounded-2xl border p-5 shadow-2xl'>
			<div className='mb-4 flex items-center justify-between'>
				<span className='text-foreground flex items-center gap-2 text-xs font-black uppercase'>
					<Filter size={14} /> Filtros
				</span>
				<button onClick={onClose} className='text-muted-foreground hover:text-foreground'>
					<X size={16} />
				</button>
			</div>

			<div className='space-y-4'>
				<div>
					<label className='text-muted-foreground mb-1.5 block text-[10px] font-bold uppercase'>Destino</label>
					<select
						className='border-border bg-muted/40 focus:border-ring w-full rounded-xl border px-3 py-2 text-xs font-bold uppercase transition-all outline-none'
						value={filters.destinationCity}
						onChange={(e) => onFilterChange({ ...filters, destinationCity: e.target.value })}
					>
						<option value=''>Todos Destinos</option>
						{(cities ?? []).map((c) => (
							<option key={typeof c === 'string' ? c : c.ds_city} value={typeof c === 'string' ? c : c.ds_city}>
								{typeof c === 'string' ? c : c.ds_city}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className='text-muted-foreground mb-1.5 block text-[10px] font-bold uppercase'>Conjunto</label>
					<select
						className='border-border bg-muted/40 focus:border-ring w-full rounded-xl border px-3 py-2 text-xs font-bold uppercase transition-all outline-none'
						value={filters.vehicleType}
						onChange={(e) => onFilterChange({ ...filters, vehicleType: e.target.value })}
					>
						<option value=''>Todos Conjuntos</option>
						<option value='Bitrem'>Bitrem</option>
						<option value='Carreta'>Carreta</option>
						<option value='Truck'>Truck</option>
						<option value='Vuc'>VUC</option>
					</select>
				</div>

				{(filters.destinationCity || filters.vehicleType) && (
					<button
						onClick={() => onFilterChange({ urgency: '', destinationCity: '', segment: '', vehicleType: '' })}
						className='text-destructive hover:bg-destructive/10 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[10px] font-black uppercase transition-all'
					>
						<X size={12} /> Limpar Filtros
					</button>
				)}
			</div>
		</div>
	);
};

// Funções de formatação removidas - não utilizadas neste componente

export const TripBoardV2: React.FC<TripBoardV2Props> = ({
	availableDocs,
	searchTerm = '',
	onRequestScheduleLoad,
	onUpdateStatus,
	onUpdateDeliveryStatus,
	onAddLeg,
	onAddDelivery,
	onAddDocument,
	// onCreateTrip, // não utilizado
	onAddLoadWithDeliveries,
	onAttachLoadsToTrip,
	onReorderDeliveries,
	showFilters,
	onCloseFilters,
	onEmitFiscal,
	onViewLoadDetails,
	dateFilter,
}) => {
	const { state: empresaId } = useCompanyContext();

	// Buscar clientes da API (não utilizado no momento)
	// const { data: clientesData } = useQuery({
	// 	queryKey: ['get-clientes-all'],
	// 	queryFn: () => getClientes(),
	// 	staleTime: 1000 * 60 * 5, // 5 minutos
	// });
	// Buscar dados via React Query
	const { data: cargasData } = useQuery({
		queryKey: ['get-cargas-all'],
		queryFn: () => getCargas(),
		staleTime: 1000 * 60 * 5,
	});

	const { data: veiculosData } = useQuery({
		queryKey: ['get-veiculos-all', empresaId],
		queryFn: () => getVeiculos(empresaId, true),
		enabled: !!empresaId,
		staleTime: 1000 * 60 * 5,
	});

	const { data: cidadesData } = useQuery({
		queryKey: ['get-cidades-all'],
		queryFn: () => getCidades({ page: 1, pageSize: 7000 }),
		staleTime: 1000 * 60 * 10,
	});

	const { data: viagensData } = useQuery({
		queryKey: ['get-viagens-all'],
		queryFn: () => getViagens(),
		staleTime: 1000 * 60 * 5,
	});

	// Filtrar apenas cargas que não estão vinculadas a viagens (disponíveis para programação)
	const loads = useMemo(() => {
		const allCargas = (cargasData ?? []) as Carga[];
		return allCargas.filter((carga) => {
			// Mostrar apenas cargas sem status de viagem (nunca programadas ou sem viagem ativa)
			// Cargas com viagem CONCLUIDA, EM_COLETA, EM_VIAGEM ou PLANEJADA NÃO devem aparecer aqui
			return !carga.ds_status_viagem;
		});
	}, [cargasData]);
	const vehicles = useMemo(() => veiculosData ?? [], [veiculosData]);
	const normalizedVehicles = useMemo(
		() =>
			(vehicles ?? []).map((v) => ({
				...v,
				ds_placa: v.ds_placa,
				ds_tipo:
					v.ds_tipo_unidade === 'TRACIONADOR'
						? 'Tracionador'
						: v.ds_tipo_unidade === 'CARROCERIA'
							? 'Carroceria'
							: v.ds_tipo_unidade === 'RIGIDO'
								? 'Rígido'
								: 'Veículo',
				ds_nome_motorista: v.tms_motoristas_veiculos?.[0]?.tms_motoristas?.rh_funcionarios?.ds_nome || 'Não informado',
				is_ativo: v.is_ativo,
			})),
		[vehicles],
	);
	const cities = useMemo(() => cidadesData?.cities ?? [], [cidadesData]);
	const viagensFromAPI = useMemo(() => viagensData ?? [], [viagensData]);

	// View Details Modal State
	const [detailsData, setDetailsData] = useState<Viagem | Carga | null>(null);

	// Handler de documento removido - não utilizado

	// --- Filter Lists ---
	const availableVehicles = useMemo(
		() => normalizedVehicles.filter((v) => v.is_ativo === true && v.is_in_use === false),
		[normalizedVehicles],
	);
	const inUseVehicles = useMemo(() => normalizedVehicles.filter((v) => v.is_in_use === true), [normalizedVehicles]);

	const [filters, setFilters] = useState<FilterState>({
		urgency: '',
		destinationCity: '',
		segment: '',
		vehicleType: '',
	});

	// Helper to filter trips based on current filters
	const filterTrips = useCallback(
		(list: Viagem[]) => {
			return list.filter((t) => {
				// Filter by search term
				if (searchTerm) {
					const searchLower = searchTerm.toLowerCase();
					const matches =
						(t.cd_viagem?.toLowerCase() || '').includes(searchLower) || // Código viagem
						(t.ds_placa_cavalo?.toLowerCase() || '').includes(searchLower) || // Placa cavalo
						(t.ds_motorista?.toLowerCase() || '').includes(searchLower) || // Motorista
						(t.id?.toLowerCase() || '').includes(searchLower); // ID
					if (!matches) return false;
				}

				// Filter by Destination (from internal filters)
				if (filters.destinationCity && t.mainDestination !== filters.destinationCity) return false;

				// Filter by Conjunto (Vehicle Type)
				if (filters.vehicleType) {
					const truck = normalizedVehicles.find((v) => v.ds_placa === (t.truckPlate || t.ds_placa_cavalo));
					// If vehicle not found or type mismatch (optional: could also check vehicleTypeReq on legs)
					if (!truck || truck.ds_tipo !== filters.vehicleType) return false;
				}
				return true;
			});
		},
		[filters, normalizedVehicles, searchTerm],
	);

	// Usar viagens da API; aplicar filtro de período quando dateFilter for informado
	const allTrips = useMemo(() => {
		let list = viagensFromAPI.length > 0 ? viagensFromAPI : [];
		if (dateFilter) {
			const startMs = startOfDay(dateFilter.start).getTime();
			const endMs = startOfDay(dateFilter.end).getTime();
			list = list.filter((t) => {
				const dateStr =
					t.dt_agendada ?? t.dt_created ?? (t as { scheduledDate?: string }).scheduledDate ?? (t as { createdAt?: string }).createdAt;
				if (!dateStr) return false;
				const tMs = startOfDay(new Date(dateStr)).getTime();
				return tMs >= startMs && tMs <= endMs;
			});
		}
		return list;
	}, [viagensFromAPI, dateFilter]);

	const plannedTrips = useMemo(
		() => filterTrips((allTrips ?? []).filter((t) => t.status === 'Planned' || t.ds_status === 'PLANEJADA')),
		[allTrips, filterTrips],
	);
	const pickingUpTrips = useMemo(
		() => filterTrips((allTrips ?? []).filter((t) => t.status === 'Picking Up' || t.ds_status === 'EM_COLETA')),
		[allTrips, filterTrips],
	);
	const activeTrips = useMemo(
		() => filterTrips((allTrips ?? []).filter((t) => t.status === 'In Transit' || t.ds_status === 'EM_VIAGEM')),
		[allTrips, filterTrips],
	);
	const completedTrips = useMemo(
		() => filterTrips((allTrips ?? []).filter((t) => t.status === 'Completed' || t.ds_status === 'CONCLUIDA')),
		[allTrips, filterTrips],
	);

	const parseMaybeDate = (value?: string) => {
		if (!value) return 0;
		const t = new Date(value).getTime();
		return Number.isFinite(t) ? t : 0;
	};

	const sortedLoads = useMemo(() => {
		return [...(loads ?? [])].sort((a, b) => parseMaybeDate(a.collectionDate) - parseMaybeDate(b.collectionDate));
	}, [loads]);

	const inUseVehiclesSorted = useMemo(() => {
		const getEta = (plate: string) => {
			const trip = allTrips.find(
				(t) => (t.truckPlate === plate || t.ds_placa_cavalo === plate) && t.status !== 'Completed' && t.ds_status !== 'CONCLUIDA',
			);
			return (
				parseMaybeDate(trip?.estimatedReturnDate || trip?.dt_previsao_retorno) ||
				parseMaybeDate(trip?.scheduledDate || trip?.dt_agendada) ||
				parseMaybeDate(trip?.createdAt || trip?.dt_created)
			);
		};

		return [...inUseVehicles].sort((a, b) => getEta(a.ds_placa) - getEta(b.ds_placa));
	}, [inUseVehicles, allTrips]);

	// --- Handlers ---
	const handleOpenSchedule = (load: Carga) => {
		// Preferir o modal padrão do host (TripsAndLoadsScreen) para manter layout consistente
		if (onRequestScheduleLoad) return onRequestScheduleLoad(load);
		// Fallback: mantém comportamento antigo (caso o host não passe o callback)
		alert('Ação de programação não configurada nesta tela.');
	};

	const handleViewDetails = (title: string, data: Viagem | Carga) => {
		setDetailsData(data);
	};

	return (
		<div className='bg-muted text-foreground relative flex h-full max-h-[76vh] min-h-0 flex-col overflow-y-auto rounded-b-3xl font-sans'>
			{/* Header / Filters */}
			{/* Filter Panel Overlay */}
			<FilterPanel
				isOpen={!!showFilters}
				onClose={() => onCloseFilters?.()}
				filters={filters}
				onFilterChange={setFilters}
				cities={cities}
			/>

			{/* DMAIC / Kanban Board */}
			<div className='custom-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-3 sm:p-4 lg:p-6'>
				<div className='flex h-full min-h-0 min-w-[1300px] gap-3 sm:min-w-[1500px] lg:min-w-[1800px] lg:gap-4'>
					{/* COL 1: Cargas Disponíveis - CINZA */}
					<Column
						title='Cargas Disponíveis'
						count={(loads ?? []).filter((load) => load.ds_status_viagem === null).length}
						headerColor='bg-blue-50 border-blue-200/60 dark:bg-blue-950/50 dark:border-blue-800/50'
						accentColor='gray'
						tooltip='Cargas disponíveis para programação (sem viagem ativa ou já concluídas).'
						containerClassName='border border-border'
						bodyClassName='bg-muted/20'
					>
						<div className='space-y-4'>
							{(loads ?? []).filter((load) => load.ds_status_viagem === null).length === 0 && (
								<EmptyState text='Nenhuma carga pendente' />
							)}
							{sortedLoads.map((load) => (
								<LoadCard key={load.id} load={load} onViewDetails={onViewLoadDetails} onSchedule={() => handleOpenSchedule(load)} />
							))}
						</div>
					</Column>

					{/* COL 2: Veículos Disponíveis - CINZA */}
					<Column
						title='Veículos Disponíveis'
						count={availableVehicles.length}
						headerColor='bg-blue-50 border-blue-200/60 dark:bg-blue-950/50 dark:border-blue-800/50'
						accentColor='gray'
						tooltip='Veículos + motoristas disponíveis, em prioridade de disponibilidade.'
						containerClassName='border border-border'
						bodyClassName='bg-muted/20'
					>
						<div className='space-y-4'>
							{availableVehicles.length === 0 && <EmptyState text='Sem veículos livres' />}
							{availableVehicles.map((v) => (
								<VehicleCard key={v.id} vehicle={v} />
							))}{' '}
							{/* Ocupados (bem abaixo) */}
							{inUseVehiclesSorted.length > 0 && (
								<div className='pt-6'>
									<div className='text-muted-foreground mb-3 px-2 text-[10px] font-black tracking-[0.25em] uppercase'>
										Em operação ({inUseVehiclesSorted.length})
									</div>
									<div className='space-y-3 opacity-60 grayscale'>
										{inUseVehiclesSorted.map((v) => {
											const trip = viagensData?.find((t) => t.ds_placa_cavalo === v.ds_placa && t.ds_status !== 'CONCLUIDA');
											const eta = trip?.dt_previsao_retorno
												? new Date(trip.dt_previsao_retorno).toLocaleDateString('pt-BR')
												: undefined;
											return (
												<Card key={`busy-${v.id}`} accentColor='gray'>
													<div className='mb-2 flex items-start justify-between'>
														<div className='border-border/70 bg-muted/40 text-foreground/90 rounded border px-2 font-mono text-base font-black'>
															{v.ds_placa}
														</div>
														<span className='text-muted-foreground text-[10px] font-black uppercase'>Ocupado</span>
													</div>
													<div className='mb-2 text-[10px] font-bold text-gray-400'>
														{v.ds_nome} •{' '}
														<span className='uppercase'>
															{v.ds_tipo_unidade === 'TRACIONADOR'
																? 'Tracionador'
																: v.ds_tipo_unidade === 'CARROCERIA'
																	? 'Carroceria'
																	: v.ds_tipo_unidade === 'RIGIDO'
																		? 'Rígido'
																		: 'Veículo'}
														</span>
													</div>
													<div className='text-muted-foreground text-[10px] font-bold'>
														Motorista:{' '}
														<span className='text-muted-foreground'>
															{v.tms_motoristas_veiculos?.[0]?.tms_motoristas?.rh_funcionarios?.ds_nome || 'Não informado'}
														</span>
													</div>
													{eta && (
														<div className='text-muted-foreground mt-1 text-[10px] font-bold'>
															Prev. chegada: <span className='text-muted-foreground'>{eta}</span>
														</div>
													)}
												</Card>
											);
										})}
									</div>
								</div>
							)}
						</div>
					</Column>

					{/* COL 3: Viagem Agendada - AZUL */}
					<TripColumn
						title='Viagem Agendada'
						trips={plannedTrips}
						headerColor='bg-yellow-500/15 border-yellow-500/30 text-yellow-700 dark:text-yellow-300'
						accentColor='yellow'
						tooltip='Junção de motorista+conjunto, e carga.'
						statusColor='border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
						statusLabel='Aguardando'
						onViewDetails={handleViewDetails}
						onEmitFiscal={onEmitFiscal}
						onStatusUpdate={onUpdateStatus}
					/>

					{/* COL 4: Em Coleta - AMARELO */}
					<TripColumn
						title='Em Coleta'
						trips={pickingUpTrips}
						headerColor='bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300'
						accentColor='orange'
						tooltip='Inicio da viagem, mas ainda sem sem a respectiva carga.'
						statusColor='border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300'
						statusLabel='Coletando'
						onViewDetails={handleViewDetails}
						onEmitFiscal={onEmitFiscal}
						showProgress
						onStatusUpdate={onUpdateStatus}
					/>

					{/* COL 5: Em Rota - LARANJA */}
					<TripColumn
						title='Em Rota'
						trips={activeTrips}
						headerColor='bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300'
						accentColor='purple'
						tooltip='Já carregado e iniciou seu percurso de carga/entrega.'
						statusColor='border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300'
						statusLabel='Em Trânsito'
						showProgress
						onViewDetails={handleViewDetails}
						onEmitFiscal={onEmitFiscal}
						onStatusUpdate={onUpdateStatus}
					/>

					{/* COL 6: Entregue - VERDE */}
					<TripColumn
						title='Viagem Entregue'
						trips={completedTrips}
						headerColor='bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
						accentColor='emerald'
						tooltip='Motorista fez a ida e o retorno, está de volta na cidade da empresa e concluiu a viagem.'
						statusColor='border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
						statusLabel='Concluído'
						isCompleted
						onViewDetails={handleViewDetails}
					/>
				</div>
			</div>

			{/* Programação: modal unificado fica no host (TripsAndLoadsScreen) */}

			{/* --- DETAILS MODAL --- */}
			{detailsData && (
				<div className='absolute inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md'>
					<div className='animate-in zoom-in-95 border-border/40 bg-card relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border shadow-2xl duration-300'>
						{detailsData && 'ds_placa_cavalo' in detailsData && detailsData.ds_placa_cavalo ? (
							// TRIP DETAILS
							<div className='custom-scrollbar bg-muted/40 h-full overflow-y-auto'>
								<ErrorBoundary title='Erro nos detalhes da viagem'>
									<TripDetails
										trip={detailsData as Viagem}
										loads={loads}
										availableDocs={availableDocs}
										isInline={true}
										onBack={() => setDetailsData(null)}
										onAddLeg={onAddLeg}
										onAddDelivery={onAddDelivery}
										onAddDocument={onAddDocument}
										onAddLoadWithDeliveries={onAddLoadWithDeliveries}
										onAttachLoadsToTrip={onAttachLoadsToTrip}
										onUpdateStatus={(tripId, status, pod) => onUpdateStatus?.(tripId, status as Viagem['status'], pod)}
										onUpdateDeliveryStatus={onUpdateDeliveryStatus}
										onReorderDeliveries={onReorderDeliveries}
										onEmitFiscal={onEmitFiscal}
										onViewLoadDetails={
											onViewLoadDetails
												? (load) => {
														setDetailsData(null);
														onViewLoadDetails(load);
													}
												: undefined
										}
									/>
								</ErrorBoundary>
								<button
									onClick={() => setDetailsData(null)}
									className='bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground absolute top-4 right-4 z-50 rounded-full p-2 backdrop-blur-sm transition-all'
								>
									<X size={24} />
								</button>
							</div>
						) : detailsData ? (
							// LOAD DETAILS
							<>
								<div className='border-border/70 bg-muted/40 flex shrink-0 items-center justify-between border-b p-8'>
									<div>
										<h3 className='text-foreground text-3xl font-black tracking-tighter uppercase'>Detalhes da Carga</h3>
										<p className='text-muted-foreground mt-1 text-[10px] font-bold tracking-widest uppercase'>
											Informações do Pedido
										</p>
									</div>
									<button onClick={() => setDetailsData(null)} className='hover:bg-muted rounded-full p-3 transition-colors'>
										<X size={32} />
									</button>
								</div>
								<div className='custom-scrollbar bg-card space-y-12 overflow-y-auto p-10'>
									<div className='grid grid-cols-2 gap-10'>
										<BigItem label='Cliente Principal' value={(detailsData as Carga).clientName || 'N/A'} />
										<BigItem label='Data para Coleta' value={(detailsData as Carga).collectionDate || 'N/A'} />
										<BigItem label='Cidade Origem' value={(detailsData as Carga).originCity || 'N/A'} />
										<BigItem label='Cidade Destino' value={(detailsData as Carga).destinationCity || 'N/A'} />
									</div>
								</div>
								<div className='border-border/70 bg-muted/40 shrink-0 border-t p-8 text-right'>
									<button
										onClick={() => setDetailsData(null)}
										className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-12 py-5 text-xs font-black tracking-widest uppercase shadow-sm transition-all'
									>
										Fechar
									</button>
								</div>
							</>
						) : null}
					</div>
				</div>
			)}
		</div>
	);
};

// --- Sub-components ---

const BigItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
	<div className='flex flex-col gap-2'>
		<p className='text-muted-foreground text-[10px] leading-none font-black tracking-widest uppercase'>{label}</p>
		<p className='text-foreground text-xl leading-none font-black tracking-tighter uppercase' title={String(value)}>
			{value}
		</p>
	</div>
);

interface TripColumnProps {
	title: string;
	trips: Viagem[];
	headerColor: string;
	accentColor: string;
	statusColor: string;
	statusLabel: string;
	showProgress?: boolean;
	isCompleted?: boolean;
	onViewDetails: (t: string, d: Viagem) => void;
	onEmitFiscal?: (loadId: string) => void;
	actionButton?: (trip: Viagem) => React.ReactNode;
	onStatusUpdate?: (tripId: string, status: Viagem['status'], pod?: string) => void;
	tooltip?: string;
}

const TripColumn: React.FC<TripColumnProps> = ({
	title,
	trips,
	headerColor,
	accentColor,
	statusColor,
	statusLabel,
	onViewDetails,
	actionButton,
	onStatusUpdate,
	tooltip,
}) => (
	<Column title={title} count={trips.length} headerColor={headerColor} accentColor={accentColor} tooltip={tooltip}>
		<div className='space-y-5'>
			{trips.length === 0 && <EmptyState text={`Sem ${statusLabel.toLowerCase()}`} />}
			{trips.map((trip) => (
				<ViagemCard
					key={trip.id}
					trip={trip}
					statusColor={statusColor}
					statusLabel={statusLabel}
					onViewDetails={(t) => onViewDetails(`Viagem ${t.id}`, t)}
					actionButton={
						actionButton ? (
							actionButton(trip)
						) : onStatusUpdate ? (
							<ViagemActionButtons
								viagem={trip}
								onStatusUpdate={() => {
									// Invalidar queries após mudança de status
									// (o hook já faz isso internamente)
								}}
							/>
						) : undefined
					}
				/>
			))}
		</div>
	</Column>
);
