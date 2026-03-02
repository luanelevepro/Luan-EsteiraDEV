'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock } from 'lucide-react';

export type ConclusaoMode = 'agora' | 'informar';

interface ModalConclusaoDataHoraProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Título do modal (ex: "Concluir entrega", "Finalizar viagem") */
	title: string;
	/** Chamado ao confirmar: undefined = concluir agora, string = ISO da data/hora informada */
	onConfirm: (dtIso?: string) => void | Promise<void>;
	/** Enquanto estiver true, botão Confirmar fica disabled */
	isLoading?: boolean;
}

function toLocalDatetimeISO(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	const h = String(date.getHours()).padStart(2, '0');
	const min = String(date.getMinutes()).padStart(2, '0');
	return `${y}-${m}-${d}T${h}:${min}:00.000`;
}

export const ModalConclusaoDataHora: React.FC<ModalConclusaoDataHoraProps> = ({
	open,
	onOpenChange,
	title,
	onConfirm,
	isLoading = false,
}) => {
	const [mode, setMode] = useState<ConclusaoMode>('agora');
	const [dateValue, setDateValue] = useState<string>(() => {
		const n = new Date();
		return toLocalDatetimeISO(n).slice(0, 16);
	});

	// Reset quando abre
	useEffect(() => {
		if (open) {
			setMode('agora');
			const n = new Date();
			setDateValue(toLocalDatetimeISO(n).slice(0, 16));
		}
	}, [open]);

	// Corrige bug do Radix: ao fechar Dialog, pointer-events/overflow podem ficar bloqueando cliques
	useEffect(() => {
		if (open) return;
		const t = setTimeout(() => {
			document.body.style.pointerEvents = '';
			document.body.style.overflow = '';
			document.documentElement.style.pointerEvents = '';
			document.documentElement.style.overflow = '';
			document.querySelectorAll('[data-slot="dialog-overlay"], [data-slot="dialog-portal"], [data-slot="select-content"]').forEach((el) => {
				(el as HTMLElement).style.pointerEvents = 'none';
			});
		}, 300);
		return () => clearTimeout(t);
	}, [open]);

	const handleConfirm = async () => {
		if (mode === 'agora') {
			await onConfirm(undefined);
		} else {
			const dt = new Date(dateValue);
			if (Number.isNaN(dt.getTime())) return;
			await onConfirm(dt.toISOString());
		}
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md" showCloseButton>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="flex flex-col gap-2">
						<label className="flex items-center gap-2 text-sm font-medium">
							<input
								type="radio"
								name="conclusao-mode"
								checked={mode === 'agora'}
								onChange={() => setMode('agora')}
								className="h-4 w-4"
							/>
							Concluir agora
						</label>
						<label className="flex items-center gap-2 text-sm font-medium">
							<input
								type="radio"
								name="conclusao-mode"
								checked={mode === 'informar'}
								onChange={() => setMode('informar')}
								className="h-4 w-4"
							/>
							Informar data e hora
						</label>
					</div>
					{mode === 'informar' && (
						<div className="flex flex-col gap-2">
							<label className="text-xs font-medium text-muted-foreground">
								Data e hora da conclusão
							</label>
							<div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
								<CalendarIcon className="h-4 w-4 text-muted-foreground" />
								<input
									type="datetime-local"
									value={dateValue}
									onChange={(e) => setDateValue(e.target.value)}
									className="flex-1 bg-transparent text-sm outline-none"
									step={60}
								/>
								<Clock className="h-4 w-4 text-muted-foreground" />
							</div>
							{dateValue && (
								<p className="text-xs text-muted-foreground">
									{format(new Date(dateValue), "dd/MM/yyyy 'às' HH:mm", {
										locale: ptBR,
									})}
								</p>
							)}
						</div>
					)}
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<Button
						type="button"
						variant="secondary"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}
						className="rounded-xl border border-border bg-muted/60 px-4 py-2 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted"
					>
						Cancelar
					</Button>
					<Button
						type="button"
						variant="secondary"
						onClick={handleConfirm}
						disabled={isLoading || (mode === 'informar' && !dateValue)}
						className="rounded-xl border border-border bg-muted/60 px-4 py-2 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
					>
						{isLoading ? 'Confirmando...' : 'Confirmar'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
