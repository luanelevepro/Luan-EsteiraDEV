import React, { useState, useMemo, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { criarCargasComDocumentos } from '@/services/api/tms/viagens';
import { MonthYearSelector } from '@/components/ui/month-year-selector';
import type { AvailableDocument, DocBucket } from '@/types/tms';
import { DocumentSelectTwoColumns, type SelectableDocWithBucket } from '@/components/general/tms/viagens/document-select-two-columns';

type ModalDocument = AvailableDocument & {
	relatedDocIds?: string[];
	docBucket?: DocBucket;
	docBadge?: string;
	fis_documento_relacionado?: Array<{
		fis_documento_origem?: {
			id: string;
		};
	}>;
	js_nfe?: {
		dt_emissao?: string;
	};
	js_cte?: {
		dt_emissao?: string;
	};
};

interface ModalCreateCargaFromDocsProps {
	isOpen: boolean;
	onClose: () => void;
	idViagem: string;
	documentos: ModalDocument[];
	onSuccess: () => void;
	competencia: Date;
	onCompetenciaChange: (date: Date) => void;
}

export const ModalCreateCargaFromDocs: React.FC<ModalCreateCargaFromDocsProps> = ({
	isOpen,
	onClose,
	idViagem,
	documentos,
	onSuccess,
	competencia,
	onCompetenciaChange,
}) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filterText, setFilterText] = useState('');
	const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

	// Filtrar documentos baseado na competência selecionada
	const competencyFilteredDocs = useMemo(() => {
		const selectedMonth = competencia.getMonth() + 1; // 1-12
		const selectedYear = competencia.getFullYear();

		return documentos.filter((doc) => {
			// Verificar data de emissão (dt_emissao ou js_nfe.dt_emissao ou js_cte.dt_emissao)
			let docDate: Date | null = null;

			if (doc.dt_emissao) {
				docDate = new Date(doc.dt_emissao);
			} else if (doc.js_nfe?.dt_emissao) {
				docDate = new Date(doc.js_nfe.dt_emissao);
			} else if (doc.js_cte?.dt_emissao) {
				docDate = new Date(doc.js_cte.dt_emissao);
			}

			if (!docDate) return false;

			const docMonth = docDate.getMonth() + 1;
			const docYear = docDate.getFullYear();

			return docMonth === selectedMonth && docYear === selectedYear;
		});
	}, [documentos, competencia]);

	// Filtrar por texto de busca
	const filteredDocs = useMemo(() => {
		if (!filterText) return competencyFilteredDocs;
		const lowerFilter = filterText.toLowerCase();
		return competencyFilteredDocs.filter(
			(doc) =>
				doc.ds_destinatario?.toLowerCase().includes(lowerFilter) ||
				doc.ds_cidade_destino?.toLowerCase().includes(lowerFilter) ||
				doc.ds_numero.toLowerCase().includes(lowerFilter) ||
				doc.ds_tipo.toLowerCase().includes(lowerFilter),
		);
	}, [competencyFilteredDocs, filterText]);

	// Ordenar documentos: CTEs primeiro, depois NFEs, ambos por número
	const sortedFilteredDocs = useMemo(() => {
		return [...filteredDocs].sort((a, b) => {
			if (a.ds_tipo !== b.ds_tipo) {
				return a.ds_tipo === 'CTE' ? -1 : 1;
			}
			const numA = a.ds_numero || '';
			const numB = b.ds_numero || '';
			return numA.localeCompare(numB);
		});
	}, [filteredDocs]);

	// Processar documentos para detecção de relacionamentos
	const processarDocumentos = () => {
		const nfesComRelacao: Set<string> = new Set();
		const ctes: ModalDocument[] = [];
		const nfes: ModalDocument[] = [];

		selectedDocIds.forEach((docId) => {
			const doc = documentos.find((d) => d.id === docId);
			if (!doc) return;

			if (doc.ds_tipo === 'CTE') {
				ctes.push(doc);

				// Marcar NFes relacionadas
				doc.fis_documento_relacionado?.forEach((rel) => {
					if (rel.fis_documento_origem?.id) {
						nfesComRelacao.add(rel.fis_documento_origem.id);
					}
				});
			} else if (doc.ds_tipo === 'NFE') {
				nfes.push(doc);
			}
		});

		const nfesRelacionadas = nfes.filter((nfe) => nfesComRelacao.has(nfe.id));
		const nfesOrfas = nfes.filter((nfe) => !nfesComRelacao.has(nfe.id));

		return { ctes, nfesRelacionadas, nfesOrfas };
	};

	const { ctes, nfesRelacionadas, nfesOrfas } = processarDocumentos();

	// Função para obter todos os documentos relacionados recursivamente
	const getAllRelatedDocIds = useCallback(
		(docId: string, visited = new Set<string>()): Set<string> => {
			if (visited.has(docId)) return visited;
			visited.add(docId);

			const doc = documentos.find((d) => d.id === docId);
			if (!doc || !doc.relatedDocIds) return visited;

			// Buscar relacionados recursivamente
			doc.relatedDocIds.forEach((relatedId) => {
				if (!visited.has(relatedId)) {
					getAllRelatedDocIds(relatedId, visited);
				}
			});

			return visited;
		},
		[documentos],
	);

	// Função para selecionar/desselecionar documento e seus relacionados
	const toggleDocSelection = useCallback(
		(docId: string) => {
			setSelectedDocIds((prev) => {
				const newSet = new Set(prev);

				if (newSet.has(docId)) {
					// Desselecionar: remove o documento e todos relacionados
					const allRelated = getAllRelatedDocIds(docId);
					allRelated.forEach((id) => newSet.delete(id));
				} else {
					// Selecionar: adiciona o documento e todos relacionados
					const allRelated = getAllRelatedDocIds(docId);
					allRelated.forEach((id) => newSet.add(id));
				}

				return newSet;
			});
		},
		[getAllRelatedDocIds],
	);

	if (!isOpen) return null;

	const handleSubmit = async () => {
		setError(null);
		setIsLoading(true);

		try {
			if (selectedDocIds.size === 0) {
				setError('Selecione pelo menos um documento');
				setIsLoading(false);
				return;
			}

			// Montar array de documentos - passar apenas os IDs com tipo
			const docsParaCriar = Array.from(selectedDocIds).map((docId) => {
				const doc = documentos.find((d) => d.id === docId);
				return {
					id: docId,
					tipo: doc?.ds_tipo || 'NFE',
				};
			});

			// Chamar API
			const response = await criarCargasComDocumentos(idViagem, docsParaCriar);

			if (!response.sucesso) {
				// Há NFes que precisam validação
				const nfesNaoRelacionadas = response.nfesNaoRelacionadas || [];
				setError(`${nfesNaoRelacionadas.length} documento(s) precisa(m) de validação de destino. ${response.mensagem}`);
				setIsLoading(false);
				return;
			}

			// Sucesso!
			onSuccess();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Erro ao criar cargas');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className='fixed inset-0 z-[10] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'>
			<div className='animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl duration-200'>
				{/* Header */}
				<div className='flex items-center justify-between border-b border-border/70 bg-muted/40 p-6'>
					<div>
						<h3 className='text-lg font-bold text-foreground uppercase'>Selecionar Documentos para Carga</h3>
						<p className='mt-1 text-xs text-muted-foreground'>
							{selectedDocIds.size > 0
								? `${selectedDocIds.size} documento(s) selecionado(s)`
								: 'Selecione documentos disponíveis para criar carga(s)'}
						</p>
					</div>
					<button onClick={onClose} className='rounded-full p-2 text-muted-foreground hover:bg-muted'>
						<X size={20} />
					</button>
				</div>

				<div className='custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-card p-6'>
					{/* Date Filter */}
					<div className='flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4'>
						<div>
							<p className='text-xs font-semibold text-muted-foreground uppercase'>Filtrar por Competência</p>
							<p className='mt-0.5 text-xs text-muted-foreground'>Selecione o mês/ano para visualizar documentos</p>
						</div>
						<MonthYearSelector
							showClearButton
							placeholder='Mês/Ano'
							className='max-w-32'
							selected={competencia}
							onSelect={(date) => onCompetenciaChange(date || new Date())}
						/>
					</div>

					{/* Documentos Disponíveis (duas colunas: CT-e próprio | DF-e relacionado; busca dentro do componente) */}
					{sortedFilteredDocs.length > 0 ? (
						<DocumentSelectTwoColumns
							documents={sortedFilteredDocs as SelectableDocWithBucket[]}
							selectedIds={selectedDocIds}
							filterText={filterText}
							onFilterChange={setFilterText}
							onToggle={toggleDocSelection}
							variant='compact'
						/>
					) : (
						<div className='rounded-lg border border-border bg-muted/40 p-8 text-center'>
							<p className='text-sm font-medium text-muted-foreground'>Nenhum documento disponível</p>
						</div>
					)}

					{/* Resumo de Agrupamento */}
					{selectedDocIds.size > 0 && (
						<div className='space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4'>
							<div className='text-xs font-bold text-blue-900 uppercase'>Resumo de Agrupamento</div>

							{ctes.length > 0 && (
								<div>
									<div className='mb-2 text-xs font-bold text-blue-700'>🚚 {ctes.length} CT-e(s)</div>
									{nfesRelacionadas.length > 0 && (
										<div className='ml-4 text-xs text-blue-700'>+ {nfesRelacionadas.length} NF-e(s) relacionada(s)</div>
									)}
								</div>
							)}

							{nfesOrfas.length > 0 && (
								<div className='rounded-lg border border-orange-200 bg-orange-50 p-3'>
									<div className='mb-2 text-xs font-bold text-orange-900'>⚠️ {nfesOrfas.length} NF-e(s) sem relacionamento</div>
									<p className='text-xs text-orange-700'>Você precisará confirmar o destino para cada uma</p>
								</div>
							)}
						</div>
					)}

					{/* Error */}
					{error && (
						<div className='rounded-xl border-2 border-red-300 bg-red-50 p-4'>
							<div className='flex items-start gap-3'>
								<AlertTriangle className='mt-1 flex-shrink-0 text-red-600' size={18} />
								<div>
									<div className='text-sm font-bold text-red-900 uppercase'>Erro</div>
									<p className='mt-1 text-xs text-red-700'>{error}</p>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className='flex gap-3 border-t border-border bg-muted/40 p-6'>
					<button
						onClick={onClose}
						className='flex-1 rounded-xl border border-border bg-muted/60 px-4 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
						disabled={isLoading}
					>
						Cancelar
					</button>
					<button
						onClick={handleSubmit}
						className='flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-4 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted disabled:opacity-50'
						disabled={isLoading || selectedDocIds.size === 0}
					>
						{isLoading ? (
							<>
								<Loader size={16} className='animate-spin' />
								Criando...
							</>
						) : (
							<>
								<CheckCircle size={16} />
								Criar Carga(s)
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
