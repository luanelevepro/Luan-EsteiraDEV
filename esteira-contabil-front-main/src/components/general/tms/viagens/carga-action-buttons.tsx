import React, { useState } from 'react';
import { Carga, Viagem } from '@/types/tms';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Truck, CheckCircle } from 'lucide-react';
import { useUpdateViagemStatus } from '@/hooks/use-viagens';
import { useFinalizarCarga } from '@/hooks/use-finalizar-carga';
import { toast } from 'sonner';
import { FinalizarViagemModal } from './modal-finalizar-viagem';
import { ModalConclusaoDataHora } from './modal-conclusao-data-hora';

interface CargaActionButtonsProps {
	carga: Carga;
	viagem: Viagem;
	isActiveCarga: boolean; // Primeira carga da viagem
	/** Quando true, mostra apenas "Iniciar deslocamento vazio" e "Deslocamento vazio finalizado" (sem Iniciar Coleta / Iniciar Viagem) */
	isDeslocamentoVazio?: boolean;
	onStatusUpdate?: () => void;
}

export const CargaActionButtons: React.FC<CargaActionButtonsProps> = ({
	carga,
	viagem,
	isActiveCarga,
	isDeslocamentoVazio = false,
	onStatusUpdate,
}) => {
	const [showFinalizarModal, setShowFinalizarModal] = useState(false);
	const [showConclusaoModal, setShowConclusaoModal] = useState(false);

	// Mutations
	const updateViagemStatusMutation = useUpdateViagemStatus(viagem.id);
	const finalizarCargaMutation = useFinalizarCarga();

	// Não mostra botões se não for a primeira carga
	if (!isActiveCarga) {
		return null;
	}

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

	const handleConfirmConclusaoCarga = async (dtIso?: string) => {
		try {
			const comprovante =
				dtIso != null ? { dt_conclusao: dtIso } : undefined;
			const result = await finalizarCargaMutation.mutateAsync({
				cargaId: carga.id,
				comprovante,
			});

			if (result.isUltimaCarga) {
				setShowFinalizarModal(true);
			} else {
				onStatusUpdate?.();
			}
		} catch (error) {
			toast.error('Erro ao finalizar carga', {
				description: error instanceof Error ? error.message : 'Erro desconhecido',
			});
		}
	};

	// Deslocamento vazio: apenas "Iniciar deslocamento vazio" e "Deslocamento vazio finalizado" (sem coleta/viagem)
	const handleIniciarDeslocamentoVazio = async () => {
		try {
			await updateViagemStatusMutation.mutateAsync('EM_VIAGEM');
			toast.success('Deslocamento vazio iniciado', {
				description: 'Viagem em trânsito.',
			});
			onStatusUpdate?.();
		} catch (error) {
			toast.error('Erro ao iniciar deslocamento vazio', {
				description: error instanceof Error ? error.message : 'Erro desconhecido',
			});
		}
	};

	// Determina quais botões mostrar baseado no status da viagem (e se é deslocamento vazio)
	const renderButtons = () => {
		const actionButtonClass =
			'h-8 w-full justify-center gap-2 rounded-lg border border-border bg-muted/60 px-3 text-[10px] font-semibold tracking-wide uppercase text-foreground shadow-sm transition-all hover:bg-muted';

		if (isDeslocamentoVazio) {
			// Deslocamento vazio: só status aguardando (PLANEJADA), em rota (EM_VIAGEM) e finalizado (CONCLUIDA/ENTREGUE). Sem coleta.
			if (viagem.ds_status === 'PLANEJADA') {
				return (
					<Button
						onClick={handleIniciarDeslocamentoVazio}
						disabled={updateViagemStatusMutation.isPending}
						variant='secondary'
						className={actionButtonClass}
					>
						{updateViagemStatusMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Truck size={12} />}
						Iniciar deslocamento vazio
					</Button>
				);
			}
			if (viagem.ds_status === 'EM_VIAGEM') {
				return (
					<Button
						onClick={handleOpenConclusaoModal}
						disabled={finalizarCargaMutation.isPending}
						variant='secondary'
						className={actionButtonClass}
					>
						{finalizarCargaMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <CheckCircle size={12} />}
						Deslocamento vazio finalizado
					</Button>
				);
			}
			return null;
		}

		// Carga normal: Iniciar Coleta → Iniciar Viagem → Finalizar
		switch (carga.ds_status) {
			case 'PENDENTE':
				return (
					<Button
						onClick={handleIniciarColeta}
						disabled={updateViagemStatusMutation.isPending}
						variant='secondary'
						className={actionButtonClass}
					>
						{updateViagemStatusMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Play size={12} />}
						Iniciar Coleta
					</Button>
				);
			case 'EM_TRANSITO':
				return (
					<Button
						onClick={handleIniciarViagem}
						disabled={updateViagemStatusMutation.isPending}
						variant='secondary'
						className={actionButtonClass}
					>
						{updateViagemStatusMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Truck size={12} />}
						Iniciar Viagem
					</Button>
				);
			case 'ENTREGUE':
				return (
					<Button
						onClick={handleOpenConclusaoModal}
						disabled={finalizarCargaMutation.isPending}
						variant='secondary'
						className={actionButtonClass}
					>
						{finalizarCargaMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <CheckCircle size={12} />}
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
				title={isDeslocamentoVazio ? 'Finalizar deslocamento vazio' : 'Finalizar carga'}
				isLoading={finalizarCargaMutation.isPending}
				onConfirm={handleConfirmConclusaoCarga}
			/>

			{/* Modal para decisão de finalização (se for última carga) */}
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
