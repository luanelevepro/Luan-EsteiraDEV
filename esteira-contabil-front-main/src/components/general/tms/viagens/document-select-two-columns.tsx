import React, { useMemo, useState } from 'react';
import { CheckCircle, Link2 } from 'lucide-react';
import type { AvailableDocument, DocBucket } from '@/types/tms';

export type SelectableDocWithBucket = AvailableDocument & {
	relatedDocIds?: string[];
	docBucket?: DocBucket;
	docBadge?: string;
};

interface DocumentSelectTwoColumnsProps {
	/** Lista já classificada (docBucket = CTE_PROPRIO | DFE_RELACIONADO | PENDENTE) */
	documents?: SelectableDocWithBucket[];
	selectedIds?: Set<string>;
	filterText?: string;
	onFilterChange?: (value: string) => void;
	onToggle?: (id: string) => void;
	isLoading?: boolean;
	isError?: boolean;
	errorMessage?: string;
	onRetry?: () => void;
	variant?: 'cards' | 'compact';
}

const TITLE_LEFT = 'CT-e emitidos';
const TITLE_RIGHT = 'DF-e relacionados';

export const DocumentSelectTwoColumns: React.FC<DocumentSelectTwoColumnsProps> = ({
	documents = [],
	selectedIds,
	filterText,
	onFilterChange,
	onToggle,
	isLoading,
	isError,
	errorMessage,
	onRetry,
	variant = 'compact',
}) => {
	const [activeTab, setActiveTab] = useState<'left' | 'right'>('left');

	const { left, right } = useMemo(() => {
		const lower = (filterText || '').toLowerCase().trim();
		const filtered = lower
			? documents.filter(
					(d) =>
						(d.ds_numero || '').toLowerCase().includes(lower) ||
						(d.ds_chave || '').toLowerCase().includes(lower)
			  )
			: documents;
		// CT-e à esquerda, DF-e (NF-e + CT-e subcontratado) à direita
		const leftList = filtered.filter((d) => d.docBucket === 'CTE_PROPRIO' || (d.ds_tipo === 'CTE' && d.docBucket !== 'DFE_RELACIONADO'));
		const rightList = filtered.filter((d) => d.docBucket === 'DFE_RELACIONADO' || (d.ds_tipo === 'NFE'));
		return { left: leftList, right: rightList };
	}, [documents, filterText]);

	const renderDocRow = (doc: SelectableDocWithBucket) => {
		const isSelected = selectedIds?.has(doc.id) ?? false;
		const numero = doc.ds_numero || 'S/N';
		const dataStr = doc.dt_emissao ? new Date(doc.dt_emissao).toLocaleDateString('pt-BR') : '';

		if (variant === 'cards') {
			return (
				<button
					key={doc.id}
					type="button"
					onClick={() => onToggle?.(doc.id)}
					className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
						isSelected ? 'border-black bg-primary text-white' : 'border-border bg-card text-foreground/90 hover:border-input'
					}`}
				>
					<div className="min-w-0 flex-1">
						<div className="text-xs font-medium">{numero}</div>
						<div className={`mt-0.5 text-xs ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
							{doc.ds_destinatario} • {doc.ds_cidade_destino}
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						{(doc.relatedDocIds?.length || 0) > 0 && (
							<span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${isSelected ? 'bg-card/20 text-white' : 'bg-violet-200/90 text-violet-800 dark:bg-violet-500/25 dark:text-violet-200'}`}>
								<Link2 size={12} /> {doc.relatedDocIds!.length}
							</span>
						)}
						{isSelected && <CheckCircle size={18} className="text-white" />}
					</div>
				</button>
			);
		}

		return (
			<label
				key={doc.id}
				className={`flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-muted/60 ${isSelected ? 'bg-primary/10 dark:bg-primary/15' : ''}`}
			>
				<input
					type="checkbox"
					checked={isSelected}
					onChange={() => onToggle?.(doc.id)}
					className="h-4 w-4 rounded border-input accent-primary"
				/>
				<span className="text-sm font-medium">{numero}</span>
				{dataStr && <span className="text-xs text-muted-foreground">{dataStr}</span>}
				{(doc.relatedDocIds?.length || 0) > 0 && (
					<span className="ml-auto flex items-center gap-1 rounded-full bg-violet-200/90 px-2 py-1 text-[10px] font-bold text-violet-800 dark:bg-violet-500/25 dark:text-violet-200">
						<Link2 size={12} /> {doc.relatedDocIds!.length}
					</span>
				)}
			</label>
		);
	};

	const searchRow = (
		<div className="flex items-center gap-3">
			<input
				className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
				placeholder="Buscar pelo número do documento (CT-e ou NF-e)..."
				value={filterText || ''}
				onChange={(e) => onFilterChange?.(e.target.value)}
			/>
			<span className="shrink-0 text-[10px] font-bold uppercase text-muted-foreground">
				{left.length} CT-e • {right.length} DF-e
			</span>
		</div>
	);

	if (isLoading) {
		return (
			<div className="space-y-4">
				{searchRow}
				<div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
					Carregando documentos...
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="space-y-4">
				{searchRow}
				<div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-6 text-center">
					<p className="text-sm font-medium text-amber-800">
						{errorMessage ?? 'Os documentos estão demorando. Tente novamente ou use um período menor.'}
					</p>
					{onRetry && (
						<button
							type="button"
							onClick={onRetry}
							className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
						>
							Tentar novamente
						</button>
					)}
				</div>
			</div>
		);
	}

	// Mobile: abas (apenas CT-e e DF-e)
	const tabs = (
		<div className="flex gap-1 border-b border-border md:hidden">
			<button
				type="button"
				onClick={() => setActiveTab('left')}
				className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'left' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
			>
				{TITLE_LEFT} ({left.length})
			</button>
			<button
				type="button"
				onClick={() => setActiveTab('right')}
				className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'right' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
			>
				{TITLE_RIGHT} ({right.length})
			</button>
		</div>
	);

	const columnHeader = (
		<div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-[10px] font-bold uppercase text-muted-foreground">
			<span className="w-4 shrink-0" aria-hidden />
			<span>Número</span>
			<span>Data</span>
			<span className="ml-auto">Relacionados</span>
		</div>
	);

	const listLeft = (
		<div className="space-y-2">
			<h4 className="text-xs font-bold uppercase text-muted-foreground md:block">{TITLE_LEFT}</h4>
			<div className="max-h-[35vh] overflow-y-auto rounded-xl border border-border md:max-h-[40vh]">
				{left.length === 0 ? (
					<div className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum CT-e próprio</div>
				) : (
					<>
						{columnHeader}
						{left.map(renderDocRow)}
					</>
				)}
			</div>
		</div>
	);

	const listRight = (
		<div className="space-y-2">
			<h4 className="text-xs font-bold uppercase text-muted-foreground md:block">{TITLE_RIGHT}</h4>
			<div className="max-h-[35vh] overflow-y-auto rounded-xl border border-border md:max-h-[40vh]">
				{right.length === 0 ? (
					<div className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum DF-e relacionado</div>
				) : (
					<>
						{columnHeader}
						{right.map(renderDocRow)}
					</>
				)}
			</div>
		</div>
	);

	return (
		<div className="space-y-4">
			{searchRow}
			{tabs}
			{/* Desktop: duas colunas (CT-e | DF-e) */}
			<div className="hidden grid-cols-2 gap-4 md:grid">
				{listLeft}
				{listRight}
			</div>
			{/* Mobile: conteúdo da aba ativa */}
			<div className="md:hidden">
				{activeTab === 'left' && listLeft}
				{activeTab === 'right' && listRight}
			</div>
		</div>
	);
};
