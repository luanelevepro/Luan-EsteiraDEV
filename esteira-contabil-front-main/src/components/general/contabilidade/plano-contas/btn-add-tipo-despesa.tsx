import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { useCompanyContext } from '@/context/company-context';
import { useQueryClient } from '@tanstack/react-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PlanoConta } from '@/pages/contabilidade/plano-contas';
import { DataTableRef } from '@/components/ui/data-table';
import { setContaTipoDespesa, TipoDespesa } from '@/services/api/plano-contas';

type HandleInsertGrupoToPlanoProps = {
	open: boolean;
	pageParameters: {
		page: number;
		pageSize: number;
		orderBy: string;
		search: string;
		status: string | null;
	};
	onChange: () => void;
	onOpenChange: (open: boolean) => void;
	tableRef: React.RefObject<DataTableRef<PlanoConta> | null>;
};

export default function HandleInsertTipoDespesaToConta({
	open,
	onChange,
	onOpenChange,
	tableRef,
	pageParameters,
}: HandleInsertGrupoToPlanoProps) {
	const [popover, setPopover] = useState(false);

	// Se o diálogo for fechado externamente, garante que o popover interno também feche
	React.useEffect(() => {
		if (!open) setPopover(false);
	}, [open]);
	const queryClient = useQueryClient();
	const { state } = useCompanyContext();
	const [selectedTipo, setSelectedTipo] = useState<TipoDespesa | null>(null);
	const TIPOS_DESPESA: TipoDespesa[] | null = ['ABASTECIMENTO', 'ADIANTAMENTO', 'PEDAGIO', 'DESPESA'];
	const [isFetching, setIsFetching] = useState(false);

	async function handlePlanoChange(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		try {
			const selectedPlanos = tableRef.current?.getSelectedRows() || [];
			if (selectedPlanos.length === 0) {
				toast.error('Selecione pelo menos uma conta.');
				return;
			}
			const possuiTipoInvalido = selectedPlanos.some((plano) => plano.ds_tipo_cta !== 'A');
			if (possuiTipoInvalido) {
				toast.error('Selecione apenas contas Analíticas.');
				return;
			}
			const ids = selectedPlanos.map((plano) => plano.id);
			toast.promise(
				(async () => {
					setIsFetching(true);
					await setContaTipoDespesa(ids, selectedTipo);
					await queryClient.invalidateQueries({ queryKey: ['get-plano-contas-paginado', pageParameters, state] });
					tableRef.current?.clearSelectedRows();
				})(),
				{
					loading: 'Atualizando o grupo do(s) plano(s)...',
					success: () => {
						setIsFetching(false);
						return `${selectedPlanos.length} plano(s) atualizado(s) com sucesso.`;
					},
				},
			);
		} catch (error) {
			console.error('Error linking grupo to plano:', error);
			toast.error('Erro ao vincular grupo ao plano.');
		} finally {
			await onChange();
			setSelectedTipo(null);
			onOpenChange(false);
		}
	}

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Vincular Tipo de Despesa</DialogTitle>
						<DialogDescription>Escolha o tipo que quer vincular.</DialogDescription>
					</DialogHeader>

					<form onSubmit={handlePlanoChange} className='grid gap-4'>
						<div className='grid gap-2'>
							<Label>Tipos de Despesa</Label>
							<Popover modal={true} open={popover} onOpenChange={setPopover}>
								<PopoverTrigger asChild>
									<Button
										variant='outline'
										disabled={isFetching}
										role='combobox'
										aria-expanded={popover}
										className='justify-between'
									>
										{selectedTipo
											? TIPOS_DESPESA?.find((item) => item === selectedTipo)
											: isFetching
												? 'Carregando...'
												: 'Selecione um tipo...'}
										<ChevronsUpDown className='opacity-50' />
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
									<Command>
										<CommandInput placeholder='Selecione um tipo...' />
										<CommandList>
											<CommandEmpty>Nenhum tipo encontrado.</CommandEmpty>
											<CommandGroup>
												{TIPOS_DESPESA?.map((tipo) => (
													<CommandItem
														key={tipo}
														value={tipo}
														onSelect={(currentValue) => {
															setSelectedTipo(currentValue as TipoDespesa);
															setPopover(false);
														}}
													>
														{tipo}
														<Check className={cn('ml-auto', selectedTipo === tipo ? 'opacity-100' : 'opacity-0')} />
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>

						<Button type='submit' className='w-full' disabled={isFetching}>
							Adicionar Tipo de Despesa
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
