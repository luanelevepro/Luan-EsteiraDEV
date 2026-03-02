import React from 'react';
import { Viagem } from '@/types/tms';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { useDeleteViagem } from '@/hooks/use-viagens';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatBusinessDate } from '@/lib/utils';

interface DeleteTripModalProps {
	isOpen: boolean;
	onClose: () => void;
	trip: Viagem;
}

export const DeleteTripModal: React.FC<DeleteTripModalProps> = ({ isOpen, onClose, trip }) => {
	const deleteMutation = useDeleteViagem();

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync(trip.id);
			toast.success('Viagem excluída com sucesso!');
			onClose();
		} catch (error) {
			console.error('Erro ao excluir viagem:', error);
			toast.error('Erro ao excluir viagem. Tente novamente.');
		}
	};

	if (!isOpen) return null;

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
			<div className='w-full max-w-md rounded-lg bg-card shadow-xl'>
				{/* Header */}
				<div className='flex items-center justify-between border-b border-border p-6'>
					<div className='flex items-center gap-3'>
						<div className='flex h-10 w-10 items-center justify-center rounded-full bg-red-100'>
							<AlertTriangle className='text-red-600' size={20} />
						</div>
						<h2 className='text-xl font-semibold text-foreground'>Excluir Viagem</h2>
					</div>
					<Button onClick={onClose} variant='ghost' size='icon' className='rounded-lg p-2'>
						<X size={20} />
					</Button>
				</div>

				{/* Content */}
				<div className='p-6'>
					<p className='mb-4 text-foreground/90'>
						Tem certeza que deseja excluir a viagem <span className='font-semibold'>#{trip.cd_viagem || trip.id}</span>?
					</p>

					<div className='rounded-lg border border-border bg-muted/40 p-4'>
						<div className='space-y-2 text-sm'>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Motorista:</span>
								<span className='font-medium text-foreground'>{trip.ds_motorista}</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Veículo:</span>
								<span className='font-medium text-foreground'>{trip.ds_placa_cavalo}</span>
							</div>
							{trip.dt_agendada && (
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>Data Agendada:</span>
									<span className='font-medium text-foreground'>{formatBusinessDate(trip.dt_agendada)}</span>
								</div>
							)}
						</div>
					</div>

					<div className='mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3'>
						<AlertTriangle className='mt-0.5 flex-shrink-0 text-red-600' size={16} />
						<p className='text-sm text-red-800'>
							<strong>Atenção:</strong> Esta ação não pode ser desfeita. Todos os dados relacionados a esta viagem serão removidos
							permanentemente.
						</p>
					</div>
				</div>

				{/* Actions */}
				<div className='flex justify-end gap-3 border-t border-border bg-muted/40 p-6'>
					<Button
						type='button'
						onClick={onClose}
						disabled={deleteMutation.isPending}
						variant='outline'
					>
						Cancelar
					</Button>
					<Button
						type='button'
						onClick={handleDelete}
						disabled={deleteMutation.isPending}
						variant='destructive'
						className='flex items-center gap-2'
					>
						<Trash2 size={16} />
						{deleteMutation.isPending ? 'Excluindo...' : 'Excluir Viagem'}
					</Button>
				</div>
			</div>
		</div>
	);
};
