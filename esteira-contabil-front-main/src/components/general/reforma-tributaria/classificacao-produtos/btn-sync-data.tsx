import { useState } from 'react';

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
import { CloudDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCompanyContext } from '@/context/company-context';
import { useQueryClient } from '@tanstack/react-query';
import { sincronizarClassificacaoProdutos } from '@/services/api/reforma-tributaria';

export default function HandleSyncClassificacaoProdutos() {
	const [open, setOpen] = useState(false);
	const { state } = useCompanyContext();
	const queryClient = useQueryClient();
	const [loading, setLoading] = useState(false);

	async function HandleUpdate() {
		setLoading(true);
		return toast.promise(
			(async () => {
				const result = await sincronizarClassificacaoProdutos();
				await queryClient.invalidateQueries({ queryKey: ['get-classificacao-produtos', state] });
				return result;
			})(),
			{
				loading: 'Sincronizando classificação de produtos...',
				success: (result) => {
					setLoading(false);
					setOpen(false);
					return `Sincronização concluída! ${result?.sincronizados || 0} produto(s) classificado(s).`;
				},
				error: (error) => {
					setLoading(false);
					return `Erro ao sincronizar: ${error.message || error}`;
				},
			},
		);
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button tooltip='Sincronizar classificação de produtos' variant='outline' disabled={loading} size='icon'>
					<CloudDownload />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Sincronizar classificação de produtos?</AlertDialogTitle>
					<AlertDialogDescription>
						Essa ação irá varrer os produtos da empresa e classificá-los de acordo com o NCM no banco calculadora.db.
						<br /><br />
						<strong>NCMs encontrados:</strong> Trará todas Classificações Tributárias permitidas para aquele NCM, sendo responsabilidade do usuário definir o CClassTrib correto na operação da empresa vigente.
						<br />
						<strong>NCMs não encontrados:</strong> Receberão CST &quot;000&quot; e CClassTrib &quot;000001&quot; como padrão.
						<br /><br />
						Esse processo pode levar alguns minutos. Deseja continuar?
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
