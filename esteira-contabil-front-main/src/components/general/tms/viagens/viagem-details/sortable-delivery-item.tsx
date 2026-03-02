import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	AlertCircle,
	Check,
	ChevronDown,
	FileText,
	GripVertical,
	Link as LinkIcon,
	Loader2,
	Plus,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/general/tms/viagens/status-viagens';
import { DeliveryLike, Document } from './types';

type Props = {
	delivery: DeliveryLike;
	index: number;
	expandedDeliveryId: string | null;
	toggleDelivery: (deliveryId: string, e: React.MouseEvent) => void;
	onFinalizeDelivery: (delivery: DeliveryLike) => void;
	onOpenAddDocs: (delivery: DeliveryLike) => void;
	isFinalizing: boolean;
	cargaId?: string;
	isFirstInLoad?: boolean;
	tripId?: string;
	legId?: string;
};

export const SortableDeliveryItem: React.FC<Props> = ({
	delivery: del,
	index,
	expandedDeliveryId,
	toggleDelivery,
	onFinalizeDelivery,
	onOpenAddDocs,
	isFinalizing,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	isFirstInLoad = false,
}) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: del.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 100 : 'auto',
		opacity: isDragging ? 0.8 : 1,
	};

	const buildCteHierarchy = (docs: Document[]) => {
		const normalizeNum = (type: Document['type'], n: string) => {
			const s = String(n || '').trim();
			if (!s) return s;
			// limpeza visual (não altera dados persistidos)
			if (type === 'CTe') return s.replace(/^CTe[-\s]*/i, '').replace(/^CT-?e[-\s]*/i, '');
			return s.replace(/^NF[-\s]*/i, '');
		};

		const safeDocs: Document[] = Array.isArray(docs)
			? docs
					.filter(Boolean)
					.filter((d: Document) => d && typeof d === 'object' && typeof d.type === 'string' && typeof d.number === 'string')
			: [];
		const toStringArray = (v: string | string[] | null | undefined): string[] => {
			if (!v) return [];
			if (Array.isArray(v)) return v.map(String).filter(Boolean);
			if (typeof v === 'string') {
				const s = v.trim();
				if (!s) return [];
				// tenta JSON array primeiro
				if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('"') && s.endsWith('"'))) {
					try {
						const parsed = JSON.parse(s);
						if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
					} catch {
						// ignore
					}
				}
				return [];
			}
			return [];
		};

		const cteDocs = safeDocs.filter((d) => d.type === 'CTe');
		const nfDocs = safeDocs.filter((d) => d.type !== 'CTe');
		// Mapa CT-e -> referências (chaves) e NF-e vinculadas
		const groups = cteDocs
			.map((cte) => ({
				cteNumber: normalizeNum('CTe', cte.number),
				cteDoc: cte,
				referencedKeys: new Set<string>(toStringArray(cte.relatedDfeKeys).filter(Boolean)),
				dfes: [] as Document[],
				missingReferencedKeys: [] as string[],
			}))
			.sort((a, b) => a.cteNumber.localeCompare(b.cteNumber));

		const groupsByNumber = new Map(groups.map((g) => [g.cteNumber, g]));
		const groupsById = new Map(groups.map((g) => [g.cteDoc.id, g]));
		const groupsByEntregaId = new Map(
			groups
				.map((g) => {
					const entregaId = (g.cteDoc as Document).entregaId;
					return entregaId ? [entregaId, g] : null;
				})
				.filter(Boolean) as Array<[string, (typeof groups)[number]]>,
		);

		// Index rápido: chave -> CT-e (se referenciado)
		const keyToCte = new Map<string, string[]>();
		for (const g of groups) {
			for (const k of g.referencedKeys) {
				if (!keyToCte.has(k)) keyToCte.set(k, []);
				keyToCte.get(k)!.push(g.cteNumber);
			}
		}

		const unlinkedNfs: Document[] = [];

		for (const nf of nfDocs) {
			// 1) vínculo explícito via linkedCteNumber (preferencial)
			const linked = nf.linkedCteNumber ? normalizeNum('CTe', nf.linkedCteNumber) : null;
			if (linked && groupsByNumber.has(linked)) {
				groupsByNumber.get(linked)!.dfes.push(nf);
				continue;
			}

			// 2) vínculo explícito via IDs relacionados (fis_documento_relacionado/origem)
			const relatedId = (nf.relatedDocIds || []).find((id) => groupsById.has(id));
			if (relatedId) {
				groupsById.get(relatedId)!.dfes.push(nf);
				continue;
			}

			const reverseRelatedGroup = groups.find((g) => (g.cteDoc as Document).relatedDocIds?.includes(nf.id));
			if (reverseRelatedGroup) {
				reverseRelatedGroup.dfes.push(nf);
				continue;
			}

			// 2.5) vínculo por entrega (mesma entrega => mesmo CTe)
			if (nf.entregaId && groupsByEntregaId.has(nf.entregaId)) {
				groupsByEntregaId.get(nf.entregaId)!.dfes.push(nf);
				continue;
			}

			// 3) vínculo via referência (dfeKey ∈ relatedDfeKeys do CT-e)
			const key = nf.dfeKey ? String(nf.dfeKey) : null;
			if (key && keyToCte.has(key)) {
				const ctes = keyToCte.get(key)!;
				const first = ctes[0];
				if (groupsByNumber.has(first)) {
					groupsByNumber.get(first)!.dfes.push(nf);
					continue;
				}
			}

			// 4) sem vínculo fiscal claro
			unlinkedNfs.push(nf);
		}

		// Ordenações e “missing refs”
		for (const g of groups) {
			g.dfes.sort((a, b) => String(a.number).localeCompare(String(b.number)));
			const presentKeys = new Set(g.dfes.map((d) => d.dfeKey).filter(Boolean) as string[]);
			g.missingReferencedKeys = Array.from(g.referencedKeys).filter((k) => !presentKeys.has(k));
		}

		const nfTotal = nfDocs.length;
		const nfLinked = groups.reduce((acc, g) => acc + g.dfes.length, 0);
		const nfUnlinked = unlinkedNfs.length;

		return {
			groups,
			unlinkedNfs: unlinkedNfs.sort((a, b) => String(a.number).localeCompare(String(b.number))),
			counts: { cte: groups.length, nfTotal, nfLinked, nfUnlinked },
		};
	};

	const deliveryDocs: Document[] = Array.isArray(del.documents) ? del.documents : [];
	const { groups, unlinkedNfs, counts } = buildCteHierarchy(deliveryDocs);
	const cteCount = counts.cte;

	return (
		<div ref={setNodeRef} style={style} className='group relative mb-4 flex flex-col items-start gap-4 md:flex-row'>
			{/* Number & Handle */}
			<div className='mt-1 flex flex-col items-center gap-2'>
				<div
					{...attributes}
					{...listeners}
					className='cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing'
				>
					<GripVertical size={16} />
				</div>
				<div className='relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-purple-100 text-[10px] font-black text-purple-700 shadow-sm ring-1 ring-purple-200 dark:border-purple-400/50 dark:bg-purple-500/25 dark:text-purple-200 dark:ring-purple-500/30'>
					{index + 1}
				</div>
				<div className='h-full min-h-[40px] w-0.5 rounded-full bg-muted'></div>
			</div>

			{/* Card */}
			<div className='border-border bg-muted/40 text-foreground w-full flex-1 overflow-hidden rounded-2xl border shadow-sm backdrop-blur-sm transition-all hover:shadow-md'>
				{/* Header */}
				<div
					className='flex cursor-pointer flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center'
					onClick={(e) => toggleDelivery(del.id, e)}
				>
					<div>
						<div className='mb-1 flex items-center gap-2'>
							<span className='text-[10px] font-black tracking-widest text-purple-600 uppercase'>Entrega {index + 1}</span>
							{del.status === 'Entregue' && (
								<StatusBadge
									status='ENTREGUE'
									context='entrega'
									size='sm'
									icon={<Check size={10} strokeWidth={4} />}
								/>
							)}
						</div>
						<div className='text-lg leading-tight font-black text-foreground'>{del.destinationCity}</div>
						<div className='mt-0.5 text-sm font-medium text-muted-foreground'>{del.recipientName}</div>
					</div>

					{/* Summary */}
					<div className='flex items-center gap-6'>
						<div className='hidden text-right md:block'>
							<div className='mb-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase'>Documentos</div>
							<div className='flex items-center justify-end gap-2 text-xs font-black text-foreground'>
								{cteCount > 0 && (
									<span className='rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/20 dark:text-blue-300'>CT-e: {counts.cte}</span>
								)}
								<span>NF-e: {counts.nfTotal}</span>
								{counts.nfUnlinked > 0 && (
									<span className='rounded border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-orange-700 dark:border-orange-400/40 dark:bg-orange-500/20 dark:text-orange-300'>
										Pendentes: {counts.nfUnlinked}
									</span>
								)}
							</div>
						</div>
						<div
							className={`rounded-full p-1 transition-transform duration-300 ${expandedDeliveryId === del.id ? 'rotate-180 bg-muted' : ''}`}
						>
							<ChevronDown size={20} className='text-muted-foreground' />
						</div>
					</div>
				</div>

				{/* Expanded Content */}
				{expandedDeliveryId === del.id && (
					<div className='animate-in slide-in-from-top-2 border-t border-border bg-muted/30'>
						<div className='space-y-3 p-5'>
							{groups.length === 0 && unlinkedNfs.length === 0 ? (
								<div className='py-4 text-center text-xs text-muted-foreground italic'>Nenhum documento vinculado.</div>
							) : (
								<>
									{groups.map((g) => (
										<div key={g.cteNumber} className='rounded-xl border border-border bg-card p-3 shadow-sm dark:border-blue-500/20'>
											<div className='mb-2 flex items-center gap-2 border-b border-border pb-2'>
												<LinkIcon size={12} className='text-blue-500 dark:text-blue-400' />
												<span className='text-xs font-black text-blue-700 dark:text-blue-300'>CT-e {g.cteNumber}</span>
												{g.cteDoc?.isSubcontracted && (
													<span className='ml-2 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-black text-orange-700 uppercase dark:border-orange-400/40 dark:bg-orange-500/20 dark:text-orange-300'>
														Subcontratado
													</span>
												)}
											</div>
											<div className='flex flex-wrap gap-2'>
												{g.dfes.map((d) => (
													<div
														key={d.id}
														className='flex items-center gap-1 rounded border border-border bg-muted/50 px-2 py-1 text-[10px] font-bold text-foreground'
													>
														<FileText size={10} className='text-muted-foreground' /> {String(d.number).replace(/^NF[-\s]*/i, '')}
													</div>
												))}
												{g.dfes.length === 0 && (
													<span className='text-[10px] text-muted-foreground italic'>Sem DF-es vinculadas nesta entrega.</span>
												)}
											</div>
											{g.missingReferencedKeys.length > 0 && (
												<div className='mt-2 text-[10px] text-muted-foreground'>
													Referenciadas no CT-e e não encontradas aqui:{' '}
													<span className='font-bold text-foreground'>{g.missingReferencedKeys.length}</span>
												</div>
											)}
										</div>
									))}
									{unlinkedNfs.length > 0 && (
										<div className='rounded-xl border border-border bg-card p-3 shadow-sm dark:border-orange-500/20'>
											<div className='mb-2 flex items-center gap-2 border-b border-border pb-2'>
												<AlertCircle size={12} className='text-orange-500 dark:text-orange-400' />
												<span className='text-xs font-black text-orange-700 dark:text-orange-300'>DF-es sem vínculo fiscal com CT-e</span>
											</div>
											<div className='flex flex-wrap gap-2'>
												{unlinkedNfs.map((d) => (
													<div
														key={d.id}
														className='flex items-center gap-1 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] font-bold text-orange-700 dark:border-orange-400/40 dark:bg-orange-500/20 dark:text-orange-300'
													>
														<FileText size={10} /> {String(d.number).replace(/^NF[-\s]*/i, '')}
													</div>
												))}
											</div>
											<div className='mt-2 text-[10px] text-orange-700 dark:text-orange-300'>
												Isto significa: existe CT-e na carga, mas estas DF-es não estão referenciadas (via chave) — precisam de
												vínculo claro.
											</div>
										</div>
									)}
								</>
							)}
						</div>

						<div className='flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3'>
							<div className='text-xs font-bold text-foreground'>
								Total:{' '}
								{deliveryDocs
									.reduce((acc: number, d) => acc + (Number(d.value) || 0), 0)
									.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
							</div>
							<div className='flex gap-2'>
								{/* Só permite finalizar quando a entrega está em trânsito (backend exige EM_TRANSITO) */}
								{!del.isLegacy && (del.status === 'Em Rota' || del.status === 'EM_TRANSITO') && (
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												onClick={(e) => {
													e.stopPropagation();
													onFinalizeDelivery(del);
												}}
												disabled={isFinalizing}
												className='flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-[10px] font-black tracking-wider text-white uppercase shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60'
											>
												{isFinalizing ? (
													<>
														<Loader2 size={12} className='animate-spin' /> Finalizando
													</>
												) : (
													<>
														<Check size={12} strokeWidth={3} /> Finalizar Entrega
													</>
												)}
											</button>
										</TooltipTrigger>
										<TooltipContent>Finaliza a entrega e atualiza a carga</TooltipContent>
									</Tooltip>
								)}
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											onClick={(e) => {
												e.stopPropagation();
												onOpenAddDocs(del);
											}}
											disabled={del.status === 'Entregue'}
											className='flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-[10px] font-black tracking-wider text-foreground uppercase transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
										>
											<Plus size={12} /> Documentos
										</button>
									</TooltipTrigger>
									<TooltipContent>
										{del.isLegacy ? 'Disponível apenas para entregas reais' : 'Adicionar documentos à entrega'}
									</TooltipContent>
								</Tooltip>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
