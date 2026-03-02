import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';

const actionButtonClass =
	'h-8 w-full justify-center gap-2 rounded-lg border border-border bg-muted/60 px-3 text-[10px] font-semibold tracking-wide uppercase text-foreground shadow-sm transition-all hover:bg-muted';

interface TripFlowActionButtonProps {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	loading?: boolean;
	blockedReason: string | null;
	canDo: boolean;
	icon?: React.ReactNode;
}

/**
 * Botão de ação da esteira (Iniciar/Finalizar). Desabilitado quando canDo é false; tooltip com blockedReason.
 */
export function TripFlowActionButton({
	label,
	onClick,
	disabled,
	loading,
	blockedReason,
	canDo,
	icon,
}: TripFlowActionButtonProps) {
	const isDisabled = disabled || loading || !canDo;
	const button = (
		<Button
			type="button"
			onClick={onClick}
			disabled={isDisabled}
			variant="secondary"
			className={actionButtonClass}
		>
			{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
			{label}
		</Button>
	);
	if (!canDo && blockedReason) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent side="top" className="max-w-xs">
					{blockedReason}
				</TooltipContent>
			</Tooltip>
		);
	}
	return button;
}
