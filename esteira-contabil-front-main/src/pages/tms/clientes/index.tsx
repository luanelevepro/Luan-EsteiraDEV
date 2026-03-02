import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { RefreshCw, SearchIcon, Plus, Edit, Trash2, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTableDynamic, type DataTableRef } from '@/components/ui/data-table-dynamic';
import EmptyState from '@/components/states/empty-state';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { getClientesPaginado, createCliente, updateCliente, deleteCliente } from '@/services/api/tms/tms';
import { getCidades } from '@/services/api/sistema';
import { useCompanyContext } from '@/context/company-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export interface ClienteData {
	id: string;
	dt_created: string;
	dt_updated: string;
	ds_nome: string;
	id_empresa: string;
	id_cidade: number;
	sis_cidades?: {
		id: number;
		ds_city: string;
		js_uf: {
			id: number;
			ds_uf: string;
			ds_state: string;
		};
	};
}

interface CidadeOption {
	id: number;
	label: string;
	ds_city: string;
	ds_uf: string;
}

export default function TMSClientesPage() {
	const { state } = useCompanyContext();
	const tableRef = useRef<DataTableRef<ClienteData>>(null);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [pageParameters, setPageParameters] = useState<{
		page: number;
		pageSize: number;
		orderBy: string;
		orderColumn: string;
		search: string;
	}>({
		page: 1,
		pageSize: 10,
		orderBy: 'asc',
		orderColumn: 'ds_nome',
		search: '',
	});
	const queryClient = useQueryClient();

	// Estados para modal de criação/edição
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingCliente, setEditingCliente] = useState<ClienteData | null>(null);
	const [formData, setFormData] = useState({ ds_nome: '', id_cidade: 0 });
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [cidadeSearch, setCidadeSearch] = useState('');

	// Buscar cidades para o select
	const { data: cidadesData, isLoading: loadingCidades } = useQuery({
		queryKey: ['get-cidades-clientes', cidadeSearch],
		queryFn: () => getCidades({ page: 1, pageSize: 7000, search: cidadeSearch, orderBy: 'asc', orderColumn: 'ds_city' }),
		staleTime: 1000 * 60 * 5, // 5 minutos
		enabled: isModalOpen,
	});

	const cidadesOptions: CidadeOption[] = React.useMemo(() => {
		if (!cidadesData?.cities) return [];
		return cidadesData.cities.map((city) => ({
			id: city.id,
			label: `${city.ds_city} - ${city.js_uf.ds_uf}`,
			ds_city: city.ds_city,
			ds_uf: city.js_uf.ds_uf,
		}));
	}, [cidadesData]);

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
		queryKey: ['get-clientes-paginado', pageParameters, state],
		queryFn: () => getClientesPaginado(pageParameters),
		staleTime: 1000 * 60 * 5,
		placeholderData: keepPreviousData,
	});

	async function handleCreateCliente() {
		if (!formData.ds_nome.trim()) {
			toast.error('Nome do cliente é obrigatório.');
			return;
		}

		if (!formData.id_cidade || formData.id_cidade === 0) {
			toast.error('Cidade é obrigatória.');
			return;
		}

		setIsSubmitting(true);

		try {
			await createCliente({
				ds_nome: formData.ds_nome,
				id_cidade: formData.id_cidade,
			});
			await queryClient.invalidateQueries({ queryKey: ['get-clientes-paginado'] });
			await refetch();
			setIsModalOpen(false);
			setFormData({ ds_nome: '', id_cidade: 0 });
			setCidadeSearch('');
			toast.success('Cliente criado com sucesso.');
		} catch (error) {
			toast.error(`Erro ao criar cliente: ${error instanceof Error ? error.message : error}`);
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleOpenEditModal(cliente: ClienteData) {
		setEditingCliente(cliente);
		setFormData({
			ds_nome: cliente.ds_nome,
			id_cidade: cliente.id_cidade,
		});
		if (cliente.sis_cidades) {
			setCidadeSearch(cliente.sis_cidades.ds_city);
		}
		setIsModalOpen(true);
	}

	async function handleUpdateCliente() {
		if (!formData.ds_nome.trim()) {
			toast.error('Nome do cliente é obrigatório.');
			return;
		}

		if (!formData.id_cidade || formData.id_cidade === 0) {
			toast.error('Cidade é obrigatória.');
			return;
		}

		if (!editingCliente) return;

		setIsSubmitting(true);

		try {
			await updateCliente(editingCliente.id, {
				ds_nome: formData.ds_nome,
				id_cidade: formData.id_cidade,
			});
			await queryClient.invalidateQueries({ queryKey: ['get-clientes-paginado'] });
			await refetch();
			setIsModalOpen(false);
			setFormData({ ds_nome: '', id_cidade: 0 });
			setEditingCliente(null);
			setCidadeSearch('');
			toast.success('Cliente atualizado com sucesso.');
		} catch (error) {
			toast.error(`Erro ao atualizar cliente: ${error instanceof Error ? error.message : error}`);
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleOpenDeleteModal(cliente: ClienteData) {
		toast.promise(
			deleteCliente(cliente.id).then(async () => {
				await queryClient.invalidateQueries({ queryKey: ['get-clientes-paginado'] });
				await refetch();
			}),
			{
				loading: 'Deletando cliente...',
				success: () => 'Cliente deletado com sucesso.',
				error: (error) => `Erro ao deletar cliente: ${error.message || error}`,
			},
		);
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
		setEditingCliente(null);
		setFormData({ ds_nome: '', id_cidade: 0 });
		setCidadeSearch('');
	};

	// Colunas da tabela
	const columns: ColumnDef<ClienteData>[] = [
		{
			accessorKey: 'ds_nome',
			header: ({ column }) => <DataTableColumnHeader column={column} title='Nome do Cliente' />,
			cell: ({ row }) => {
				const nome = row.getValue('ds_nome') as string;
				return <span className='font-semibold'>{nome}</span>;
			},
		},
		{
			accessorKey: 'sis_cidades',
			header: ({ column }) => <DataTableColumnHeader column={column} title='Cidade' />,
			cell: ({ row }) => {
				const cidade = row.original.sis_cidades;
				if (!cidade) return <span className='text-gray-400'>-</span>;
				return (
					<div className='flex items-center gap-2'>
						<MapPin className='h-4 w-4 text-gray-400' />
						<span>
							{cidade.ds_city} - {cidade.js_uf.ds_uf}
						</span>
					</div>
				);
			},
		},
		{
			accessorKey: 'dt_created',
			header: ({ column }) => <DataTableColumnHeader column={column} title='Data de Criação' />,
			cell: ({ row }) => {
				const date = new Date(row.getValue('dt_created'));
				return <span className='text-sm text-gray-600'>{date.toLocaleDateString('pt-BR')}</span>;
			},
		},
		{
			id: 'actions',
			cell: ({ row }) => (
				<div className='flex justify-end gap-2'>
					<Button variant='ghost' size='sm' tooltip='Editar' onClick={() => handleOpenEditModal(row.original)}>
						<Edit className='h-4 w-4' />
					</Button>
					<Button
						variant='ghost'
						size='sm'
						tooltip='Deletar'
						onClick={() => handleOpenDeleteModal(row.original)}
						className='text-red-600 hover:bg-red-100 hover:text-red-700'
					>
						<Trash2 className='h-4 w-4' />
					</Button>
				</div>
			),
		},
	];

	return (
		<>
			<Head>
				<title>Clientes | Esteira</title>
			</Head>
			<DashboardLayout title='Clientes' description='Gerenciamento de clientes do módulo TMS.'>
				<div className='grid gap-6'>
					<div className='flex gap-2'>
						<div className='relative col-span-5 h-10 flex-1'>
							<SearchIcon className='absolute top-[45%] left-2 h-4 w-4 -translate-y-1/2 transform' />
							<Input
								placeholder='Pesquisar por nome do cliente...'
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
									setPageParameters((prev) => ({ ...prev, search: e.target.value, page: 1 }));
								}}
								className='mr-2 pl-8'
							/>
						</div>
						<Button tooltip='Atualizar' variant='outline' size='icon' disabled={isFetching} onClick={() => refetch()}>
							<RefreshCw className={`h-4 w-4 ${isFetching && 'animate-spin'}`} />
						</Button>
						<Button
							variant='default'
							onClick={() => {
								setEditingCliente(null);
								setFormData({ ds_nome: '', id_cidade: 0 });
								setCidadeSearch('');
								setIsModalOpen(true);
							}}
							className='gap-2'
						>
							<Plus className='h-4 w-4' />
							Novo Cliente
						</Button>
					</div>
					{!isFetching && data?.clientes?.length === 0 && <EmptyState label='Nenhum cliente encontrado.' />}

					{(isFetching || (data?.clientes?.length ?? 0) > 0) && (
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
							data={data?.clientes || []}
							sorting={sorting}
							onSortingChange={setSorting}
							allIds={data?.allIds}
						/>
					)}
				</div>
			</DashboardLayout>

			{/* Modal de Criação/Edição */}
			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className='sm:max-w-[500px]'>
					<DialogHeader>
						<DialogTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
						<DialogDescription>
							{editingCliente ? 'Atualize as informações do cliente.' : 'Cadastre um novo cliente vinculando-o a uma cidade.'}
						</DialogDescription>
					</DialogHeader>
					<div className='grid gap-4 py-4'>
						<div className='grid grid-cols-4 items-center gap-4'>
							<Label htmlFor='nome' className='text-right'>
								Nome <span className='text-red-500'>*</span>
							</Label>
							<Input
								id='nome'
								placeholder='Nome do cliente'
								value={formData.ds_nome}
								onChange={(e) => setFormData({ ...formData, ds_nome: e.target.value })}
								className='col-span-3'
								autoFocus
							/>
						</div>
						<div className='grid grid-cols-4 items-start gap-4'>
							<Label htmlFor='cidade' className='pt-2 text-right'>
								Cidade <span className='text-red-500'>*</span>
							</Label>
							<div className='col-span-3 space-y-2'>
								<Input
									id='cidade-search'
									placeholder='Buscar cidade...'
									value={cidadeSearch}
									onChange={(e) => setCidadeSearch(e.target.value)}
									className='w-full'
								/>
								<div className='max-h-48 overflow-y-auto rounded-md border border-gray-200'>
									{loadingCidades && (
										<div className='p-4 text-center text-sm text-gray-500'>
											<Loader2 className='mx-auto h-4 w-4 animate-spin' />
										</div>
									)}
									{!loadingCidades && cidadesOptions.length === 0 && (
										<div className='p-4 text-center text-sm text-gray-500'>Nenhuma cidade encontrada</div>
									)}
									{!loadingCidades &&
										cidadesOptions.map((cidade) => (
											<button
												key={cidade.id}
												type='button'
												onClick={() => {
													setFormData({ ...formData, id_cidade: cidade.id });
													setCidadeSearch(cidade.label);
												}}
												className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${
													formData.id_cidade === cidade.id ? 'bg-blue-50 font-semibold text-blue-700' : ''
												}`}
											>
												<div className='flex items-center gap-2'>
													<MapPin className='h-4 w-4 text-gray-400' />
													{cidade.label}
												</div>
											</button>
										))}
								</div>
								{formData.id_cidade > 0 && (
									<div className='text-xs text-green-600'>
										✓ Cidade selecionada: {cidadesOptions.find((c) => c.id === formData.id_cidade)?.label}
									</div>
								)}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={handleCloseModal} disabled={isSubmitting}>
							Cancelar
						</Button>
						<Button onClick={editingCliente ? handleUpdateCliente : handleCreateCliente} disabled={isSubmitting} className='gap-2'>
							{isSubmitting && <Loader2 className='h-4 w-4 animate-spin' />}
							{editingCliente ? 'Atualizar' : 'Criar'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
