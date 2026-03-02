import React from 'react';
import { Carga, Viagem } from '@/types/tms';
import { Eye, Copy, Truck, MapPin, Calendar } from 'lucide-react';
import { CargaActionButtons } from './carga-action-buttons';

interface InTransitLoadCardProps {
	load: Carga;
	trip?: Viagem;
	progress?: number;
	isActiveCarga?: boolean; // Se é a primeira carga (ativa) da viagem
	onViewDetails?: () => void;
	onFinishTrip?: () => void;
	onStatusUpdate?: () => void;
}

export const InTransitLoadCard: React.FC<InTransitLoadCardProps> = ({
	load,
	trip,
	progress = 0,
	isActiveCarga = false,
	onViewDetails,
	onFinishTrip,
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
				<h3 className='text-base leading-tight font-black text-foreground'>{(load.fis_clientes ?? load.tms_clientes)?.ds_nome}</h3>
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
			{/* Data e Hora de Entrega */}
			{(() => {
				// Verificar se a carga está com status ENTREGUE
				const isCargaEntregue = load.ds_status === 'ENTREGUE';

				// Tentar obter dt_limite_entrega do load a partir das entregas (js_entregas)
				const deadline = getEarliestDeadline(load);

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

				// Se não está entregue mas há deadline previsto
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

				// Se não tem deadline, calcular estimativa baseada na coleta + 1 dia
				if (load.dt_coleta_inicio) {
					const collectionDateTime = new Date(load.dt_coleta_inicio);

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

				return null;
			})()}{' '}
			{/* Descrição */}
			{load.ds_observacoes && (
				<div className='mb-3 flex items-start gap-2'>
					<div className='mt-0.5 h-4 w-0.5 shrink-0 bg-muted'></div>
					<span className='text-[10px] leading-relaxed text-muted-foreground italic'>{load.ds_observacoes}</span>
				</div>
			)}
			{/* Barra de Progresso */}
			<div className='mb-3'>
				<div className='mb-1 flex items-center justify-between'>
					<span className='text-[10px] font-bold text-muted-foreground uppercase'>Progresso</span>
					<span className='text-[10px] font-black text-green-600'>{progress}%</span>
				</div>
				<div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
					<div className='h-full rounded-full bg-green-500 transition-all duration-500' style={{ width: `${progress}%` }} />
				</div>
			</div>
			{/* Botão de Ação */}
			<div className='mt-3 border-t border-border/70 pt-3'>
				{isActiveCarga ? (
					trip ? (
						<CargaActionButtons
							carga={load}
							viagem={trip}
							isActiveCarga={isActiveCarga}
							isDeslocamentoVazio={load.fl_deslocamento_vazio === true || load.cd_carga === 'DESLOCAMENTO_VAZIO'}
							onStatusUpdate={onStatusUpdate}
						/>
					) : null
				) : (
					<button
						onClick={onFinishTrip}
						className='w-full rounded-lg border border-border bg-muted/60 py-2.5 text-[11px] font-bold uppercase text-foreground shadow-sm transition-colors hover:bg-muted'
					>
						Finalizar Viagem
					</button>
				)}
			</div>
		</div>
	);
};
