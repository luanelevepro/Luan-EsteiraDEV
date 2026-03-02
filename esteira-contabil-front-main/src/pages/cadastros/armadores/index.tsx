import React, { useMemo, useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Pencil, Plus, RefreshCw, SearchIcon, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/data-table';
import EmptyState from '@/components/states/empty-state';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/layout/icons';
import { createArmador, deleteArmador, getArmadores, updateArmador } from '@/services/api/tms/tms';

export interface ArmadorData {
	id: string;
	ds_nome: string;
}

const columns: ColumnDef<ArmadorData>[] = [
	{
		accessorKey: 'ds_nome',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Nome' />,
	},
	{
		id: 'actions',
		cell: ({ row }) => (
			<div className='flex justify-end'>
				<HandleInsert data={row.original}>
					<Button tooltip='Editar' variant='ghost' size='icon'>
						<Pencil />
					</Button>
				</HandleInsert>
				<HandleDelete data={row.original} />
			</div>
		),
	},
];

export default function CadastroArmadoresPage() {
	const [searchTerm, setSearchTerm] = useState('');

	const { data, isError, error, isFetching, refetch } = useQuery({
		queryKey: ['get-armadores'],
		queryFn: getArmadores,
		staleTime: 1000 * 60 * 5,
	});

	const filteredData = useMemo(() => {
		if (!data) return [];
		return data.filter((item: ArmadorData) =>
			item.ds_nome?.toLowerCase().includes(searchTerm.toLowerCase()),
		);
	}, [data, searchTerm]);

	if (isError) {
		toast.error((error as Error)?.message || 'Erro ao carregar armadores.');
	}

	return (
		<>
			<Head>
				<title>Armadores | Esteira</title>
			</Head>
			<DashboardLayout
				title='Armadores'
				description='Cadastro de armadores para operação de container (TMS).'
			>
				<div className='grid gap-6'>
					<div className='flex gap-2'>
						<div className='relative col-span-5 h-10 flex-1'>
							<SearchIcon className='absolute top-[45%] left-2 h-4 w-4 -translate-y-1/2 transform' />
							<Input
								placeholder='Pesquisar por nome...'
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className='mr-2 pl-8'
							/>
						</div>
						<Button
							tooltip='Atualizar'
							variant='outline'
							size='icon'
							disabled={isFetching}
							onClick={() => refetch()}
						>
							<RefreshCw className={`h-4 w-4 ${isFetching && 'animate-spin'}`} />
						</Button>
						<HandleInsert>
							<Button variant='outline' className='h-9 max-sm:w-9'>
								<Plus className='h-4 w-4 sm:hidden' />
								<p className='max-sm:hidden'>Adicionar</p>
							</Button>
						</HandleInsert>
					</div>
					{filteredData?.length === 0 ? (
						isFetching ? (
							<EmptyState label='Carregando...' />
						) : (
							<EmptyState label='Nenhum armador encontrado.' />
						)
					) : (
						<DataTable columns={columns} data={filteredData} />
					)}
				</div>
			</DashboardLayout>
		</>
	);
}

function HandleInsert({
	children,
	data,
}: {
	children: React.ReactNode;
	data?: ArmadorData;
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [dsNome, setDsNome] = useState(data?.ds_nome ?? '');
	const [errorMessage, setErrorMessage] = useState('');

	React.useEffect(() => {
		if (open) {
			setDsNome(data?.ds_nome ?? '');
			setErrorMessage('');
		}
	}, [open, data]);

	async function submit() {
		setErrorMessage('');
		const nome = dsNome.trim();
		if (!nome) {
			setErrorMessage('Nome é obrigatório.');
			return;
		}
		setIsLoading(true);
		try {
			if (data?.id) {
				await updateArmador(data.id, { ds_nome: nome });
			} else {
				await createArmador({ ds_nome: nome });
			}
			await queryClient.invalidateQueries({ queryKey: ['get-armadores'] });
			toast.success('Salvo com sucesso.');
			setOpen(false);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setErrorMessage(msg);
			toast.error('Erro ao salvar.');
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>{data?.id ? 'Editar' : 'Adicionar'} Armador</DialogTitle>
					<DialogDescription>
						Preencha o nome do armador para operação de container.
					</DialogDescription>
				</DialogHeader>
				<div className='grid gap-4'>
					<div className='grid gap-2'>
						<Label htmlFor='ds_nome'>Nome *</Label>
						<Input
							id='ds_nome'
							value={dsNome}
							onChange={(e) => setDsNome(e.target.value)}
							placeholder='Ex.: Maersk, MSC'
							disabled={isLoading}
						/>
					</div>
					{errorMessage && (
						<p className='text-sm text-red-600' role='alert'>
							{errorMessage}
						</p>
					)}
					<Button onClick={() => submit()} disabled={isLoading} className='w-full'>
						{isLoading ? 'Salvando...' : 'Salvar'}
						{isLoading && <Icons.spinner className='ml-2 h-4 w-4 animate-spin' />}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function HandleDelete({ data }: { data: ArmadorData }) {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const [loading, setLoading] = useState(false);

	async function handleDelete() {
		if (!data?.id) {
			toast.error('Erro ao excluir.');
			return;
		}
		setLoading(true);
		try {
			await deleteArmador(data.id);
			await queryClient.invalidateQueries({ queryKey: ['get-armadores'] });
			toast.success('Armador removido com sucesso.');
			setOpen(false);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			toast.error(msg || 'Erro ao excluir. O armador pode estar vinculado a carga(s).');
		} finally {
			setLoading(false);
			setOpen(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button tooltip='Excluir' variant='ghost' size='icon'>
					<Trash />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Excluir armador?</DialogTitle>
					<DialogDescription>
						Isso irá remover o armador <strong>{data.ds_nome}</strong>. Essa ação é
						irreversível. Não é possível excluir se estiver vinculado a carga(s) de
						container.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button disabled={loading} variant='outline'>
							Cancelar
						</Button>
					</DialogClose>
					<Button onClick={handleDelete} disabled={loading} variant='destructive'>
						Excluir
						{loading && <Icons.spinner className='ml-2 h-4 w-4 animate-spin' />}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
