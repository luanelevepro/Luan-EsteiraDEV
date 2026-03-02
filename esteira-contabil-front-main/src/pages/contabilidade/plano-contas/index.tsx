import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { FileCheck, ListFilter, MoreVertical, RefreshCw, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import EmptyState from '@/components/states/empty-state';
import { useCompanyContext } from '@/context/company-context';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import HandleUpdatePlanoContas from '@/components/general/contabilidade/plano-contas/btn-update-all';
import { DataTableDynamic, type DataTableRef } from '@/components/ui/data-table-dynamic';
import { getPlanoContasPaginado } from '@/services/api/plano-contas';
import { columns } from '@/components/general/contabilidade/plano-contas/plano-contas-columns';
import HandleInsertGrupoToPlano from '@/components/general/contabilidade/plano-contas/btn-add-grupo-to-plano';
import { SortingState } from '@tanstack/react-table';
import HandleInsertTipoDespesaToConta from '@/components/general/contabilidade/plano-contas/btn-add-tipo-despesa';
import { Checkbox } from '@/components/ui/checkbox';

export interface PlanoConta {
	id: string;
	ds_nome_cta: string;
	ds_classificacao_cta?: string;
	id_conta_pai?: string | null;
	ds_tipo_cta?: string;
	is_ativo: boolean;
	js_con_grupo_contas?: {
		ds_nome_grupo: string;
	};
	children?: PlanoConta[];
}

export default function PlanoContasPage() {
	const tableRef = useRef<DataTableRef<PlanoConta> | null>(null);
	const { state } = useCompanyContext();
	const [openDialog, setOpenDialog] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
	const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
	const [activeTab, setActiveTab] = useState<'status' | 'tipos'>('status');
	const [sorting, setSorting] = useState<SortingState>([]);
	// Opções conhecidas de tipo de despesa — ajuste se houver novos tipos
	const TIPO_DESPESA_OPTIONS: { value: string; label: string }[] = [
		{ value: 'ABASTECIMENTO', label: 'Abastecimento' },
		{ value: 'ADIANTAMENTO', label: 'Adiantamento' },
		{ value: 'PEDAGIO', label: 'Pedágio' },
		{ value: 'DESPESA', label: 'Despesa' },
	];
	const [pageParameters, setPageParameters] = useState({
		page: 1,
		pageSize: 10,
		orderBy: 'asc' as 'asc' | 'desc',
		orderColumn: 'ds_classificacao_cta',
		search: '',
		status: [] as string[],
		tipos: [] as string[],
	});
	useEffect(() => {
		const handler = setTimeout(() => {
			setPageParameters((prev) => ({ ...prev, search: searchTerm, page: 1 }));
		}, 500);
		return () => clearTimeout(handler);
	}, [searchTerm]);

	useEffect(() => {}, []);

	useEffect(() => {
		if (sorting.length === 0) return;

		const [{ id: orderColumn, desc }] = sorting;
		setPageParameters((prev) => ({
			...prev,
			orderColumn,
			orderBy: desc ? 'desc' : 'asc',
			page: 1,
		}));
	}, [sorting]);

	const { data, isError, error, isFetching, refetch } = useQuery({
		queryKey: ['get-plano-contas-paginado', pageParameters, state],
		queryFn: () =>
			getPlanoContasPaginado({
				empresaId: state,
				page: pageParameters.page,
				pageSize: pageParameters.pageSize,
				orderBy: pageParameters.orderBy,
				orderColumn: pageParameters.orderColumn,
				search: pageParameters.search,
				status: Array.isArray(pageParameters.status)
					? pageParameters.status.length === 1
						? pageParameters.status[0]
						: null
					: (pageParameters.status as unknown as string) || null,
				tipos: Array.isArray(pageParameters.tipos) && pageParameters.tipos.length > 0 ? pageParameters.tipos : undefined,
			}),
		staleTime: 1000 * 60 * 5,
		placeholderData: keepPreviousData,
		enabled: !!state,
	});

	if (isError) {
		toast.error((error as Error).message);
	}

	const handlePageChange = (newPage: number) => {
		if (newPage < 1) return;
		setPageParameters((prev) => ({ ...prev, page: newPage }));
	};

	const handlePageSizeChange = (newSize: number) => {
		setPageParameters((prev) => ({ ...prev, pageSize: newSize, page: 1 }));
	};

	return (
		<>
			<Head>
				<title>Plano Contas | Esteira</title>
			</Head>
			<DashboardLayout title='Plano de Contas' description='Gerenciamento do seu plano de contas.'>
				<div className='grid gap-6'>
					<div className='flex gap-2'>
						<div className='relative col-span-5 h-10 flex-1'>
							<SearchIcon className='absolute top-[45%] left-2 h-4 w-4 -translate-y-1/2 transform' />
							<Input
								placeholder='Pesquisar...'
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className='mr-2 pl-8'
							/>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant='outline' size='icon' tooltip='Filtrar'>
									<ListFilter className='h-4 w-4' />
								</Button>
							</DropdownMenuTrigger>

							<DropdownMenuContent align='end' className='w-64 p-0'>
								{(() => {
									// Mapeia dados conforme a aba ativa
									const cfg =
										activeTab === 'status'
											? {
													label: 'Filtrar Status',
													options: ['Ativos', 'Inativos'] as string[],
													selected: selectedStatus,
													setSelected: setSelectedStatus,
													paramKey: 'status' as const,
												}
											: {
													label: 'Filtrar Tipos',
													options: TIPO_DESPESA_OPTIONS.map((t) => t.value),
													selected: selectedTypes,
													setSelected: setSelectedTypes,
													paramKey: 'tipos' as const,
												};

									return (
										<div className='flex flex-col'>
											{/* Header das abas */}
											<div className='flex border-b'>
												<button
													type='button'
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														setActiveTab('status');
													}}
													className={`flex-1 px-3 py-2 text-sm ${activeTab === 'status' ? 'border-b-2 font-medium' : 'text-muted-foreground'}`}
												>
													Status
												</button>
												<button
													type='button'
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														setActiveTab('tipos');
													}}
													className={`flex-1 px-3 py-2 text-sm ${activeTab === 'tipos' ? 'border-b-2 font-medium' : 'text-muted-foreground'}`}
												>
													Tipos
												</button>
											</div>

											{/* Conteúdo da aba */}
											<div className='p-2'>
												<DropdownMenuLabel>{cfg.label}</DropdownMenuLabel>
												<DropdownMenuSeparator />

												<div className='max-h-64 overflow-auto pr-1'>
													{cfg.options.map((opt: string) => (
														<DropdownMenuItem
															key={`${cfg.paramKey}-${opt}`}
															onSelect={(e) => e.preventDefault()}
															className='flex items-center gap-2'
														>
															<Checkbox
																checked={cfg.selected.includes(opt)}
																onCheckedChange={(checked) => {
																	cfg.setSelected((prev: string[]) =>
																		checked ? [...prev, opt] : prev.filter((s) => s !== opt),
																	);
																	const currentFilters = (pageParameters[cfg.paramKey] || []) as string[];
																	const next = checked
																		? [...currentFilters, opt]
																		: currentFilters.filter((s: string) => s !== opt);
																	setPageParameters((prev) => ({ ...prev, [cfg.paramKey]: next, page: 1 }));
																}}
															/>
															<span>{opt.replace(/_/g, ' ')}</span>
														</DropdownMenuItem>
													))}
												</div>
												<DropdownMenuSeparator />
												{/* Selecionar todos da aba ativa */}
												<DropdownMenuItem
													onSelect={(e) => {
														e.preventDefault();
														// marca todos os options da aba ativa
														cfg.setSelected([...cfg.options]);
														setPageParameters((prev) => ({ ...prev, [cfg.paramKey]: [...cfg.options], page: 1 }));
													}}
													className='hover:cursor-pointer'
												>
													Selecionar todos
												</DropdownMenuItem>
												<DropdownMenuItem
													onSelect={(e) => {
														e.preventDefault();
														setSelectedStatus?.([]);
														setSelectedTypes?.([]);
														setPageParameters((prev) => ({ ...prev, status: [], tipos: [], page: 1 }));
													}}
													className='text-red-600 hover:bg-red-100'
												>
													Limpar todos os filtros
												</DropdownMenuItem>
											</div>
										</div>
									);
								})()}
							</DropdownMenuContent>
						</DropdownMenu>
						<Button tooltip='Atualizar' variant='outline' size='icon' disabled={isFetching} onClick={() => refetch()}>
							<RefreshCw className={`h-4 w-4 ${isFetching && 'animate-spin'}`} />
						</Button>
						<HandleUpdatePlanoContas
							pageParameters={{
								page: pageParameters.page,
								pageSize: pageParameters.pageSize,
								orderBy: pageParameters.orderBy,
								search: pageParameters.search,
								status: Array.isArray(pageParameters.status)
									? pageParameters.status.length === 1
										? pageParameters.status[0]
										: null
									: (pageParameters.status as unknown as string) || null,
							}}
						/>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant='outline' tooltip='Opções' size='icon' aria-label='Abrir menu de ações'>
									<MoreVertical className='h-4 w-4' />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end'>
								<DropdownMenuItem
									onSelect={() => {
										// Defer opening the dialog so the dropdown can close first
										setTimeout(() => setOpenDialog(true), 0);
									}}
								>
									<div className='hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1'>
										<FileCheck className='h-4 w-4' />
										<span>Vincular Grupo</span>
									</div>
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={() => {
										// Defer opening the dialog so the dropdown can close first
										setTimeout(() => setOpenDialog(true), 0);
									}}
								>
									<div className='hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1'>
										<FileCheck className='h-4 w-4' />
										<span>Vincular Tipo</span>
									</div>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					{data?.planoContas?.length === 0 ? (
						<EmptyState label='Nenhum plano de contas encontrado.' />
					) : (
						<DataTableDynamic
							ref={tableRef}
							columns={columns}
							data={data?.planoContas || []}
							pageParameters={{
								page: pageParameters.page,
								pageSize: pageParameters.pageSize,
								total: data?.total || 0,
								totalPages: data?.totalPages || 1,
							}}
							onPageChange={handlePageChange}
							onPageSizeChange={handlePageSizeChange}
							sorting={sorting}
							onSortingChange={setSorting}
						/>
					)}
				</div>
			</DashboardLayout>
			<HandleInsertGrupoToPlano
				open={openDialog}
				onOpenChange={setOpenDialog}
				onChange={() => {
					refetch();
				}}
				pageParameters={{
					page: pageParameters.page,
					pageSize: pageParameters.pageSize,
					orderBy: pageParameters.orderBy,
					search: pageParameters.search,
					status: Array.isArray(pageParameters.status)
						? pageParameters.status.length === 1
							? pageParameters.status[0]
							: null
						: (pageParameters.status as unknown as string) || null,
				}}
				tableRef={tableRef}
			/>
			<HandleInsertTipoDespesaToConta
				open={openDialog}
				onOpenChange={setOpenDialog}
				onChange={() => {
					refetch();
				}}
				tableRef={tableRef}
				pageParameters={{
					page: pageParameters.page,
					pageSize: pageParameters.pageSize,
					orderBy: pageParameters.orderBy,
					search: pageParameters.search,
					status: selectedStatus.length === 1 ? selectedStatus[0] : null,
				}}
			/>
		</>
	);
}
