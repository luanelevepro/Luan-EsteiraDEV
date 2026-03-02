import React, { useState } from 'react';
import { Viagem } from '@/types/tms';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Truck, CheckCircle } from 'lucide-react';
import { useUpdateViagemStatus } from '@/hooks/use-viagens';
import { useFinalizarViagem } from '@/hooks/use-finalizar-viagem';
import { toast } from 'sonner';
import { FinalizarViagemModal } from './modal-finalizar-viagem';
import { ModalConclusaoDataHora } from './modal-conclusao-data-hora';

interface ViagemActionButtonsProps {
	viagem: Viagem;
	onStatusUpdate?: () => void;
}

export const ViagemActionButtons: React.FC<ViagemActionButtonsProps> = ({ viagem, onStatusUpdate }) => {
	const [showFinalizarModal, setShowFinalizarModal] = useState(false);
	const [showConclusaoModal, setShowConclusaoModal] = useState(false);

	// Mutations
	const updateViagemStatusMutation = useUpdateViagemStatus(viagem.id);
	const finalizarViagemMutation = useFinalizarViagem();

	// Handlers para cada ação
	const handleIniciarColeta = async () => {
		try {
			await updateViagemStatusMutation.mutateAsync('EM_COLETA');
			toast.success('Coleta iniciada', {
				description: 'Viagem movida para EM_COLETA',
			});
			onStatusUpdate?.();
		} catch (error) {
			toast.error('Erro ao iniciar coleta', {
				description: error instanceof Error ? error.message : 'Erro desconhecido',
			});
		}
	};

	const handleIniciarViagem = async () => {
		try {
			await updateViagemStatusMutation.mutateAsync('EM_VIAGEM');
			toast.success('Viagem iniciada', {
				description: 'Viagem movida para EM_VIAGEM',
			});
			onStatusUpdate?.();
		} catch (error) {
			toast.error('Erro ao iniciar viagem', {
				description: error instanceof Error ? error.message : 'Erro desconhecido',
			});
		}
	};

	const handleOpenConclusaoModal = () => {
		setShowConclusaoModal(true);
	};

	const handleConfirmConclusaoViagem = async (dtIso?: string) => {
		try {
			await finalizarViagemMutation.mutateAsync({
				viagemId: viagem.id,
				dt_conclusao: dtIso,
			});
			setShowFinalizarModal(true);
		} catch (error) {
			toast.error('Erro ao finalizar viagem', {
				description: error instanceof Error ? error.message : 'Erro desconhecido',
			});
		}
	};

	// Determina quais botões mostrar baseado no status da viagem
	const renderButtons = () => {
		const actionButtonClass =
			'h-8 w-full justify-center gap-2 rounded-lg border border-border bg-muted/60 px-3 text-[10px] font-semibold tracking-wide uppercase text-foreground shadow-sm transition-all hover:bg-muted';

		switch (viagem.ds_status) {
			case 'PLANEJADA':
				return (
					<Button
						variant='secondary'
						onClick={handleIniciarColeta}
						disabled={updateViagemStatusMutation.isPending}
						className={actionButtonClass}
					>
						{updateViagemStatusMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Play size={12} />}
						Iniciar Coleta
					</Button>
				);

			case 'EM_COLETA':
				return (
					<Button
						variant='secondary'
						onClick={handleIniciarViagem}
						disabled={updateViagemStatusMutation.isPending}
						className={actionButtonClass}
					>
						{updateViagemStatusMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Truck size={12} />}
						Iniciar Viagem
					</Button>
				);

			case 'EM_VIAGEM':
				return (
					<Button
						variant='secondary'
						onClick={handleOpenConclusaoModal}
						disabled={finalizarViagemMutation.isPending}
						className={actionButtonClass}
					>
						{finalizarViagemMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <CheckCircle size={12} />}
						Finalizar
					</Button>
				);

			default:
				return null;
		}
	};

	return (
		<>
			{renderButtons()}

			<ModalConclusaoDataHora
				open={showConclusaoModal}
				onOpenChange={setShowConclusaoModal}
				title="Finalizar viagem"
				isLoading={finalizarViagemMutation.isPending}
				onConfirm={handleConfirmConclusaoViagem}
			/>

			{/* Modal para decisão de finalização */}
			{showFinalizarModal && (
				<FinalizarViagemModal
					isOpen={showFinalizarModal}
					onClose={() => setShowFinalizarModal(false)}
					viagem={viagem}
					onFinalizar={() => {
						setShowFinalizarModal(false);
						onStatusUpdate?.();
					}}
					onAdicionarMaisCargas={() => {
						setShowFinalizarModal(false);
						onStatusUpdate?.();
					}}
				/>
			)}
		</>
	);
};
