import { Carga, Viagem } from '@/types/tms';

/**
 * CONTRATO STATUS CARGA x TORRE DE CONTROLE
 * ------------------------------------------
 * - Coluna no kanban (Torre de Controle e tela Viagens e Cargas): definida pelo STATUS VISUAL
 *   (viagem.ds_status + sequência da carga ativa + carga.ds_status === 'ENTREGUE').
 * - StatusCarga (tms_cargas.ds_status) inclui EM_COLETA; a coluna "Em Coleta" do kanban corresponde
 *   a carga.ds_status === 'EM_COLETA' (quando carga ativa) ou ao status visual derivado da viagem.
 * - StatusCarga deve permanecer sincronizado com:
 *   (1) a carga ativa da viagem (via updateViagemStatus no backend e chamadas no front/trip-flow);
 *   (2) o resultado de calcularStatusCarga quando entregas são atualizadas (ex.: finalizar entrega).
 * - Regra de negócio: quando uma entrega está em trânsito, a carga é EM_TRANSITO até que todas
 *   as entregas sejam concluídas (ver calcularStatusCarga no backend).
 */

/**
 * Status visual da carga no Kanban
 */
export type CargaStatusVisual = 'BACKLOG' | 'AGENDADA' | 'EM_COLETA' | 'EM_TRANSITO' | 'ENTREGUE';

/**
 * Resultado do cálculo de status visual de uma carga
 */
export interface CargaStatusResult {
	statusVisual: CargaStatusVisual;
	isActiveCarga: boolean; // Se é a carga ativa (primeira não entregue) da viagem
	viagemStatus?: Viagem['ds_status'];
	sequencia?: number;
	totalCargas?: number;
}

/**
 * Determina o status visual de uma carga baseado na lógica de sequência e status da viagem
 *
 * REGRAS:
 * 1. Carga sem viagem vinculada → BACKLOG
 * 2. Carga vinculada a viagem:
 *    - Se for a PRIMEIRA carga não entregue → Herda status da viagem (EM_COLETA, EM_TRANSITO, etc)
 *    - Se NÃO for a primeira → AGENDADA (aguardando sua vez)
 * 3. Carga já entregue (ds_status = 'ENTREGUE') → ENTREGUE
 */
export function getCargaStatusVisual(carga: Carga, viagem?: Viagem | null): CargaStatusResult {
	// Se carga já está entregue (independente de viagem)
	if (carga.ds_status === 'ENTREGUE') {
		return {
			statusVisual: 'ENTREGUE',
			isActiveCarga: false,
			viagemStatus: viagem?.ds_status,
		};
	}

	// Se não tem viagem vinculada → BACKLOG
	if (!viagem || !viagem.js_viagens_cargas || viagem.js_viagens_cargas.length === 0) {
		return {
			statusVisual: 'BACKLOG',
			isActiveCarga: false,
		};
	}

	// Ordenar cargas por sequência
	const cargasOrdenadas = [...viagem.js_viagens_cargas].sort((a, b) => a.nr_sequencia - b.nr_sequencia);

	// Encontrar a primeira carga não entregue
	const primeiraCargaNaoEntregue = cargasOrdenadas.find((vc) => {
		const cargaData = vc.tms_cargas;
		return cargaData && cargaData.ds_status !== 'ENTREGUE';
	});

	// Verificar se esta carga é a primeira não entregue
	const isActiveCarga = primeiraCargaNaoEntregue?.id_carga === carga.id;

	// Encontrar a sequência desta carga
	const viagemCarga = cargasOrdenadas.find((vc) => vc.id_carga === carga.id);
	const sequencia = viagemCarga?.nr_sequencia;

	// Se é a carga ativa (primeira não entregue), herda status da viagem
	if (isActiveCarga) {
		// Mapear status da viagem para status visual
		const statusMap: Record<Viagem['ds_status'], CargaStatusVisual> = {
			PLANEJADA: 'AGENDADA',
			EM_COLETA: 'EM_COLETA',
			EM_VIAGEM: 'EM_TRANSITO',
			CONCLUIDA: 'ENTREGUE',
			ATRASADA: 'EM_TRANSITO', // Atrasada ainda está em trânsito
			CANCELADA: 'AGENDADA', // Cancelada volta para agendada
		};

		return {
			statusVisual: statusMap[viagem.ds_status] || 'AGENDADA',
			isActiveCarga: true,
			viagemStatus: viagem.ds_status,
			sequencia,
			totalCargas: cargasOrdenadas.length,
		};
	}

	// Se não é a primeira, sempre aparece como AGENDADA (aguardando sua vez)
	return {
		statusVisual: 'AGENDADA',
		isActiveCarga: false,
		viagemStatus: viagem.ds_status,
		sequencia,
		totalCargas: cargasOrdenadas.length,
	};
}

/**
 * Agrupa cargas por status visual para exibição no Kanban
 */
export function groupCargasByStatusVisual(
	cargas: Carga[],
	viagens: Viagem[]
): Record<CargaStatusVisual, Carga[]> {
	const grupos: Record<CargaStatusVisual, Carga[]> = {
		BACKLOG: [],
		AGENDADA: [],
		EM_COLETA: [],
		EM_TRANSITO: [],
		ENTREGUE: [],
	};

	cargas.forEach((carga) => {
		// Encontrar a viagem desta carga
		const viagem = viagens.find((v) =>
			v.js_viagens_cargas?.some((vc) => vc.id_carga === carga.id)
		);

		const { statusVisual } = getCargaStatusVisual(carga, viagem);
		grupos[statusVisual].push(carga);
	});

	return grupos;
}

/**
 * Verifica se uma carga é do tipo "Deslocamento Vazio"
 */
export function isDeslocamentoVazio(carga: Carga): boolean {
	return carga.fl_deslocamento_vazio === true || carga.cd_carga === 'DESLOCAMENTO_VAZIO' || carga.ds_nome === 'DESLOCAMENTO_VAZIO';
}

/**
 * Determina o próximo status da viagem quando uma carga é finalizada
 *
 * @param viagem - Viagem atual
 * @param cargaId - ID da carga que foi finalizada
 * @returns Próximo status da viagem ou null se não houver mudança
 */
export function getProximoStatusViagem(viagem: Viagem, cargaId: string): {
	proximoStatus: Viagem['ds_status'] | null;
	proximaCargaId: string | null;
	isUltimaCarga: boolean;
	mensagem: string;
} {
	if (!viagem.js_viagens_cargas || viagem.js_viagens_cargas.length === 0) {
		return {
			proximoStatus: null,
			proximaCargaId: null,
			isUltimaCarga: false,
			mensagem: 'Viagem sem cargas vinculadas',
		};
	}

	// Ordenar cargas por sequência
	const cargasOrdenadas = [...viagem.js_viagens_cargas].sort((a, b) => a.nr_sequencia - b.nr_sequencia);

	// Encontrar índice da carga atual
	const indexCargaAtual = cargasOrdenadas.findIndex((vc) => vc.id_carga === cargaId);

	if (indexCargaAtual === -1) {
		return {
			proximoStatus: null,
			proximaCargaId: null,
			isUltimaCarga: false,
			mensagem: 'Carga não encontrada na viagem',
		};
	}

	// Verificar se é a última carga
	const isUltimaCarga = indexCargaAtual === cargasOrdenadas.length - 1;

	if (isUltimaCarga) {
		return {
			proximoStatus: null,
			proximaCargaId: null,
			isUltimaCarga: true,
			mensagem: 'Última carga da viagem. Deseja finalizar a viagem ou adicionar mais cargas?',
		};
	}

	// Encontrar próxima carga
	const proximaCarga = cargasOrdenadas[indexCargaAtual + 1];

	// Verificar se a próxima carga é deslocamento vazio
	const proximaCargaData = proximaCarga.tms_cargas;
	const isProximaDeslocamentoVazio = proximaCargaData && isDeslocamentoVazio(proximaCargaData);

	// Se próxima é deslocamento vazio → EM_VIAGEM, senão → EM_COLETA
	const proximoStatus: Viagem['ds_status'] = isProximaDeslocamentoVazio ? 'EM_VIAGEM' : 'EM_COLETA';

	return {
		proximoStatus,
		proximaCargaId: proximaCarga.id_carga,
		isUltimaCarga: false,
		mensagem: isProximaDeslocamentoVazio
			? 'Próxima carga é deslocamento vazio. Viagem irá para EM TRÂNSITO.'
			: 'Viagem avançará para coleta da próxima carga.',
	};
}

/**
 * Calcula estatísticas de uma viagem baseado nas cargas
 */
export function getViagemStats(viagem: Viagem): {
	totalCargas: number;
	cargasEntregues: number;
	cargasPendentes: number;
	cargaAtualSequencia: number | null;
	percentualConclusao: number;
} {
	if (!viagem.js_viagens_cargas || viagem.js_viagens_cargas.length === 0) {
		return {
			totalCargas: 0,
			cargasEntregues: 0,
			cargasPendentes: 0,
			cargaAtualSequencia: null,
			percentualConclusao: 0,
		};
	}

	const totalCargas = viagem.js_viagens_cargas.length;
	const cargasEntregues = viagem.js_viagens_cargas.filter(
		(vc) => vc.tms_cargas?.ds_status === 'ENTREGUE'
	).length;
	const cargasPendentes = totalCargas - cargasEntregues;

	// Encontrar carga atual (primeira não entregue)
	const cargasOrdenadas = [...viagem.js_viagens_cargas].sort((a, b) => a.nr_sequencia - b.nr_sequencia);
	const cargaAtual = cargasOrdenadas.find((vc) => vc.tms_cargas?.ds_status !== 'ENTREGUE');
	const cargaAtualSequencia = cargaAtual?.nr_sequencia ?? null;

	const percentualConclusao = totalCargas > 0 ? Math.round((cargasEntregues / totalCargas) * 100) : 0;

	return {
		totalCargas,
		cargasEntregues,
		cargasPendentes,
		cargaAtualSequencia,
		percentualConclusao,
	};
}
