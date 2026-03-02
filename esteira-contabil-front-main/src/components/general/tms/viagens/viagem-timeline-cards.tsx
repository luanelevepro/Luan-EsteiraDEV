import React from 'react';

/**
 * Estado do percurso: cor só no stripe (accent), borda sempre neutra para evitar "moldura neon".
 */
export type BorderStatus = 'agendado' | 'em_coleta' | 'em_rota' | 'entregue';

const NEUTRAL_BORDER = 'border-border/70';

/** Borda sempre neutra; semântica de status fica no stripe (getStripeBgClass). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- API mantida para compatibilidade com callers
export function getBorderClasses(status?: BorderStatus): string {
	return NEUTRAL_BORDER;
}

const DOT_BG_BY_STATUS: Record<BorderStatus, string> = {
	agendado: 'bg-blue-500',
	em_coleta: 'bg-orange-500',
	em_rota: 'bg-purple-500',
	entregue: 'bg-emerald-500',
};

export function getDotBgClass(status: BorderStatus | undefined): string {
	if (!status) return 'bg-muted-foreground';
	return DOT_BG_BY_STATUS[status];
}

/** Classe do stripe vertical (3px) por status — opacidade /70 para não competir com badges. */
const STRIPE_BG_BY_STATUS: Record<BorderStatus, string> = {
	agendado: 'bg-blue-500/70',
	em_coleta: 'bg-orange-500/70',
	em_rota: 'bg-purple-500/70',
	entregue: 'bg-emerald-500/70',
};

export function getStripeBgClass(status: BorderStatus | undefined): string {
	if (!status) return 'bg-muted-foreground/60';
	return STRIPE_BG_BY_STATUS[status];
}

const LEG_CARD_EMPTY_LEG = 'border-border bg-muted/50';

/** Card do leg (carga ou deslocamento) na timeline — fundo neutro, borda neutra, stripe por status. */
export function LegCard({
	children,
	isEmptyLeg,
	borderStatus,
	className = '',
}: {
	children: React.ReactNode;
	concluded?: boolean;
	isEmptyLeg: boolean;
	borderStatus?: BorderStatus;
	className?: string;
}) {
	const borderClass = isEmptyLeg ? 'border-border' : getBorderClasses(borderStatus);
	const bgClass = isEmptyLeg ? LEG_CARD_EMPTY_LEG : 'bg-card';
	const stripeClass = isEmptyLeg ? 'bg-muted-foreground/60' : getStripeBgClass(borderStatus);
	return (
		<div
			className={`rounded-2xl border shadow-sm ${borderClass} ${bgClass} relative overflow-hidden ${className}`}
		>
			<div className={`absolute left-0 top-0 h-full w-[3px] rounded-l-2xl ${stripeClass}`} aria-hidden />
			<div className="p-6 pl-[calc(1.5rem+3px)]">{children}</div>
		</div>
	);
}

/** Card da entrega — fundo neutro, borda neutra, stripe por status. */
export function DeliveryCard({
	children,
	borderStatus,
	className = '',
}: {
	children: React.ReactNode;
	concluded?: boolean;
	borderStatus?: BorderStatus;
	className?: string;
}) {
	const stripeClass = getStripeBgClass(borderStatus);
	return (
		<div
			className={`relative w-full flex-1 overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md ${NEUTRAL_BORDER} ${className}`}
		>
			<div className={`absolute left-0 top-0 h-full w-[3px] rounded-l-xl ${stripeClass}`} aria-hidden />
			<div className="p-4 pl-[calc(1rem+3px)]">{children}</div>
		</div>
	);
}

/** Faixa "Origem" dentro do card da entrega — fundo neutro, borda neutra, stripe por status. */
export function OriginStrip({
	children,
	borderStatus,
	className = '',
}: {
	children: React.ReactNode;
	concluded?: boolean;
	borderStatus?: BorderStatus;
	className?: string;
}) {
	const stripeClass = getStripeBgClass(borderStatus);
	return (
		<div className={`relative rounded-t-xl border-b p-4 transition-colors bg-card/50 ${NEUTRAL_BORDER} ${className}`}>
			<div className={`absolute left-0 top-0 h-full w-[3px] rounded-tl-xl ${stripeClass}`} aria-hidden />
			<div className="pl-3">{children}</div>
		</div>
	);
}

/** Nó de Origem na timeline — fundo neutro, borda neutra, stripe por status. */
export function TimelineNodeOrigin({
	children,
	borderStatus,
	className = '',
}: {
	children: React.ReactNode;
	concluded?: boolean;
	borderStatus?: BorderStatus;
	className?: string;
}) {
	const stripeClass = getStripeBgClass(borderStatus);
	return (
		<div className={`relative flex-1 rounded-xl border p-4 transition-colors bg-card ${NEUTRAL_BORDER} ${className}`}>
			<div className={`absolute left-0 top-0 h-full w-[3px] rounded-l-xl ${stripeClass}`} aria-hidden />
			<div className="pl-3">{children}</div>
		</div>
	);
}

/** Nó de Destino na timeline — fundo neutro, borda neutra, stripe por status. */
export function TimelineNodeDest({
	children,
	borderStatus,
	className = '',
}: {
	children: React.ReactNode;
	concluded?: boolean;
	borderStatus?: BorderStatus;
	className?: string;
}) {
	const stripeClass = getStripeBgClass(borderStatus);
	return (
		<div className={`relative flex-1 rounded-xl border p-4 transition-colors bg-card ${NEUTRAL_BORDER} ${className}`}>
			<div className={`absolute left-0 top-0 h-full w-[3px] rounded-l-xl ${stripeClass}`} aria-hidden />
			<div className="pl-3">{children}</div>
		</div>
	);
}
