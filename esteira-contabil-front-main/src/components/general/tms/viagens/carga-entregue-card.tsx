import React from 'react';
import { Carga, Viagem } from '@/types/tms';
import { Eye, Copy, Truck, MapPin, Calendar } from 'lucide-react';

interface DeliveredLoadCardProps {
	load: Carga;
	trip?: Viagem;
	onViewDetails?: () => void;
}

export const DeliveredLoadCard: React.FC<DeliveredLoadCardProps> = ({ load, trip, onViewDetails }) => {
	// Formatar ID da carga 
	const formattedId = load.cd_carga;

	// Obter placas do veículo (verificar se trip existe)
	const vehiclePlates = trip
		? [
				trip.truckPlate || trip.ds_placa_cavalo,
				trip.trailer1Plate || trip.ds_placa_carreta_1,
				trip.trailer2Plate || trip.ds_placa_carreta_2,
				trip.trailer3Plate || trip.ds_placa_carreta_3,
			]
				.filter(Boolean)
				.join(' / ')
		: 'N/A';

	// Formatar data de coleta
	const collectionDate = load.collectionDate
		? new Date(load.collectionDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
		: '';

	const collectionTime = load.dt_coleta_inicio
		? new Date(load.dt_coleta_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
		: '';

	// Extrair etiquetas EPI e Ajudante dos requirements
	// const epiTag = load.requirements?.some((r) => r.includes('EPI')) ? 'EPI' : null;
	// const ajudanteTag = load.requirements?.some((r) => r.includes('Ajudante')) ? 'Ajudante' : null;

	return (
		<div className='rounded-lg border border-border bg-card p-4 opacity-75 shadow-sm transition-all hover:border-input hover:shadow-md'>
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
			{/* {(epiTag || ajudanteTag) && (
				<div className='mb-2 flex items-center gap-1.5'>
					{epiTag && <span className='rounded bg-muted-foreground px-2 py-0.5 text-[9px] font-bold text-white uppercase'>EPI</span>}
					{ajudanteTag && <span className='rounded bg-muted-foreground px-2 py-0.5 text-[9px] font-bold text-white uppercase'>Ajudante</span>}
				</div>
			)} */}
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
			{/* Data e Hora de Entrega - SEMPRE mostrar quando entregue */}
			{(() => {
				// Verificar se a carga está com status ENTREGUE
				const isCargaEntregue = load.ds_status === 'ENTREGUE';

				// Se carga está entregue: dt_entregue_em > max(dt_entrega das entregas) > dt_updated
				if (isCargaEntregue) {
					const entregasComDt = load.js_entregas?.filter((e) => e.dt_entrega) ?? [];
					const maxDtEntrega =
						entregasComDt.length > 0
							? entregasComDt.reduce<string>(
									(latest, e) =>
										new Date(e.dt_entrega!) > new Date(latest) ? e.dt_entrega! : latest,
									entregasComDt[0].dt_entrega!,
								)
							: null;
					const raw = load.dt_entregue_em ?? maxDtEntrega ?? load.dt_updated;
					const deliveryDateTime = raw ? new Date(raw) : new Date();
					const deliveryDate = deliveryDateTime.toLocaleDateString('pt-BR', {
						day: '2-digit',
						month: '2-digit',
					});
					const deliveryTime = deliveryDateTime.toLocaleTimeString('pt-BR', {
						hour: '2-digit',
						minute: '2-digit',
					});

					return (
						<div className='mb-2 flex items-center gap-2'>
							<Calendar size={14} className='shrink-0 text-green-500' />
							<span className='text-[11px] font-medium text-green-600'>
								Entregue: {deliveryDate}, {deliveryTime}
							</span>
						</div>
					);
				}

				// Se não está entregue, mostra deadline previsto
				const deadline = load.dt_limite_entrega;
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

				// Versão anterior com trip.status e proofOfDelivery (mantida para referência)
				// if (trip.status === 'Completed') {
				// 	const completionDate = trip.proofOfDelivery ? new Date(trip.proofOfDelivery) : new Date();
				// 	const deliveryDate = completionDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
				// 	const deliveryTime = completionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
				// 	return (
				// 		<div className='mb-2 flex items-center gap-2'>
				// 			<Calendar size={14} className='shrink-0 text-green-500' />
				// 			<span className='text-[11px] font-medium text-green-600'>
				// 				Entregue: {deliveryDate}, {deliveryTime}
				// 			</span>
				// 		</div>
				// 	);
				// }

				return null;
			})()}{' '}
			{/* Descrição */}
			{load.ds_observacoes && (
				<div className='mb-3 flex items-start gap-2'>
					<div className='mt-0.5 h-4 w-0.5 shrink-0 bg-muted'></div>
					<span className='text-[10px] leading-relaxed text-muted-foreground italic'>{load.ds_observacoes}</span>
				</div>
			)}
			{/* Status de Entregue */}
			<div className='mt-3 flex justify-end border-t border-border/70 pt-3'>
				<span className='inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200'>
					<span className='h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 dark:bg-emerald-300' />
					Entregue
				</span>
			</div>
		</div>
	);
};
