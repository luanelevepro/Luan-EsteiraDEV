import { useMutation } from '@tanstack/react-query';
import { finalizarViagem } from '@/services/api/tms/viagens';
import { toast } from 'sonner';

export function useFinalizarViagem() {

	return useMutation({
		mutationFn: ({
			viagemId,
			dt_conclusao,
		}: {
			viagemId: string;
			dt_conclusao?: string;
		}) => finalizarViagem(viagemId, dt_conclusao != null ? { dt_conclusao } : undefined),
		onSuccess: (data) => {
			// Sempre mostra toast de sucesso
			toast.success('Viagem finalizada!', {
				description: data?.mensagem || 'Todas as cargas foram marcadas como entregues.',
			});

			// NÃO invalida queries aqui - espera decisão do usuário no modal
			// A invalidação será feita nos handlers do modal (onFinalizar ou onAdicionarMaisCargas)
		},
		onError: (error) => {
			toast.error('Erro ao finalizar viagem', {
				description: error instanceof Error ? error.message : 'Erro desconhecido',
			});
		},
	});
}
