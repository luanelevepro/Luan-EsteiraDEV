import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { setOrUnsetArquivado } from '@/services/api/documentos-fiscais';
import type { QueryKey } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

type BtnSetOrUnsetArquivadoProps = {
	queryFnKey?: string;
	invalidateQueryKey?: QueryKey;
	documentoId: string;
	isArquivado?: boolean;
	renderAs?: 'button' | 'dropdownItem';
	className?: string;
	hideTrigger?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
};

export default function BtnSetOrUnsetArquivado({
	queryFnKey,
	invalidateQueryKey,
	documentoId,
	isArquivado,
	renderAs = 'button',
	className,
	hideTrigger = false,
	open: openProp,
	onOpenChange,
}: BtnSetOrUnsetArquivadoProps) {
	const queryClient = useQueryClient();
	const [loading, setLoading] = useState(false);
	const [openUncontrolled, setOpenUncontrolled] = useState(false);
	const open = openProp ?? openUncontrolled;
	const setOpen = onOpenChange ?? setOpenUncontrolled;

	const actionLabel = isArquivado ? 'Reverter arquivação' : 'Arquivar documento';

	async function handleUpdate() {
		if (loading) return;
		if (!documentoId) return;
		try {
			setLoading(true);
			await toast.promise(setOrUnsetArquivado(documentoId), {
				loading: 'Sincronizando status...',
				success: () => 'Status sincronizados com sucesso!',
				error: (error) => `Erro ao sincronizar: ${error?.message || error}`,
			});
			setOpen(false);
		} catch (error) {
			toast.error(`Erro ao sincronizar: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setLoading(false);
			if (invalidateQueryKey) {
				await queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
			} else if (queryFnKey) {
				await queryClient.invalidateQueries({ queryKey: [queryFnKey] });
			}
		}
	}

	if (!documentoId && !open) return null;

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			{!hideTrigger &&
				(renderAs === 'dropdownItem' ? (
					<DropdownMenuItem
						disabled={loading}
						className={className}
						onSelect={() => {
							setOpen(true);
						}}
					>
						{actionLabel}
					</DropdownMenuItem>
				) : (
					<Button
						tooltip={isArquivado ? 'Reverter arquivado' : 'Arquivar documento'}
						variant='outline'
						disabled={loading}
						className={className ?? 'w-full justify-start'}
						onClick={() => setOpen(true)}
					>
						{actionLabel}
					</Button>
				))}
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{isArquivado ? 'Reverter arquivação?' : 'Arquivar documento?'}</AlertDialogTitle>
					<AlertDialogDescription>
						{isArquivado
							? 'Essa ação irá reverter o documento selecionado para PENDENTE. Deseja continuar?'
							: 'Essa ação irá definir o documento selecionado como arquivado. Deseja continuar?'}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction onClick={handleUpdate} disabled={loading}>
						{actionLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
