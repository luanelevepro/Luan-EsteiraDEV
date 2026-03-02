import React from 'react';
import type { FluxoEntregaDTO } from '@/types/tms';
import { TripFlowActionButton } from './trip-flow-action-button';
import { deliveryStatusLabelPt } from './status-viagens';
import { CheckCircle, Truck } from 'lucide-react';

interface CargoDeliveriesListProps {
	entregas: FluxoEntregaDTO[];
	cargaId: string;
	onIniciarEntrega: (entregaId: string) => void;
	onFinalizarEntrega: (params: {
		entregaId: string;
		comprovante?: { dt_entrega?: string; ds_comprovante_entrega?: string; ds_comprovante_key?: string };
	}) => void;
	loadingIniciar?: string | null;
	loadingFinalizar?: string | null;
	onOpenConclusaoModal?: (entregaId: string) => void;
}

/**
 * Lista sequencial de entregas da carga com botões Iniciar rota / Finalizar (etapa a etapa).
 */
export function CargoDeliveriesList({
	entregas,
	onIniciarEntrega,
	onFinalizarEntrega,
	loadingIniciar,
	loadingFinalizar,
	onOpenConclusaoModal,
}: CargoDeliveriesListProps) {
	if (!entregas?.length) return null;
	return (
		<div className="space-y-3 pl-2">
			<div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
				Entregas
			</div>
			{entregas.map((e, index) => {
				const isUltimaEntrega = index === entregas.length - 1;
				const labelFinalizar =
					e.ds_status === 'EM_TRANSITO' && isUltimaEntrega ? 'Finalizar rota' : 'Finalizar entrega';
				return (
					<div
						key={e.id}
						className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-3"
					>
						<span className="text-xs font-semibold text-foreground">
							#{e.nr_sequencia} — {deliveryStatusLabelPt(e.ds_status)}
						</span>
						{e.ds_status === 'ENTREGUE' && (
							<CheckCircle className="h-4 w-4 text-emerald-600" aria-hidden />
						)}
						<div className="ml-auto flex gap-2">
							{e.ds_status === 'PENDENTE' && (
								<TripFlowActionButton
									label="Iniciar rota"
									canDo={e.canStart}
									blockedReason={e.blockedReason}
									loading={loadingIniciar === e.id}
									onClick={() => onIniciarEntrega(e.id)}
									icon={<Truck size={12} />}
								/>
							)}
							{e.ds_status === 'EM_TRANSITO' && (
								<TripFlowActionButton
									label={labelFinalizar}
									canDo={e.canFinish}
									blockedReason={e.blockedReason}
									loading={loadingFinalizar === e.id}
									onClick={() => onOpenConclusaoModal?.(e.id) ?? onFinalizarEntrega({ entregaId: e.id })}
									icon={<CheckCircle size={12} />}
								/>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
