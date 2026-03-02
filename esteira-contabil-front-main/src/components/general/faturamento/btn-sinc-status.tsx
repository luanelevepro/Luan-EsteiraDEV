import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { syncCteContra, syncNfeProcessado, syncNfeRelacionadas } from '@/services/api/documentos-fiscais';
import { CloudDownload } from 'lucide-react';
import { useQueryClient } from 'node_modules/@tanstack/react-query/build/modern/QueryClientProvider';
import { useState } from 'react';
import { toast } from 'sonner';

type BtnSincStatusProps = {
	queryFnKey: string;
	competencia: string;
};

export default function BtnSincStatus({ queryFnKey, competencia }: BtnSincStatusProps) {
	const queryClient = useQueryClient();
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);

	async function HandleUpdate() {
		try {
			toast.promise(
				(async () => {
					setLoading(true);
					await Promise.all([
						syncCteContra({ competencia }),
						syncNfeProcessado({ competencia }),
						syncNfeRelacionadas({ competencia }),
					]);
				})(),
				{
					loading: 'Sincronizando status...',
					success: () => {
						setLoading(false);
						return 'Status sincronizados com sucesso!';
					},
					error: (error) => {
						setLoading(false);
						return `Erro ao sincronizar: ${error.message || error}`;
					},
				},
			);
		} catch (error) {
			toast.error(`Erro ao sincronizar: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			await queryClient.invalidateQueries({ queryKey: [queryFnKey] });
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button tooltip='Sincronizar' variant='outline' disabled={loading} size='icon'>
					<CloudDownload />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Sincronizar status?</AlertDialogTitle>
					<AlertDialogDescription>
						Essa ação irá sincronizar os status de faturamento com os dados do sistema. Esse processo pode levar alguns minutos.
						Deseja continuar?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction onClick={HandleUpdate}>Sincronizar</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
