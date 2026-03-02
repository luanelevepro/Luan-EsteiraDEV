import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	getViagens,
	getViagensPaginado,
	getViagem,
	getViagemFluxo,
	iniciarItemViagem,
	finalizarItemViagem,
	createViagem,
	updateViagem,
	updateViagemStatus,
	deleteViagem,
	vincularCargaAViagem,
	removerCargaDaViagem,
	reordenarCargasViagem,
	finalizarCargaViagem,
	createViagemComCargas,
} from '@/services/api/tms/viagens';
import { getCarga, iniciarColeta, finalizarColeta } from '@/services/api/tms/cargas';
import { iniciarEntrega, finalizarEntrega } from '@/services/api/tms/entregas';
import { Viagem, Carga } from '@/types/tms';

// ============= QUERIES =============

/**
 * Hook para buscar todas as viagens
 */
export function useGetViagens() {
	return useQuery({
		queryKey: ['get-viagens-all'],
		queryFn: () => getViagens(),
		staleTime: 1000 * 60 * 5, // 5 minutos
	});
}

/**
 * Hook para buscar viagens com paginação
 */
export function useGetViagensPaginado(params: {
	page: number;
	pageSize: number;
	orderBy: 'asc' | 'desc';
	orderColumn: 'cd_viagem' | 'ds_motorista' | 'ds_status' | 'dt_created' | 'dt_agendada' | 'dt_conclusao';
	search?: string;
	status?: string[];
}) {
	return useQuery({
		queryKey: ['get-viagens-paginado', params],
		queryFn: () => getViagensPaginado(params),
		staleTime: 1000 * 60 * 5, // 5 minutos
	});
}

/**
 * Hook para buscar uma viagem específica
 */
export function useGetViagem(id: string) {
	return useQuery({
		queryKey: ['get-viagem', id],
		queryFn: () => getViagem(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 5, // 5 minutos
	});
}

/**
 * Hook para buscar o fluxo da esteira sequencial da viagem
 */
export function useViagemFluxo(viagemId: string) {
	return useQuery({
		queryKey: ['viagem-fluxo', viagemId],
		queryFn: () => getViagemFluxo(viagemId),
		enabled: !!viagemId,
		staleTime: 0, // sempre refetch para ter canStart/canFinish atualizados
	});
}

// ============= MUTATIONS =============

/**
 * Hook para criar uma nova viagem
 */
export function useCreateViagem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: Parameters<typeof createViagem>[0]) => createViagem(data),
		onSuccess: () => {
			// Invalidar queries afetadas
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
		},
	});
}

/**
 * Hook para atualizar uma viagem
 */
export function useUpdateViagem(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: Parameters<typeof updateViagem>[1]) => updateViagem(id, data),
		onSuccess: () => {
			// Invalidar queries afetadas
			queryClient.invalidateQueries({ queryKey: ['get-viagem', id] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
		},
	});
}

/**
 * Hook para atualizar apenas o status de uma viagem
 */
export function useUpdateViagemStatus(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (status: Parameters<typeof updateViagemStatus>[1]) => updateViagemStatus(id, status),
		onSuccess: () => {
			// Invalidar queries afetadas
			queryClient.invalidateQueries({ queryKey: ['get-viagem', id] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
		},
	});
}

// ============= Esteira sequencial (fluxo) =============

function invalidateFluxoAndViagens(queryClient: ReturnType<typeof useQueryClient>, viagemId: string) {
	queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', viagemId] });
	queryClient.invalidateQueries({ queryKey: ['get-viagem', viagemId] });
	queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
	queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
}

export function useIniciarItemViagem(viagemId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: { itemId: string; dt_inicio?: string }) =>
			iniciarItemViagem(viagemId, params.itemId, { dt_inicio: params.dt_inicio }),
		onSuccess: () => {
			invalidateFluxoAndViagens(queryClient, viagemId);
			toast.success('Item iniciado.');
		},
		onError: (err) => toast.error(err.message),
	});
}

export function useFinalizarItemViagem(viagemId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: { itemId: string; dt_fim?: string }) =>
			finalizarItemViagem(viagemId, params.itemId, { dt_fim: params.dt_fim }),
		onSuccess: () => {
			invalidateFluxoAndViagens(queryClient, viagemId);
			toast.success('Item finalizado.');
		},
		onError: (err) => toast.error(err.message),
	});
}

export function useIniciarColeta() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: { cargaId: string; dt_coleta_inicio?: string }) =>
			iniciarColeta(params.cargaId, { dt_coleta_inicio: params.dt_coleta_inicio }),
		onSuccess: (data) => {
			invalidateFluxoAndViagens(queryClient, data.id_viagem);
			toast.success('Coleta iniciada.');
		},
		onError: (err) => toast.error(err.message),
	});
}

export function useFinalizarColeta() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: { cargaId: string; dt_coleta_fim?: string }) =>
			finalizarColeta(params.cargaId, { dt_coleta_fim: params.dt_coleta_fim }),
		onSuccess: (data) => {
			invalidateFluxoAndViagens(queryClient, data.id_viagem);
			toast.success('Coleta finalizada.');
		},
		onError: (err) => toast.error(err.message),
	});
}

export function useIniciarEntrega() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: { entregaId: string; dt_inicio_rota?: string }) =>
			iniciarEntrega(params.entregaId, { dt_inicio_rota: params.dt_inicio_rota }),
		onSuccess: (data) => {
			invalidateFluxoAndViagens(queryClient, data.id_viagem);
			toast.success('Rota da entrega iniciada.');
		},
		onError: (err) => toast.error(err.message),
	});
}

export function useFinalizarEntrega() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (params: {
			entregaId: string;
			comprovante?: {
				dt_entrega?: string;
				dt_finalizado_em?: string;
				ds_comprovante_entrega?: string;
				ds_comprovante_key?: string;
			};
		}) => finalizarEntrega(params.entregaId, params.comprovante),
		onSuccess: (data) => {
			invalidateFluxoAndViagens(queryClient, data.id_viagem);
			toast.success('Entrega finalizada.');
		},
		onError: (err) => toast.error(err.message),
	});
}

/**
 * Hook para deletar uma viagem
 */
export function useDeleteViagem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteViagem(id),
		onSuccess: () => {
			// Invalidar queries afetadas
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
		},
	});
}

/**
 * Hook para vincular uma carga a uma viagem
 */
export function useVincularCargaAViagem(idViagem: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: Parameters<typeof vincularCargaAViagem>[1]) => vincularCargaAViagem(idViagem, data),
		onSuccess: () => {
			// Invalidar queries afetadas
			queryClient.invalidateQueries({ queryKey: ['get-viagem', idViagem] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
		},
	});
}

/**
 * Hook para remover uma carga de uma viagem
 */
export function useRemoverCargaDaViagem(idViagem: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (idCarga: string) => removerCargaDaViagem(idViagem, idCarga),
		onSuccess: () => {
			// Invalidar queries afetadas
			queryClient.invalidateQueries({ queryKey: ['get-viagem', idViagem] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
		},
	});
}

/**
 * Hook para reordenar cargas de uma viagem
 */
export function useReordenarCargasViagem(idViagem: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (cargas: Parameters<typeof reordenarCargasViagem>[1]) => reordenarCargasViagem(idViagem, cargas),
		onSuccess: () => {
			// Invalidar queries afetadas
			queryClient.invalidateQueries({ queryKey: ['get-viagem', idViagem] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
		},
	});
}

/**
 * Hook para finalizar uma carga de uma viagem
 */
export function useFinalizarCargaViagem(idViagem: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (idCarga: string) => finalizarCargaViagem(idViagem, idCarga),
		onSuccess: () => {
			// Invalidar queries afetadas
			queryClient.invalidateQueries({ queryKey: ['get-viagem', idViagem] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
			queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
		},
	});
}

/**
 * Hook para criar uma viagem com cargas vinculadas
 */
export function useCreateViagemComCargas() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: {
			viagemData: Parameters<typeof createViagemComCargas>[0];
			cargas: Parameters<typeof createViagemComCargas>[1];
		}) => createViagemComCargas(data.viagemData, data.cargas),
		onSuccess: () => {
			// Invalidar queries afetadas
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
			queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
		},
	});
}

// ============= ENRICHMENT HOOKS =============

/**
 * Hook para enriquecer uma viagem com dados completos das cargas
 * Busca cada carga em paralelo usando React Query
 */
export function useViagemComCargas(viagem: Viagem | undefined) {
	// Extrair IDs das cargas
	const cargaIds = viagem?.js_viagens_cargas
		?.map((vc) => vc.id_carga)
		.filter(Boolean) || [];

	// Buscar cada carga
	const cargasQueries = useQuery({
		queryKey: ['viagem-cargas-completas', viagem?.id],
		queryFn: async () => {
			if (cargaIds.length === 0) return [];

			try {
				const cargasPromises = cargaIds.map((id) => getCarga(id));
				const cargas = await Promise.all(cargasPromises);
				return cargas;
			} catch (error) {
				console.error('Erro ao buscar cargas completas:', error);
				return [];
			}
		},
		enabled: !!viagem && cargaIds.length > 0,
		staleTime: 1000 * 60 * 5, // 5 minutos
	});

	// Enriquecer viagem com cargas completas
	const viagemEnriquecida: Viagem | undefined = viagem
		? {
				...viagem,
				cargas: cargasQueries.data || [],
		  }
		: undefined;

	return {
		viagem: viagemEnriquecida,
		isLoading: cargasQueries.isLoading,
		isError: cargasQueries.isError,
		error: cargasQueries.error,
	};
}

/**
 * Hook para enriquecer múltiplas viagens com dados completos das cargas
 * Busca todas as cargas em paralelo
 */
export function useViagensComCargas(viagens: Viagem[] | undefined) {
	// Extrair todos os IDs únicos de cargas
	const cargaIds = Array.from(
		new Set(
			viagens
				?.flatMap((v) => v.js_viagens_cargas?.map((vc) => vc.id_carga) || [])
				.filter(Boolean) || []
		)
	);

	// Buscar todas as cargas em paralelo
	const cargasQueries = useQuery({
		queryKey: ['viagens-cargas-completas', cargaIds],
		queryFn: async () => {
			if (cargaIds.length === 0) return new Map<string, Carga>();

			try {
				const cargasPromises = cargaIds.map((id) => getCarga(id));
				const cargas = await Promise.all(cargasPromises);

				// Criar mapa para acesso rápido
				const cargasMap = new Map<string, Carga>();
				cargas.forEach((carga) => {
					cargasMap.set(carga.id, carga);
				});
				return cargasMap;
			} catch (error) {
				console.error('Erro ao buscar cargas completas:', error);
				return new Map<string, Carga>();
			}
		},
		enabled: !!viagens && cargaIds.length > 0,
		staleTime: 1000 * 60 * 5, // 5 minutos
	});

	// Enriquecer viagens com cargas completas
	const viagensEnriquecidas: Viagem[] | undefined = viagens
		? viagens.map((viagem) => ({
				...viagem,
				cargas: viagem.js_viagens_cargas
					?.map((vc) => cargasQueries.data?.get(vc.id_carga))
					.filter(Boolean) as Carga[] | undefined,
		  }))
		: undefined;

	return {
		viagens: viagensEnriquecidas,
		isLoading: cargasQueries.isLoading,
		isError: cargasQueries.isError,
		error: cargasQueries.error,
	};
}
