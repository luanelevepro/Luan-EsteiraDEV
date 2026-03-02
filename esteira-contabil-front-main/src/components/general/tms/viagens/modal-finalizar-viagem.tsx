import React, { useState } from 'react';
import { Viagem } from '@/types/tms';
import { X, CheckCircle, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { finalizarViagem, reabrirViagemParaNovasCargas } from '@/services/api/tms/viagens';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ModalConclusaoDataHora } from './modal-conclusao-data-hora';
import { Button } from '@/components/ui/button';

interface FinalizarViagemModalProps {
	isOpen: boolean;
	onClose: () => void;
	viagem: Viagem;
	onFinalizar: () => void;
	onAdicionarMaisCargas: () => void;
}

export const FinalizarViagemModal: React.FC<FinalizarViagemModalProps> = ({
	isOpen,
	onClose,
	viagem,
	onFinalizar,
	onAdicionarMaisCargas,
}) => {
	const [isLoadingFinalizar, setIsLoadingFinalizar] = useState(false);
	const [isLoadingAdicionar, setIsLoadingAdicionar] = useState(false);
	const [showConclusaoModal, setShowConclusaoModal] = useState(false);
	const queryClient = useQueryClient();

	if (!isOpen) return null;

	const handleFinalizar = async (dtConclusao?: string) => {
		setIsLoadingFinalizar(true);
		try {
			await finalizarViagem(viagem.id, dtConclusao != null ? { dt_conclusao: dtConclusao } : undefined);

			queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });

			toast.success('Viagem finalizada!', {
				description: 'A viagem foi marcada como CONCLUÍDA.',
			});
			onFinalizar();
			onClose();
		} catch (error) {
			toast.error('Erro ao finalizar viagem', {
				description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.',
			});
		} finally {
			setIsLoadingFinalizar(false);
		}
	};

	const handleAdicionarMaisCargas = async () => {
		setIsLoadingAdicionar(true);
		try {
			await reabrirViagemParaNovasCargas(viagem.id);

			// Invalidar queries após reabrir
			queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });

			toast.success('Viagem reaberta!', {
				description: 'A viagem foi reaberta para adicionar mais cargas.',
			});
			onAdicionarMaisCargas();
			onClose();
		} catch (error) {
			toast.error('Erro ao reabrir viagem', {
				description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.',
			});
		} finally {
			setIsLoadingAdicionar(false);
		}
	};

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
			<div className='w-full max-w-md rounded-lg bg-card shadow-xl'>
				{/* Header */}
				<div className='flex items-center justify-between border-b border-border p-6'>
					<div className='flex items-center gap-3'>
						<div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100'>
							<AlertCircle className='text-blue-600' size={20} />
						</div>
						<h2 className='text-xl font-semibold text-foreground'>Última Carga Entregue</h2>
					</div>
					<Button onClick={onClose} variant='ghost' size='icon' className='rounded-lg p-2'>
						<X size={20} />
					</Button>
				</div>

				{/* Content */}
				<div className='p-6'>
					<p className='mb-4 text-foreground/90'>
						Você finalizou a última carga da viagem <span className='font-semibold'>#{viagem.cd_viagem || viagem.id}</span>.
					</p>

					<div className='mb-6 rounded-lg border border-border bg-muted/40 p-4'>
						<div className='space-y-2 text-sm'>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Motorista:</span>
								<span className='font-medium text-foreground'>{viagem.ds_motorista}</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Veículo:</span>
								<span className='font-medium text-foreground'>{viagem.ds_placa_cavalo}</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Total de Cargas:</span>
								<span className='font-medium text-foreground'>{viagem.js_viagens_cargas?.length || 0}</span>
							</div>
						</div>
					</div>

					<div className='rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4'>
						<p className='text-sm font-medium text-blue-900'>O que você deseja fazer?</p>
						<ul className='mt-2 ml-4 list-disc space-y-1 text-sm text-blue-800'>
							<li>Finalizar a viagem completamente</li>
							<li>Adicionar mais cargas e continuar a viagem</li>
						</ul>
					</div>
				</div>

				{/* Actions */}
				<div className='flex flex-col gap-3 border-t border-border bg-muted/40 p-6'>
					<Button
						type='button'
						variant='secondary'
						onClick={() => setShowConclusaoModal(true)}
						disabled={isLoadingFinalizar || isLoadingAdicionar}
						className='flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
					>
						<CheckCircle size={16} />
						Finalizar Viagem
					</Button>
					<Button
						type='button'
						variant='secondary'
						onClick={handleAdicionarMaisCargas}
						disabled={isLoadingFinalizar || isLoadingAdicionar}
						className='flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted disabled:opacity-50'
					>
						{isLoadingAdicionar ? (
							<>
								<Loader2 size={16} className='animate-spin' />
								Reabrindo...
							</>
						) : (
							<>
								<Plus size={16} />
								Adicionar Mais Cargas
							</>
						)}
					</Button>
					<Button
						type='button'
						variant='secondary'
						onClick={onClose}
						disabled={isLoadingFinalizar || isLoadingAdicionar}
						className='rounded-xl border border-border bg-muted/60 py-2 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
					>
						Cancelar
					</Button>
				</div>
			</div>

			<ModalConclusaoDataHora
				open={showConclusaoModal}
				onOpenChange={setShowConclusaoModal}
				title="Finalizar viagem"
				isLoading={isLoadingFinalizar}
				onConfirm={handleFinalizar}
			/>
		</div>
	);
};
