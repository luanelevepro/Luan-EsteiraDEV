import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Plus, RefreshCw, SearchIcon, Truck, ListFilter, ToggleRight, ToggleLeft, Loader2, CloudDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTableDynamic, type DataTableRef } from '@/components/ui/data-table-dynamic';
import EmptyState from '@/components/states/empty-state';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { getMotoristasPaginado, createMotorista, updateMotorista, sincronizarMotoristas } from '@/services/api/tms/tms';
import type { Motorista } from '@/services/api/tms/motoristas';
import { useCompanyContext } from '@/context/company-context';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ModalLinkVeiculoMotorista from '@/components/general/tms/modal-link-veiculo-motorista';
import { Label } from '@/components/ui/label';

type MotoristaRow = Motorista;

export default function TmsMotoristasPage() {
	const { state } = useCompanyContext();
	const tableRef = useRef<DataTableRef<MotoristaRow>>(null);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [pageParameters, setPageParameters] = useState({
		page: 1,
		pageSize: 10,
		orderBy: 'asc',
		orderColumn: 'dt_created',
		search: '',
		status: [] as string[],
	});
	const queryClient = useQueryClient();
	const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
	const statusOptions = ['ATIVO', 'INATIVO'];
	const [activeTab, setActiveTab] = useState<'status'>('status');

	// Modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
	const [selectedMotoristaForLink, setSelectedMotoristaForLink] = useState<Motorista | null>(null);
	const [formData, setFormData] = useState({ ds_nome: '', ds_documento: '', ds_salario: '' });
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [processingIds, setProcessingIds] = useState<string[]>([]);
	const [isSyncing, setIsSyncing] = useState(false);

	// Formatação dinâmica de documento (CPF / CNPJ)
	function formatCPF(value: string) {
		const v = value.replace(/\D/g, '').slice(0, 11);
		return v
			.replace(/(\d{3})(\d)/, '$1.$2')
			.replace(/(\d{3})(\d)/, '$1.$2')
			.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
	}

	function formatCNPJ(value: string) {
		const v = value.replace(/\D/g, '').slice(0, 14);
		return v
			.replace(/(\d{2})(\d)/, '$1.$2')
			.replace(/(\d{3})(\d)/, '$1.$2')
			.replace(/(\d{3})(\d)/, '$1/$2')
			.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
	}

	function handleDocumentChange(raw: string) {
		const digits = raw.replace(/\D/g, '');
		if (digits.length > 11) {
			setFormData((prev) => ({ ...prev, ds_documento: formatCNPJ(raw) }));
		} else {
			setFormData((prev) => ({ ...prev, ds_documento: formatCPF(raw) }));
		}
	}

	// Formatação dinâmica de salário (máscara BRL)
	function formatCurrencyFromDigits(digits: string) {
		if (!digits) return '';
		const cents = parseInt(digits, 10) || 0;
		const value = cents / 100;
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
	}

	function handleSalaryChange(raw: string) {
		const digits = raw.replace(/\D/g, '').slice(0, 12); // limita até bilhões em centavos
		setFormData((prev) => ({ ...prev, ds_salario: formatCurrencyFromDigits(digits) }));
	}

	useEffect(() => {
		setPageParameters((prev) => ({ ...prev, status: selectedStatus }));
	}, [selectedStatus]);

	useEffect(() => {
		if (sorting.length === 0) return;
		const [{ id: orderColumn, desc }] = sorting;
		setPageParameters((prev) => ({ ...prev, orderColumn, orderBy: desc ? 'desc' : 'asc', page: 1 }));
	}, [sorting]);

	const { data, isError, error, isFetching, refetch } = useQuery({
		queryKey: ['get-motoristas-paginado', pageParameters, state],
		queryFn: () => getMotoristasPaginado(pageParameters),
		staleTime: 1000 * 60 * 5,
		placeholderData: keepPreviousData,
	});

	async function handleSincronizar() {
		setIsSyncing(true);
		try {
			await sincronizarMotoristas();
			toast.success('Motoristas sincronizados com RH/Funcionários.');
			await refetch();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Erro ao sincronizar motoristas.');
		} finally {
			setIsSyncing(false);
		}
	}

	async function handleCreateMotorista() {
		if (!formData.ds_nome.trim()) {
			toast.error('Nome é obrigatório.');
			return;
		}
		if (!formData.ds_documento.trim()) {
			toast.error('Documento é obrigatório.');
			return;
		}
		if (!formData.ds_salario.trim()) {
			toast.error('Salário é obrigatório.');
			return;
		}

		setIsSubmitting(true);

		// Normaliza salário: pega apenas dígitos e converte para número com 2 casas decimais (cents)
		const salaryDigits = formData.ds_salario.replace(/\D/g, '');
		const normalizedSalary = salaryDigits ? (parseInt(salaryDigits, 10) / 100).toFixed(2) : '0.00';

		const payload = {
			is_ativo: true,
			funcionario: {
				ds_nome: formData.ds_nome,
				ds_documento: formData.ds_documento.replace(/\D/g, ''),
				ds_salario: normalizedSalary,
				ds_tipo_vinculo: 'TERCEIRIZADO',
			},
		};

		try {
			await createMotorista(payload);
			await queryClient.invalidateQueries({ queryKey: ['get-motoristas-paginado'] });
			await refetch();
			setIsModalOpen(false);
			setFormData({ ds_nome: '', ds_documento: '', ds_salario: '' });
			toast.success('Motorista criado com sucesso.');
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`Erro ao criar motorista: ${message}`);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleToggleActive(motorista: MotoristaRow) {
		const toastId = toast.loading(`${motorista.is_ativo ? 'Inativando' : 'Ativando'} motorista...`);
		setProcessingIds((s) => [...s, motorista.id]);

		try {
			await updateMotorista(motorista.id, { is_ativo: !motorista.is_ativo });
			await queryClient.invalidateQueries({ queryKey: ['get-motoristas-paginado'] });
			await refetch();
			toast.success(
				`Motorista ${motorista.rh_funcionarios?.ds_nome || ''} ${motorista.is_ativo ? 'inativado' : 'ativado'} com sucesso.`,
				{ id: toastId },
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`Erro ao atualizar status: ${message}`, { id: toastId });
		} finally {
			setProcessingIds((s) => s.filter((id) => id !== motorista.id));
		}
	}

	if (isError) {
		toast.error(error?.message || 'Erro ao carregar os registros.');
	}

	const handlePageChange = (newPage: number) => {
		if (newPage < 1) return;
		setPageParameters((prev) => ({ ...prev, page: newPage }));
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		setFormData({ ds_nome: '', ds_documento: '', ds_salario: '' });
	};

	const handleCloseLinkModal = () => {
		setIsLinkModalOpen(false);
		setSelectedMotoristaForLink(null);
	};

	const columns: ColumnDef<MotoristaRow>[] = [
		{
			id: 'select',
			header: ({ table }) => (
				<Checkbox
					checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label='Select all'
				/>
			),
			cell: ({ row }) => (
				<Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label='Select row' />
			),
		},
		{
			accessorFn: (row) => row.rh_funcionarios?.ds_nome || '',
			id: 'ds_nome',
			header: ({ column }) => <DataTableColumnHeader column={column} title='Nome' />,
		},
		{
			accessorFn: (row) => row.rh_funcionarios?.ds_documento || '',
			id: 'ds_documento',
			header: ({ column }) => <DataTableColumnHeader column={column} title='Documento' />,
			cell: ({ row }) => <span className='font-mono'>{row.getValue('ds_documento')}</span>,
		},
		{
			accessorKey: 'is_ativo',
			header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
			cell: ({ row }) => {
				const value = row.getValue('is_ativo');
				const formattedValue = value ? 'Ativo' : 'Inativo';
				const variant = value ? 'success' : 'danger';
				return (
					<Badge variant={variant} className='cursor-default'>
						{formattedValue}
					</Badge>
				);
			},
		},
		{
			id: 'ds_tipo_vinculo',
			accessorFn: (row) => row.rh_funcionarios?.ds_tipo_vinculo ?? '',
			header: ({ column }) => <DataTableColumnHeader column={column} title='Terceirizado?' />,
			cell: ({ row }) => {
				const rawFromGet = String(row.getValue('ds_tipo_vinculo') ?? '');
				const rawFromObj = String(row.original?.rh_funcionarios?.ds_tipo_vinculo ?? '');
				const raw = (rawFromGet || rawFromObj || '').toString();
				const value = raw.trim().toUpperCase();
				const isTerceirizado = value === 'TERCEIRIZADO';
				const formattedValue = isTerceirizado ? 'Sim' : 'Não';
				const variant = isTerceirizado ? 'warning' : 'outline';
				if (raw && !isTerceirizado) {
					console.debug(`Motorista ${row.original?.id} -> ds_tipo_vinculo raw:`, raw);
				}
				return (
					<Badge variant={variant} className='cursor-default'>
						{formattedValue}
					</Badge>
				);
			},
			enableSorting: false,
		},
		{
			id: 'actions',
			cell: ({ row }) => (
				<div className='flex justify-end gap-2'>
					<Button
						variant='ghost'
						size='sm'
						tooltip='Vincular veículo'
						onClick={() => {
							// Pass the entire row object so modal can pre-select linked vehicle if present
							setSelectedMotoristaForLink(row.original);
							setIsLinkModalOpen(true);
						}}
						className='text-blue-600 hover:bg-blue-100 hover:text-blue-700'
					>
						<Truck className='h-4 w-4' />
					</Button>

					<Button
						variant='ghost'
						size='sm'
						tooltip={row.original.is_ativo ? 'Inativar' : 'Ativar'}
						onClick={() => handleToggleActive(row.original)}
						disabled={processingIds.includes(row.original.id)}
						className={
							row.original.is_ativo
								? 'text-green-600 hover:bg-green-100 hover:text-green-700'
								: 'text-red-600 hover:bg-red-100 hover:text-red-700'
						}
					>
						{processingIds.includes(row.original.id) ? (
							<Loader2 className='h-4 w-4 animate-spin' />
						) : row.original.is_ativo ? (
							<ToggleRight className='h-4 w-4' />
						) : (
							<ToggleLeft className='h-4 w-4' />
						)}
					</Button>
				</div>
			),
		},
	];

	return (
		<>
			<Head>
				<title>Motoristas | Esteira</title>
			</Head>
			<DashboardLayout title='Motoristas' description='Gerenciamento de motoristas.'>
				<div className='grid gap-6'>
					<div className='flex w-full items-center gap-2'>
						<div className='relative h-10 min-w-0 max-w-md flex-1'>
							<SearchIcon className='absolute top-[45%] left-2 h-4 w-4 -translate-y-1/2 transform' />
							<Input
								placeholder='Pesquisar por nome ou documento...'
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
									setPageParameters((prev) => ({ ...prev, search: e.target.value, page: 1 }));
								}}
								className='mr-2 pl-8'
							/>
						</div>
						<div className='ml-auto flex shrink-0 items-center gap-2'>
							<Button
								tooltip='Sincronizar com RH/Funcionários (inclui novos motoristas configurados)'
								variant='outline'
								size='sm'
								className='gap-2'
								disabled={isFetching || isSyncing}
								onClick={handleSincronizar}
							>
								<CloudDownload className={`h-4 w-4 shrink-0 ${isSyncing ? 'animate-pulse' : ''}`} />
								{isSyncing ? 'Sincronizando…' : 'Sincronizar'}
							</Button>
							<Button tooltip='Atualizar' variant='outline' size='icon' disabled={isFetching} onClick={() => refetch()}>
								<RefreshCw className={`h-4 w-4 ${isFetching && 'animate-spin'}`} />
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant='outline' size='icon' tooltip='Filtrar'>
										<ListFilter className='h-4 w-4' />
									</Button>
								</DropdownMenuTrigger>

								<DropdownMenuContent align='end' className='w-64 p-0'>
									<div className='flex flex-col'>
										<div className='flex border-b'>
										<button
											type='button'
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setActiveTab('status');
											}}
											className={`flex-1 px-3 py-2 text-sm ${
												activeTab === 'status' ? 'border-b-2 font-medium' : 'text-muted-foreground'
											}`}
										>
											Status
											</button>
										</div>

										<div className='p-2'>
											<DropdownMenuLabel>Filtrar Status</DropdownMenuLabel>
											<DropdownMenuSeparator />

											<div className='max-h-64 overflow-auto pr-1'>
											{statusOptions.map((opt: string) => (
												<DropdownMenuItem
													key={`status-${opt}`}
													onSelect={(e) => e.preventDefault()}
													className='flex items-center gap-2'
												>
													<Checkbox
														checked={selectedStatus.includes(opt)}
														onCheckedChange={(checked) => {
															setSelectedStatus((prev: string[]) =>
																checked ? [...prev, opt] : prev.filter((s) => s !== opt),
															);
															const currentFilters = (pageParameters['status'] || []) as string[];
															const next = checked
																? [...currentFilters, opt]
																: currentFilters.filter((s: string) => s !== opt);
															setPageParameters((prev) => ({ ...prev, status: next, page: 1 }));
														}}
													/>
													<span>{opt.replace(/_/g, ' ')}</span>
												</DropdownMenuItem>
											))}
											</div>
											<DropdownMenuSeparator />

											<DropdownMenuItem
												onSelect={(e) => {
													e.preventDefault();
													setSelectedStatus([...statusOptions]);
													setPageParameters((prev) => ({ ...prev, status: [...statusOptions], page: 1 }));
												}}
												className='hover:cursor-pointer'
											>
												Selecionar todos
											</DropdownMenuItem>
											<DropdownMenuItem
												onSelect={(e) => {
													e.preventDefault();
													setSelectedStatus([]);
													setPageParameters((prev) => ({ ...prev, status: [], page: 1 }));
												}}
												className='text-red-600 hover:bg-red-100'
											>
												Limpar todos os filtros
											</DropdownMenuItem>
										</div>
									</div>
								</DropdownMenuContent>
							</DropdownMenu>
							<Button
								variant='default'
								onClick={() => {
									setFormData({ ds_nome: '', ds_documento: '', ds_salario: '' });
									setIsModalOpen(true);
								}}
								className='gap-2'
							>
								<Plus className='h-4 w-4' />
								Novo Motorista
							</Button>
						</div>
					</div>

					{!isFetching && data?.motoristas?.length === 0 && <EmptyState label='Nenhum motorista encontrado.' />}

					{(isFetching || (data?.motoristas?.length ?? 0) > 0) && (
						<DataTableDynamic
							pageParameters={{
								page: pageParameters.page,
								pageSize: pageParameters.pageSize,
								total: data?.total || 0,
								totalPages: data?.totalPages || 1,
							}}
							onPageChange={handlePageChange}
							onPageSizeChange={(newSize) => setPageParameters((prev) => ({ ...prev, pageSize: newSize, page: 1 }))}
							ref={tableRef}
							columns={columns}
							data={data?.motoristas || []}
							sorting={sorting}
							onSortingChange={setSorting}
							allIds={data?.allIds}
						/>
					)}
				</div>
			</DashboardLayout>

			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className='sm:max-w-[480px]'>
					<DialogHeader>
						<DialogTitle>Criar motorista terceirizado</DialogTitle>
						<DialogDescription>Crie um motorista terceirizado.</DialogDescription>
					</DialogHeader>

					<div className='grid gap-4 py-4'>
						<div className='grid grid-cols-4 items-center gap-4'>
							<Label htmlFor='nome' className='text-right'>
								Nome
							</Label>
							<Input
								id='nome'
								placeholder='Nome do motorista'
								value={formData.ds_nome}
								onChange={(e) => setFormData({ ...formData, ds_nome: e.target.value })}
								className='col-span-3'
								autoFocus
							/>
						</div>

						<div className='grid grid-cols-4 items-center gap-4'>
							<Label htmlFor='documento' className='text-right'>
								Documento
							</Label>
							<Input
								id='documento'
								placeholder='CPF ou CNPJ'
								value={formData.ds_documento}
								onChange={(e) => handleDocumentChange(e.target.value)}
								className='col-span-3'
							/>
						</div>

						<div className='grid grid-cols-4 items-center gap-4'>
							<Label htmlFor='salario' className='text-right'>
								Salário
							</Label>
							<Input
								id='salario'
								placeholder='R$ 0,00'
								value={formData.ds_salario}
								onChange={(e) => handleSalaryChange(e.target.value)}
								className='col-span-3'
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant='outline' onClick={handleCloseModal} disabled={isSubmitting}>
							Cancelar
						</Button>
						<Button onClick={handleCreateMotorista} disabled={isSubmitting} className='gap-2'>
							{isSubmitting ? 'Salvando...' : 'Criar'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Modal de vínculo veículo-motorista */}
			<ModalLinkVeiculoMotorista
				isOpen={isLinkModalOpen}
				onClose={handleCloseLinkModal}
				motorista={selectedMotoristaForLink}
				onLinked={async () => {
					await queryClient.invalidateQueries({ queryKey: ['get-motoristas-paginado'] });
					await refetch();
				}}
			/>
		</>
	);
}
