import React from 'react';
import { Carga, Viagem } from '@/types/tms';
import { Package, FileText, CheckCircle, AlertCircle, MapPin, Calendar, Eye, Download, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadCardInTripProps {
	load: Carga;
	tripId: string;
	trip?: Viagem | null;
	onEmitFiscal?: (loadId: string) => void;
	isExpanded?: boolean;
	onToggleExpand?: () => void;
	showProgress?: boolean; // Para mostrar barra de progresso quando em coleta
	progress?: number; // Percentual de progresso (0-100)
	onViewDetails?: () => void; // Handler para visualizar detalhes
	onDownloadPDF?: () => void; // Handler para baixar PDF
	onFinalizarCarga?: () => void;
	isFinalizarCargaPending?: boolean;
}

/**
 * Card de Carga dentro de uma Viagem
 * Mostra o ciclo de vida fiscal da carga e permite emitir CT-e
 */
export const LoadCardInTrip: React.FC<LoadCardInTripProps> = ({
	load,
	onEmitFiscal,
	isExpanded = false,
	onToggleExpand,
	showProgress = false,
	progress = 0,
	onViewDetails,
	onDownloadPDF,
	onFinalizarCarga,
	isFinalizarCargaPending = false,
}) => {
	const hasCTe = load.cte && load.cte.status === 'Authorized';
	const hasMDFe = load.mdfe && load.mdfe.status === 'Authorized';

	// Validação para habilitar/desabilitar botão de fiscal (EM_COLETA tratado como AGENDADA)
	const canEmitFiscal = load.ds_status === 'AGENDADA' || load.ds_status === 'EM_COLETA' || (load.ds_status === 'EM_TRANSITO' && !hasMDFe);

	// Determina o status visual da carga baseado no status e CT-e (padrão dark-safe)
	const getLoadStatusInfo = () => {
		if (load.ds_status === 'ENTREGUE') {
			return {
				label: 'Entregue',
				color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
				iconColor: 'text-emerald-700 dark:text-emerald-300',
				icon: CheckCircle,
			};
		}
		if (load.ds_status === 'EM_TRANSITO' && hasCTe && hasMDFe) {
			return {
				label: 'Fiscal OK',
				color: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300',
				iconColor: 'text-green-700 dark:text-green-300',
				icon: CheckCircle,
			};
		}
		if (load.ds_status === 'EM_TRANSITO' && hasCTe && !hasMDFe) {
			return {
				label: 'CT-e OK | MDF-e Pend.',
				color: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
				iconColor: 'text-blue-700 dark:text-blue-300',
				icon: FileText,
			};
		}
		if (load.ds_status === 'AGENDADA') {
			return {
				label: 'Agendada',
				color: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
				iconColor: 'text-blue-700 dark:text-blue-300',
				icon: Package,
			};
		}
		if (load.ds_status === 'EM_COLETA') {
			return {
				label: 'Em Coleta',
				color: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
				iconColor: 'text-orange-700 dark:text-orange-300',
				icon: Package,
			};
		}
		if (load.ds_status === 'PENDENTE') {
			return { label: 'Pendente', color: 'border-border bg-muted/40 text-muted-foreground', iconColor: 'text-muted-foreground', icon: Package };
		}
		// EM_TRANSITO (Em Rota) → roxo, alinhado à torre de controle
		if (load.ds_status === 'EM_TRANSITO') {
			return {
				label: 'Em Rota',
				color: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
				iconColor: 'text-purple-700 dark:text-purple-300',
				icon: Package,
			};
		}
		return { label: load.ds_status, color: 'border-border bg-muted/40 text-muted-foreground', iconColor: 'text-muted-foreground', icon: Package };
	};

	const statusInfo = getLoadStatusInfo();
	const StatusIcon = statusInfo.icon;

	return (
		<div className='rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-input hover:shadow-md'>
			{/* Header: Status + Cliente + Ícones de Ação */}
			<div className='mb-3 flex items-start justify-between'>
				<div className='flex-1'>
					<div className='mb-1 flex items-center gap-2'>
						<StatusIcon size={16} className={statusInfo.iconColor ?? 'text-muted-foreground'} />
						<span className={`rounded-md border px-2 py-1 text-xs font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
						{load.id_segmento && (
							<span className='rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase'>
								{load.tms_segmentos?.ds_nome}
							</span>
						)}
					</div>
					<div className='text-sm font-bold text-foreground'>{(load.fis_clientes ?? load.tms_clientes)?.ds_nome}</div>
				</div>
				<div className='flex items-center gap-2'>
					{/* Ícones de visualizar e baixar PDF */}
					<div className='flex items-center gap-1 text-muted-foreground opacity-60 transition-opacity hover:opacity-100'>
						{onViewDetails && (
							<button
								onClick={onViewDetails}
								className='rounded-md p-1.5 transition-colors hover:bg-muted'
								title='Visualizar detalhes'
							>
								<Eye size={14} />
							</button>
						)}
						{onDownloadPDF && (
							<button onClick={onDownloadPDF} className='rounded-md p-1.5 transition-colors hover:bg-muted' title='Baixar PDF'>
								<Download size={14} />
							</button>
						)}
					</div>
					{onToggleExpand && (
						<button onClick={onToggleExpand} className='p-1 text-muted-foreground transition-colors hover:text-foreground'>
							{isExpanded ? '▲' : '▼'}
						</button>
					)}
				</div>
			</div>

			{/* Rota + Finalizar Carga */}
			<div className='mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
				<div className='flex items-center gap-2'>
					<MapPin size={12} className='text-muted-foreground' />
					<span className='font-medium'>
						{load.sis_cidade_origem?.ds_city} - {load.sis_cidade_origem?.js_uf?.ds_uf}
					</span>
					{load.sis_cidade_destino && (
						<>
							<span className='text-muted-foreground'>→</span>
							<span className='font-medium'>
								{load.sis_cidade_destino?.ds_city} - {load.sis_cidade_destino?.js_uf?.ds_uf}
							</span>
						</>
					)}
				</div>
				{onFinalizarCarga && load.ds_status !== 'ENTREGUE' && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onFinalizarCarga();
						}}
						disabled={isFinalizarCargaPending}
						title='Finaliza a carga e todas as entregas'
						className='flex shrink-0 items-center gap-1 rounded-lg border border-emerald-700/50 bg-emerald-700/20 px-3 py-1.5 text-[10px] font-black tracking-wider text-emerald-800 uppercase transition-colors hover:bg-emerald-700/30 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-200'
					>
						{isFinalizarCargaPending ? (
							<>
								<Loader2 size={12} className='animate-spin' /> Finalizando...
							</>
						) : (
							<>
								<Check size={12} strokeWidth={3} /> Finalizar Carga
							</>
						)}
					</button>
				)}
			</div>

			{/* Data de Coleta - Sempre visível quando em coleta */}
			{showProgress && load.dt_coleta_inicio && (
				<div className='mb-3 flex items-center gap-2 text-xs text-muted-foreground'>
					<Calendar size={12} className='text-muted-foreground' />
					<span className='font-medium'>
						Coleta: {new Date(load.dt_coleta_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
						{load.dt_coleta_inicio &&
							`, ${new Date(load.dt_coleta_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
					</span>
				</div>
			)}

			{/* Descrição - Sempre visível quando em coleta */}
			{showProgress && load.ds_observacoes && <div className='mb-3 text-[10px] text-muted-foreground italic'>{load.ds_observacoes}</div>}

			{/* Barra de Progresso (quando em coleta) */}
			{showProgress && (
				<div className='mb-3'>
					<div className='mb-1 flex items-center justify-between'>
						<span className='text-[10px] font-bold text-muted-foreground uppercase'>Progresso</span>
						<span className='text-[10px] font-black text-foreground'>{progress}%</span>
					</div>
					<div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
						<div className='h-full rounded-full bg-green-500 transition-all duration-500' style={{ width: `${progress}%` }} />
					</div>
				</div>
			)}

			{/* CT-e & MDF-e Info */}
			<div className='mb-3 space-y-2'>
				{hasCTe && load.cte && (
					<div className='rounded-lg border border-green-500/30 bg-green-500/10 p-3'>
						<div className='mb-1 flex items-center gap-2'>
							<FileText size={14} className='text-green-700 dark:text-green-300' />
							<span className='text-xs font-bold text-green-700 dark:text-green-300'>CT-e Autorizado</span>
						</div>
						<div className='font-mono text-xs text-green-700 dark:text-green-300'>
							Nº: {load.cte.number} | Chave: {load.cte.accessKey.substring(0, 20)}...
						</div>
					</div>
				)}

				{hasMDFe && load.mdfe && (
					<div className='rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3'>
						<div className='mb-1 flex items-center gap-2'>
							<FileText size={14} className={hasMDFe ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'} />
							<span className='text-xs font-bold text-emerald-700 dark:text-emerald-300'>MDF-e Autorizado</span>
						</div>
						<div className='font-mono text-xs text-emerald-700 dark:text-emerald-300'>
							Nº: {load.mdfe.number} | Chave: {load.mdfe.accessKey.substring(0, 20)}...
						</div>
					</div>
				)}
			</div>

			{/* Botão Fiscal Combinado */}
			{load.ds_status !== 'ENTREGUE' && (!hasCTe || !hasMDFe) && (
				<div className='mt-2'>
					{canEmitFiscal ? (
						<Button
							onClick={() => onEmitFiscal?.(load.id)}
							variant='secondary'
							className='h-9 w-full rounded-xl py-3 text-[10px] font-semibold tracking-wide uppercase'
							title='Emite CT-e (se pendente) e MDF-e para esta carga'
						>
							Emitir CT-e&apos;s / MDF-e da Carga
						</Button>
					) : (
						<div className='flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted py-3 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase'>
							<AlertCircle size={14} /> Fiscal Indisponível
						</div>
					)}
				</div>
			)}

			{/* Info Expandida */}
			{isExpanded && (
				<div className='mt-3 space-y-2 border-t border-border pt-3'>
					{load.dt_coleta_inicio && (
						<div className='flex items-center gap-2 text-xs text-muted-foreground'>
							<Calendar size={12} className='text-muted-foreground' />
							<span>Coleta: {new Date(load.dt_coleta_inicio).toLocaleDateString('pt-BR')}</span>
						</div>
					)}
					{load.vl_peso_bruto && (
						<div className='text-xs text-muted-foreground'>
							<span className='font-semibold'>Peso:</span> {load.vl_peso_bruto}kg
						</div>
					)}
					{load.vl_cubagem && (
						<div className='text-xs text-muted-foreground'>
							<span className='font-semibold'>Volume:</span> {load.vl_cubagem}m³
						</div>
					)}
					{load.ds_observacoes && <div className='text-xs text-muted-foreground italic'>{load.ds_observacoes}</div>}
				</div>
			)}
		</div>
	);
};
