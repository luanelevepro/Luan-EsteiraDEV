import React, { useEffect, useMemo, useState } from 'react';
import { Carga, Viagem } from '@/types/tms';
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ChevronDown,
	ChevronUp,
	Edit2,
	Eye,
	EllipsisVertical,
	Grid2x2Plus,
	LayoutGrid,
	ListFilter,
	Map,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	UploadCloud,
	X,
} from 'lucide-react';
import { TripDetails } from '@/components/general/tms/viagens/viagem-details';
import { StatusBadge } from '@/components/general/tms/viagens/status-viagens';
import {
	ViagemAccordionDetails,
	viagemToAccordionData,
	calcularReceitaViagemCentavos,
} from '@/components/general/tms/viagens/viagem-accordion-details';
import { getDespesasByViagem } from '@/services/api/tms/despesas';
import { ErrorBoundary } from '@/components/ui/errorBoundary';
import { NewTripWizard } from '@/components/general/tms/viagens/modal-create-viagem';
import { EditTripModal } from '@/components/general/tms/viagens/modal-edit-viagem';
import { DeleteTripModal } from '@/components/general/tms/viagens/modal-delete-viagem';
import { DeleteCargaModal } from '@/components/general/tms/viagens/modal-delete-carga';
import { CreateLoadModal } from '@/components/general/tms/viagens/modal-create-carga';
import { LoadDetailsModal } from '@/components/general/tms/viagens/modal-details-carga';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getViagens, getViagensPaginado, updateViagemStatus, vincularCargaAViagem } from '@/services/api/tms/viagens';
import { useViagensComCargas } from '@/hooks/use-viagens';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { getCargas, getCargasPaginado, getCarga } from '@/services/api/tms/cargas';
import { reordenarEntregasCarga } from '@/services/api/tms/entregas';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MonthYearSelector } from '@/components/ui/month-year-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ColunasPersonalizadasSheet } from '@/components/general/tms/viagens/colunas-personalizadas-sheet';
import { CelulaColunaPersonalizada } from '@/components/general/tms/viagens/celula-coluna-personalizada';
import type { TabelasPersonalizadas } from '@/types/colunas-personalizadas';
import { getColunasPersonalizadas, getColunasPersonalizadasDados, upsertColunaDado } from '@/services/api/tms/colunas-personalizadas';
import { ImportCargasModal } from '@/components/general/tms/viagens/import-cargas-modal';
import { ImportViagensModal } from '@/components/general/tms/viagens/import-viagens-modal';
import { ModalConclusaoDataHora } from '@/components/general/tms/viagens/modal-conclusao-data-hora';
import { ServerPaginationBar } from '@/components/ui/server-pagination-bar';
import { formatBusinessDate } from '@/lib/utils';

export const TripList: React.FC = () => {
	const queryClient = useQueryClient();
	const [viewMode, setViewMode] = useState<'TRIPS' | 'LOADS'>('TRIPS');
	const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showCreateLoadModal, setShowCreateLoadModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [selectedTrip, setSelectedTrip] = useState<Viagem | null>(null);
	const [tripToDelete, setTripToDelete] = useState<Viagem | null>(null);
	const [cargaToDelete, setCargaToDelete] = useState<Carga | null>(null);
	const [selectedCargaIdForDetails, setSelectedCargaIdForDetails] = useState<string | null>(null);
	const [editingCarga, setEditingCarga] = useState<Carga | null>(null);
	const [searchText, setSearchText] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
	const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
	const [mostrarCargasSemData, setMostrarCargasSemData] = useState(true);

	// Debounce da pesquisa para evitar requisições a cada tecla e cancelamentos
	useEffect(() => {
		if (searchText === '') {
			setDebouncedSearch('');
			return;
		}
		const t = setTimeout(() => setDebouncedSearch(searchText), 666);
		return () => clearTimeout(t);
	}, [searchText]);
	const [statusFilter, setStatusFilter] = useState<string[]>([]);
	const [showFilters, setShowFilters] = useState(false);
	const [tripForDetailsModal, setTripForDetailsModal] = useState<Viagem | null>(null);
	const [tripForQuickDetailsModal, setTripForQuickDetailsModal] = useState<Viagem | null>(null);
	const [createLoadOpenedFromWizard, setCreateLoadOpenedFromWizard] = useState(false);
	const [wizardRemountKey, setWizardRemountKey] = useState(0);
	const [addCargaToViagemId, setAddCargaToViagemId] = useState<string | null>(null);
	const [viagemIdToLinkAfterCreate, setViagemIdToLinkAfterCreate] = useState<string | null>(null);
	const [tripDetailsInitialTab, setTripDetailsInitialTab] = useState<'CARGAS' | 'DESPESAS' | 'ADIANTAMENTOS' | null>(null);
	const [tripIdParaIniciarViagem, setTripIdParaIniciarViagem] = useState<string | null>(null);
	const [tripIdParaFinalizarViagem, setTripIdParaFinalizarViagem] = useState<string | null>(null);
	const [showColunasPersonalizadasSheet, setShowColunasPersonalizadasSheet] = useState(false);
	const [isImportCargasOpen, setIsImportCargasOpen] = useState(false);
	const [isImportViagensOpen, setIsImportViagensOpen] = useState(false);

	// Paginação por aba (Viagens e Cargas)
	const [pageTrips, setPageTrips] = useState(1);
	const [pageLoads, setPageLoads] = useState(1);
	const [pageSizeTrips, setPageSizeTrips] = useState(10);
	const [pageSizeLoads, setPageSizeLoads] = useState(10);

	// Ordenação (viagens: cd_viagem | ds_motorista | ds_status | dt_created | dt_agendada | dt_conclusao)
	type OrderColumnTrips = 'cd_viagem' | 'ds_motorista' | 'ds_status' | 'dt_created' | 'dt_agendada' | 'dt_conclusao';
	const [orderColumnTrips, setOrderColumnTrips] = useState<OrderColumnTrips>('dt_agendada');
	const [orderByTrips, setOrderByTrips] = useState<'asc' | 'desc'>('asc');
	// Ordenação (cargas: cd_carga | dt_created | dt_coleta | ds_prioridade | ds_status)
	type OrderColumnLoads = 'cd_carga' | 'dt_created' | 'dt_coleta' | 'ds_prioridade' | 'ds_status';
	const [orderColumnLoads, setOrderColumnLoads] = useState<OrderColumnLoads>('dt_created');
	const [orderByLoads, setOrderByLoads] = useState<'asc' | 'desc'>('desc');

	const handleSortTrips = (column: OrderColumnTrips) => {
		const nextDir = orderColumnTrips === column && orderByTrips === 'asc' ? 'desc' : 'asc';
		setOrderColumnTrips(column);
		setOrderByTrips(nextDir);
		setPageTrips(1);
	};
	const handleSortLoads = (column: OrderColumnLoads) => {
		const nextDir = orderColumnLoads === column && orderByLoads === 'asc' ? 'desc' : 'asc';
		setOrderColumnLoads(column);
		setOrderByLoads(nextDir);
		setPageLoads(1);
	};

	// Resetar página ao mudar filtros
	useEffect(() => {
		setPageTrips(1);
		setPageLoads(1);
	}, [debouncedSearch, selectedMonth, selectedYear, statusFilter, mostrarCargasSemData]);

	const toggleExpand = (tripId: string) => {
		setExpandedTripId((prev) => (prev === tripId ? null : tripId));
	};

	const handleUpdateTripStatus = async (tripId: string, status: Viagem['ds_status']) => {
		try {
			await updateViagemStatus(tripId, status);
			// Atualizar o trip no estado do modal para refletir o novo status sem fechar
			setTripForDetailsModal((prev) =>
				prev && prev.id === tripId
					? { ...prev, ds_status: status, status: status === 'CONCLUIDA' ? ('Completed' as const) : prev.status }
					: prev,
			);
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] }),
				queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] }),
				queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] }),
				queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] }),
				queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', tripId] }),
			]);
			await queryClient.refetchQueries({ queryKey: ['viagem-fluxo', tripId] });
			toast.success(status === 'CONCLUIDA' ? 'Viagem encerrada com sucesso!' : 'Status da viagem atualizado.');
		} catch (err) {
			console.error('Erro ao atualizar status da viagem', err);
			toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status da viagem.');
		}
	};

	const handleReorderDeliveries = async (
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
				queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] }),
				queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] }),
				queryClient.invalidateQueries({ queryKey: ['viagem-fluxo'] }),
			]);
			toast.success('Ordem das entregas atualizada');
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Erro ao reordenar entregas';
			toast.error(message);
		}
	};

	// Listagens completas para modais (Nova Viagem, Adicionar Carga à viagem) — carregadas sob demanda
	const needCargasAll = showCreateModal || showCreateLoadModal || !!addCargaToViagemId;
	const needViagensAll = showCreateModal || !!addCargaToViagemId;
	const { data: cargasData } = useQuery({
		queryKey: ['get-cargas-all'],
		queryFn: () => getCargas(),
		staleTime: 1000 * 60 * 5,
		enabled: needCargasAll,
	});
	const { data: viagensData } = useQuery({
		queryKey: ['get-viagens-all'],
		queryFn: () => getViagens(),
		staleTime: 1000 * 60 * 5,
		enabled: needViagensAll,
	});

	// Listagens paginadas para as tabelas
	const pageParamsTrips = useMemo(
		() => ({
			page: pageTrips,
			pageSize: pageSizeTrips,
			orderBy: orderByTrips,
			orderColumn: orderColumnTrips,
			search: debouncedSearch,
			status: statusFilter,
			month: selectedMonth,
			year: selectedYear,
		}),
		[pageTrips, pageSizeTrips, orderByTrips, orderColumnTrips, debouncedSearch, statusFilter, selectedMonth, selectedYear],
	);
	const pageParamsLoads = useMemo(
		() => ({
			page: pageLoads,
			pageSize: pageSizeLoads,
			orderBy: orderByLoads,
			orderColumn: orderColumnLoads,
			search: debouncedSearch,
			status: statusFilter,
			month: selectedMonth,
			year: selectedYear,
			includeCargasSemData: mostrarCargasSemData,
		}),
		[pageLoads, pageSizeLoads, orderByLoads, orderColumnLoads, debouncedSearch, statusFilter, selectedMonth, selectedYear, mostrarCargasSemData],
	);

	const { data: viagensPaginatedData, isFetching: isFetchingTrips } = useQuery({
		queryKey: ['get-viagens-paginado', pageParamsTrips],
		queryFn: () => getViagensPaginado(pageParamsTrips),
		staleTime: 1000 * 60 * 5,
		placeholderData: keepPreviousData,
		refetchOnWindowFocus: false,
	});
	const { data: cargasPaginatedData, isFetching: isFetchingLoads } = useQuery({
		queryKey: ['get-cargas-paginado', pageParamsLoads],
		queryFn: () => getCargasPaginado(pageParamsLoads),
		staleTime: 1000 * 60 * 5,
		placeholderData: keepPreviousData,
		refetchOnWindowFocus: false,
	});

	const viagensFromPaginated = (viagensPaginatedData?.viagens ?? []) as Viagem[];
	const { viagens: viagensComCargasFromPaginated } = useViagensComCargas(viagensFromPaginated);
	const viagensFiltradas = viagensComCargasFromPaginated ?? viagensFromPaginated;

	const { viagens: viagensComCargasForModals } = useViagensComCargas(viagensData);
	const cargasFiltradas = useMemo(
		() => (cargasPaginatedData?.cargas ?? []) as Carga[],
		[cargasPaginatedData],
	);

	const paginationTrips = useMemo(
		() => ({
			page: viagensPaginatedData?.page ?? pageTrips,
			pageSize: viagensPaginatedData?.pageSize ?? pageSizeTrips,
			total: viagensPaginatedData?.total ?? 0,
			totalPages: Math.max(1, viagensPaginatedData?.totalPages ?? 1),
		}),
		[viagensPaginatedData, pageTrips, pageSizeTrips],
	);
	const paginationLoads = useMemo(
		() => ({
			page: cargasPaginatedData?.page ?? pageLoads,
			pageSize: cargasPaginatedData?.pageSize ?? pageSizeLoads,
			total: cargasPaginatedData?.total ?? 0,
			totalPages: Math.max(1, cargasPaginatedData?.totalPages ?? 1),
		}),
		[cargasPaginatedData, pageLoads, pageSizeLoads],
	);

	const { data: cargaDetailsData, isLoading: cargaDetailsLoading } = useQuery({
		queryKey: ['get-carga', selectedCargaIdForDetails],
		queryFn: () => getCarga(selectedCargaIdForDetails!),
		enabled: !!selectedCargaIdForDetails,
		staleTime: 1000 * 60 * 2,
	});

	const { data: despesasQuickDetails } = useQuery({
		queryKey: ['viagem-despesas', tripForQuickDetailsModal?.id],
		queryFn: () => (tripForQuickDetailsModal?.id ? getDespesasByViagem(tripForQuickDetailsModal.id) : []),
		enabled: !!tripForQuickDetailsModal?.id,
		staleTime: 1000 * 60 * 1,
	});

	const { data: despesasExpandedRow } = useQuery({
		queryKey: ['viagem-despesas-expanded', expandedTripId],
		queryFn: () => (expandedTripId ? getDespesasByViagem(expandedTripId) : []),
		enabled: !!expandedTripId,
		staleTime: 1000 * 60 * 1,
	});

	// Filtrar apenas cargas que não estão vinculadas a viagens em andamento (para modais)
	const loads = useMemo(() => {
		const allCargas = (cargasData ?? []) as Carga[];
		return allCargas.filter((carga) => {
			if (!carga.ds_status_viagem) return true;
			if (carga.ds_status_viagem === 'CONCLUIDA') return true;
			return false;
		});
	}, [cargasData]);

	const toggleStatusFilter = (status: string) => {
		setStatusFilter((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
	};

	const clearFilters = () => {
		setStatusFilter([]);
		setSearchText('');
		setDebouncedSearch('');
		setSelectedMonth(new Date().getMonth());
		setSelectedYear(new Date().getFullYear());
		setMostrarCargasSemData(true);
	};

	const handleRefresh = () => {
		queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
		queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
		queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
		queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
	};

	const ds_tabela = (viewMode === 'TRIPS' ? 'VIAGENSLIST' : 'CARGASLIST') as TabelasPersonalizadas;
	const idsReferencia = useMemo(() => {
		if (viewMode === 'TRIPS') {
			return (viagensFiltradas ?? []).map((t) => t.id);
		}
		return (cargasFiltradas ?? []).map((c) => c.id);
	}, [viewMode, viagensFiltradas, cargasFiltradas]);

	const { data: colunasPers = [] } = useQuery({
		queryKey: ['colunas-personalizadas', ds_tabela],
		queryFn: () => getColunasPersonalizadas(ds_tabela),
		staleTime: 1000 * 60 * 2,
	});

	const { data: colunasDados = [] } = useQuery({
		queryKey: ['colunas-personalizadas-dados', ds_tabela, idsReferencia],
		queryFn: () => getColunasPersonalizadasDados(ds_tabela, idsReferencia),
		enabled: idsReferencia.length > 0 && colunasPers.length > 0,
		staleTime: 1000 * 60 * 1,
	});

	const dadosPorReferencia = useMemo(() => {
		const map: Record<string, Record<string, string>> = {};
		for (const d of colunasDados) {
			if (!map[d.id_referencia]) map[d.id_referencia] = {};
			map[d.id_referencia][d.id_sis_colunas_personalizadas] = d.ds_valor ?? '';
		}
		return map;
	}, [colunasDados]);

	const handleSaveColunaPersonalizada = async (
		idColuna: string,
		idReferencia: string,
		dsValor: string,
	) => {
		await upsertColunaDado({
			id_sis_colunas_personalizadas: idColuna,
			id_referencia: idReferencia,
			ds_valor: dsValor,
		});
		queryClient.invalidateQueries({ queryKey: ['colunas-personalizadas-dados'] });
	};

	const totalColunas = 8 + colunasPers.length; // Código, Cronograma, Cavalo+Carretas, Motorista, Receita, Custo, Status, Ações + colunas personalizadas
	const totalColunasCargas = 7 + colunasPers.length; // +1 coluna Carreta planejada

	/** Cabeçalho de coluna ordenável (estilo fiscal/entradas) */
	function SortableTh<T extends string>({
		label,
		columnId,
		currentColumn,
		currentDir,
		onSort,
		className = '',
		align = 'left',
	}: {
		label: string;
		columnId: T;
		currentColumn: string;
		currentDir: 'asc' | 'desc';
		onSort: (col: T) => void;
		className?: string;
		align?: 'left' | 'center' | 'right';
	}) {
		const isActive = currentColumn === columnId;
		return (
			<TableHead className={className}>
				<Button
					variant='ghost'
					size='sm'
					className={`-ml-3 h-8 text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}
					onClick={() => onSort(columnId)}
				>
					<span>{label}</span>
					{isActive ? currentDir === 'asc' ? <ArrowUp className='ml-1.5 h-3.5 w-3.5' /> : <ArrowDown className='ml-1.5 h-3.5 w-3.5' /> : <ArrowUpDown className='ml-1.5 h-3.5 w-3.5' />}
				</Button>
			</TableHead>
		);
	}

	const handleDeleteClick = (trip: Viagem, e: React.MouseEvent) => {
		e.stopPropagation();
		setTripToDelete(trip);
		setShowDeleteModal(true);
	};

	const handleEditClick = (trip: Viagem, e: React.MouseEvent) => {
		e.stopPropagation();
		setSelectedTrip(trip);
		setShowEditModal(true);
	};

	return (
		<>
			<Head>
				<title>Viagens e Cargas | Esteira</title>
			</Head>
			<DashboardLayout
				title='Viagens e Cargas'
				description='Gerenciamento de viagens e cargas.'
				className='flex h-full min-h-0 flex-col'
			>
				<div className='flex h-full min-h-0 min-w-0 flex-col transition-all'>
					{/* Modal de Criação de Viagem */}
					<NewTripWizard
						key={`wizard-${wizardRemountKey}`}
						isOpen={showCreateModal}
						onClose={() => setShowCreateModal(false)}
						cargas={loads}
						activeTrips={(viagensComCargasForModals ?? viagensData ?? []) as Viagem[]}
						onCreateTrip={() => {
							setShowCreateModal(false);
						}}
						onOpenCreateCarga={() => {
							setCreateLoadOpenedFromWizard(true);
							setShowCreateModal(false);
							setShowCreateLoadModal(true);
						}}
					/>

					{/* Modal de Criação/Edição de Carga */}
					<CreateLoadModal
						isOpen={showCreateLoadModal}
						onClose={() => {
							setShowCreateLoadModal(false);
							setEditingCarga(null);
							setViagemIdToLinkAfterCreate(null);
							if (createLoadOpenedFromWizard) {
								setWizardRemountKey((k) => k + 1);
								setShowCreateModal(true);
								setCreateLoadOpenedFromWizard(false);
							}
						}}
						editingLoad={editingCarga}
						onSaveLoad={(loadData) => {
							setPageLoads(1);
							queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
							queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
							if (loadData?.id) {
								queryClient.invalidateQueries({ queryKey: ['get-carga', loadData.id] });
							}
							setShowCreateLoadModal(false);
							setEditingCarga(null);
						}}
						onCreated={async (carga) => {
							setPageLoads(1);
							queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
							queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
							if (carga?.id) {
								queryClient.invalidateQueries({ queryKey: ['get-carga', carga.id] });
							}
							setShowCreateLoadModal(false);
							setEditingCarga(null);
							if (viagemIdToLinkAfterCreate) {
								const viagensList = (viagensComCargasForModals ?? viagensData ?? []) as Viagem[];
								const trip = viagensList.find((t: Viagem) => t.id === viagemIdToLinkAfterCreate);
								const nextSeq = (trip?.js_viagens_cargas?.length ?? 0) + 1;
								try {
									await vincularCargaAViagem(viagemIdToLinkAfterCreate, {
										id_carga: carga.id,
										nr_sequencia: nextSeq,
									});
									toast.success('Carga criada e vinculada à viagem.');
									await Promise.all([
										queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] }),
										queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] }),
										queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] }),
										queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] }),
									]);
								} catch (err) {
									toast.error(err instanceof Error ? err.message : 'Erro ao vincular carga à viagem.');
								}
								setViagemIdToLinkAfterCreate(null);
							}
							if (createLoadOpenedFromWizard) {
								setWizardRemountKey((k) => k + 1);
								setShowCreateModal(true);
								setCreateLoadOpenedFromWizard(false);
							}
						}}
					/>

					<ImportCargasModal
						open={isImportCargasOpen}
						onOpenChange={setIsImportCargasOpen}
						onImported={async () => {
							await Promise.all([
								queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] }),
								queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] }),
								queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] }),
								queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] }),
							]);
						}}
					/>

					<ImportViagensModal
						open={isImportViagensOpen}
						onOpenChange={setIsImportViagensOpen}
						onImported={async () => {
							await Promise.all([
								queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] }),
								queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] }),
								queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] }),
								queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] }),
							]);
						}}
					/>

					{/* Modal de Edição de Viagem */}
					{selectedTrip && (
						<EditTripModal
							isOpen={showEditModal}
							onClose={() => {
								setShowEditModal(false);
								setSelectedTrip(null);
							}}
							trip={selectedTrip}
						/>
					)}

					{/* Modal de Exclusão de Viagem */}
					{tripToDelete && (
						<DeleteTripModal
							isOpen={showDeleteModal}
							onClose={() => {
								setShowDeleteModal(false);
								setTripToDelete(null);
							}}
							trip={tripToDelete}
						/>
					)}
					{cargaToDelete && (
						<DeleteCargaModal
							isOpen={!!cargaToDelete}
							onClose={() => setCargaToDelete(null)}
							carga={cargaToDelete}
						/>
					)}

					{/* Modal de Detalhes da Carga (aba Cargas) */}
					{selectedCargaIdForDetails && (
						<>
							{cargaDetailsLoading ? (
								<div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm'>
									<div className='rounded-2xl border border-border bg-card px-8 py-6 shadow-xl'>
										<p className='text-sm font-medium text-muted-foreground'>Carregando detalhes...</p>
									</div>
								</div>
							) : cargaDetailsData ? (
								<LoadDetailsModal
									load={cargaDetailsData as Carga}
									onClose={() => setSelectedCargaIdForDetails(null)}
									onSchedule={() => {
										setSelectedCargaIdForDetails(null);
										setShowCreateModal(true);
									}}
									onEdit={(load) => {
										setSelectedCargaIdForDetails(null);
										setEditingCarga(load);
										setShowCreateLoadModal(true);
									}}
								/>
							) : null}
						</>
					)}

					{/* Modal de detalhes rápidos (estilo Viagens e Cargas: trajetos + custos) — aberto pelo olho */}
					{tripForQuickDetailsModal && (
						<div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md'>
							<div className='animate-in zoom-in-95 relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border/40 bg-card shadow-2xl duration-300'>
								<div className='custom-scrollbar h-full overflow-y-auto bg-muted/40'>
									<ErrorBoundary title='Erro nos detalhes da viagem'>
										{(() => {
											const despesas = Array.isArray(despesasQuickDetails) ? despesasQuickDetails : [];
											const receitaCentavos = calcularReceitaViagemCentavos(tripForQuickDetailsModal);
											const { trajetos, custos } = viagemToAccordionData(
												tripForQuickDetailsModal,
												despesas,
												receitaCentavos,
											);
											return (
												<ViagemAccordionDetails
													trajetos={trajetos}
													custos={custos}
													trip={tripForQuickDetailsModal}
													onOpenFullDetails={() => {
														setTripDetailsInitialTab(null);
														setTripForDetailsModal(tripForQuickDetailsModal);
														setTripForQuickDetailsModal(null);
													}}
													onAddCarga={() => {
														setAddCargaToViagemId(tripForQuickDetailsModal.id);
														setTripForQuickDetailsModal(null);
													}}
													onAddDeslocamentoVazio={() => {
														setTripDetailsInitialTab('CARGAS');
														setTripForDetailsModal(tripForQuickDetailsModal);
														setTripForQuickDetailsModal(null);
													}}
													onIniciarViagem={() => setTripIdParaIniciarViagem(tripForQuickDetailsModal.id)}
													onFinalizarViagem={() => setTripIdParaFinalizarViagem(tripForQuickDetailsModal.id)}
												/>
											);
										})()}
									</ErrorBoundary>
									<button
										onClick={() => setTripForQuickDetailsModal(null)}
										className='absolute top-4 right-4 z-50 rounded-full bg-card/50 p-2 text-muted-foreground backdrop-blur-sm transition-all hover:bg-card hover:text-foreground'
										aria-label='Fechar'
									>
										<X size={24} />
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Modal: Iniciar viagem (accordion) — concluir agora ou informar data/hora */}
					<ModalConclusaoDataHora
						open={!!tripIdParaIniciarViagem}
						onOpenChange={(open) => !open && setTripIdParaIniciarViagem(null)}
						title='Iniciar viagem'
						isLoading={false}
						onConfirm={async () => {
							if (tripIdParaIniciarViagem) {
								await handleUpdateTripStatus(tripIdParaIniciarViagem, 'EM_VIAGEM');
								setTripIdParaIniciarViagem(null);
							}
						}}
					/>

					{/* Modal: Finalizar viagem (accordion) — concluir agora ou informar data/hora */}
					<ModalConclusaoDataHora
						open={!!tripIdParaFinalizarViagem}
						onOpenChange={(open) => !open && setTripIdParaFinalizarViagem(null)}
						title='Finalizar viagem'
						isLoading={false}
						onConfirm={async () => {
							if (tripIdParaFinalizarViagem) {
								await handleUpdateTripStatus(tripIdParaFinalizarViagem, 'CONCLUIDA');
								setTripIdParaFinalizarViagem(null);
							}
						}}
					/>

					{/* Modal de detalhes completos da viagem (mesma telinha da Torre de Controle) */}
					{tripForDetailsModal && (
						<div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md'>
							<div className='animate-in zoom-in-95 relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border/40 bg-card shadow-2xl duration-300'>
								<div className='custom-scrollbar h-full overflow-y-auto bg-muted/40'>
									<ErrorBoundary title='Erro nos detalhes da viagem'>
										<TripDetails
											trip={tripForDetailsModal}
											loads={loads}
											availableDocs={[]}
											isInline={true}
											initialViewMode={tripDetailsInitialTab ?? 'CARGAS'}
											onBack={() => {
												setTripForDetailsModal(null);
												setTripDetailsInitialTab(null);
											}}
											onAddLeg={() => console.log('Add leg')}
											onAddDelivery={() => console.log('Add delivery')}
											onAddDocument={() => console.log('Add document')}
											onAddLoadWithDeliveries={() => console.log('Add load with deliveries')}
											onAttachLoadsToTrip={() => console.log('Attach loads to trip')}
											onUpdateStatus={handleUpdateTripStatus}
											onUpdateDeliveryStatus={() => console.log('Update delivery status')}
											onReorderDeliveries={handleReorderDeliveries}
											onViewLoadDetails={(load) => {
												setTripForDetailsModal(null);
												setSelectedCargaIdForDetails(load.id);
											}}
										/>
									</ErrorBoundary>
									<button
										onClick={() => {
											setTripForDetailsModal(null);
											setTripDetailsInitialTab(null);
										}}
										className='absolute top-4 right-4 z-50 rounded-full bg-card/50 p-2 text-muted-foreground backdrop-blur-sm transition-all hover:bg-card hover:text-foreground'
										aria-label='Fechar'
									>
										<X size={24} />
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Dialog: Adicionar carga à viagem */}
					<Dialog open={!!addCargaToViagemId} onOpenChange={(open) => !open && setAddCargaToViagemId(null)}>
						<DialogContent className='max-w-md' showCloseButton>
							<DialogHeader>
								<DialogTitle>Adicionar carga à viagem</DialogTitle>
							</DialogHeader>
							<div className='max-h-[60vh] overflow-y-auto space-y-2 py-2'>
								{(loads ?? [])
									.filter(
										(c: Carga) =>
											c.ds_status !== 'ENTREGUE' && (c.ds_status === 'PENDENTE' || c.ds_status === 'AGENDADA' || c.ds_status === 'EM_COLETA' || c.ds_status === 'EM_TRANSITO'),
									)
									.map((c: Carga) => (
										<button
											key={c.id}
											type='button'
											className='w-full text-left rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors'
											onClick={async () => {
												if (!addCargaToViagemId) return;
												const viagensList = (viagensComCargasForModals ?? viagensData ?? []) as Viagem[];
												const trip = viagensList.find((t: Viagem) => t.id === addCargaToViagemId);
												const nextSeq = (trip?.js_viagens_cargas?.length ?? 0) + 1;
												try {
													await vincularCargaAViagem(addCargaToViagemId, {
														id_carga: c.id,
														nr_sequencia: nextSeq,
													});
													toast.success('Carga vinculada à viagem.');
													await Promise.all([
														queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] }),
														queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] }),
														queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] }),
														queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] }),
													]);
													setAddCargaToViagemId(null);
												} catch (err) {
													toast.error(err instanceof Error ? err.message : 'Erro ao vincular carga.');
												}
											}}
										>
											<span className='font-semibold text-sm text-foreground'>{c.cd_carga ?? c.ds_nome ?? c.id}</span>
											{(c.sis_cidade_origem || c.sis_cidade_destino) && (
												<p className='text-xs text-muted-foreground mt-0.5'>
													{c.sis_cidade_origem?.ds_city ?? '—'} → {c.sis_cidade_destino?.ds_city ?? '—'}
												</p>
											)}
										</button>
									))}
								{loads &&
									loads.filter(
										(c: Carga) =>
											c.ds_status !== 'ENTREGUE' && (c.ds_status === 'PENDENTE' || c.ds_status === 'AGENDADA' || c.ds_status === 'EM_COLETA' || c.ds_status === 'EM_TRANSITO'),
									).length === 0 && (
										<div className='space-y-3 py-4 text-center'>
											<p className='text-sm text-muted-foreground'>
												Nenhuma carga disponível para vincular. Cargas entregues não aparecem aqui.
											</p>
											<Button
												type='button'
												variant='outline'
												size='sm'
												className='gap-2'
												onClick={() => {
													setViagemIdToLinkAfterCreate(addCargaToViagemId);
													setAddCargaToViagemId(null);
													setShowCreateLoadModal(true);
												}}
											>
												<Plus size={14} />
												Criar nova carga
											</Button>
										</div>
									)}
							</div>
						</DialogContent>
					</Dialog>

					{/* Barra única: busca à esquerda; à direita tudo na mesma linha: Viagens/Cargas, Nova Viagem/Carga, Competência, Kebab, Filtro */}
					<div className='bg-background relative z-20 flex shrink-0 flex-row items-center gap-3 px-4 py-3 lg:px-6'>
						{/* Esquerda: pesquisa */}
						<div className='relative min-w-0 flex-1'>
							<Search className='text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
							<Input
								type='text'
								placeholder={viewMode === 'TRIPS' ? 'Buscar viagem, placa, motorista...' : 'Buscar carga, cliente, cidade...'}
								className='h-9 pl-9'
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
							/>
						</div>

						{/* Direita: Viagens/Cargas, Nova Viagem/Carga, Competência, Kebab, Filtro — tudo na mesma linha */}
						<div className='flex flex-nowrap items-center gap-3 shrink-0'>
							<div className='bg-muted flex rounded-lg p-0.5'>
								<Button
									onClick={() => setViewMode('TRIPS')}
									variant='ghost'
									size='sm'
									className={`rounded-md px-3 text-xs font-medium ${
										viewMode === 'TRIPS' ? 'bg-card shadow-sm' : 'text-muted-foreground'
									}`}
								>
									<Map size={14} className='mr-1.5' /> Viagens
								</Button>
								<Button
									onClick={() => setViewMode('LOADS')}
									variant='ghost'
									size='sm'
									className={`rounded-md px-3 text-xs font-medium ${
										viewMode === 'LOADS' ? 'bg-card shadow-sm' : 'text-muted-foreground'
									}`}
								>
									<LayoutGrid size={14} className='mr-1.5' /> Cargas
								</Button>
							</div>

							{viewMode === 'TRIPS' ? (
								<Button onClick={() => setShowCreateModal(true)} size='sm' className='h-9 min-w-[11rem] shrink-0 gap-2 px-4 font-medium'>
									<Plus size={16} /> Nova Viagem
								</Button>
							) : (
								<Button onClick={() => setShowCreateLoadModal(true)} size='sm' className='h-9 min-w-[11rem] shrink-0 gap-2 px-4 font-medium'>
									<Plus size={16} /> Nova Carga
								</Button>
							)}

							<Button
								variant='outline'
								size='icon'
								className='h-9 w-9 shrink-0'
								onClick={handleRefresh}
								disabled={isFetchingTrips || isFetchingLoads}
								title='Atualizar'
								aria-label='Atualizar lista'
							>
								<RefreshCw className={`h-4 w-4 ${(isFetchingTrips || isFetchingLoads) ? 'animate-spin' : ''}`} />
							</Button>
							<MonthYearSelector
								showClearButton={false}
								placeholder='Mês/Ano'
								className='h-9 max-w-32 shrink-0'
								selected={new Date(selectedYear, selectedMonth)}
								onSelect={(date) => {
									if (date) {
										setSelectedMonth(date.getMonth());
										setSelectedYear(date.getFullYear());
									}
								}}
								footerContent={
									viewMode === 'LOADS' ? (
										<label className='flex cursor-pointer items-center gap-2'>
											<Checkbox
												checked={mostrarCargasSemData}
												onCheckedChange={(checked) => setMostrarCargasSemData(checked === true)}
											/>
											<span className='text-foreground/90 whitespace-nowrap text-sm'>Mostrar cargas sem data</span>
										</label>
									) : undefined
								}
							/>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant='outline' size='icon' className='h-9 w-9 shrink-0' tooltip='Mais opções'>
										<EllipsisVertical className='h-4 w-4' />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='end'>
									<DropdownMenuItem
										className='cursor-pointer'
										onClick={() => setShowColunasPersonalizadasSheet(true)}
									>
										<Grid2x2Plus className='mr-2 h-4 w-4' />
										Colunas
									</DropdownMenuItem>
									<DropdownMenuItem className='cursor-pointer' onClick={() => setIsImportViagensOpen(true)}>
										<UploadCloud className='mr-2 h-4 w-4' />
										Importar viagens
									</DropdownMenuItem>
									<DropdownMenuItem className='cursor-pointer' onClick={() => setIsImportCargasOpen(true)}>
										<UploadCloud className='mr-2 h-4 w-4' />
										Importar cargas
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							<Popover open={showFilters} onOpenChange={setShowFilters}>
								<PopoverTrigger asChild>
									<Button variant='outline' size='icon' className='h-9 w-9 shrink-0' tooltip='Filtros'>
										<ListFilter className='h-4 w-4' />
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-64' align='end'>
									<div className='space-y-3'>
										<div className='flex items-center justify-between'>
											<h4 className='text-foreground text-sm font-semibold'>Filtrar por Status</h4>
											{statusFilter.length > 0 && (
												<Button onClick={clearFilters} variant='ghost' className='text-primary h-auto px-2 py-0 text-xs hover:underline'>
													Limpar
												</Button>
											)}
										</div>
										<div className='space-y-2'>
											{(viewMode === 'TRIPS'
												? [
														{ value: 'PLANEJADA', label: 'Planejada' },
														{ value: 'EM_COLETA', label: 'Em Coleta' },
														{ value: 'EM_VIAGEM', label: 'Em Trânsito' },
														{ value: 'ATRASADA', label: 'Atrasada' },
														{ value: 'CONCLUIDA', label: 'Concluída' },
														{ value: 'CANCELADA', label: 'Cancelada' },
													]
												: [
														{ value: 'PENDENTE', label: 'Pendente' },
														{ value: 'AGENDADA', label: 'Agendada' },
														{ value: 'EM_COLETA', label: 'Em Coleta' },
														{ value: 'EM_TRANSITO', label: 'Em Trânsito' },
														{ value: 'ENTREGUE', label: 'Entregue' },
													]
											).map((status) => (
												<label key={status.value} className='flex cursor-pointer items-center gap-2'>
													<Checkbox
														checked={statusFilter.includes(status.value)}
														onCheckedChange={() => toggleStatusFilter(status.value)}
													/>
													<span className='text-foreground/90 text-sm'>{status.label}</span>
												</label>
											))}
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</div>
					</div>

					<ColunasPersonalizadasSheet
						open={showColunasPersonalizadasSheet}
						onOpenChange={setShowColunasPersonalizadasSheet}
						ds_tabela={(viewMode === 'TRIPS' ? 'VIAGENSLIST' : 'CARGASLIST') as TabelasPersonalizadas}
					/>

					{/* Conteúdo Principal — espaçamento alinhado ao padrão fechamento */}
					<div className='relative min-h-0 min-w-0 flex-1 overflow-hidden'>
						<div className='bg-muted/20 flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-hidden p-4 md:p-6'>
							{viewMode === 'TRIPS' ? (
								/* Tabela de Viagens */
								<div className='flex flex-col rounded-lg border border-border bg-card shadow-sm w-full'>
									<div className='w-full overflow-x-auto'>
										<Table className='w-full min-w-full text-left'>
										<TableHeader>
											<TableRow className='h-[52px] bg-muted/40 hover:bg-muted/40 text-muted-foreground text-xs tracking-wider uppercase'>
												<SortableTh
													label='Código Viagem'
													columnId='cd_viagem'
													currentColumn={orderColumnTrips}
													currentDir={orderByTrips}
													onSort={handleSortTrips}
													className='px-6 py-4 font-medium'
												/>
												<SortableTh
													label='Cronograma'
													columnId='dt_agendada'
													currentColumn={orderColumnTrips}
													currentDir={orderByTrips}
													onSort={handleSortTrips}
													className='px-6 py-4 font-medium'
												/>
												<TableHead className='px-6 py-4 font-medium'>Cavalo + Carretas</TableHead>
												<SortableTh
													label='Motorista'
													columnId='ds_motorista'
													currentColumn={orderColumnTrips}
													currentDir={orderByTrips}
													onSort={handleSortTrips}
													className='px-6 py-4 font-medium'
												/>
												<TableHead className='px-6 py-4 text-right font-medium'>Receita Frete</TableHead>
												<TableHead className='px-6 py-4 text-right font-medium'>Custo Viagem</TableHead>
												<SortableTh
													label='Status'
													columnId='ds_status'
													currentColumn={orderColumnTrips}
													currentDir={orderByTrips}
													onSort={handleSortTrips}
													className='px-6 py-4 text-center font-medium'
													align='center'
												/>
												{colunasPers.map((c) => (
													<TableHead key={c.id} className='px-6 py-4 font-medium'>
														{c.ds_nome_coluna}
													</TableHead>
												))}
												<TableHead className='px-6 py-4 text-center font-medium'>Ações</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{viagensFiltradas?.map((trip) => {
												// Use scheduledDate if available, otherwise createdAt
												let receita = 0;

												// Iterar sobre todas as cargas da viagem
												for (const viagemCarga of trip.js_viagens_cargas || []) {
													const carga = viagemCarga.tms_cargas;
													if (!carga) continue;

													// NOVA ESTRUTURA: Somar CT-es das entregas
													if (carga.js_entregas && carga.js_entregas.length > 0) {
														carga.js_entregas.forEach((entrega) => {
															// Somar CT-es da entrega
															const valorCtes =
																entrega.js_entregas_ctes?.reduce((sum, cteLink) => {
																	const valorCte = Number(cteLink.js_cte?.vl_total ?? 0);
																	return sum + valorCte;
																}, 0) || 0;

															receita += valorCtes;
														});
													} else {
														// ESTRUTURA LEGADA: Fallback para js_cargas_ctes
														const valorLegado =
															carga.js_cargas_ctes?.reduce((sum, cteLink) => {
																return sum + Number(cteLink.js_cte?.vl_total ?? 0);
															}, 0) || 0;
														receita += valorLegado;
													}
												}

												const scheduled = trip.dt_agendada;
												const created = trip.dt_agendada;
												const dateLabel = formatBusinessDate(scheduled ?? created);
												const isScheduled = !!scheduled;
												const isExpanded = expandedTripId === trip.id;
												const isEditable = trip.ds_status === 'PLANEJADA';
												const estimatedReturn = trip.dt_previsao_retorno;
												const returnDateLabel = estimatedReturn ? formatBusinessDate(estimatedReturn) : null;

												return (
													<React.Fragment key={trip.id}>
														<TableRow
															className={`cursor-pointer transition-colors hover:bg-muted/50 ${isExpanded ? 'bg-blue-500/10' : ''}`}
															onClick={() => toggleExpand(trip.id)}
														>
															<TableCell className='text-foreground px-6 py-4 text-sm font-medium'>#{trip.cd_viagem || trip.id}</TableCell>
															<TableCell className='text-muted-foreground px-6 py-4 text-sm'>
																<div className='flex flex-col gap-1'>
																	<div className='flex items-center gap-1.5' title='Data de Saída'>
																		<span className={`h-1.5 w-1.5 rounded-full ${isScheduled ? 'bg-blue-500' : 'bg-muted-foreground'}`}></span>
																		<span className={isScheduled ? 'text-foreground font-semibold' : ''}>
																			{dateLabel}
																		</span>
																	</div>
																	{returnDateLabel && (
																		<div className='flex items-center gap-1.5' title='Previsão de Retorno'>
																			<span className='h-1.5 w-1.5 rounded-full bg-orange-400'></span>
																			<span className='text-muted-foreground text-xs'>Até {returnDateLabel}</span>
																		</div>
																	)}
																	{!estimatedReturn && !isScheduled && (
																		<span className='text-muted-foreground pl-3 text-xs'>
																			{created
																				? new Date(created).toLocaleTimeString([], {
																						hour: '2-digit',
																						minute: '2-digit',
																				  })
																				: ''}
																		</span>
																	)}
																</div>
															</TableCell>
															<TableCell className='text-foreground/90 px-6 py-4 text-sm'>
																<div className='flex flex-col'>
																	<span className='font-bold'>{trip.ds_placa_cavalo}</span>
																	<div className='mt-0.5 flex flex-col gap-0.5'>
																		{trip.ds_placa_carreta_1 && (
																			<span className='text-muted-foreground flex items-center gap-1 text-xs'>
																				<span className='bg-muted-foreground h-1 w-1 rounded-full'></span> {trip.ds_placa_carreta_1}
																			</span>
																		)}
																		{trip.ds_placa_carreta_2 && (
																			<span className='text-muted-foreground flex items-center gap-1 text-xs'>
																				<span className='bg-muted-foreground h-1 w-1 rounded-full'></span> {trip.ds_placa_carreta_2}
																			</span>
																		)}
																		{trip.ds_placa_carreta_3 && (
																			<span className='text-muted-foreground flex items-center gap-1 text-xs'>
																				<span className='bg-muted-foreground h-1 w-1 rounded-full'></span> {trip.ds_placa_carreta_3}
																			</span>
																		)}
																	</div>
																</div>
															</TableCell>
															<TableCell className='text-foreground/90 px-6 py-4 text-sm'>{trip.ds_motorista}</TableCell>
															<TableCell className='px-6 py-4 text-right text-sm font-bold text-green-700 dark:text-green-300'>
																{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receita / 100)}{' '}
																{/*TODO: valor de receita*/}
															</TableCell>
															<TableCell className='px-6 py-4 text-right text-sm font-medium text-red-600 dark:text-red-300'>
																{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(trip.ds_custo_total)}
															</TableCell>
															<TableCell className='px-6 py-4 text-center'>
																<StatusBadge status={trip.ds_status ?? trip.status} size='sm' />
															</TableCell>
															{colunasPers.map((c) => (
																<TableCell key={c.id} className='px-6 py-4' onClick={(e) => e.stopPropagation()}>
																	<CelulaColunaPersonalizada
																		coluna={c}
																		idReferencia={trip.id}
																		valor={dadosPorReferencia[trip.id]?.[c.id] ?? ''}
																		onSave={handleSaveColunaPersonalizada}
																	/>
																</TableCell>
															))}
															<TableCell className='px-6 py-4 text-center'>
																<div className='flex items-center justify-center gap-1' onClick={(e) => e.stopPropagation()}>
																	<Button
																		onClick={() => toggleExpand(trip.id)}
																		variant='outline'
																		size='icon'
																		className={`h-7 w-7 rounded border p-1.5 transition-colors ${
																			isExpanded ? 'border-blue-500/20 bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'text-muted-foreground'
																		}`}
																		title={isExpanded ? 'Recolher resumo' : 'Expandir resumo da viagem'}
																	>
																		{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
																	</Button>
									<Button
										onClick={() => setTripForQuickDetailsModal(trip)}
										variant='outline'
										size='icon'
										className='text-muted-foreground hover:border-blue-500/40 hover:text-blue-600 h-7 w-7 rounded border p-1.5 transition-colors'
										title='Ver detalhes (trajetos e custos)'
									>
										<Eye size={14} />
									</Button>
																	<Button
																		onClick={(e) => handleDeleteClick(trip, e)}
																		disabled={!isEditable}
																		variant='outline'
																		size='icon'
																		className={`h-7 w-7 rounded p-1.5 transition-colors ${
																			isEditable
																				? 'text-muted-foreground hover:border-red-500/40 hover:text-red-600'
																				: 'cursor-not-allowed opacity-40'
																		}`}
																		title={isEditable ? 'Excluir Viagem' : 'Viagem já iniciada, não é possível excluir.'}
																	>
																		<Trash2 size={14} />
																	</Button>
																	<Button
																		onClick={(e) => handleEditClick(trip, e)}
																		variant='outline'
																		size='icon'
																		className='text-muted-foreground hover:border-blue-500/40 hover:text-blue-600 h-7 w-7 rounded p-1.5 transition-colors'
																		title='Editar Viagem (Datas e Recursos)'
																	>
																		<Edit2 size={14} />
																	</Button>
																</div>
															</TableCell>
														</TableRow>
														{/* Expanded: mesmo layout simples de Viagens e Cargas (trajetos + custos) */}
														{isExpanded && (
															<TableRow>
																<TableCell colSpan={totalColunas} className="w-full p-0">
																	{(() => {
																		const despesas = Array.isArray(despesasExpandedRow) ? despesasExpandedRow : [];
																		const receitaCentavos = calcularReceitaViagemCentavos(trip);
																		const { trajetos, custos } = viagemToAccordionData(trip, despesas, receitaCentavos);
																		return (
																			<ViagemAccordionDetails
																				trajetos={trajetos}
																				custos={custos}
																				trip={trip}
																				onOpenFullDetails={() => {
																					setTripDetailsInitialTab(null);
																					setTripForDetailsModal(trip);
																					setExpandedTripId(null);
																				}}
																				onAddCarga={() => setAddCargaToViagemId(trip.id)}
																				onAddDeslocamentoVazio={() => {
																					setTripDetailsInitialTab('CARGAS');
																					setTripForDetailsModal(trip);
																					setExpandedTripId(null);
																				}}
																				onIniciarViagem={() => setTripIdParaIniciarViagem(trip.id)}
																				onFinalizarViagem={() => setTripIdParaFinalizarViagem(trip.id)}
																			/>
																		);
																	})()}
																</TableCell>
															</TableRow>
														)}
													</React.Fragment>
												);
											})}
											{(viagensFiltradas?.length ?? 0) === 0 && (
												<TableRow>
													<TableCell colSpan={totalColunas} className='text-muted-foreground p-12 text-center'>
														{searchText || statusFilter.length > 0 ? (
															<>
																<p className='mb-2'>Nenhuma viagem encontrada com os filtros aplicados.</p>
																<Button onClick={clearFilters} variant='ghost' className='text-primary h-auto p-0 text-sm hover:underline'>
																	Limpar filtros
																</Button>
															</>
														) : (
															'Nenhuma viagem cadastrada. Clique em "Nova Viagem" para começar.'
														)}
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
									</div>
									<div className='shrink-0 bg-card'>
										<ServerPaginationBar
											page={paginationTrips.page}
											pageSize={paginationTrips.pageSize}
											total={paginationTrips.total}
											totalPages={paginationTrips.totalPages}
											onPageChange={setPageTrips}
											onPageSizeChange={(size) => {
												setPageSizeTrips(size);
												setPageTrips(1);
											}}
											isFetching={isFetchingTrips}
										/>
									</div>
								</div>
							) : (
								/* Tabela de Cargas */
								<div className='flex flex-col rounded-lg border border-border bg-card shadow-sm'>
									<div className='w-full overflow-x-auto'>
										<Table className='text-left'>
										<TableHeader>
											<TableRow className='h-[52px] bg-muted/40 hover:bg-muted/40 text-muted-foreground text-xs tracking-wider uppercase'>
												<SortableTh
													label='Código Carga'
													columnId='cd_carga'
													currentColumn={orderColumnLoads}
													currentDir={orderByLoads}
													onSort={handleSortLoads}
													className='px-6 py-4 font-medium'
												/>
												<TableHead className='px-6 py-4 font-medium'>Origem → Destino</TableHead>
												<SortableTh
													label='Data de Coleta'
													columnId='dt_coleta'
													currentColumn={orderColumnLoads}
													currentDir={orderByLoads}
													onSort={handleSortLoads}
													className='px-6 py-4 font-medium'
												/>
												<TableHead className='px-6 py-4 font-medium'>Data de Entrega</TableHead>
												<SortableTh
													label='Status'
													columnId='ds_status'
													currentColumn={orderColumnLoads}
													currentDir={orderByLoads}
													onSort={handleSortLoads}
													className='px-6 py-4 text-center font-medium'
													align='center'
												/>
												<TableHead className='px-6 py-4 font-medium'>Carreta planejada</TableHead>
												{colunasPers.map((c) => (
													<TableHead key={c.id} className='px-6 py-4 font-medium'>
														{c.ds_nome_coluna}
													</TableHead>
												))}
												<TableHead className='px-6 py-4 text-center font-medium'>Ações</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{cargasFiltradas?.map((carga) => {
												const origem = carga.sis_cidade_origem
													? `${carga.sis_cidade_origem.ds_city}${carga.sis_cidade_origem.js_uf ? `/${carga.sis_cidade_origem.js_uf.ds_uf}` : ''}`
													: '-';
												const destino = carga.sis_cidade_destino
													? `${carga.sis_cidade_destino.ds_city}${carga.sis_cidade_destino.js_uf ? `/${carga.sis_cidade_destino.js_uf.ds_uf}` : ''}`
													: '-';
												const dataColetaRaw = carga.dt_coleta || carga.dt_coleta_inicio;
												const dataColeta = dataColetaRaw ? new Date(dataColetaRaw) : null;
												const coletaEstimada = dataColeta && (carga.ds_status === 'PENDENTE' || carga.ds_status === 'AGENDADA' || carga.ds_status === 'EM_COLETA');
												const primeiraEntrega = carga.js_entregas?.slice().sort((a, b) => a.nr_sequencia - b.nr_sequencia)[0];
												const dataEntregaRaw = primeiraEntrega?.dt_entrega || primeiraEntrega?.dt_limite_entrega;
												const dataEntrega = dataEntregaRaw ? new Date(dataEntregaRaw) : null;
												const entregaEstimada = primeiraEntrega && !primeiraEntrega.dt_entrega && !!primeiraEntrega.dt_limite_entrega;

												return (
													<TableRow
														key={carga.id}
														className='cursor-pointer transition-colors hover:bg-muted/50'
														onClick={() => setSelectedCargaIdForDetails(carga.id)}
													>
														<TableCell className='text-foreground px-6 py-4 text-sm font-medium'>
															#{carga.cd_carga || carga.id}
														</TableCell>
														<TableCell className='text-foreground/90 px-6 py-4 text-sm'>
															<div className='flex items-center gap-2'>
																<span>{origem}</span>
																<span className='text-muted-foreground'>→</span>
																<span>{destino}</span>
															</div>
														</TableCell>
														<TableCell className='text-muted-foreground px-6 py-4 text-sm'>
															<div className='flex items-center gap-1.5'>
																{dataColeta ? dataColeta.toLocaleDateString('pt-BR') : '-'}
																{coletaEstimada && (
																	<span className='text-[10px] font-medium uppercase text-muted-foreground/80'>Est.</span>
																)}
															</div>
														</TableCell>
														<TableCell className='text-muted-foreground px-6 py-4 text-sm'>
															<div className='flex items-center gap-1.5'>
																{dataEntrega ? dataEntrega.toLocaleDateString('pt-BR') : '-'}
																{entregaEstimada && (
																	<span className='text-[10px] font-medium uppercase text-muted-foreground/80'>Est.</span>
																)}
															</div>
														</TableCell>
														<TableCell className='px-6 py-4 text-center'>
															<StatusBadge
																status={carga.ds_status}
																context='carga'
																size='sm'
																className='inline-flex'
															/>
														</TableCell>
														<TableCell className='text-foreground/90 px-6 py-4 text-sm'>
															{carga.tms_carroceria_planejada
																? carga.tms_carroceria_planejada.ds_placa
																: '–'}
														</TableCell>
														{colunasPers.map((c) => (
															<TableCell key={c.id} className='px-6 py-4' onClick={(e) => e.stopPropagation()}>
																<CelulaColunaPersonalizada
																	coluna={c}
																	idReferencia={carga.id}
																	valor={dadosPorReferencia[carga.id]?.[c.id] ?? ''}
																	onSave={handleSaveColunaPersonalizada}
																/>
															</TableCell>
														))}
														<TableCell className='px-6 py-4 text-center' onClick={(e) => e.stopPropagation()}>
															<div className='flex items-center justify-center gap-1'>
																<Button
																	variant='outline'
																	size='icon'
																	className='text-muted-foreground h-7 w-7 rounded p-1.5 transition-colors hover:text-blue-600'
																	title='Visualizar Detalhes'
																	onClick={(e) => {
																		e.stopPropagation();
																		setSelectedCargaIdForDetails(carga.id);
																	}}
																>
																	<Eye size={14} />
																</Button>
																<Button
																	variant='outline'
																	size='icon'
																	className='text-muted-foreground h-7 w-7 rounded p-1.5 transition-colors hover:border-red-500/40 hover:text-red-600'
																	title='Excluir Carga'
																	onClick={(e) => {
																		e.stopPropagation();
																		setCargaToDelete(carga);
																	}}
																>
																	<Trash2 size={14} />
																</Button>
															</div>
														</TableCell>
													</TableRow>
												);
											})}
											{(cargasFiltradas?.length ?? 0) === 0 && (
												<TableRow>
													<TableCell colSpan={totalColunasCargas} className='text-muted-foreground p-12 text-center'>
														{searchText || statusFilter.length > 0 ? (
															<>
																<p className='mb-2'>Nenhuma carga encontrada com os filtros aplicados.</p>
																<Button onClick={clearFilters} variant='ghost' className='text-primary h-auto p-0 text-sm hover:underline'>
																	Limpar filtros
																</Button>
															</>
														) : (
															'Nenhuma carga cadastrada. Clique em "Nova Carga" para começar.'
														)}
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
									</div>
									<div className='shrink-0 bg-card'>
										<ServerPaginationBar
											page={paginationLoads.page}
											pageSize={paginationLoads.pageSize}
											total={paginationLoads.total}
											totalPages={paginationLoads.totalPages}
											onPageChange={setPageLoads}
											onPageSizeChange={(size) => {
												setPageSizeLoads(size);
												setPageLoads(1);
											}}
											isFetching={isFetchingLoads}
										/>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</DashboardLayout>
		</>
	);
};

export default TripList;
