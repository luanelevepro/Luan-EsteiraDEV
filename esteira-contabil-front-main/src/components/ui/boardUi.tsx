import React from 'react';
import { Info, Package } from 'lucide-react';

// --- SHARED TYPES ---

export interface BoardColumnProps {
	title: string | React.ReactNode;
	count: number;
	children: React.ReactNode;
	headerColor: string;
	accentColor?: string;
	tooltip?: string;
	headerExtra?: React.ReactNode; // Elemento extra no header (ex: botão de alertas)
	containerClassName?: string;
	bodyClassName?: string;
}

export interface BoardCardProps {
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
	accentColor?: string; // 'blue' | 'yellow' | 'orange' | 'emerald' | 'gray' etc
}

// --- COMPONENTS ---

export const BoardColumn: React.FC<BoardColumnProps> = ({ title, count, children, headerColor, tooltip, headerExtra, containerClassName, bodyClassName }) => (
	<div
		className={`bg-card ring-border/60 flex h-full max-h-[calc(100vh-260px)] min-h-0 min-w-[320px] flex-1 flex-col overflow-hidden rounded-[40px] shadow-inner ring-1 ${containerClassName ?? ''}`}
	>
		<div className={`border-border/70 flex shrink-0 items-center justify-between rounded-t-[40px] border-b p-6 shadow-sm ${headerColor}`}>
			<div className='flex items-center gap-3'>
				{typeof title === 'string' ? (
					<h3 className='text-foreground text-xs font-black tracking-tighter uppercase'>{title}</h3>
				) : (
					<div className='text-foreground text-xs font-black tracking-tighter uppercase'>{title}</div>
				)}
				{tooltip && (
					<div className='group relative'>
						<Info size={14} className='cursor-help text-current opacity-50 transition-opacity hover:opacity-100' />
						<div className='bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg border border-border p-2 text-[10px] font-medium opacity-0 shadow-xl transition-opacity group-hover:opacity-100'>
							{tooltip}
							<div className='border-t-popover absolute top-full left-3 h-0 w-0 border-t-4 border-r-4 border-l-4 border-r-transparent border-l-transparent'></div>
						</div>
					</div>
				)}
			</div>
			<div className='flex items-center gap-2'>
				{headerExtra}
				<span className='border border-border rounded-full bg-muted/80 px-3 py-1.5 text-[10px] leading-none font-black tracking-tighter text-foreground tabular-nums shadow-lg dark:bg-muted dark:text-foreground'>
					{count}
				</span>
			</div>
		</div>
		<div className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 ${bodyClassName ?? 'bg-muted/20'}`}>{children}</div>
	</div>
);

export const BoardCard: React.FC<BoardCardProps> = ({ children, className = '', onClick, accentColor }) => {
	// Determine border color based on accentColor if not provided in className
	let accentBorder = 'border-l-border';
	if (accentColor === 'blue') accentBorder = 'border-l-blue-500';
	else if (accentColor === 'yellow') accentBorder = 'border-l-yellow-400';
	else if (accentColor === 'orange') accentBorder = 'border-l-orange-500';
	else if (accentColor === 'emerald') accentBorder = 'border-l-emerald-500';
	else if (accentColor === 'green') accentBorder = 'border-l-green-500';
	else if (accentColor === 'purple') accentBorder = 'border-l-purple-500';
	else if (accentColor === 'gray') accentBorder = 'border-l-border';

	return (
		<div
			onClick={onClick}
			className={`bg-card ring-border/40 cursor-default rounded-[35px] border border-border/70 border-l-4 p-6 shadow-sm ring-1 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl ${accentBorder} ${className} `}
		>
			{children}
		</div>
	);
};

export const EmptyState: React.FC<{ text?: string; message?: string }> = ({ text, message }) => (
	<div className='bg-muted/30 border-border/60 mb-4 rounded-[40px] border-4 border-dashed px-8 py-16 text-center'>
		<Package size={48} className='text-muted-foreground mx-auto mb-4' />
		<p className='text-muted-foreground text-[10px] font-black tracking-[0.2em] uppercase'>{text || message}</p>
	</div>
);
