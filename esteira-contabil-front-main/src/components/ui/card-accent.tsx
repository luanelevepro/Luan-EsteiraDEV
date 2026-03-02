import React from 'react';
import { cn } from '@/lib/utils';

export type Accent = 'green' | 'blue' | 'amber' | 'orange' | 'purple' | 'red' | 'gray';

const ACCENT_CLASS: Record<Accent, string> = {
	green: 'bg-emerald-500/70',
	blue: 'bg-blue-500/70',
	amber: 'bg-amber-500/70',
	orange: 'bg-orange-500/70',
	purple: 'bg-purple-500/70',
	red: 'bg-red-500/70',
	gray: 'bg-muted-foreground/60',
};

export function CardAccent({
	accent = 'gray',
	className,
	children,
}: {
	accent?: Accent;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				'relative rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden',
				className,
			)}
		>
			<div
				className={cn(
					'absolute left-0 top-0 h-full w-[3px] rounded-l-2xl',
					ACCENT_CLASS[accent],
				)}
			/>
			<div className="pl-3">{children}</div>
		</div>
	);
}
