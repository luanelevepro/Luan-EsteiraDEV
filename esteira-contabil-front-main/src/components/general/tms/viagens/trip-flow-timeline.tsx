import React from 'react';
import type { ViagemFluxoDTO } from '@/types/tms';
import { TripFlowItemCard } from './trip-flow-item-card';

interface TripFlowTimelineProps {
	fluxo: ViagemFluxoDTO;
	onIniciarItem: (itemId: string) => void;
	onFinalizarItem: (itemId: string) => void;
	onIniciarColeta: (cargaId: string) => void;
	onFinalizarColeta: (cargaId: string) => void;
	onIniciarEntrega: (entregaId: string) => void;
	onFinalizarEntrega: (params: {
		entregaId: string;
		comprovante?: { dt_entrega?: string; ds_comprovante_entrega?: string; ds_comprovante_key?: string };
	}) => void;
	loadingItemIniciar?: boolean;
	loadingItemFinalizar?: boolean;
	loadingColetaIniciar?: boolean;
	loadingColetaFinalizar?: boolean;
	loadingEntregaIniciar?: string | null;
	loadingEntregaFinalizar?: string | null;
	onOpenConclusaoEntrega?: (entregaId: string) => void;
}

/**
 * Timeline das ordens da viagem (esteira sequencial). Renderiza um card por item.
 */
export function TripFlowTimeline({
	fluxo,
	onIniciarItem,
	onFinalizarItem,
	onIniciarColeta,
	onFinalizarColeta,
	onIniciarEntrega,
	onFinalizarEntrega,
	loadingItemIniciar,
	loadingItemFinalizar,
	loadingColetaIniciar,
	loadingColetaFinalizar,
	loadingEntregaIniciar,
	loadingEntregaFinalizar,
	onOpenConclusaoEntrega,
}: TripFlowTimelineProps) {
	if (!fluxo?.itens?.length) return null;
	return (
		<div className="space-y-6">
			<div className="text-sm font-semibold text-muted-foreground">
				Fluxo da viagem — {fluxo.itens.length} item(ns)
			</div>
			{fluxo.itens.map((item) => (
				<TripFlowItemCard
					key={item.id}
					item={item}
					viagemId={fluxo.id_viagem}
					onIniciarItem={onIniciarItem}
					onFinalizarItem={onFinalizarItem}
					onIniciarColeta={onIniciarColeta}
					onFinalizarColeta={onFinalizarColeta}
					onIniciarEntrega={onIniciarEntrega}
					onFinalizarEntrega={onFinalizarEntrega}
					loadingItemIniciar={loadingItemIniciar}
					loadingItemFinalizar={loadingItemFinalizar}
					loadingColetaIniciar={loadingColetaIniciar}
					loadingColetaFinalizar={loadingColetaFinalizar}
					loadingEntregaIniciar={loadingEntregaIniciar}
					loadingEntregaFinalizar={loadingEntregaFinalizar}
					onOpenConclusaoEntrega={onOpenConclusaoEntrega}
				/>
			))}
		</div>
	);
}
