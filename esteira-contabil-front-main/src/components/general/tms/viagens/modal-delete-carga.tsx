import React from 'react';
import { Carga } from '@/types/tms';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { deleteCarga } from '@/services/api/tms/cargas';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteCargaModalProps {
	isOpen: boolean;
	onClose: () => void;
	carga: Carga;
}

export const DeleteCargaModal: React.FC<DeleteCargaModalProps> = ({ isOpen, onClose, carga }) => {
	const queryClient = useQueryClient();
	const [isDeleting, setIsDeleting] = React.useState(false);

	const handleDelete = async () => {
		try {
			setIsDeleting(true);
			await deleteCarga(carga.id);
			toast.success('Carga excluída com sucesso!');
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tms', 'cargas'] }),
				queryClient.invalidateQueries({ queryKey: ['tms', 'viagens'] }),
			]);
			onClose();
		} catch (error) {
			console.error('Erro ao excluir carga:', error);
			toast.error('Erro ao excluir carga. Tente novamente.');
		} finally {
			setIsDeleting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
			<div className='w-full max-w-md rounded-lg bg-card shadow-xl'>
				<div className='flex items-center justify-between border-b border-border p-6'>
					<div className='flex items-center gap-3'>
						<div className='flex h-10 w-10 items-center justify-center rounded-full bg-red-100'>
							<AlertTriangle className='text-red-600' size={20} />
						</div>
						<h2 className='text-xl font-semibold text-foreground'>Excluir Carga</h2>
					</div>
					<Button onClick={onClose} variant='ghost' size='icon' className='rounded-lg p-2'>
						<X size={20} />
					</Button>
				</div>

				<div className='p-6'>
					<p className='mb-4 text-foreground/90'>
						Tem certeza que deseja excluir a carga <span className='font-semibold'>{carga.cd_carga || carga.id}</span>?
					</p>

					<div className='rounded-lg border border-border bg-muted/40 p-4'>
						<div className='space-y-2 text-sm'>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Código:</span>
								<span className='font-medium text-foreground'>{carga.cd_carga ?? '—'}</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Status:</span>
								<span className='font-medium text-foreground'>{carga.ds_status ?? '—'}</span>
							</div>
						</div>
					</div>

					<div className='mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-950/30'>
						<AlertTriangle className='mt-0.5 flex-shrink-0 text-red-600' size={16} />
						<p className='text-sm text-red-800 dark:text-red-200'>
							<strong>Atenção:</strong> Esta ação não pode ser desfeita. A carga e suas entregas serão removidas permanentemente.
						</p>
					</div>
				</div>

				<div className='flex justify-end gap-3 border-t border-border bg-muted/40 p-6'>
					<Button type='button' onClick={onClose} disabled={isDeleting} variant='outline'>
						Cancelar
					</Button>
					<Button
						type='button'
						onClick={handleDelete}
						disabled={isDeleting}
						variant='destructive'
						className='flex items-center gap-2'
					>
						<Trash2 size={16} />
						{isDeleting ? 'Excluindo...' : 'Excluir Carga'}
					</Button>
				</div>
			</div>
		</div>
	);
};
