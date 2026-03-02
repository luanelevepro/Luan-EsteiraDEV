import React from 'react';
import type { Entrega, Viagem } from '@/types/tms';

/** Status da viagem (badge único por projeto: agendada, em coleta, em rota, concluído) */
export function tripStatusLabelPt(status: Viagem['status'] | Viagem['ds_status'] | string | undefined): string {
	switch (status) {
		// Novos status (Prisma)
		case 'AGENDADA':
		case 'PLANEJADA':
			return 'Agendada';
		case 'EM_COLETA':
			return 'Em Coleta';
		case 'EM_VIAGEM':
		case 'EM_TRANSITO':
			return 'Em Rota';
		case 'CONCLUIDA':
			return 'Concluído';
		case 'ATRASADA':
			return 'Atrasada';
		case 'CANCELADA':
			return 'Cancelada';
		// Status legados (compatibilidade)
		case 'Planned':
			return 'Agendada';
		case 'Picking Up':
			return 'Em Coleta';
		case 'In Transit':
			return 'Em Rota';
		case 'Completed':
			return 'Concluído';
		case 'Delayed':
			return 'Atrasado';
		default:
			return String(status || 'Desconhecido');
	}
}

/** Status do item da esteira (tms_viagens_cargas.ds_status) — sincronizado com os badges */
export type StatusItemViagem = 'BLOQUEADO' | 'DISPONIVEL' | 'EM_DESLOCAMENTO' | 'CONCLUIDO';

export function itemStatusLabelPt(status: string | undefined): string {
	switch (status) {
		case 'BLOQUEADO':
			return 'Aguardando';
		case 'DISPONIVEL':
			return 'Agendada';
		case 'EM_DESLOCAMENTO':
		case 'EM_ROTA':
			return 'Em Rota';
		case 'CONCLUIDO':
			return 'Concluído';
		default:
			return String(status || 'Aguardando');
	}
}

/** Status da carga (ds_status da carga) — labels em português */
export function cargaStatusLabelPt(status: string | undefined): string {
	switch (status) {
		case 'PENDENTE':
			return 'Pendente';
		case 'AGENDADA':
			return 'Agendada';
		case 'EM_COLETA':
			return 'Em Coleta';
		case 'EM_TRANSITO':
			return 'Em Trânsito';
		case 'ENTREGUE':
			return 'Entregue';
		default:
			return String(status || 'Pendente');
	}
}

/** Status da entrega — mesmo vocabulário (Pendente, Em Rota, Entregue) */
export function deliveryStatusLabelPt(status: Entrega['ds_status'] | string | undefined): string {
	switch (status) {
		case 'PENDENTE':
			return 'Pendente';
		case 'EM_TRANSITO':
			return 'Em Rota';
		case 'ENTREGUE':
			return 'Entregue';
		case 'DEVOLVIDA':
			return 'Devolvida';
		case 'CANCELADA':
			return 'Cancelada';
		default:
			return String(status || 'Pendente');
	}
}

/**
 * Mapeamento de cores (padrão Torre de Controle): azul=Pendente, amarelo=Agendada, laranja=Em Coleta, roxo=Em Rota, verde=Concluído.
 *
 * Para testar outra cor no CONCLUIDO/Entregue, altere as classes abaixo.
 * Tailwind: border-{cor}-500/30, bg-{cor}-500/10, text-{cor}-700 dark:text-{cor}-300
 * Ex.: emerald (verde atual), green, teal, lime.
 */
const STATUS_COLOR_MAP: Record<string, string> = {
	// Pendente → azul
	PENDENTE: 'rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
	// Agendada, Planejado, Disponível → azul
	AGENDADA: 'rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
	PLANEJADA: 'rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
	Planned: 'rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
	DISPONIVEL: 'rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
	// Aguardando (bloqueado) → amarelo
	BLOQUEADO: 'rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
	// Em Coleta → laranja
	EM_COLETA: 'rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
	'Picking Up': 'rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
	// Em Rota, Em trânsito (viagem/carga/item) → roxo
	EM_VIAGEM: 'rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
	EM_TRANSITO: 'rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
	EM_DESLOCAMENTO: 'rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
	'In Transit': 'rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
	// Entregue, Concluído → verde (dark: tons mais contidos para integrar ao tema escuro)
	ENTREGUE:
		'rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-900/50 dark:text-emerald-200',
	CONCLUIDO:
		'rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-900/50 dark:text-emerald-200',
	CONCLUIDA:
		'rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-900/50 dark:text-emerald-200',
	Completed:
		'rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-900/50 dark:text-emerald-200',
	// Devolvida → vermelho/âmbar
	DEVOLVIDA: 'rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
	// Cancelada, Atrasada → vermelho
	CANCELADA: 'rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
	ATRASADA: 'rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
	Delayed: 'rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
	// Labels em português (DeliveryLike.status)
	Pendente: 'rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
	'Em Rota': 'rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
	'Em Trânsito': 'rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
	Entregue:
		'rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-900/50 dark:text-emerald-200',
	Agendada: 'rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
	Concluído:
		'rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-900/50 dark:text-emerald-200',
	Aguardando: 'rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
};

const SIZE_CLASSES = {
	sm: 'px-2 py-0.5 text-[9px]',
	md: 'px-3 py-1.5 text-[10px]',
	lg: 'px-3 py-1 text-sm',
};

const BASE_CLASSES = 'inline-flex items-center gap-1 font-bold tracking-wider';

/** Variante do Badge UI (badge.tsx) para uso em qualquer tela TMS */
export type TmsStatusBadgeVariant =
	| 'successTwo'
	| 'info'
	| 'transit'
	| 'pending'
	| 'late'
	| 'outline'
	| 'muted'
	| 'cargo';

/** Retorna a variante do Badge do design system para o status (fonte única TMS). */
export function getTmsStatusVariant(status: string | undefined): TmsStatusBadgeVariant {
	const s = String(status || '').trim();
	// Concluído / Entregue → verde
	if (
		['ENTREGUE', 'CONCLUIDO', 'CONCLUIDA', 'Completed', 'Entregue', 'Concluído'].includes(s)
	)
		return 'successTwo';
	// Agendada / Pendente / Disponível → azul (EM_TRANSITO/Em Rota ficam no grupo transit/roxo abaixo)
	if (
		['AGENDADA', 'PLANEJADA', 'Planned', 'DISPONIVEL', 'PENDENTE', 'Pendente', 'Agendada'].includes(s)
	)
		return 'info';
	if (['BLOQUEADO', 'Aguardando'].includes(s)) return 'pending';
	// Em coleta → laranja (pending)
	if (['EM_COLETA', 'Picking Up', 'Em Coleta'].includes(s)) return 'pending';
	// Em rota / Em trânsito / Em deslocamento → roxo (cargo/transit)
	if (
		['EM_VIAGEM', 'EM_TRANSITO', 'EM_DESLOCAMENTO', 'In Transit', 'Em Rota', 'Em Trânsito'].includes(s)
	)
		return 'transit';
	// Atrasada / Cancelada / Devolvida → vermelho
	if (['ATRASADA', 'CANCELADA', 'DEVOLVIDA', 'Delayed', 'Atrasada', 'Cancelada', 'Devolvida'].includes(s))
		return 'late';
	return 'outline';
}

/** Retorna as classes Tailwind para o badge conforme o status (padrão Torre de Controle) */
export function getStatusBadgeClasses(status: string | undefined, size: 'sm' | 'md' | 'lg' = 'md'): string {
	const s = String(status || '').trim();
	const colorClasses = STATUS_COLOR_MAP[s] ?? 'rounded-lg border border-border bg-muted text-muted-foreground';
	return `${BASE_CLASSES} ${SIZE_CLASSES[size]} ${colorClasses}`;
}

function getLabelForStatus(status: string | undefined, context?: 'viagem' | 'carga' | 'entrega' | 'itemFluxo'): string {
	if (!status) return '';
	const knownLabels = ['Pendente', 'Em Rota', 'Em Trânsito', 'Entregue', 'Agendada', 'Concluído', 'Aguardando', 'Em Coleta', 'Cancelada', 'Atrasada', 'Emitida', 'Devolvida'];
	if (knownLabels.includes(status)) return status;
	if (context === 'carga') return cargaStatusLabelPt(status) || status;
	if (context === 'entrega') return deliveryStatusLabelPt(status) || status;
	if (context === 'itemFluxo') return itemStatusLabelPt(status) || status;
	if (context === 'viagem') return tripStatusLabelPt(status) || status;
	return deliveryStatusLabelPt(status) || tripStatusLabelPt(status) || itemStatusLabelPt(status) || cargaStatusLabelPt(status) || status;
}

/** Badge de status unificado (padrão Torre de Controle) */
export function StatusBadge({
	status,
	label,
	size = 'md',
	icon,
	className,
	context,
}: {
	status: string | undefined;
	label?: string;
	size?: 'sm' | 'md' | 'lg';
	icon?: React.ReactNode;
	className?: string;
	/** Contexto para escolher a função de label (viagem, carga, entrega, itemFluxo) */
	context?: 'viagem' | 'carga' | 'entrega' | 'itemFluxo';
}) {
	const classes = getStatusBadgeClasses(status, size);
	const displayLabel = label ?? getLabelForStatus(status, context);
	return (
		<span className={`${classes} ${className ?? ''}`}>
			{icon}
			{displayLabel}
		</span>
	);
}
