import React from 'react';
import { Carga } from '@/types/tms';
import { Eye, MapPin, Calendar, Truck, Copy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/general/tms/viagens/status-viagens';

/** Origem para exibição: sis_cidade_origem ou, se vazio, município/UF do emitente do primeiro CTe/NFe. */
function getOrigemDisplay(load: Carga): string {
	if (load.sis_cidade_origem?.ds_city) {
		const uf = load.sis_cidade_origem?.js_uf?.ds_uf ?? '';
		return uf ? `${load.sis_cidade_origem.ds_city}-${uf}` : load.sis_cidade_origem.ds_city;
	}
	const entregas = load.js_entregas as Array<Record<string, unknown>> | undefined;
	if (entregas?.length) {
		for (const ent of entregas) {
			const cte = (ent.js_entregas_ctes as Array<{ js_cte?: Record<string, unknown> }> | undefined)?.[0]?.js_cte;
			if (cte?.ds_nome_mun_ini || cte?.ds_uf_ini) {
				return [cte.ds_nome_mun_ini, cte.ds_uf_ini].filter(Boolean).join('/') as string;
			}
			const nfe = (ent.js_entregas_nfes as Array<{ js_nfe?: Record<string, unknown> }> | undefined)?.[0]?.js_nfe;
			if (nfe?.ds_municipio_emitente || nfe?.ds_uf_emitente) {
				return [nfe.ds_municipio_emitente, nfe.ds_uf_emitente].filter(Boolean).join(' - ') as string;
			}
		}
	}
	return 'Origem Indefinida';
}

interface LoadCardProps {
	load: Carga;
	onViewDetails?: (load: Carga) => void;
	onSchedule?: (load: Carga) => void;
}

export const LoadCard: React.FC<LoadCardProps> = ({ load, onViewDetails, onSchedule }) => {
	// Usar cd_carga da API ou fallback para ID formatado
	const controlNumber = load.cd_carga || `CRG-${load.id.slice(0, 8).toUpperCase()}`;

	// Contar entregas e documentos
	const entregasCount = load.js_entregas?.length || 0;
	const totalCtes = load.js_entregas?.reduce((acc, e) => acc + (e.js_entregas_ctes?.length || 0), 0) || 0;
	const totalNfes = load.js_entregas?.reduce((acc, e) => acc + (e.js_entregas_nfes?.length || 0), 0) || 0;

	return (
		<div className='group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md'>
			{/* Top Bar: Control Number + Icons + Status */}
			<div className='flex items-start justify-between'>
				<div className='flex flex-col'>
					<span className='text-[10px] font-medium text-muted-foreground'>#{controlNumber}</span>
					<span className='text-[11px] font-black tracking-tight text-blue-600 dark:text-blue-300 uppercase'>
						{load.ds_tipo_carroceria?.replace(/_/g, ' ') || 'CARGA GERAL'}
					</span>
				</div>

				<div className='flex items-center gap-2'>
					<div className='flex items-center gap-1 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100'>
						<button
							onClick={() => onViewDetails?.(load)}
							className='rounded-md p-1 transition-colors hover:bg-muted'
							title='Visualizar'
						>
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
					<StatusBadge status={load.ds_status} context='carga' size='sm' className='flex h-5 items-center' />
				</div>
			</div>

			{/* Main Info: Client or DESLOCAMENTO_VAZIO */}
			<div>
				<h3
					className='truncate text-sm leading-tight font-black text-foreground'
					title={(load.fis_clientes ?? load.tms_clientes)?.ds_nome || 'Deslocamento Vazio'}
				>
					{(load.fis_clientes ?? load.tms_clientes)?.ds_nome || (load.fl_deslocamento_vazio === true || load.cd_carga === 'DESLOCAMENTO_VAZIO' ? 'Deslocamento Vazio' : 'Sem Cliente')}
				</h3>
				<div className='mt-1 flex items-center gap-1.5 text-muted-foreground'>
					<Truck size={12} strokeWidth={2.5} />
					<span className='text-[11px] font-medium italic'>
						{load.tms_motoristas_veiculos?.tms_veiculos?.ds_placa || 'Sem veículo atribuído'}
					</span>
				</div>
			</div>

			{/* Route: Origin -> Dest */}
			<div className='flex items-start gap-2 py-1'>
				<MapPin size={14} className='mt-0.5 shrink-0 text-muted-foreground' />
				<div className='text-[11px] leading-tight font-bold text-muted-foreground'>
					{getOrigemDisplay(load)}{' '}
					<span className='px-0.5 font-medium text-muted-foreground'>→</span>
					{load.sis_cidade_destino?.ds_city && load.sis_cidade_destino?.js_uf?.ds_uf
						? `${load.sis_cidade_destino.ds_city}-${load.sis_cidade_destino.js_uf.ds_uf}`
						: load.sis_cidade_destino?.ds_city || 'Destino Indefinido'}
				</div>
			</div>

			{/* Entregas e Documentos Summary */}
			{entregasCount > 0 && (
				<div className='flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2'>
					<span className='text-[10px] font-bold text-muted-foreground'>
						{entregasCount} {entregasCount === 1 ? 'Entrega' : 'Entregas'}
					</span>
					{totalCtes > 0 && (
						<span className='rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:text-blue-300'>
							{totalCtes} CT-e{totalCtes > 1 ? 's' : ''}
						</span>
					)}
					{totalNfes > 0 && (
						<span className='rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold text-purple-700 dark:text-purple-300'>
							{totalNfes} NF-e{totalNfes > 1 ? 's' : ''}
						</span>
					)}
				</div>
			)}

			{/* Date */}
			{load.dt_coleta_inicio && load.dt_coleta_fim && (
				<div className='flex items-center gap-2 text-[11px] font-bold text-orange-700 dark:text-orange-300'>
					<Calendar size={13} strokeWidth={2.5} />
					<span>
						Coleta:{' '}
						{`${new Date(load.dt_coleta_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}-${new Date(load.dt_coleta_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
					</span>
				</div>
			)}

			{/* Observation (Subtle) */}
			{load.ds_observacoes && (
				<div className='line-clamp-1 border-l-2 border-border/70 py-0.5 pl-2 text-[10px] text-muted-foreground italic'>
					{load.ds_observacoes}
				</div>
			)}

			{/* Action Button */}
			{load.tms_motoristas_veiculos?.tms_veiculos?.ds_placa && load.ds_status === 'PENDENTE' ? (
				<Button
					onClick={() => onSchedule?.(load)}
					variant='secondary'
					className='mt-1 h-9 w-full rounded-lg border border-border bg-muted/60 text-[11px] font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
				>
					Programar Veículo
				</Button>
			) : (
				<Button disabled variant='secondary' className='mt-1 h-9 w-full rounded-lg border border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase'>
					<Info size={14} className='mr-1' />
					Vincule a Carga a uma viagem
				</Button>
			)}
		</div>
	);
};
