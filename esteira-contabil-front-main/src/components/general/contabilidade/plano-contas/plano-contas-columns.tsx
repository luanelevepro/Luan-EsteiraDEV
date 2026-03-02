import { ColumnDef } from '@tanstack/react-table';
import { PlanoConta } from '@/pages/contabilidade/plano-contas';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Checkbox } from '@/components/ui/checkbox';
import { Droplets, HandCoins, Receipt, Tickets } from 'lucide-react';

export const columns: ColumnDef<PlanoConta>[] = [
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
		accessorKey: 'ds_classificacao_cta',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Classificação da Conta' />,
		cell: ({ row }) => {
			const codigo = row.getValue<string>('ds_classificacao_cta') || '';
			const nivel = codigo.length;
			const margemPx = (nivel - 1) * 8;
			return <div style={{ marginLeft: `${margemPx}px` }}>{codigo}</div>;
		},
	},
	{
		accessorKey: 'ds_nome_cta',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Nome da Conta' />,
		cell: ({ row }) => row.getValue('ds_nome_cta'),
	},
	{
		accessorKey: 'ds_tipo_cta',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Tipo da Conta' />,
		cell: ({ row }) => row.getValue('ds_tipo_cta'),
	},
	{
		accessorKey: 'ds_tipo_tms_despesa',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Tipo de Despesa' />,
		cell: ({ row }) => {
			const tipoDespesa = row.getValue<string>('ds_tipo_tms_despesa');

			const BadgeWrapper = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
				<span
					role='button'
					title={typeof children === 'string' ? String(children) : undefined}
					className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-2 py-0.5 text-sm font-semibold select-none ${className}`}
					onClick={() => {
						try {
							window.dispatchEvent(new CustomEvent('plano_tipo_filter', { detail: tipoDespesa }));
						} catch {
							// ignore
						}
					}}
				>
					{children}
				</span>
			);

			switch (tipoDespesa) {
				case 'ABASTECIMENTO':
					return (
						<BadgeWrapper className='border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300'>
							<Droplets className='h-4 w-4 text-blue-600 dark:text-blue-300' />
							<span>Abastecimento</span>
						</BadgeWrapper>
					);
				case 'ADIANTAMENTO':
					return (
						<BadgeWrapper className='border border-yellow-100 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'>
							<HandCoins className='h-4 w-4 text-yellow-600 dark:text-yellow-300' />
							<span>Adiantamento</span>
						</BadgeWrapper>
					);
				case 'PEDAGIO':
					return (
						<BadgeWrapper className='border border-purple-100 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300'>
							<Tickets className='h-4 w-4 text-purple-600 dark:text-purple-300' />
							<span>Pedágio</span>
						</BadgeWrapper>
					);
				case 'DESPESA':
					return (
						<BadgeWrapper className='border border-gray-100 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200'>
							<Receipt className='h-4 w-4 text-gray-600 dark:text-gray-200' />
							<span>Despesa</span>
						</BadgeWrapper>
					);
				default:
					return <span className='text-sm text-gray-500'>Sem tipo</span>;
			}
		},
	},
	{
		id: 'id_grupo_contas',
		accessorKey: 'con_grupo_contas.ds_nome_grupo',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Indicador de Grupo' />,
		cell: ({ row }) => {
			const { js_con_grupo_contas } = row.original;
			return js_con_grupo_contas?.ds_nome_grupo ?? 'Sem tipo';
		},
	},
	{
		accessorKey: 'is_ativo',
		header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
		cell: ({ row }) => {
			return (
				<Badge variant={row.getValue('is_ativo') ? 'success' : 'destructive'} className='cursor-default'>
					{row.getValue('is_ativo') ? 'Ativo' : 'Inativo'}
				</Badge>
			);
		},
	},
];
