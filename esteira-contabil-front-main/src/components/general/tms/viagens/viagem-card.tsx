import React from 'react';
import { Viagem } from '@/types/tms';
import { Truck, Calendar, ChevronRight, Eye } from 'lucide-react';
import { formatBusinessDate } from '@/lib/utils';

interface TripCardProps {
	trip: Viagem;
	statusLabel?: string;
	statusColor?: string; // Padrão dark-safe: border-*-500/30 bg-*-500/10 text-*-700 dark:text-*-300
	onViewDetails?: (trip: Viagem) => void;
	actionButton?: React.ReactNode;
	showProgress?: boolean; // Prop to potentially show progress bar if needed, though LoadCard doesn't have it prominent
}

export const ViagemCard: React.FC<TripCardProps> = ({
	trip,
	statusLabel,
	statusColor = 'text-muted-foreground border-border bg-muted/40',
	onViewDetails,
	actionButton,
}) => {
	// Format ID usando cd_viagem
	const displayId = trip.cd_viagem || `VG-${trip.id.slice(0, 8).toUpperCase()}`;

	// Contar cargas, entregas e documentos
	const cargasCount = trip.js_viagens_cargas?.length || 0;
	const totalEntregas = trip.js_viagens_cargas?.reduce((acc, vc) => acc + (vc.tms_cargas?.js_entregas?.length || 0), 0) || 0;
	const totalCtes =
		trip.js_viagens_cargas?.reduce((acc, vc) => {
			const entregas = vc.tms_cargas?.js_entregas || [];
			return acc + entregas.reduce((sum, e) => sum + (e.js_entregas_ctes?.length || 0), 0);
		}, 0) || 0;
	const totalNfes =
		trip.js_viagens_cargas?.reduce((acc, vc) => {
			const entregas = vc.tms_cargas?.js_entregas || [];
			return acc + entregas.reduce((sum, e) => sum + (e.js_entregas_nfes?.length || 0), 0);
		}, 0) || 0;

	// Get origin and destination from cargas
	const getOrigemFromCargas = () => {
		if (!trip.js_viagens_cargas || trip.js_viagens_cargas.length === 0) {
			return '...';
		}

		// Sort by nr_sequencia e pega a primeira carga
		const sorted = [...trip.js_viagens_cargas].sort((a, b) => (a?.nr_sequencia || 0) - (b?.nr_sequencia || 0));
		const firstCarga = sorted[0]?.tms_cargas;

		if (!firstCarga?.sis_cidade_origem) return '...';

		return firstCarga.sis_cidade_origem.js_uf
			? `${firstCarga.sis_cidade_origem.ds_city}-${firstCarga.sis_cidade_origem.js_uf.ds_uf}`
			: firstCarga.sis_cidade_origem.ds_city;
	};

	const getDestinoFromCargas = () => {
		if (!trip.js_viagens_cargas || trip.js_viagens_cargas.length === 0) {
			return '...';
		}

		// Pega o destino da última entrega da última carga
		const sorted = [...trip.js_viagens_cargas].sort((a, b) => (b?.nr_sequencia || 0) - (a?.nr_sequencia || 0));
		const lastCarga = sorted[0]?.tms_cargas;

		if (!lastCarga?.js_entregas || lastCarga.js_entregas.length === 0) {
			// Fallback para destino da carga se não houver entregas
			if (!lastCarga?.sis_cidade_destino) return '...';
			return lastCarga.sis_cidade_destino.js_uf
				? `${lastCarga.sis_cidade_destino.ds_city}-${lastCarga.sis_cidade_destino.js_uf.ds_uf}`
				: lastCarga.sis_cidade_destino.ds_city;
		}

		// Sort entregas by nr_sequencia e pega a última
		const sortedEntregas = [...lastCarga.js_entregas].sort((a, b) => (b?.nr_sequencia || 0) - (a?.nr_sequencia || 0));
		const lastEntrega = sortedEntregas[0];

		if (!lastEntrega?.sis_cidade_destino) return '...';

		return lastEntrega.sis_cidade_destino.js_uf
			? `${lastEntrega.sis_cidade_destino.ds_city}-${lastEntrega.sis_cidade_destino.js_uf.ds_state}`
			: lastEntrega.sis_cidade_destino.ds_city;
	};

	const origemAtual = getOrigemFromCargas();
	const finalDest = getDestinoFromCargas();

	return (
		<div className='group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md'>
			{/* Header: ID + Badges + Status */}
			<div className='mb-1 flex items-start justify-between'>
				<div className='flex flex-col gap-1'>
					<span className='text-[10px] font-medium text-muted-foreground'>#{displayId}</span>

					{/* Management Badges */}
					<div className='flex flex-wrap items-center gap-1.5'>
						{cargasCount > 0 && (
							<span
								className='flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground'
								title='Cargas'
							>
								{cargasCount} {cargasCount === 1 ? 'Carga' : 'Cargas'}
							</span>
						)}
						{totalEntregas > 0 && (
							<span
								className='flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:text-blue-300'
								title='Entregas'
							>
								{totalEntregas} {totalEntregas === 1 ? 'Entrega' : 'Entregas'}
							</span>
						)}
						{totalCtes > 0 && (
							<span className='flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:text-purple-300'>
								{totalCtes} CT-e{totalCtes > 1 ? 's' : ''}
							</span>
						)}
						{totalNfes > 0 && (
							<span className='flex items-center gap-1 rounded border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold text-green-700 dark:text-green-300'>
								{totalNfes} NF-e{totalNfes > 1 ? 's' : ''}
							</span>
						)}
					</div>
				</div>

				<div className='flex items-center gap-2'>
					<div className='flex items-center gap-1 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100'>
						<button
							onClick={() => onViewDetails?.(trip)}
							className='rounded-md p-1 transition-colors hover:bg-muted'
							title='Visualizar'
						>
							<Eye size={14} />
						</button>
					</div>
					{statusLabel && (
						<div
							className={`flex h-5 items-center gap-1 rounded-md border px-2 py-0 text-[10px] font-bold whitespace-nowrap ${statusColor}`}
						>
							<span className={`h-1.5 w-1.5 rounded-full bg-current`}></span>
							{statusLabel}
						</div>
					)}
				</div>
			</div>

			{/* Main Info: Driver & Plate */}
			<div>
				<div className='mb-2 flex items-center gap-3'>
					<div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-black text-muted-foreground uppercase'>
						{trip.ds_motorista?.charAt(0) || '?'}
					</div>
					<div className='flex flex-col'>
						<h3 className='truncate text-sm leading-tight font-black text-foreground' title={trip.ds_motorista}>
							{trip.ds_motorista || 'Motorista não definido'}
						</h3>
						<div className='mt-0.5 flex items-center gap-1.5'>
							<Truck size={12} className='text-muted-foreground' />
							<span className='rounded border border-blue-500/30 bg-blue-500/10 px-1.5 text-[11px] font-black tracking-tight text-blue-700 dark:text-blue-300 uppercase'>
								{trip.ds_placa_cavalo || 'SEM PLACA'}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Route - Restored "Box" Style but cleaner */}
			<div className='space-y-2 rounded-lg border border-border/70 bg-muted/50 p-3'>
				<div className='flex items-center gap-2'>
					<div className='h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground'></div>
					<span className='text-xs leading-none font-bold tracking-wide text-foreground/90 uppercase'>{origemAtual}</span>
				</div>
				<div className='flex items-center gap-2'>
					<ChevronRight size={14} className='ml-0.5 shrink-0 text-muted-foreground' />
					<span className='text-xs leading-none font-black tracking-wide text-foreground uppercase'>{finalDest}</span>
				</div>
			</div>

			{/* Date/Time */}
			{trip.dt_agendada && (
				<div className='flex items-center gap-2 px-1 text-[11px] font-bold text-muted-foreground'>
					<Calendar size={13} strokeWidth={2.5} />
					<span>Agendada: {formatBusinessDate(trip.dt_agendada)}</span>
				</div>
			)}

			{/* Action Button */}
			{actionButton && <div className='mt-1 w-full'>{actionButton}</div>}
		</div>
	);
};
