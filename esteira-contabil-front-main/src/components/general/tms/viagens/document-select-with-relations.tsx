import React from 'react';
import { CheckCircle, Link2 } from 'lucide-react';
import type { AvailableDocument } from '@/types/tms';

export type SelectableDoc = AvailableDocument & { relatedDocIds?: string[] };

interface DocumentSelectWithRelationsProps {
	documents?: SelectableDoc[];
	selectedIds?: Set<string>;
	filterText?: string;
	onFilterChange?: (value: string) => void;
	onToggle?: (id: string) => void;
	isLoading?: boolean;
	/** Exibir estado de erro com mensagem e botão tentar novamente */
	isError?: boolean;
	errorMessage?: string;
	onRetry?: () => void;
	// Single doc mode (for use in modal)
	doc?: SelectableDoc;
	isSelected?: boolean;
	allDocs?: SelectableDoc[];
	/** 'compact' = lista em linhas (checkbox + tipo + número + data), como no modal Nova Carga */
	variant?: 'cards' | 'compact';
}

export const DocumentSelectWithRelations: React.FC<DocumentSelectWithRelationsProps> = ({
	documents,
	selectedIds,
	filterText,
	onFilterChange,
	onToggle,
	isLoading,
	isError,
	errorMessage,
	onRetry,
	doc,
	isSelected,
	variant = 'cards',
}) => {
	// Single doc mode
	if (doc) {
		return (
			<button
				type='button'
				onClick={() => onToggle?.(doc.id)}
				className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
					isSelected ? 'border-black bg-primary text-white' : 'border-border bg-card text-foreground/90 hover:border-input'
				}`}
			>
				<div>
					<div className='text-xs font-black tracking-widest uppercase'>
						{doc.ds_tipo} {doc.ds_numero || 'S/N'}
					</div>
					<div className={`mt-0.5 text-xs ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
						{doc.ds_destinatario} • {doc.ds_cidade_destino}
					</div>
				</div>
				<div className='flex items-center gap-2'>
					{(doc.relatedDocIds?.length || 0) > 0 && (
						<span
							className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${isSelected ? 'bg-card/20 text-white' : 'bg-purple-100 text-purple-700'}`}
						>
							<Link2 size={12} /> {doc.relatedDocIds?.length}
						</span>
					)}
					{isSelected && <CheckCircle size={18} className='text-white' />}
				</div>
			</button>
		);
	}

	// List mode
	const docs = documents || [];

	const searchRow = (
		<div className='flex items-center gap-3'>
			<input
				className='w-full rounded-xl border border-border px-3 py-2 text-sm font-medium outline-none focus:border-black focus:ring-2 focus:ring-gray-100'
				placeholder='Buscar por destinatário, cidade, número ou tipo...'
				value={filterText || ''}
				onChange={(e) => onFilterChange?.(e.target.value)}
			/>
			<span className='text-[10px] font-bold text-muted-foreground uppercase'>{docs.length} docs</span>
		</div>
	);

	if (isLoading) {
		return (
			<div className='space-y-4'>
				{searchRow}
				<div className='rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground'>
					Carregando documentos...
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className='space-y-4'>
				{searchRow}
				<div className='rounded-xl border border-dashed border-amber-200 bg-amber-50 p-6 text-center'>
					<p className='text-sm font-medium text-amber-800'>
						{errorMessage ?? 'Os documentos estão demorando. Tente novamente ou use um período menor.'}
					</p>
					{onRetry && (
						<button
							type='button'
							onClick={onRetry}
							className='mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700'
						>
							Tentar novamente
						</button>
					)}
				</div>
			</div>
		);
	}

	if (variant === 'compact') {
		return (
			<div className='space-y-4'>
				{searchRow}
				<div className='max-h-[45vh] overflow-y-auto rounded-xl border border-border'>
					{docs.map((document) => {
						const isDocSelected = selectedIds?.has(document.id) || false;
						const numero = document.ds_numero || 'S/N';
						const dataStr = document.dt_emissao
							? new Date(document.dt_emissao).toLocaleDateString('pt-BR')
							: '';
						return (
							<label
								key={document.id}
								className={`flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-muted ${isDocSelected ? 'bg-accent' : ''}`}
							>
								<input
									type='checkbox'
									checked={isDocSelected}
									onChange={() => onToggle?.(document.id)}
									className='h-4 w-4 rounded border-input accent-primary'
								/>
								<span className='text-[10px] font-bold uppercase text-muted-foreground'>
									{document.ds_tipo ?? 'DOC'}
								</span>
								<span className='text-sm font-medium'>{numero}</span>
								{dataStr && <span className='text-xs text-muted-foreground'>{dataStr}</span>}
								{(document.relatedDocIds?.length || 0) > 0 && (
									<span className='ml-auto flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-[10px] font-bold text-purple-700'>
										<Link2 size={12} /> {document.relatedDocIds?.length}
									</span>
								)}
							</label>
						);
					})}
					{docs.length === 0 && (
						<div className='px-4 py-8 text-center text-sm text-muted-foreground'>Nenhum documento disponível.</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			{searchRow}
			<div className='max-h-[45vh] space-y-2 overflow-y-auto pr-2'>
				{docs.map((document) => {
					const isDocSelected = selectedIds?.has(document.id) || false;
					return (
						<button
							key={document.id}
							type='button'
							onClick={() => onToggle?.(document.id)}
							className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
								isDocSelected
									? 'border-black bg-primary text-white'
									: 'border-border bg-card text-foreground/90 hover:border-input'
							}`}
						>
							<div>
								<div className='text-xs font-black tracking-widest uppercase'>
									{document.ds_tipo} {document.ds_numero || 'S/N'}
								</div>
								<div className={`mt-0.5 text-xs ${isDocSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
									{document.ds_destinatario} • {document.ds_cidade_destino}
								</div>
							</div>
							<div className='flex items-center gap-2'>
								{(document.relatedDocIds?.length || 0) > 0 && (
									<span
										className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${isDocSelected ? 'bg-card/20 text-white' : 'bg-purple-100 text-purple-700'}`}
									>
										<Link2 size={12} /> {document.relatedDocIds?.length}
									</span>
								)}
								{isDocSelected && <CheckCircle size={18} className='text-white' />}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
