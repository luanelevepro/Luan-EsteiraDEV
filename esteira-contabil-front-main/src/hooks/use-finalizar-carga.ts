import { useMutation, useQueryClient } from '@tanstack/react-query';
import { finalizarCarga } from '@/services/api/tms/cargas';
import { toast } from 'sonner';

export function useFinalizarCarga() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			cargaId,
			comprovante,
		}: {
			cargaId: string;
			comprovante?: { file?: string; key?: string; dt_conclusao?: string };
		}) => finalizarCarga(cargaId, comprovante),
		onSuccess: (data) => {
			// Mostrar mensagem apropriada
			if (data.isUltimaCarga) {
				toast.info(data.mensagem, {
					duration: 5000,
					description: 'Decida se deseja finalizar a viagem ou adicionar mais cargas.',
				});
				// NÃO invalida queries aqui - espera decisão do usuário no modal
			} else {
				// Só invalida queries se NÃO for última carga
				queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
				queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
				queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
				queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
				if (data.viagem?.id) {
					queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', data.viagem.id] });
					queryClient.invalidateQueries({ queryKey: ['get-viagem', data.viagem.id] });
				}

				toast.success('Carga finalizada!', {
					description: data.mensagem,
				});
			}
		},
		onError: (error) => {
			toast.error('Erro ao finalizar carga', {
				description: error.message,
			});
		},
	});
}
