import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { ListFilter, RefreshCw, SearchIcon, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DataTableDynamic } from '@/components/ui/data-table-dynamic';
import type { Row, SortingState } from '@tanstack/react-table';
import EmptyState from '@/components/states/empty-state';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { useCompanyContext } from '@/context/company-context';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getClassificacaoProdutos } from '@/services/api/reforma-tributaria';
import HandleSyncClassificacaoProdutos from '@/components/general/reforma-tributaria/classificacao-produtos/btn-sync-data';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SheetDefinirCClassTrib from '@/components/general/reforma-tributaria/classificacao-produtos/sheet-definir-cclasstrib';


const tipoItemOptions: { cd: number; label: string }[] = [
	{ cd: 0, label: 'Mercadoria para revenda' },
	{ cd: 1, label: 'Matéria prima' },
	{ cd: 2, label: 'Embalagem' },
	{ cd: 3, label: 'Produto em processo' },
	{ cd: 4, label: 'Produto acabado' },
	{ cd: 5, label: 'Subproduto' },
	{ cd: 6, label: 'Produto intermediário' },
	{ cd: 7, label: 'Uso e consumo' },
	{ cd: 8, label: 'Ativo imobilizado' },
	{ cd: 9, label: 'Serviços' },
	{ cd: 10, label: 'Outros insumos' },
	{ cd: 99, label: 'Outras' },
];

function getTipoItemLabel(cd: number | null): string {
	if (cd == null) return '-';
	const opt = tipoItemOptions.find((o) => o.cd === cd);
	const descricao = opt?.label ?? String(cd);
	const numero = String(cd).padStart(2, '0');
	return `${numero} - ${descricao}`;
}

function CellWithTooltip({ value, tooltip }: { value: React.ReactNode; tooltip: string | null }) {
	if (!tooltip) return <span>{value}</span>;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className='cursor-help underline decoration-dotted underline-offset-2'>{value}</span>
			</TooltipTrigger>
			<TooltipContent side='top' className='max-w-sm'>
				{tooltip}
			</TooltipContent>
		</Tooltip>
	);
}

export interface ClassificacaoProdutoData {
	id: string;
	id_externo: string | null;
	ds_nome: string;
	cd_ncm: string | null;
	ds_unidade: string;
	ds_status: string;
	ds_tipo_item: number | null;
	classificacao: {
		cd_cst: string;
		cd_class_trib: string;
		ds_cst_desc: string | null;
		ds_class_trib_descr: string | null;
		ds_anexo_descricao_full: string | null;
		ds_tipo_aliquota: string | null;
		ds_anexo_numero: string | null;
		ds_anexo_descricao: string | null;
		ds_anexo_numero_item: string | null;
		fl_ncm_encontrado: boolean;
		fl_confirmado_usuario: boolean;
		vl_reducao_cbs?: number | null;
		vl_reducao_ibs_uf?: number | null;
		vl_reducao_ibs_mun?: number | null;
		ds_tipo_reducao?: string | null;
		aliquota_reducao?: {
			status: string;
			cbs: number;
			ibsUf: number;
			ibsMun: number;
			label: string;
		} | null;
	} | null;
}

const columns: ColumnDef<ClassificacaoProdutoData>[] = [
	{
		accessorKey: 'id_externo',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Código' />,
		cell: ({ row }) => row.original.id_externo || '-',
	},
	{
		accessorKey: 'ds_nome',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Produto' />,
		cell: ({ row }) => (
			<div className='max-w-[300px] truncate' title={row.getValue('ds_nome')}>
				{row.getValue('ds_nome')}
			</div>
		),
	},
	{
		accessorKey: 'cd_ncm',
		header: ({ column }) => <DataTableColumnHeader column={column} title='NCM' />,
		cell: ({ row }) => row.getValue('cd_ncm') || '-',
	},
	{
		id: 'ds_tipo_item',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Tipo de item' />,
		cell: ({ row }) => getTipoItemLabel(row.original.ds_tipo_item),
	},
	{
		id: 'cd_cst',
		header: ({ column }) => <DataTableColumnHeader column={column} title='CST' />,
		cell: ({ row }) => {
			const cl = row.original.classificacao;
			const valor = cl?.cd_cst || '-';
			const descricao = cl?.ds_cst_desc ?? cl?.ds_class_trib_descr ?? null;
			return <CellWithTooltip value={valor} tooltip={descricao} />;
		},
	},
	{
		id: 'cd_class_trib',
		header: ({ column }) => <DataTableColumnHeader column={column} title='CClassTrib' />,
		cell: ({ row }) => {
			const cl = row.original.classificacao;
			const valor = cl?.cd_class_trib || '-';
			const descricao = cl?.ds_class_trib_descr ?? null;
			return <CellWithTooltip value={valor} tooltip={descricao} />;
		},
	},
	{
		id: 'ds_class_trib_descr',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Classificação' />,
		cell: ({ row }) => {
			const classificacao = row.original.classificacao;
			const descricao = classificacao?.ds_class_trib_descr;
			return (
				<div className='max-w-[200px] truncate' title={descricao || '-'}>
					{descricao || '-'}
				</div>
			);
		},
	},
	{
		id: 'ds_anexo',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Anexo' />,
		cell: ({ row }) => {
			const cl = row.original.classificacao;
			if (!cl?.ds_anexo_numero) return '-';
			const valor = `${cl.ds_anexo_numero || ''} ${cl.ds_anexo_numero_item || ''}`.trim() || '-';
			const descricao = cl?.ds_anexo_descricao_full ?? null;
			return <CellWithTooltip value={valor} tooltip={descricao} />;
		},
	},
	{
		id: 'aliquota_reducao',
		header: ({ column }) => (
			<div className='text-center w-full'>
				<DataTableColumnHeader column={column} title='Alíquota / Redução' />
			</div>
		),
		cell: ({ row }) => {
			const cl = row.original.classificacao;
			if (!cl || !cl.aliquota_reducao) return <div className='text-center'>-</div>;

			const { status, label } = cl.aliquota_reducao;

			// Determinar badge conforme status
			let badgeVariant: 'secondary' | 'muted' | 'info' | 'success' | 'warning' = 'secondary';
			let badgeText = '';

			switch (status) {
				case 'SEM_REDUCAO':
					badgeVariant = 'muted';
					badgeText = 'Sem redução';
					break;
				case 'REDUCAO':
					badgeVariant = 'info';
					badgeText = 'REDUÇÃO';
					break;
				case 'ALIQUOTA_ZERO':
					badgeVariant = 'success';
					badgeText = 'ALÍQUOTA ZERO';
					break;
				case 'MISTA':
					badgeVariant = 'warning';
					badgeText = 'MISTA';
					break;
				case 'INCOMPLETA':
					badgeVariant = 'warning';
					badgeText = 'INCOMPLETA';
					break;
				default:
					badgeVariant = 'secondary';
					badgeText = status;
			}

			// Para SEM_REDUCAO, pode compactar o label
			const displayLabel = status === 'SEM_REDUCAO' ? 'Sem redução' : label;

			return (
				<div className='flex flex-col gap-1 items-center justify-center'>
					<div className='text-xs text-center'>{displayLabel}</div>
					<Badge variant={badgeVariant} className='w-fit text-[10px] leading-3'>
						{badgeText}
					</Badge>
				</div>
			);
		},
	},
	{
		id: 'fl_ncm_encontrado',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
		cell: ({ row }) => {
			const classificacao = row.original.classificacao;
			if (!classificacao) {
				return (
					<Badge variant='secondary' className='cursor-default'>
						Não sincronizado
					</Badge>
				);
			}
			return classificacao.fl_ncm_encontrado ? (
				<Badge variant='success' className='cursor-default'>
					NCM Encontrado
				</Badge>
			) : (
				<Badge variant='warning' className='cursor-default'>
					NCM Padrão
				</Badge>
			);
		},
	},
	{
		id: 'fl_confirmado_usuario',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Confirmação' />,
		cell: ({ row }) => {
			const cl = row.original.classificacao;
			const confirmado = cl?.fl_confirmado_usuario ?? false;
			return (
				<Badge variant={confirmado ? 'success' : 'warning'}>
					{confirmado ? 'Confirmado' : 'Pendente'}
				</Badge>
			);
		},
	},
];

export default function ClassificacaoProdutosPage() {
	const { state } = useCompanyContext();
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedTipoItem, setSelectedTipoItem] = useState<number[]>([]);
	const [selectedClassTrib, setSelectedClassTrib] = useState<string[]>([]);
	const [selectedFlNcmEncontrado, setSelectedFlNcmEncontrado] = useState<boolean[]>([]);
	const [selectedFlConfirmado, setSelectedFlConfirmado] = useState<boolean[]>([]);
	const [activeTab, setActiveTab] = useState<'status' | 'confirmacao' | 'tipoItem' | 'classTrib'>('status');
	const [sorting, setSorting] = useState<SortingState>([]);
	const [produtoSelecionado, setProdutoSelecionado] = useState<ClassificacaoProdutoData | null>(null);

	const filterTabs = [
		{ id: 'status', label: 'Status' },
		{ id: 'confirmacao', label: 'Confirmação' },
		{ id: 'tipoItem', label: 'Tipo' },
		{ id: 'classTrib', label: 'CClassTrib' },
	] as const;

	const [pageParameters, setPageParameters] = useState<{
		page: number;
		limit: number;
		search: string;
		status: string[];
		tipo_item: number[];
		cd_class_trib: string[];
		fl_ncm_encontrado?: boolean[];
		fl_confirmado_usuario?: boolean[];
		orderColumn?: string;
		orderBy?: 'asc' | 'desc';
	}>({
		page: 1,
		limit: 50,
		search: '',
		status: ['ATIVO', 'NOVO'],
		tipo_item: [],
		cd_class_trib: [],
		fl_ncm_encontrado: [],
		fl_confirmado_usuario: [],
		orderColumn: 'ds_nome',
		orderBy: 'asc',
	});

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

	useEffect(() => {
		setPageParameters((prev) => ({ ...prev, tipo_item: selectedTipoItem, page: 1 }));
	}, [selectedTipoItem]);

	useEffect(() => {
		setPageParameters((prev) => ({ ...prev, cd_class_trib: selectedClassTrib, page: 1 }));
	}, [selectedClassTrib]);

	useEffect(() => {
		setPageParameters((prev) => ({ ...prev, fl_ncm_encontrado: selectedFlNcmEncontrado, page: 1 }));
	}, [selectedFlNcmEncontrado]);

	useEffect(() => {
		setPageParameters((prev) => ({ ...prev, fl_confirmado_usuario: selectedFlConfirmado, page: 1 }));
	}, [selectedFlConfirmado]);

	const { data, isError, error, isFetching, refetch } = useQuery({
		queryKey: ['get-classificacao-produtos', pageParameters, state],
		queryFn: () => getClassificacaoProdutos(pageParameters),
		staleTime: 1000 * 60 * 5,
		placeholderData: keepPreviousData,
	});

	const handlePageChange = (newPage: number) => {
		setPageParameters((prev) => ({ ...prev, page: newPage }));
	};

	const opcoesClassTrib = data?.opcoesFiltro?.classTrib ?? [];
	const opcoesTipoItem = data?.opcoesFiltro?.tipoItem ?? [];

	// Função auxiliar para calcular valor de ordenação por intensidade do benefício
	const getBeneficioOrderValue = (aliquotaReducao: { status: string; cbs: number; ibsUf: number; ibsMun: number } | null | undefined): number => {
		if (!aliquotaReducao) return 999; // Sem classificação vai para o final

		const { status, cbs, ibsUf, ibsMun } = aliquotaReducao;
		const avgPercentual = (cbs + ibsUf + ibsMun) / 3;

		switch (status) {
			case 'ALIQUOTA_ZERO':
				return 0; // Primeiro
			case 'REDUCAO':
				return 100 - avgPercentual; // Maior % primeiro (ex: 60% = 40, 30% = 70)
			case 'MISTA':
				return 200; // Depois de reduções uniformes
			case 'INCOMPLETA':
				return 250; // Depois de mista
			case 'SEM_REDUCAO':
				return 300; // Por último
			default:
				return 999;
		}
	};

	// Filtra no frontend por busca textual (dados já vêm filtrados por status/CST/CClassTrib do backend)
	const filteredProdutos = useMemo(() => {
		if (!data?.data) return [];

		let filtered: ClassificacaoProdutoData[];

		if (!searchTerm.trim()) {
			filtered = data.data as ClassificacaoProdutoData[];
		} else {
			const searchLower = searchTerm.toLowerCase();
			filtered = (data.data as ClassificacaoProdutoData[]).filter((produto) => {
				// Busca padrão nos campos existentes
				const matchesStandardFields =
					produto.id_externo?.toLowerCase().includes(searchLower) ||
					produto.ds_nome?.toLowerCase().includes(searchLower) ||
					produto.cd_ncm?.toLowerCase().includes(searchLower) ||
					getTipoItemLabel(produto.ds_tipo_item).toLowerCase().includes(searchLower) ||
					produto.classificacao?.cd_cst?.toLowerCase().includes(searchLower) ||
					produto.classificacao?.cd_class_trib?.toLowerCase().includes(searchLower) ||
					produto.classificacao?.ds_class_trib_descr?.toLowerCase().includes(searchLower);

				// Busca na nova coluna aliquota_reducao
				const aliquotaReducao = produto.classificacao?.aliquota_reducao;
				const matchesAliquotaReducao =
					aliquotaReducao &&
					(aliquotaReducao.label?.toLowerCase().includes(searchLower) ||
						aliquotaReducao.status?.toLowerCase().includes(searchLower) ||
						// Busca por termos específicos
						(searchLower === 'zero' && aliquotaReducao.status === 'ALIQUOTA_ZERO') ||
						(searchLower === '100' &&
							aliquotaReducao.cbs === 100 &&
							aliquotaReducao.ibsUf === 100 &&
							aliquotaReducao.ibsMun === 100) ||
						(searchLower === '60' &&
							aliquotaReducao.cbs === 60 &&
							aliquotaReducao.ibsUf === 60 &&
							aliquotaReducao.ibsMun === 60) ||
						(searchLower === '30' &&
							aliquotaReducao.cbs === 30 &&
							aliquotaReducao.ibsUf === 30 &&
							aliquotaReducao.ibsMun === 30) ||
						(searchLower === 'mista' && aliquotaReducao.status === 'MISTA') ||
						(searchLower.includes('sem redução') && aliquotaReducao.status === 'SEM_REDUCAO'));

				return matchesStandardFields || matchesAliquotaReducao;
			});
		}

		// Aplicar ordenação customizada se a coluna aliquota_reducao estiver sendo ordenada
		if (sorting.length > 0) {
			const [{ id: orderColumn, desc }] = sorting;
			if (orderColumn === 'aliquota_reducao') {
				return [...filtered].sort((a, b) => {
					const orderA = getBeneficioOrderValue(a.classificacao?.aliquota_reducao);
					const orderB = getBeneficioOrderValue(b.classificacao?.aliquota_reducao);
					return desc ? orderB - orderA : orderA - orderB;
				});
			}
		}

		return filtered;
	}, [data?.data, searchTerm, sorting]);

	const columnsWithActions = useMemo(() => {
		return [
			...columns,
			{
				id: 'acoes',
				header: 'Ações',
				cell: ({ row }: { row: Row<ClassificacaoProdutoData> }) => (
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setProdutoSelecionado(row.original)}
						title="Definir CClassTrib"
					>
						<Edit className="h-4 w-4" />
					</Button>
				),
			},
		];
	}, []);

	if (isError) {
		toast.error(error?.message || 'Erro ao carregar os registros.');
	}

	return (
		<>
			<Head>
				<title>Classificação de Produtos | Esteira</title>
			</Head>
			<DashboardLayout
				title='Classificação de Produtos'
				description='Classificação tributária de produtos por NCM (Reforma Tributária).'
			>
				<div className='grid gap-6'>
					<div className='flex gap-2'>
						<div className='relative col-span-5 h-10 flex-1'>
							<SearchIcon className='absolute top-[45%] left-2 h-4 w-4 -translate-y-1/2 transform' />
							<Input
								placeholder='Pesquisar por nome, NCM, CST, classificação...'
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className='mr-2 pl-8'
							/>
						</div>
						<Button
							type='button'
							tooltip='Atualizar'
							variant='outline'
							size='icon'
							disabled={isFetching}
							onClick={() => {
								refetch().then(() => {
									toast.success('Lista atualizada.');
								});
							}}
						>
							<RefreshCw className={`h-4 w-4 ${isFetching && 'animate-spin'}`} />
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant='outline' size='icon' tooltip='Filtrar'>
									<ListFilter className='h-4 w-4' />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end' className='w-72 p-0'>
								{(() => {
									const cfg =
											activeTab === 'status'
												? {
														label: 'Filtrar Status',
														options: [true, false],
														selected: selectedFlNcmEncontrado,
														setSelected: setSelectedFlNcmEncontrado,
														displayOptions: [
															{ value: 'true', label: 'NCM Encontrado' },
															{ value: 'false', label: 'NCM Padrão' },
														],
														type: 'boolean' as const,
													}
												: activeTab === 'confirmacao'
													? {
															label: 'Filtrar Confirmação',
															options: [true, false],
															selected: selectedFlConfirmado,
															setSelected: setSelectedFlConfirmado,
															displayOptions: [
																{ value: 'true', label: 'Confirmado' },
																{ value: 'false', label: 'Pendente' },
															],
															type: 'boolean' as const,
														}
													: activeTab === 'tipoItem'
														? {
																label: 'Filtrar Tipo de item',
																options: opcoesTipoItem,
																selected: selectedTipoItem,
																setSelected: setSelectedTipoItem,
																displayOptions: opcoesTipoItem.map((n) => ({ value: String(n), label: getTipoItemLabel(n) })),
																type: 'number' as const,
															}
														: {
																label: 'Filtrar CClassTrib',
																options: opcoesClassTrib,
																selected: selectedClassTrib,
																setSelected: setSelectedClassTrib,
																displayOptions: opcoesClassTrib.map((c) => ({ value: c, label: c })),
																type: 'string' as const,
															};

									const selectAll = () => {
										if (activeTab === 'status') {
											setSelectedFlNcmEncontrado([...cfg.options as boolean[]]);
										} else if (activeTab === 'confirmacao') {
											setSelectedFlConfirmado([...cfg.options as boolean[]]);
										} else if (activeTab === 'tipoItem') {
											setSelectedTipoItem([...cfg.options as number[]]);
										} else {
											setSelectedClassTrib([...cfg.options as string[]]);
										}
									};
									const clearAll = () => {
										setSelectedTipoItem([]);
										setSelectedClassTrib([]);
										setSelectedFlNcmEncontrado([]);
										setSelectedFlConfirmado([]);
									};

									return (
										<div className='flex flex-col overflow-hidden'>
											<Tabs
												value={activeTab}
												onValueChange={(value) => {
													const tabValue = value as typeof activeTab;
													setActiveTab(tabValue);
												}}
												className='w-full relative z-10'
											>
											<TabsList className='w-full h-auto p-0 bg-transparent border-b rounded-none overflow-x-auto overflow-y-visible relative z-10'>
											<div className='flex min-w-max'>
												{filterTabs.map((tab) => (
												<TabsTrigger
													key={tab.id}
													value={tab.id}
													onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													}}
													className='px-3 py-2 text-xs whitespace-nowrap border-0 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-0 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:font-medium relative z-10'
												>
													{tab.label}
												</TabsTrigger>
												))}
											</div>
											</TabsList>
											</Tabs>
											<div className='p-2 relative z-0'>
												<DropdownMenuLabel>{cfg.label}</DropdownMenuLabel>
												<DropdownMenuSeparator />
												<div className='max-h-64 overflow-auto pr-1'>
													{cfg.displayOptions?.length === 0 ? (
														<p className='text-muted-foreground px-2 py-4 text-sm'>Nenhuma opção disponível.</p>
													) : (
														cfg.displayOptions?.map((opt) => {
															const isTipoItem = activeTab === 'tipoItem';
															const isBoolean = cfg.type === 'boolean';
															const optValNum = Number(opt.value);
															const optValBool = opt.value === 'true';
															
															let isChecked = false;
															if (isTipoItem) {
																isChecked = selectedTipoItem.includes(optValNum);
															} else if (isBoolean) {
																if (activeTab === 'status') {
																	isChecked = selectedFlNcmEncontrado.includes(optValBool);
																} else {
																	isChecked = selectedFlConfirmado.includes(optValBool);
																}
															} else {
																isChecked = selectedClassTrib.includes(opt.value);
															}
															
															return (
																<DropdownMenuItem
																	key={`${activeTab}-${opt.value}`}
																	onSelect={(e) => e.preventDefault()}
																	className='flex items-center gap-2'
																>
																	<Checkbox
																		checked={isChecked}
																		onCheckedChange={(checked) => {
																			if (isTipoItem) {
																				setSelectedTipoItem((prev) =>
																					checked ? [...prev, optValNum] : prev.filter((s) => s !== optValNum),
																				);
																			} else if (isBoolean) {
																				if (activeTab === 'status') {
																					setSelectedFlNcmEncontrado((prev) =>
																						checked ? [...prev, optValBool] : prev.filter((s) => s !== optValBool),
																					);
																				} else {
																					setSelectedFlConfirmado((prev) =>
																						checked ? [...prev, optValBool] : prev.filter((s) => s !== optValBool),
																					);
																				}
																			} else {
																				setSelectedClassTrib((prev) =>
																					checked ? [...prev, opt.value] : prev.filter((s) => s !== opt.value),
																				);
																			}
																		}}
																	/>
																	<span>{opt.label}</span>
																</DropdownMenuItem>
															);
														})
													)}
												</div>
												<DropdownMenuSeparator />
												<DropdownMenuItem onSelect={(e) => { e.preventDefault(); selectAll(); }} className='hover:cursor-pointer'>
													Selecionar todos
												</DropdownMenuItem>
												<DropdownMenuItem onSelect={(e) => { e.preventDefault(); clearAll(); }} className='text-red-600 hover:bg-red-100'>
													Limpar todos os filtros
												</DropdownMenuItem>
											</div>
										</div>
									);
								})()}
							</DropdownMenuContent>
						</DropdownMenu>
						<HandleSyncClassificacaoProdutos />
					</div>
					{filteredProdutos?.length === 0 ? (
						<EmptyState label='Nenhum produto encontrado. Sincronize os produtos para ver a classificação tributária.' />
					) : (
						<>
							<DataTableDynamic
								pageParameters={{
									page: data?.page ?? 1,
								pageSize: data?.limit ?? pageParameters.limit,
								total: data?.total ?? 0,
								totalPages: data?.totalPages ?? 1,
							}}
							onPageChange={handlePageChange}
							onPageSizeChange={(newSize) => setPageParameters((prev) => ({ ...prev, limit: newSize, page: 1 }))}
							columns={columnsWithActions}
							data={filteredProdutos || []}
							sorting={sorting}
							onSortingChange={setSorting}
						/>
						{produtoSelecionado && (
							<SheetDefinirCClassTrib
								produto={produtoSelecionado}
								open={!!produtoSelecionado}
								onOpenChange={(open) => !open && setProdutoSelecionado(null)}
							/>
						)}
					</>
					)}
					{data?.total && (
						<div className='text-muted-foreground text-sm'>
							Total de {data.total} produto(s) encontrado(s).
						</div>
					)}
				</div>
			</DashboardLayout>
		</>
	);
}
