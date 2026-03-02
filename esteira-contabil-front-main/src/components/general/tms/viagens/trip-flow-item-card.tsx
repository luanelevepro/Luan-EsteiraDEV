import React from 'react';
import type { FluxoItemDTO } from '@/types/tms';
import { TripFlowActionButton } from './trip-flow-action-button';
import { CargoDeliveriesList } from './cargo-deliveries-list';
import { Truck, CheckCircle, Package } from 'lucide-react';

const statusLabels: Record<string, string> = {
	BLOQUEADO: 'Bloqueado',
	DISPONIVEL: 'Disponível',
	EM_DESLOCAMENTO: 'Em andamento',
	CONCLUIDO: 'Concluído',
};

interface TripFlowItemCardProps {
	item: FluxoItemDTO;
	viagemId: string;
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
 * Card de um item da esteira (trajeto vazio ou carga). Deslocamento vazio: Iniciar/Finalizar trajeto. Carga: Coleta + lista de entregas.
 */
export function TripFlowItemCard({
	item,
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
}: TripFlowItemCardProps) {
	const statusLabel = statusLabels[item.status_item] ?? item.status_item;
	const isVazio = item.tipo === 'DESLOCAMENTO_VAZIO';

	return (
		<div className="rounded-2xl border bg-card shadow-sm p-6">
			<div className="mb-4 flex items-center gap-3">
				{isVazio ? (
					<span className="rounded-lg bg-muted px-4 py-1.5 text-xs font-black tracking-wider text-muted-foreground uppercase">
						Deslocamento vazio
					</span>
				) : (
					<>
						<span className="rounded-lg border border-border bg-muted px-4 py-1.5 text-xs font-black tracking-wider text-muted-foreground uppercase">
							Carga #{item.nr_sequencia}
						</span>
						{item.carga?.cd_carga && (
							<span className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/80 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase">
								<Package size={10} /> {item.carga.cd_carga}
							</span>
						)}
					</>
				)}
				<span
					className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase ${
						item.status_item === 'CONCLUIDO'
							? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
							: item.status_item === 'EM_DESLOCAMENTO'
								? 'border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
								: item.status_item === 'DISPONIVEL'
									? 'border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
									: 'border border-border bg-muted text-muted-foreground'
					}`}
				>
					{statusLabel}
				</span>
			</div>

			{/* Ações do item */}
			<div className="mb-4 flex flex-wrap gap-2">
				{isVazio ? (
					<>
						<TripFlowActionButton
							label="Iniciar trajeto"
							canDo={item.canStart}
							blockedReason={item.blockedReason}
							loading={loadingItemIniciar}
							onClick={() => onIniciarItem(item.id)}
							icon={<Truck size={12} />}
						/>
						<TripFlowActionButton
							label="Finalizar trajeto"
							canDo={item.canFinish}
							blockedReason={item.blockedReason}
							loading={loadingItemFinalizar}
							onClick={() => onFinalizarItem(item.id)}
							icon={<CheckCircle size={12} />}
						/>
					</>
				) : (
					item.carga && (
						<>
							<TripFlowActionButton
								label="Iniciar item"
								canDo={item.canStart}
								blockedReason={item.blockedReason}
								loading={loadingItemIniciar}
								onClick={() => onIniciarItem(item.id)}
								icon={<Truck size={12} />}
							/>
							<TripFlowActionButton
								label="Iniciar coleta"
								canDo={item.carga.canStartColeta}
								blockedReason={item.carga.blockedReasonColeta}
								loading={loadingColetaIniciar}
								onClick={() => onIniciarColeta(item.carga!.id_carga)}
								icon={<Package size={12} />}
							/>
							<TripFlowActionButton
								label="Finalizar coleta"
								canDo={item.carga.canFinishColeta}
								blockedReason={item.carga.blockedReasonColeta}
								loading={loadingColetaFinalizar}
								onClick={() => onFinalizarColeta(item.carga!.id_carga)}
								icon={<CheckCircle size={12} />}
							/>
						</>
					)
				)}
			</div>

			{/* Lista de entregas (só para carga) */}
			{item.carga?.entregas?.length ? (
				<CargoDeliveriesList
					entregas={item.carga.entregas}
					cargaId={item.carga.id_carga}
					onIniciarEntrega={onIniciarEntrega}
					onFinalizarEntrega={onFinalizarEntrega}
					loadingIniciar={loadingEntregaIniciar}
					loadingFinalizar={loadingEntregaFinalizar}
					onOpenConclusaoModal={onOpenConclusaoEntrega}
				/>
			) : null}
		</div>
	);
}
