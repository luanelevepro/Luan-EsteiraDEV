import React, { useMemo, useState } from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import { Viagem, Carga, Veiculo, AvailableDocument } from '@/types/tms';
import { MapPin, Truck, CheckCircle, AlertTriangle, X, Bell, TrendingUp, Zap } from 'lucide-react';
import { BoardColumn as Column, EmptyState } from '@/components/ui/boardUi';
import { LoadCard } from './carga-card';
import { VehicleCard } from './veiculo-card';
import { ScheduledLoadCard } from './carga-scheduled-card';
import { PickingUpLoadCard } from './carga-coleta-card';
import { InTransitLoadCard } from './carga-transito-card';
import { DeliveredLoadCard } from './carga-entregue-card';
import { getCargaStatusVisual, groupCargasByStatusVisual } from '@/lib/tms-status-utils';

interface LoadBoardProps {
	loads: Carga[];
	trips: Viagem[];
	vehicles: Veiculo[];
	availableDocs: AvailableDocument[];
	cities?: string[]; // Tornando opcional
	searchTerm?: string;
	onViewDetails: (load: Carga) => void;
	onScheduleLoad?: (load: Carga) => void;
	onRequestScheduleLoad?: (load: Carga) => void;
	onUpdateStatus: (tripId: string, status: Viagem['ds_status'], pod?: string) => void;
	onEmitFiscal?: (loadId: string) => void;
	showFilters?: boolean;
	onCloseFilters?: () => void;
	/** Filtro por período: exibe apenas cargas cuja dt_created está no intervalo. */
	dateFilter?: { start: Date; end: Date };
}

// ===== HELPERS =====

// Extrai a menor data de entrega da carga (usando js_entregas ou fallback)
const getEarliestDeadline = (load: Carga): string | undefined => {
	// Busca a menor data de entrega entre todas as entregas (js_entregas)
	if (load.js_entregas && load.js_entregas.length > 0) {
		// Ordena entregas por nr_sequencia (primeira entrega tem prioridade)
		const sortedEntregas = [...load.js_entregas].sort((a, b) => a.nr_sequencia - b.nr_sequencia);

		// Pega a primeira entrega com data limite
		const firstEntregaWithDeadline = sortedEntregas.find((e) => e.dt_limite_entrega);

		if (firstEntregaWithDeadline?.dt_limite_entrega) {
			return firstEntregaWithDeadline.dt_limite_entrega;
		}
	}

	return undefined;
};

// Calcula horas até o deadline
const getHoursUntilDeadline = (deadline?: string): number | null => {
	if (!deadline) return null;
	const now = new Date();
	const deadlineDate = new Date(deadline);
	return (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
};

// Determina urgência baseada no SLA
const getUrgencyLevel = (load: Carga): 'critical' | 'warning' | 'attention' | 'normal' => {
	// Primeiro verifica prioridade explícita
	if (load.ds_prioridade === 'URGENTE') return 'critical';

	const deadline = getEarliestDeadline(load);
	const hours = getHoursUntilDeadline(deadline);

	if (hours === null) return 'normal';

	if (hours <= 12) return 'critical'; // Menos de 12h - CRÍTICO
	if (hours <= 24) return 'warning'; // Menos de 24h - ALERTA
	if (hours <= 48) return 'attention'; // Menos de 48h - ATENÇÃO
	return 'normal';
};

// Formata peso para exibição
const formatWeight = (weight?: number): string => {
	if (!weight) return '-';
	if (weight >= 1000) return `${(weight / 1000).toFixed(1)}t`;
	return `${weight}kg`;
};

// Formata tempo restante
const formatTimeRemaining = (deadline?: string): string => {
	const hours = getHoursUntilDeadline(deadline);
	if (hours === null) return 'Sem prazo';
	if (hours < 0) return 'ATRASADO';
	if (hours < 1) return `${Math.round(hours * 60)}min`;
	if (hours < 24) return `${Math.round(hours)}h`;
	const days = Math.floor(hours / 24);
	return `${days}d ${Math.round(hours % 24)}h`;
};

// Painel de Alertas
const AlertsPanel = ({ loads, isOpen, onClose }: { loads: Carga[]; isOpen: boolean; onClose: () => void }) => {
	const criticalLoads = loads.filter((l) => getUrgencyLevel(l) === 'critical');
	const warningLoads = loads.filter((l) => getUrgencyLevel(l) === 'warning');
	const attentionLoads = loads.filter((l) => getUrgencyLevel(l) === 'attention');

	if (!isOpen) return null;

	return (
		<div className='flex h-full w-80 flex-col border-l border-border bg-card shadow-lg'>
			<div className='flex items-center justify-between border-b border-border/70 bg-muted/40 p-4'>
				<div className='flex items-center gap-2'>
					<Bell size={18} className='text-red-600 dark:text-red-400' />
					<span className='text-sm font-black tracking-wide uppercase'>Central de Alertas</span>
				</div>
				<button onClick={onClose} className='rounded p-1 hover:bg-muted'>
					<X size={16} />
				</button>
			</div>

			<div className='flex-1 space-y-4 overflow-y-auto p-4'>
				{/* Críticos */}
				{criticalLoads.length > 0 && (
					<div>
						<div className='mb-2 flex items-center gap-2'>
							<div className='h-2 w-2 animate-pulse rounded-full bg-red-500'></div>
							<span className='text-[10px] font-black text-red-700 dark:text-red-300 uppercase'>Crítico ({criticalLoads.length})</span>
						</div>
						<div className='space-y-2'>
							{criticalLoads.map((l) => (
								<div key={l.id} className='rounded-lg border border-red-500/30 bg-red-500/10 p-3'>
									<div className='mb-1 text-xs font-bold text-red-900 dark:text-red-100'>{(l.fis_clientes ?? l.tms_clientes)?.ds_nome || l.ds_nome}</div>
									<div className='text-[10px] text-red-700 dark:text-red-300'>
										{l.sis_cidade_origem?.ds_city} → {l.sis_cidade_destino?.ds_city}
									</div>
									<div className='mt-1 text-[10px] font-black text-red-700 dark:text-red-300'>⏱ {formatTimeRemaining(getEarliestDeadline(l))}</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Alertas */}
				{warningLoads.length > 0 && (
					<div>
						<div className='mb-2 flex items-center gap-2'>
							<div className='h-2 w-2 rounded-full bg-orange-500'></div>
							<span className='text-[10px] font-black text-orange-700 dark:text-orange-300 uppercase'>Alerta ({warningLoads.length})</span>
						</div>
						<div className='space-y-2'>
							{warningLoads.map((l) => (
								<div key={l.id} className='rounded-lg border border-orange-500/30 bg-orange-500/10 p-3'>
									<div className='mb-1 text-xs font-bold text-orange-900 dark:text-orange-100'>{(l.fis_clientes ?? l.tms_clientes)?.ds_nome || l.ds_nome}</div>
									<div className='text-[10px] text-orange-700 dark:text-orange-300'>
										{l.sis_cidade_origem?.ds_city} → {l.sis_cidade_destino?.ds_city}
									</div>
									<div className='mt-1 text-[10px] font-black text-orange-700 dark:text-orange-300'>
										⏱ {formatTimeRemaining(getEarliestDeadline(l))}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Atenção */}
				{attentionLoads.length > 0 && (
					<div>
						<div className='mb-2 flex items-center gap-2'>
							<div className='h-2 w-2 rounded-full bg-yellow-500'></div>
							<span className='text-[10px] font-black text-yellow-700 dark:text-yellow-300 uppercase'>Atenção ({attentionLoads.length})</span>
						</div>
						<div className='space-y-2'>
							{attentionLoads.map((l) => (
								<div key={l.id} className='rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3'>
									<div className='mb-1 text-xs font-bold text-yellow-900 dark:text-yellow-100'>{(l.fis_clientes ?? l.tms_clientes)?.ds_nome || l.ds_nome}</div>
									<div className='text-[10px] text-yellow-700 dark:text-yellow-300'>
										{l.sis_cidade_origem?.ds_city} → {l.sis_cidade_destino?.ds_city}
									</div>
									<div className='mt-1 text-[10px] font-black text-yellow-700 dark:text-yellow-300'>
										⏱ {formatTimeRemaining(getEarliestDeadline(l))}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{criticalLoads.length === 0 && warningLoads.length === 0 && attentionLoads.length === 0 && (
					<div className='py-8 text-center text-muted-foreground'>
						<CheckCircle size={32} className='mx-auto mb-2 text-green-400' />
						<div className='text-sm font-bold'>Tudo sob controle!</div>
						<div className='text-xs'>Nenhum alerta no momento</div>
					</div>
				)}
			</div>

			{/* KPIs Rápidos */}
			<div className='border-t border-border/70 bg-muted/40 p-4'>
				<div className='mb-2 text-[9px] font-black text-muted-foreground uppercase'>Resumo do Backlog</div>
				<div className='grid grid-cols-3 gap-2 text-center'>
					<div className='rounded border bg-card p-2'>
						<div className='text-lg font-black text-foreground'>{loads.length}</div>
						<div className='text-[8px] text-muted-foreground uppercase'>Total</div>
					</div>
					<div className='rounded border bg-card p-2'>
						<div className='text-lg font-black text-red-700 dark:text-red-300'>{criticalLoads.length + warningLoads.length}</div>
						<div className='text-[8px] text-muted-foreground uppercase'>Urgentes</div>
					</div>
					<div className='rounded border bg-card p-2'>
						<div className='text-lg font-black text-foreground'>
							{formatWeight(loads.reduce((acc, l) => acc + (l.vl_peso_bruto || 0), 0))}
						</div>
						<div className='text-[8px] text-muted-foreground uppercase'>Peso Total</div>
					</div>
				</div>
			</div>
		</div>
	);
};

interface FilterState {
	urgency: string;
	destinationCity: string;
	segment: string;
	vehicleType: string;
	client: string;
}

// ===== COMPONENTE PRINCIPAL =====
export const LoadBoard: React.FC<LoadBoardProps> = ({
	loads,
	trips,
	vehicles,
	searchTerm = '',
	onViewDetails,
	onUpdateStatus,
	onRequestScheduleLoad,
	showFilters,
	onCloseFilters,
	dateFilter,
}) => {
	// Filtro de período: carga ENTREGUE só pelo mês de conclusão (dt_entregue_em); demais pelo dt_created (cada carga em um único mês)
	const loadsInPeriod = useMemo(() => {
		if (!dateFilter) return loads;
		const startMs = startOfDay(dateFilter.start).getTime();
		const endMs = endOfDay(dateFilter.end).getTime();
		return loads.filter((l) => {
			if (l.ds_status === 'ENTREGUE' && l.dt_entregue_em) {
				const deliveredMs = new Date(l.dt_entregue_em).getTime();
				return deliveredMs >= startMs && deliveredMs <= endMs;
			}
			const createdMs = l.dt_created ? startOfDay(new Date(l.dt_created)).getTime() : null;
			return createdMs != null && createdMs >= startMs && createdMs <= endMs;
		});
	}, [loads, dateFilter]);

	// Determine unique values for filters
	const destinationCities = useMemo(() => Array.from(new Set(loadsInPeriod.map((l) => l.destinationCity).filter(Boolean))), [loadsInPeriod]);
	const segments = useMemo(() => Array.from(new Set(loadsInPeriod.map((l) => l.tms_segmentos?.ds_nome).filter(Boolean))), [loadsInPeriod]);
	const normalizedVehicles = useMemo(
		() =>
			(vehicles ?? []).map((v) => ({
				...v,
				plate: v.ds_placa,
				model: v.ds_nome,
				type: v.ds_tipo_unidade === 'TRACIONADOR' ? 'Tracionador' : v.ds_tipo_unidade === 'CARROCERIA' ? 'Carroceria' : v.ds_tipo_unidade === 'RIGIDO' ? 'Rígido' : 'Veículo',
				driverName: v.tms_motoristas_veiculos?.[0]?.tms_motoristas?.rh_funcionarios?.ds_nome || 'Não informado',
				status: v.is_ativo ? 'Available' : 'Maintenance',
			})),
		[vehicles],
	);

	const [filters, setFilters] = useState<FilterState>({
		urgency: '',
		destinationCity: '',
		segment: '',
		vehicleType: '',
		client: '',
	});

	const [showAlerts, setShowAlerts] = useState(false);

	// Filtered lists (mesma lógica do TripBoardV2)
	const availableVehicles = useMemo(
		() =>
			normalizedVehicles.filter(
				(v) => v.is_ativo === true && v.is_in_use === false && (!filters.vehicleType || v.type === filters.vehicleType),
			),
		[normalizedVehicles, filters.vehicleType],
	);

	const inUseVehicles = useMemo(
		() => normalizedVehicles.filter((v) => v.is_in_use === true && (!filters.vehicleType || v.type === filters.vehicleType)),
		[normalizedVehicles, filters.vehicleType],
	);

	const maintenanceVehicles = useMemo(
		() => normalizedVehicles.filter((v) => v.is_ativo === false && (!filters.vehicleType || v.type === filters.vehicleType)),
		[normalizedVehicles, filters.vehicleType],
	);

	const filterLoads = React.useCallback(
		(list: Carga[]) => {
			return list.filter((l) => {
				// Aplicar filtro de busca por texto
				if (searchTerm) {
					const searchLower = searchTerm.toLowerCase();
					const matches =
						((l.fis_clientes ?? l.tms_clientes)?.ds_nome?.toLowerCase() || '').includes(searchLower) || // Cliente
						(l.cd_carga?.toLowerCase() || '').includes(searchLower) || // Código Carga
						(l.ds_nome?.toLowerCase() || '').includes(searchLower) || // Nome Carga
						(l.sis_cidade_origem?.ds_city?.toLowerCase() || '').includes(searchLower) || // Cidade Origem
						(l.sis_cidade_destino?.ds_city?.toLowerCase() || '').includes(searchLower); // Cidade Destino
					if (!matches) return false;
				}

				if (filters.destinationCity && l.sis_cidade_destino?.ds_city !== filters.destinationCity) return false;
				if (filters.segment && l.tms_segmentos?.ds_nome !== filters.segment) return false;
				if (filters.urgency && getUrgencyLevel(l) !== filters.urgency) return false;
				if (filters.vehicleType && l.ds_tipo_carroceria !== filters.vehicleType) return false;
				if (filters.client && (l.fis_clientes ?? l.tms_clientes)?.ds_nome !== filters.client) return false;
				return true;
			});
		},
		[filters, searchTerm],
	);

	// Agrupar cargas por status visual usando a nova lógica (com loads já filtrados por período)
	const cargasAgrupadas = useMemo(() => {
		const grupos = groupCargasByStatusVisual(loadsInPeriod, trips);

		// Aplicar filtros em cada grupo
		return {
			BACKLOG: filterLoads(grupos.BACKLOG),
			AGENDADA: filterLoads(grupos.AGENDADA),
			EM_COLETA: filterLoads(grupos.EM_COLETA),
			EM_TRANSITO: filterLoads(grupos.EM_TRANSITO),
			ENTREGUE: filterLoads(grupos.ENTREGUE),
		};
	}, [loadsInPeriod, trips, filterLoads]);

	// Ordenar cargas do backlog por urgência
	const sortedLoads = useMemo(() => {
		const urgencyOrder = { critical: 0, warning: 1, attention: 2, normal: 3 };
		return [...cargasAgrupadas.BACKLOG].sort((a, b) => urgencyOrder[getUrgencyLevel(a)] - urgencyOrder[getUrgencyLevel(b)]);
	}, [cargasAgrupadas.BACKLOG]);

	// Criar objetos enriquecidos para as outras colunas (com viagem e progresso)
	const scheduledLoads = useMemo(() => {
		return cargasAgrupadas.AGENDADA.map((load) => {
			const trip = trips.find((t) => t.js_viagens_cargas?.some((vc) => vc.id_carga === load.id));
			return {
				...load,
				loadId: load.id,
				status: 'Agendada',
				_trip: trip,
				_progress: 10,
			};
		});
	}, [cargasAgrupadas.AGENDADA, trips]);

	const pickingUpLoads = useMemo(() => {
		return cargasAgrupadas.EM_COLETA.map((load) => {
			const trip = trips.find((t) => t.js_viagens_cargas?.some((vc) => vc.id_carga === load.id));
			return {
				...load,
				loadId: load.id,
				status: 'Em Coleta',
				_trip: trip,
				_progress: 30,
			};
		});
	}, [cargasAgrupadas.EM_COLETA, trips]);

	const inTransitLoads = useMemo(() => {
		return cargasAgrupadas.EM_TRANSITO.map((load) => {
			const trip = trips.find((t) => t.js_viagens_cargas?.some((vc) => vc.id_carga === load.id));
			return {
				...load,
				loadId: load.id,
				status: 'Em Rota',
				_trip: trip,
				_progress: 60,
			};
		});
	}, [cargasAgrupadas.EM_TRANSITO, trips]);

	const deliveredLoads = useMemo(() => {
		return cargasAgrupadas.ENTREGUE.map((load) => {
			const trip = trips.find((t) => t.js_viagens_cargas?.some((vc) => vc.id_carga === load.id));
			return {
				...load,
				loadId: load.id,
				status: 'Entregue',
				_trip: trip,
				_progress: 100,
			};
		});
	}, [cargasAgrupadas.ENTREGUE, trips]);

	// Contagem de alertas
	const alertCount = useMemo(() => {
		return loads.filter((l) => ['critical', 'warning', 'attention'].includes(getUrgencyLevel(l))).length;
	}, [loads]);

	return (
		<div className='relative flex h-full max-h-[76vh] min-h-0 flex-col overflow-y-auto rounded-b-3xl bg-muted font-sans text-foreground'>
			{/* Conteúdo Principal — mesma estrutura e padding do board Viagens para alinhamento */}
			<div className='custom-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-3 sm:p-4 lg:p-6'>
				<div className='flex h-full min-h-0 min-w-[1300px] gap-3 sm:min-w-[1500px] lg:min-w-[1800px] lg:gap-4'>
						{/* COL 1: Cargas Disponíveis (Backlog) */}
						<Column
							title='Backlog de Cargas'
							count={sortedLoads.length}
							headerColor='bg-blue-50 border-blue-200/60 dark:bg-blue-950/50 dark:border-blue-800/50'
							accentColor='gray'
							containerClassName='border border-border'
							bodyClassName='bg-muted/20'
							headerExtra={
								<button
									onClick={() => setShowAlerts(!showAlerts)}
									className={`relative rounded-lg p-1.5 transition-colors ${showAlerts ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' : 'text-muted-foreground hover:bg-muted'}`}
								>
									<Bell size={14} />
									{alertCount > 0 && (
										<span className='absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white'>
											{alertCount}
										</span>
									)}
								</button>
							}
						>
							{sortedLoads.length === 0 ? (
								<EmptyState message='Nenhuma carga no backlog' />
							) : (
								sortedLoads.map((l) => (
									<LoadCard key={l.id} load={l} onViewDetails={onViewDetails} onSchedule={() => onRequestScheduleLoad?.(l)} />
								))
							)}
						</Column>

						{/* COL 2: Veículos Disponíveis - CINZA COM BOLINHA VERDE */}
						<Column
							title={
								<div className='flex items-center gap-2'>
									<span>Veículos Disponíveis</span>
									<div className='h-2 w-2 rounded-full bg-green-500 shadow-sm'></div>
								</div>
							}
							count={availableVehicles.length}
							headerColor='bg-blue-50 border-blue-200/60 dark:bg-blue-950/50 dark:border-blue-800/50 text-foreground'
							accentColor='gray'
							containerClassName='border border-border'
							bodyClassName='bg-muted/20'
						>
							{availableVehicles.map((v) => (
								<VehicleCard key={v.id} vehicle={v} />
							))}
							{inUseVehicles.length > 0 && (
								<div className='mt-4 border-t border-border pt-3'>
									<div className='mb-2 px-2 text-[9px] font-black tracking-[0.25em] text-muted-foreground uppercase'>
										Em operação ({inUseVehicles.length})
									</div>
									<div className='space-y-2 opacity-60 grayscale'>
										{inUseVehicles.map((v) => (
											<VehicleCard key={`in-use-${v.id}`} vehicle={v} />
										))}
									</div>
								</div>
							)}
							{maintenanceVehicles.length > 0 && (
								<div className='mt-2 border-t border-border pt-2'>
									<div className='mb-2 flex items-center gap-1 text-[9px] font-black text-orange-500 uppercase'>
										<AlertTriangle size={10} /> Em Manutenção ({maintenanceVehicles.length})
									</div>
									{maintenanceVehicles.map((v) => (
										<VehicleCard key={v.id} vehicle={v} />
									))}
								</div>
							)}
						</Column>

						{/* COL 3: Carga Agendada - AMARELO/ATENÇÃO */}
						<Column
							title='Carga Agendada'
							count={scheduledLoads.length}
							headerColor='bg-yellow-500/15 border-yellow-500/30 text-yellow-700 dark:text-yellow-300'
							accentColor='yellow'
						>
							{scheduledLoads.map((l) => {
								const originalLoad = loads.find((load) => load.id === l.loadId);
								// Verificar se há outra viagem em andamento para o mesmo veículo
								console.log('Veículo da carga agendada:', l._trip?.truckPlate);
								console.log('Viagens atuais:', trips);
								console.log('Carga _trip:', l._trip);
								const hasActiveTripForVehicle = trips.some(
									(t) =>
										t.id !== l._trip?.id &&
										t.ds_placa_cavalo === l._trip?.ds_placa_cavalo &&
										(t.ds_status === 'EM_VIAGEM' ||
											t.ds_status === 'EM_COLETA' ||
											t.status === 'In Transit' ||
											t.status === 'Picking Up'),
								);

								// Se por algum motivo a carga não tiver viagem associada, não renderiza o card
								if (!l._trip) return null;

								// Determinar se é a carga ativa
								const statusResult = getCargaStatusVisual((originalLoad || l) as Carga, l._trip);
								const isActiveCarga = statusResult.isActiveCarga;

								return (
									<ScheduledLoadCard
										key={l.id}
										load={(originalLoad || l) as Carga}
										trip={l._trip}
										hasActiveRoute={hasActiveTripForVehicle}
										isActiveCarga={isActiveCarga}
										onViewDetails={() => onViewDetails((originalLoad || l) as Carga)}
										onStartCollection={() => {
											if (l._trip) {
												onUpdateStatus(l._trip.id, 'EM_COLETA');
											}
										}}
										onStatusUpdate={() => {
											// Refetch data - você pode implementar isso via query invalidation
										}}
									/>
								);
							})}
						</Column>

						{/* COL 4: Em Coleta - LARANJA */}
						<Column
							title='Em Coleta'
							count={pickingUpLoads.length}
							headerColor='bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300'
							accentColor='orange'
						>
							{pickingUpLoads.map((l) => {
								const originalLoad = loads.find((load) => load.id === l.loadId);
								const progress = l._progress || 30; // Progresso padrão de 30% quando em coleta

								const trip = l._trip;
								if (!trip) return null;

								// Determinar se é a carga ativa
								const statusResult = getCargaStatusVisual((originalLoad || l) as Carga, trip);
								const isActiveCarga = statusResult.isActiveCarga;

								return (
									<PickingUpLoadCard
										key={l.id}
										load={(originalLoad || l) as Carga}
										trip={trip}
										progress={progress}
										isActiveCarga={isActiveCarga}
										onViewDetails={() => onViewDetails((originalLoad || l) as Carga)}
										onStartTrip={() => {
											onUpdateStatus(trip.id, 'EM_VIAGEM');
										}}
										onStatusUpdate={() => {
											// Refetch data
										}}
									/>
								);
							})}
						</Column>

						{/* COL 5: Em Rota - ROXO/ÍNDIGO */}
						<Column
							title='Em Rota'
							count={inTransitLoads.length}
							headerColor='bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300'
							accentColor='purple'
						>
							{inTransitLoads.map((l) => {
								const originalLoad = loads.find((load) => load.id === l.loadId);
								const progress = l._progress || 60; // Progresso padrão de 60% quando em rota

								const trip = l._trip;
								if (!trip) return null;

								// Determinar se é a carga ativa
								const statusResult = getCargaStatusVisual((originalLoad || l) as Carga, trip);
								const isActiveCarga = statusResult.isActiveCarga;

								return (
									<InTransitLoadCard
										key={l.id}
										load={(originalLoad || l) as Carga}
										trip={trip}
										progress={progress}
										isActiveCarga={isActiveCarga}
										onViewDetails={() => onViewDetails((originalLoad || l) as Carga)}
										onFinishTrip={() => {
											onUpdateStatus(trip.id, 'CONCLUIDA');
										}}
										onStatusUpdate={() => {
											// Refetch data
										}}
									/>
								);
							})}
						</Column>

						{/* COL 6: Entregue */}
						<Column
							title='Entregues'
							count={deliveredLoads.length}
							headerColor='bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
							accentColor='emerald'
						>
							{deliveredLoads.map((l) => {
								const originalLoad = loads.find((load) => load.id === l.loadId);
								// Use original load data if available
								const loadData = (originalLoad || l) as Carga;
								return (
									<DeliveredLoadCard
										key={l.id}
										load={loadData}
										trip={l._trip}
										onViewDetails={() => onViewDetails(loadData)}
									/>
								);
							})}
						</Column>
						{/* Painel de Alertas */}
						<AlertsPanel loads={loads} isOpen={showAlerts} onClose={() => setShowAlerts(false)} />
					</div>

					{/* --- FILTER PANEL (SIDEBAR) --- */}
					{showFilters && (
						<div className='z-20 flex w-80 translate-x-0 flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300'>
							<div className='flex items-center justify-between border-b border-border/70 bg-muted/40 p-6'>
								<div>
									<h4 className='text-lg font-black tracking-tighter text-foreground uppercase'>Filtros Avançados</h4>
									<p className='text-[10px] font-bold tracking-widest text-muted-foreground uppercase'>Refine sua visualização</p>
								</div>
								<button
									onClick={onCloseFilters}
									className='rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
								>
									<X size={20} />
								</button>
							</div>

							<div className='custom-scrollbar flex-1 space-y-8 overflow-y-auto p-6'>
								{/* Urgência */}
								<div className='space-y-3'>
									<label className='flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
										<Zap size={14} /> Urgência / SLA
									</label>
									<div className='grid grid-cols-2 gap-2'>
										{['critical', 'warning', 'attention', 'normal'].map((u) => (
											<button
												key={u}
												onClick={() => setFilters({ ...filters, urgency: filters.urgency === u ? '' : u })}
												className={`rounded-xl border-2 px-3 py-2.5 text-[10px] font-black uppercase transition-all ${
													filters.urgency === u
														? 'border-primary bg-primary text-primary-foreground shadow-lg'
														: 'border-border/70 text-muted-foreground hover:border-border hover:bg-muted/50'
												}`}
											>
												{u === 'critical' ? 'Crítico' : u === 'warning' ? 'Alerta' : u === 'attention' ? 'Atenção' : 'Normal'}
											</button>
										))}
									</div>
								</div>

								{/* Destino */}
								<div className='space-y-3'>
									<label className='flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
										<MapPin size={14} /> Destino
									</label>
									<select
										value={filters.destinationCity}
										onChange={(e) => setFilters({ ...filters, destinationCity: e.target.value })}
										className='w-full rounded-xl border-2 border-border/70 bg-muted/40 px-4 py-3 text-sm font-bold transition-all outline-none focus:border-ring'
									>
										<option value=''>Todas as cidades</option>
										{destinationCities.map((c) => (
											<option key={c} value={c}>
												{c}
											</option>
										))}
									</select>
								</div>

								{/* Segmento */}
								<div className='space-y-3'>
									<label className='flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
										<TrendingUp size={14} /> Segmento
									</label>
									<div className='flex flex-wrap gap-2'>
										{segments.map((s) => (
											<button
												key={s}
												onClick={() => setFilters({ ...filters, segment: filters.segment === s ? '' : s || '' })}
												className={`rounded-full border-2 px-4 py-2 text-[10px] font-bold uppercase transition-all ${
													filters.segment === s
														? 'border-primary/80 bg-primary/90 text-primary-foreground shadow-md'
														: 'border-border/70 text-muted-foreground hover:border-border hover:bg-muted/50'
												}`}
											>
												{s}
											</button>
										))}
									</div>
								</div>

								{/* Tipo de Conjunto */}
								<div className='space-y-3'>
									<label className='flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
										<Truck size={14} /> Tipo de Conjunto
									</label>
									<select
										value={filters.vehicleType}
										onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
										className='w-full rounded-xl border-2 border-border/70 bg-muted/40 px-4 py-3 text-sm font-bold transition-all outline-none focus:border-ring'
									>
										<option value=''>Todos os tipos</option>
										{['Bitrem', 'Rodotrem', 'Sider', 'Vanderleia', 'Grade Baixa', 'Baú'].map((t) => (
											<option key={t} value={t}>
												{t}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className='border-t border-border/70 bg-card p-6'>
								<button
									onClick={() => setFilters({ urgency: '', destinationCity: '', segment: '', vehicleType: '', client: '' })}
									className='w-full rounded-2xl border-2 border-transparent py-4 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase transition-all hover:border-border/70 hover:text-foreground'
								>
									Limpar Todos os Filtros
								</button>
							</div>
						</div>
					)}
			</div>
		</div>
	);
};
