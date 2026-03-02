import React from 'react';
import { Carga, Viagem } from '@/types/tms';
import { Eye, Copy, Truck, MapPin, Calendar } from 'lucide-react';
import { CargaActionButtons } from './carga-action-buttons';

interface ScheduledLoadCardProps {
	load: Carga;
	trip: Viagem;
	hasActiveRoute?: boolean; // Indica se há outra viagem ativa para o veículo
	isActiveCarga?: boolean; // Se é a primeira carga (ativa) da viagem
	onViewDetails?: () => void;
	onStartCollection?: () => void;
	onStatusUpdate?: () => void;
}

export const ScheduledLoadCard: React.FC<ScheduledLoadCardProps> = ({
	load,
	trip,
	hasActiveRoute = false,
	isActiveCarga = false,
	onViewDetails,
	onStartCollection,
	onStatusUpdate,
}) => {
	// Extrai a menor data de entrega da carga (usando js_entregas)
	const getEarliestDeadline = (load: Carga): string | undefined => {
		if (load.js_entregas && load.js_entregas.length > 0) {
			const sorted = [...load.js_entregas].sort((a, b) => (a.nr_sequencia ?? 0) - (b.nr_sequencia ?? 0));
			const firstWith = sorted.find((e) => !!e.dt_limite_entrega);
			if (firstWith?.dt_limite_entrega) return firstWith.dt_limite_entrega;
		}

		// fallback: nenhuma data encontrada nas entregas
		return undefined;
	};
	// Formatar ID da carga
	const formattedId = load.id.includes('SHP') ? load.cd_carga : `${load.cd_carga.replace(/\D/g, '').substring(0, 6)}`;

	// Obter placas do veículo
	const vehiclePlates = [trip.ds_placa_cavalo, trip.ds_placa_carreta_1, trip.ds_placa_carreta_2, trip.ds_placa_carreta_3]
		.filter(Boolean)
		.join(' / ');

	// Formatar data de coleta
	const collectionDate = load.dt_coleta_inicio
		? new Date(load.dt_coleta_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
		: '';

	const collectionTime = load.dt_coleta_inicio
		? new Date(load.dt_coleta_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
		: '';

	return (
		<div className='rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-input hover:shadow-md'>
			{/* Cabeçalho: ID + Tipo + Ícones */}
			<div className='mb-3 flex items-start justify-between'>
				<div className='flex flex-col'>
					<span className='text-[10px] font-medium text-muted-foreground'>#{formattedId}</span>
<span className='text-[11px] font-black tracking-tight text-blue-700 dark:text-blue-300 uppercase'>
					{load.ds_tipo_carroceria?.replace(/_/g, ' ') || 'CARGA GERAL'}
				</span>
				</div>

				<div className='flex items-center gap-1 text-muted-foreground opacity-60 transition-opacity hover:opacity-100'>
					<button onClick={onViewDetails} className='rounded-md p-1 transition-colors hover:bg-muted' title='Visualizar'>
						<Eye size={14} />
					</button>
					<button
						className='rounded-md p-1 transition-colors hover:bg-muted'
						title='Copiar'
						onClick={() => navigator.clipboard.writeText(load.id)}
					>
						<Copy size={14} />
					</button>
				</div>
			</div>

			{/* Nome do Cliente */}
			<div className='mb-2'>
				<h3 className='text-base leading-tight font-black text-foreground'>{load.clientName}</h3>
			</div>

			{/* Etiquetas EPI e Ajudante */}
			{/* {(() => {
				const epiTag = load.requirements?.some((r) => r.includes('EPI')) ? 'EPI' : null;
				const ajudanteTag = load.requirements?.some((r) => r.includes('Ajudante')) ? 'Ajudante' : null;
				return epiTag || ajudanteTag ? (
					<div className='mb-2 flex items-center gap-1.5'>
						{epiTag && <span className='rounded bg-muted-foreground px-2 py-0.5 text-[9px] font-bold text-white uppercase'>EPI</span>}
						{ajudanteTag && (
							<span className='rounded bg-muted-foreground px-2 py-0.5 text-[9px] font-bold text-white uppercase'>Ajudante</span>
						)}
					</div>
				) : null;
			})()} */}

			{/* Veículo - Destacado (mesmo padrão da coluna Veículos Disponíveis) */}
			<div className='mb-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2.5'>
				<div className='flex items-center gap-2'>
					<Truck size={16} className='shrink-0 text-blue-700 dark:text-blue-300' />
					<span className='font-mono text-[12px] font-black tracking-wide text-blue-700 dark:text-blue-300'>{vehiclePlates}</span>
				</div>
			</div>

			{/* Rota */}
			<div className='mb-2 flex items-center gap-2'>
				<MapPin size={14} className='shrink-0 text-muted-foreground' />
				<span className='text-[11px] font-medium text-foreground/90'>
					{`${load.sis_cidade_destino?.ds_city}-${load.sis_cidade_destino?.js_uf?.ds_uf}` || 'Destino Indefinido'}
				</span>
			</div>

			{/* Data e Hora de Coleta */}
			{collectionDate && (
				<div className='mb-2 flex items-center gap-2'>
					<Calendar size={14} className='shrink-0 text-orange-500' />
					<span className='text-[11px] font-medium text-orange-600'>
						Coleta: {collectionDate}
						{collectionTime ? `, ${collectionTime}` : ''}
					</span>
				</div>
			)}

			{/* Data e Hora de Entrega */}
			{(() => {
				// Verificar se há entrega concluída nas legs da viagem
				// const deliveredDelivery = trip.cargas?.flatMap((c) => c || []).find((d) => d.ds_status === 'ENTREGUE');

				// Tentar obter deliveryDeadline do load a partir das entregas (js_entregas)
				const deadline = getEarliestDeadline(load);

				// Se há entrega concluída, usar data real
				// if (deliveredDelivery?.deliveryDate) {
				// 	const deliveryDate = new Date(deliveredDelivery.deliveryDate).toLocaleDateString('pt-BR', {
				// 		day: '2-digit',
				// 		month: '2-digit',
				// 	});
				// 	const deliveryTime = new Date(deliveredDelivery.deliveryDate).toLocaleTimeString('pt-BR', {
				// 		hour: '2-digit',
				// 		minute: '2-digit',
				// 	});

				// 	return (
				// 		<div className='mb-2 flex items-center gap-2'>
				// 			<Calendar size={14} className='shrink-0 text-green-500' />
				// 			<span className='text-[11px] font-medium text-green-600'>
				// 				Entregue: {deliveryDate}, {deliveryTime}
				// 			</span>
				// 		</div>
				// 	);
				// }

				// Se não há entrega concluída mas há deadline previsto
				if (deadline) {
					const deliveryDate = new Date(deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
					const deliveryTime = new Date(deadline).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

					return (
						<div className='mb-2 flex items-center gap-2'>
							<Calendar size={14} className='shrink-0 text-green-500' />
							<span className='text-[11px] font-medium text-green-600'>
								Entrega prevista: {deliveryDate}, {deliveryTime}
							</span>
						</div>
					);
				}

				// Se não tem nenhuma data, calcular estimativa baseada na coleta + 1 dia
				if (collectionDate) {
					const collectionDateTime = load.dt_coleta_inicio
						? new Date(load.dt_coleta_inicio)
						: load.dt_coleta_inicio
							? new Date(load.dt_coleta_inicio)
							: null;

					if (collectionDateTime) {
						// Adicionar 1 dia como estimativa padrão
						const estimatedDelivery = new Date(collectionDateTime);
						estimatedDelivery.setDate(estimatedDelivery.getDate() + 1);

						const deliveryDate = estimatedDelivery.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
						const deliveryTime = estimatedDelivery.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

						return (
							<div className='mb-2 flex items-center gap-2'>
								<Calendar size={14} className='shrink-0 text-green-500' />
								<span className='text-[11px] font-medium text-green-600'>
									Entrega prevista: {deliveryDate}, {deliveryTime}
								</span>
							</div>
						);
					}
				}

				return null;
			})()}

			{/* Descrição */}
			{load.ds_observacoes && (
				<div className='mb-3 flex items-start gap-2'>
					<div className='mt-0.5 h-4 w-0.5 shrink-0 bg-muted'></div>
					<span className='text-[10px] leading-relaxed text-muted-foreground italic'>{load.ds_observacoes}</span>
				</div>
			)}

			{/* Status ou Ação */}
			{hasActiveRoute ? (
				<div className='mt-3 border-t border-border/70 pt-3'>
					<div className='rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2'>
						<span className='text-[10px] font-bold text-red-700 dark:text-red-300'>Veículo em rota ativa (Aguarde finalizar)</span>
					</div>
				</div>
			) : isActiveCarga ? (
				<div className='mt-3 border-t border-border/70 pt-3'>
					<CargaActionButtons
						carga={load}
						viagem={trip}
						isActiveCarga={isActiveCarga}
						isDeslocamentoVazio={load.fl_deslocamento_vazio === true || load.cd_carga === 'DESLOCAMENTO_VAZIO'}
						onStatusUpdate={onStatusUpdate}
					/>
				</div>
			) : (
				<div className='mt-3 border-t border-border/70 pt-3'>
					<button
						onClick={onStartCollection}
						className='w-full rounded-lg bg-muted py-2.5 text-[11px] font-bold text-foreground/90 uppercase transition-colors hover:bg-muted'
					>
						Iniciar Coleta
					</button>
				</div>
			)}
		</div>
	);
};
