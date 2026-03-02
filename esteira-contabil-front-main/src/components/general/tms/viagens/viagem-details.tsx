import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Carga, AvailableDocument, Doc, CTeData, NFe, NFeItem, ContaDespesa, Despesa, NfseServiceItem } from '@/types/tms';
import { tripStatusLabelPt, StatusBadge, deliveryStatusLabelPt, cargaStatusLabelPt } from '@/components/general/tms/viagens/status-viagens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocumentosDisponiveis, agruparDocumentos, getDocumentosDespesasDisponiveis } from '@/services/api/tms/documentos';
import { classificarDocBucket, docBadgeFromBucket } from '@/utils/tms/classificar-documento-dfe';
import { createDespesas, getDespesasByViagem, deleteDespesa } from '@/services/api/tms/despesas';
import { createEntregasLote, addDocumentosToEntrega, updateEntregaStatus, finalizarEntrega } from '@/services/api/tms/entregas';
import { createCarga } from '@/services/api/tms/cargas';
import { vincularCargaAViagem, reordenarCargasViagem, getViagem } from '@/services/api/tms/viagens';
import {
	useViagemFluxo,
	useIniciarItemViagem,
	useFinalizarItemViagem,
	useIniciarColeta,
	useFinalizarColeta,
	useIniciarEntrega,
	useUpdateViagemStatus,
} from '@/hooks/use-viagens';
import { useFinalizarCarga } from '@/hooks/use-finalizar-carga';
import { TripFlowActionButton } from '@/components/general/tms/viagens/trip-flow-action-button';
import { toast } from 'sonner';
import { CreateLoadModal } from '@/components/general/tms/viagens/modal-create-carga';
import { ModalConclusaoDataHora } from '@/components/general/tms/viagens/modal-conclusao-data-hora';
import { DocumentSelectWithRelations } from '@/components/general/tms/viagens/document-select-with-relations';
import { DocumentSelectTwoColumns } from '@/components/general/tms/viagens/document-select-two-columns';
import { EntregasPreviewEdit, type EntregaDraft } from '@/components/general/tms/viagens/entregas-preview-edit';
import {
	ArrowLeft,
	MapPin,
	Clipboard,
	Plus,
	Play,
	FileText,
	X,
	Check,
	ChevronDown,
	ChevronUp,
	Search,
	Route,
	Tag,
	CheckCircle,
	Loader2,
	Wallet,
	DollarSign,
	Box,
	Banknote,
	Calendar,
	MessageSquare,
	Receipt,
	Droplets,
	HandCoins,
	Tickets,
	User,
	AlignLeft,
	Trash2,
	Gauge,
} from 'lucide-react';
import { Dialog, DialogContentMedium, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useCompanyContext } from '@/context/company-context';
import { LoadCardInTrip } from '@/components/general/tms/viagens/carga-vg-card';
import { CargaActionButtons } from '@/components/general/tms/viagens/carga-action-buttons';
import {
	LegCard,
	TimelineNodeOrigin,
	TimelineNodeDest,
	type BorderStatus,
	getDotBgClass,
	getBorderClasses,
	getStripeBgClass,
} from '@/components/general/tms/viagens/viagem-timeline-cards';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getCidades } from '@/services/api/sistema';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Document, DeliveryLike, Leg, TripDetailsProps, FisDocumentoRelacionado } from './viagem-details/types';
import { CitySearch } from './viagem-details/city-search';
import { SortableDeliveryItem } from './viagem-details/sortable-delivery-item';
import { MonthYearSelector } from '@/components/ui/month-year-selector';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getContasDespesaTmsByEmpresaId } from '@/services/api/plano-contas';
import { format } from 'date-fns';

const BODY_TYPE_OPTIONS = ['Frigorífico', 'Graneleira', 'Baú', 'Sider', 'Prancha', 'Basculante', 'Porta-Container', 'Cegonheira'];

/** Status do leg/carga para borda do percurso: agendado=amarelo, em_coleta=laranja, em_rota=roxo, entregue=verde */
function getLegBorderStatus(
	fluxoItem: { status_item?: string; carga?: { ds_status_coleta?: string | null } } | null | undefined,
	carga: Carga | undefined,
): BorderStatus | undefined {
	if (carga?.ds_status === 'ENTREGUE') return 'entregue';
	if (fluxoItem?.status_item === 'CONCLUIDO') return 'entregue';
	if (fluxoItem?.status_item === 'EM_DESLOCAMENTO' && fluxoItem?.carga?.ds_status_coleta === 'EM_COLETA') return 'em_coleta';
	if (fluxoItem?.status_item === 'EM_DESLOCAMENTO') return 'em_rota';
	if (fluxoItem?.status_item === 'DISPONIVEL' || fluxoItem?.status_item === 'BLOQUEADO') return 'agendado';
	return 'agendado';
}

/** Pendências para finalizar viagem: só pode finalizar quando todas as cargas e deslocamentos estiverem finalizados. */
function getPendenciasFinalizarViagem(fluxo: { itens?: Array<{ nr_sequencia: number; tipo: string; status_item: string; carga?: { entregas?: Array<{ ds_status: string }> } }> } | null | undefined): {
	itensEmDeslocamento: string[];
	itensNaoIniciados: string[];
	cargasPendentes: string[];
	podeFinalizar: boolean;
	mensagemTooltip: string;
} {
	const itens = fluxo?.itens ?? [];
	const rotulo = (i: (typeof itens)[0]) => (i.tipo === 'DESLOCAMENTO_VAZIO' ? `Deslocamento Vazio ${i.nr_sequencia}` : `Carga ${i.nr_sequencia}`);

	const itensEmDeslocamento = itens.filter((i) => i.status_item === 'EM_DESLOCAMENTO').map(rotulo);
	const itensNaoIniciados = itens
		.filter((i) => i.status_item === 'DISPONIVEL' || i.status_item === 'BLOQUEADO')
		.map(rotulo);
	const cargasPendentes = itens
		.filter((i) => i.tipo === 'CARGA' && i.carga?.entregas?.some((e) => e.ds_status !== 'ENTREGUE'))
		.map((i) => `Carga ${i.nr_sequencia}`);

	// Só pode finalizar quando todos os itens estiverem CONCLUIDO (nenhum em deslocamento, nenhum não iniciado, nenhuma carga com entrega pendente)
	const todosConcluidos = itens.length === 0 || itens.every((i) => i.status_item === 'CONCLUIDO');
	const semCargasPendentes = cargasPendentes.length === 0;
	const podeFinalizar = todosConcluidos && semCargasPendentes;

	const partes: string[] = [];
	if (itensEmDeslocamento.length > 0) {
		partes.push(`Você ainda possui trajetos em andamento: ${itensEmDeslocamento.join(', ')}.`);
	}
	if (itensNaoIniciados.length > 0) {
		partes.push(`Trajetos não iniciados: ${itensNaoIniciados.join(', ')}.`);
	}
	if (cargasPendentes.length > 0) {
		partes.push(`Há cargas pendentes (${cargasPendentes.join(', ')}). Finalize as entregas ou remova a carga da viagem se não for vinculada a ela.`);
	}
	if (partes.length > 0) {
		partes.push('Finalize ou encerre os itens na viagem ou desvincule-os da viagem antes de finalizar.');
	}
	const mensagemTooltip = partes.join(' ');
	return { itensEmDeslocamento, itensNaoIniciados, cargasPendentes, podeFinalizar, mensagemTooltip };
}

/**
 * Tipo reduzido para contas do plano (analíticas) usadas nas despesas.
 * Campos baseados no JSON de exemplo fornecido pelo usuário.
 */
interface PlanoContaAnalitica {
	id: string;
	dt_created?: string;
	dt_updated?: string;
	id_con_empresas?: string;
	ds_classificacao_cta?: string;
	ds_nome_cta?: string;
	ds_tipo_cta?: string;
	ds_nivel_cta?: number | string;
	ds_classificacao_pai?: string;
	id_externo?: string;
	id_conta_pai?: string | null;
	is_ativo?: boolean;
	id_empresa_externo?: string;
	ds_tipo_tms_despesa?: 'ABASTECIMENTO' | 'ADIANTAMENTO' | 'PEDAGIO' | 'DESPESA' | string | null;
	id_grupo_contas?: string | null;
	[key: string]: unknown;
}

// Despesa payload item (utilizado para criar despesas/adiantamentos)
export interface DespesaRecord {
	tipo: 'DESPESA' | 'ADIANTAMENTO';
	valor: string;
	data: string;
	nfeItemId?: string | number;
	nfseId?: string | number | null;
	observacao?: string | null;
	id_conta_despesa?: string | null;
	odometro?: number;
}

export const TripDetails: React.FC<TripDetailsProps> = ({
	trip: tripProp,
	loads = [],
	availableDocs: availableDocsFromProps,
	isInline = false,
	onBack,
	onAddLeg,
	onReorderDeliveries,
	onEmitFiscal,
	onViewLoadDetails,
	initialViewMode,
	onUpdateStatus,
}) => {
	const [competencia, setCompetencia] = useState<Date>(new Date());
	const queryClient = useQueryClient();
	const { state: empresaId } = useCompanyContext();
	// Refetch da viagem para refletir entregas/cargas atualizadas (ex.: após "Encerrar carga")
	const { data: tripFetched } = useQuery({
		queryKey: ['get-viagem', tripProp?.id],
		queryFn: () => getViagem(tripProp!.id),
		enabled: !!tripProp?.id,
		initialData: tripProp,
		initialDataUpdatedAt: 0,
	});
	const trip = tripFetched ?? tripProp;
	const { data: fluxo } = useViagemFluxo(trip?.id ?? '');
	const pendenciasFinalizar = useMemo(() => getPendenciasFinalizarViagem(fluxo), [fluxo]);
	const isPlanejada = trip?.ds_status === 'PLANEJADA' && trip?.status !== 'Completed';
	const isEmViagemOuColeta = trip?.ds_status === 'EM_VIAGEM' || trip?.ds_status === 'EM_COLETA';
	const isConcluida = trip?.ds_status === 'CONCLUIDA' || trip?.status === 'Completed';
	const iniciarItemMutation = useIniciarItemViagem(trip?.id ?? '');
	const finalizarItemMutation = useFinalizarItemViagem(trip?.id ?? '');
	const iniciarColetaMutation = useIniciarColeta();
	const finalizarColetaMutation = useFinalizarColeta();
	const iniciarEntregaMutation = useIniciarEntrega();
	const updateViagemStatusMutation = useUpdateViagemStatus(trip?.id ?? '');
	const finalizarEntregaSimplesMutation = useMutation({
		mutationFn: async (params: { entregaId: string; dtIso?: string }) => {
			return await updateEntregaStatus(params.entregaId, 'ENTREGUE', params.dtIso);
		},
	});
	const [viewMode, setViewMode] = useState<'CARGAS' | 'DESPESAS' | 'ADIANTAMENTOS'>(initialViewMode ?? 'CARGAS');
	useEffect(() => {
		setViewMode(initialViewMode ?? 'CARGAS');
	}, [trip?.id, initialViewMode]);
	// DESPESAS state
	const [selectedConta, setSelectedConta] = useState<PlanoContaAnalitica | null>(null);
	// contas selecionadas por item/serviço (id da conta)
	const [contasPorItem, setContasPorItem] = useState<Record<string, string>>({});
	const [documentModalOpen, setDocumentModalOpen] = useState(false);
	const [docSearch, setDocSearch] = useState('');
	const [selectedDocument, setSelectedDocument] = useState<Doc | null>(null);

	// Corrige bug do Radix: ao fechar Dialog, pointer-events/overflow podem ficar bloqueando cliques
	useEffect(() => {
		if (documentModalOpen) return;
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
	}, [documentModalOpen]);
	const [dataDespesa, setDataDespesa] = useState<string | null>(null);
	const [valorDespesa, setValorDespesa] = useState<number | null>(null);
	const [descricaoDespesa, setDescricaoDespesa] = useState('');
	const [odometro, setOdometro] = useState<number | null>(null);
	const [quemPagou, setQuemPagou] = useState<'EMPRESA' | 'MOTORISTA'>('EMPRESA');

	// Lists (local, draft) for Despesas e Adiantamentos
	const [despesasList, setDespesasList] = useState<Despesa[]>([]);
	const [adiantamentosList, setAdiantamentosList] = useState<Despesa[]>([]);

	const formatCurrency = (v: number | null | undefined) => {
		if (v === null || v === undefined || Number.isNaN(v)) return 'R$ 0,00';
		return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
	};

	const handleSaveDespesa = async () => {
		// Build payload: one record per item (NFe items or NFSe services), or a single record if manual
		const payload: [] = [];

		type DespesaPayload = DespesaRecord[];

		const addRecord = (rec: DespesaRecord): void => {
			// payload foi declarado acima com tipo genérico vazio; forçamos o cast para o tipo correto aqui
			(payload as unknown as DespesaPayload).push(rec);
		};

		if (
			selectedDocument?.js_nfe &&
			Array.isArray(selectedDocument.js_nfe.fis_nfe_itens) &&
			selectedDocument.js_nfe.fis_nfe_itens.length > 0
		) {
			selectedDocument.js_nfe.fis_nfe_itens.forEach((it: NFeItem) => {
				const valorNum = Number(it.vl_total ?? it.vl_unitario ?? '0') / 100;
				const valorStr = valorNum.toFixed(2);
				const rec: DespesaRecord = {
					tipo: 'DESPESA',
					valor: valorStr,
					data: dataDespesa ? new Date(dataDespesa).toISOString() : new Date().toISOString(),
					nfeItemId: it.id,
					observacao: descricaoDespesa || null,
					id_conta_despesa: contasPorItem[it.id] || null,
				};

				// attach odometer if required for this item account
				const contaIdForItem = contasPorItem[it.id] || null;
				const contaForItem = (planoContas || []).find((p: ContaDespesa) => p.id === contaIdForItem) || null;
				if (contaForItem?.ds_tipo_tms_despesa === 'ABASTECIMENTO') {
					if (odometro !== null) {
						rec.odometro = odometro;
					}
				}

				addRecord(rec);
			});
		} else if (
			selectedDocument?.js_nfse &&
			Array.isArray(selectedDocument.js_nfse.js_servicos) &&
			selectedDocument.js_nfse.js_servicos.length > 0
		) {
			const valorNum = Number(selectedDocument.js_nfse.ds_valor_servicos ?? '0') / 100;
			const valorStr = valorNum.toFixed(2);
			console.log(contasPorItem, selectedDocument.js_nfse.id);
			const rec: DespesaRecord = {
				tipo: 'DESPESA',
				valor: valorStr,
				data: dataDespesa ? new Date(dataDespesa).toISOString() : new Date().toISOString(),
				nfseId: selectedDocument.js_nfse?.id || selectedDocument.js_nfse?.ds_numero || null,
				observacao: descricaoDespesa || null,
				id_conta_despesa: selectedConta?.id ?? (contasPorItem[selectedDocument.js_nfse?.id] || null),
			};

			// attach odometer if conta is ABASTECIMENTO
			const contaIdForNfse = selectedConta?.id || contasPorItem[selectedDocument.js_nfse?.id] || null;
			const contaForNfse = (planoContas || []).find((p: ContaDespesa) => p.id === contaIdForNfse) || null;
			if (contaForNfse?.ds_tipo_tms_despesa === 'ABASTECIMENTO') {
				if (odometro !== null) {
					rec.odometro = odometro;
				}
			}

			addRecord(rec);
		} else if (valorDespesa) {
			// Manual single entry
			const rec: DespesaRecord = {
				tipo: 'DESPESA',
				valor: (Number(valorDespesa) || 0).toFixed(2),
				data: dataDespesa ? new Date(dataDespesa).toISOString() : new Date().toISOString(),
				observacao: descricaoDespesa || null,
				id_conta_despesa: selectedConta?.id || null,
			};

			// attach odometer for manual entry if selectedConta is ABASTECIMENTO
			if (selectedConta?.ds_tipo_tms_despesa === 'ABASTECIMENTO') {
				if (odometro !== null) {
					rec.odometro = odometro;
				}
			}

			addRecord(rec);
		} else {
			// nothing to save
			toast.error('Nada para salvar. Selecione um documento ou informe um valor.');
			return;
		}

		try {
			// If any selected account/document requires odometer, validate inputs
			if (odometerEnabled) {
				if (odometro === null) {
					toast.error('Informe odômetro para despesas de abastecimento.');
					return;
				}
			}
			await createDespMutation.mutateAsync(payload);
			toast.success('Despesas salvas com sucesso');
			// clear form and local draft
			setSelectedDocument(null);
			setDataDespesa(null);
			setValorDespesa(null);
			setDescricaoDespesa('');
			setContasPorItem({});
			// update local view
			setDespesasList([]);
		} catch (err) {
			console.error('Erro ao salvar despesas', err);
			toast.error('Erro ao salvar despesas: ' + (err || ''));
		}
	};

	const handleRemoveDespesa = (id: string) => setDespesasList((s) => s.filter((d) => d.id !== id));

	const handleDeleteDespesa = async (id: string) => {
		try {
			await deleteDespMutation.mutateAsync(id);
			toast.success('Despesa removida');
			queryClient.invalidateQueries({ queryKey: ['viagem-despesas', trip.id] });
			queryClient.invalidateQueries({ queryKey: ['viagem-adiantamentos', trip.id] });
		} catch (err) {
			console.error('Erro ao remover despesa', err);
			toast.error('Erro ao remover despesa: ' + (err || ''));
		}
	};

	const handleSaveAdiantamento = async () => {
		// Build payload for adiantamento (single record)
		if (!valorAdiantamento || Number.isNaN(Number(valorAdiantamento))) {
			toast.error('Informe um valor válido para o adiantamento');
			return;
		}

		const payload: DespesaRecord[] = [
			{
				tipo: 'ADIANTAMENTO',
				valor: (Number(valorAdiantamento) || 0).toFixed(2),
				data: dataAdiantamento ? new Date(dataAdiantamento).toISOString() : new Date().toISOString(),
				observacao: obsAdiantamento || null,
				id_conta_despesa: selectedConta?.id || null,
			},
		];

		try {
			await createAdiantMutation.mutateAsync(payload);
			toast.success('Adiantamento salvo com sucesso');
			// clear form
			setSelectedConta(null);
			setDataAdiantamento(undefined);
			setValorAdiantamento(null);
			setObsAdiantamento('');
			// clear local draft list
			setAdiantamentosList([]);
		} catch (err) {
			console.error('Erro ao salvar adiantamento', err);
			toast.error('Erro ao salvar adiantamento: ' + (err || ''));
		}
	};

	const handleRemoveAdiantamento = (id: string) => setAdiantamentosList((s) => s.filter((a) => a.id !== id));

	const handleDeleteAdiantamento = async (id: string) => {
		try {
			await deleteDespMutation.mutateAsync(id);
			toast.success('Adiantamento removido');
			queryClient.invalidateQueries({ queryKey: ['viagem-adiantamentos', trip.id] });
			queryClient.invalidateQueries({ queryKey: ['viagem-despesas', trip.id] });
		} catch (err) {
			console.error('Erro ao remover adiantamento', err);
			toast.error('Erro ao remover adiantamento: ' + (err || ''));
		}
	};

	const formatDateForInput = (d: string | Date) => {
		if (!d) return '';
		try {
			const date = typeof d === 'string' ? new Date(d) : d instanceof Date ? d : new Date(d);
			if (isNaN(date.getTime())) return '';
			return date.toISOString().slice(0, 10);
		} catch {
			return '';
		}
	};
	// expanded document ids in modal
	const [docExpanded, setDocExpanded] = useState<Set<string>>(new Set());

	// ADIANTAMENTOS state
	const [dataAdiantamento, setDataAdiantamento] = useState<Date | undefined>(undefined);
	const [valorAdiantamento, setValorAdiantamento] = useState<number | null>(null);
	const [obsAdiantamento, setObsAdiantamento] = useState('');

	// Queries
	const { data: planoContas } = useQuery({
		queryKey: ['plano-contas-all', empresaId],
		queryFn: () => getContasDespesaTmsByEmpresaId(empresaId),
		enabled: !!empresaId,
	});

	const needsOdometer = useMemo(() => {
		if (!selectedDocument && !selectedConta) return false;

		// If manual (no document) but selectedConta is ABASTECIMENTO
		if (!selectedDocument && selectedConta?.ds_tipo_tms_despesa === 'ABASTECIMENTO') return true;

		// NF-e: check per-item selected accounts
		if (selectedDocument?.js_nfe && Array.isArray(selectedDocument.js_nfe.fis_nfe_itens)) {
			for (const it of selectedDocument.js_nfe.fis_nfe_itens) {
				const contaId = contasPorItem[it.id];
				if (!contaId) continue;
				const conta = (planoContas || []).find((p: ContaDespesa) => p.id === contaId);
				if (conta?.ds_tipo_tms_despesa === 'ABASTECIMENTO') return true;
			}
		}

		// NFSe: check selectedConta or mapping for the nfse id
		if (selectedDocument?.js_nfse) {
			const contaId = selectedConta?.id || contasPorItem[selectedDocument.js_nfse?.id];
			if (contaId) {
				const conta = (planoContas || []).find((p: ContaDespesa) => p.id === contaId);
				if (conta?.ds_tipo_tms_despesa === 'ABASTECIMENTO') return true;
			}
		}

		return false;
	}, [selectedDocument, selectedConta, contasPorItem, planoContas]);

	// explicit enabled state to respond immediately to select changes
	const [odometerEnabled, setOdometerEnabled] = useState<boolean>(false);

	// keep enabled state in sync with computed needsOdometer
	React.useEffect(() => {
		setOdometerEnabled(Boolean(needsOdometer));
	}, [needsOdometer]);

	// despesas from API
	const { data: despesasFromApi } = useQuery({
		//, refetch: refetchDespesas
		queryKey: ['viagem-despesas', trip.id],
		queryFn: () => (trip?.id ? getDespesasByViagem(trip.id) : []),
		enabled: !!trip?.id && viewMode === 'DESPESAS',
	});

	const createDespMutation = useMutation({
		mutationFn: (payload: DespesaRecord[]) => createDespesas(trip.id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['viagem-despesas', trip.id] });
			// optionally refetch documentos or other data
		},
	});

	// mutation to delete a despesa (despesa or adiantamento)
	const deleteDespMutation = useMutation({
		mutationFn: (id: string) => deleteDespesa(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['viagem-despesas', trip.id] });
			queryClient.invalidateQueries({ queryKey: ['viagem-adiantamentos', trip.id] });
		},
	});

	// adiantamentos (use same endpoint but mark tipo 'ADIANTAMENTO')
	const { data: adiantamentosFromApi } = useQuery({
		//, refetch: refetchAdiantamentos
		queryKey: ['viagem-adiantamentos', trip.id],
		queryFn: () => (trip?.id ? getDespesasByViagem(trip.id) : []),
		enabled: !!trip?.id && viewMode === 'ADIANTAMENTOS',
	});

	const createAdiantMutation = useMutation({
		mutationFn: (payload: DespesaRecord[]) => createDespesas(trip.id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['viagem-despesas', trip.id] });
			queryClient.invalidateQueries({ queryKey: ['viagem-adiantamentos', trip.id] });
		},
	});

	const despesasToShow = despesasFromApi || despesasList;
	const adiantamentosToShow = adiantamentosFromApi
		? (adiantamentosFromApi as Despesa[]).filter((d) => d?.ds_tipo === 'ADIANTAMENTO')
		: adiantamentosList;

	const { data: documentosDespesas } = useQuery({
		queryKey: [
			'documentos-despesas',
			empresaId,
			docSearch,
			competencia ? `${competencia.getFullYear()}-${String(competencia.getMonth() + 1).padStart(2, '0')}` : undefined,
		],
		queryFn: () => {
			const params: { search: string; competencia?: string } = { search: docSearch };
			if (competencia) {
				params.competencia = format(new Date(competencia), 'yyyy-MM');
			}
			return getDocumentosDespesasDisponiveis(params);
		},
		enabled: !!empresaId && viewMode === 'DESPESAS' && documentModalOpen,
	});
	// TODO: Implementar sistema de legs/pernas. Por enquanto, usar js_viagens_cargas como "legs"
	// Cada carga vinculada = 1 leg (simplificação temporária)
	const safeLegs: Leg[] = useMemo(() => {
		const buildLegFromCarga = (carga: Carga | undefined, index: number, idOverride?: string): Leg => {
			const originCity = carga?.sis_cidade_origem?.ds_city || carga?.originCity || '';
			const originUf = carga?.sis_cidade_origem?.js_uf?.ds_uf;

			// Destinação:
			// 1. Para deslocamentos vazios (DESLOCAMENTO_VAZIO), usar sis_cidade_destino da carga
			// 2. Para cargas normais, usar primeira entrega como destino primário
			const primeiraEntrega = carga?.js_entregas?.[0];
			const isDeslocamentoVazio = carga?.fl_deslocamento_vazio === true || carga?.cd_carga === 'DESLOCAMENTO_VAZIO';

			let destinationCity = '';
			let destinationUf = '';

			if (isDeslocamentoVazio) {
				// Deslocamento vazio: usar cidade destino da carga
				destinationCity = carga?.sis_cidade_destino?.ds_city || '';
				destinationUf = carga?.sis_cidade_destino?.js_uf?.ds_uf || '';
			} else {
				// Carga normal: usar primeira entrega
				destinationCity = primeiraEntrega?.sis_cidade_destino?.ds_city || carga?.destinationCity || '';
				destinationUf = primeiraEntrega?.sis_cidade_destino?.js_uf?.ds_uf || '';
			}

			return {
				id: idOverride || carga?.id || `carga-${index}`,
				type: 'LOAD' as const,
				sequence: index + 1,
				direction: 'Ida',
				originCity: originUf ? `${originCity} - ${originUf}` : originCity,
				originAddress: carga?.ds_observacoes || '',
				destinationCity: destinationUf ? `${destinationCity} - ${destinationUf}` : destinationCity,
				destinationAddress: '',
				segment: carga?.tms_segmentos?.ds_nome,
				controlNumber: carga?.cd_carga,
				cd_carga: carga?.cd_carga,
				fl_deslocamento_vazio: carga?.fl_deslocamento_vazio === true || carga?.cd_carga === 'DESLOCAMENTO_VAZIO',
				loadId: carga?.id,
				deliveries: [],
				cargaData: carga,
			};
		};

		const apiLegs = Array.isArray(trip?.cargas) ? (trip.cargas as Carga[]) : [];

		if (apiLegs.length > 0) {
			return apiLegs.map((carga, index) => buildLegFromCarga(carga, index));
		}

		const viagemCargas = Array.isArray(trip?.js_viagens_cargas) ? trip.js_viagens_cargas : [];

		return viagemCargas
			.sort((a, b) => (a.nr_sequencia || 0) - (b.nr_sequencia || 0))
			.map((vc, index: number) => {
				const carga = vc.tms_cargas;
				return buildLegFromCarga(carga, index, vc.id);
			});
	}, [trip]);
	// Documentos vinculados à carga (via entregas ou fallback para estrutura legada)
	const getCargaDocumentos = (carga: Carga): Document[] => {
		if (!carga) return [];

		// NOVA ESTRUTURA: Usar js_entregas se disponível
		if (carga.js_entregas && carga.js_entregas.length > 0) {
			// Agregar todos os documentos de todas as entregas
			const allDocs: Document[] = [];
			carga.js_entregas.forEach((entrega) => {
				const recipientName = (carga.fis_clientes ?? carga.tms_clientes)?.ds_nome || 'Destinatário não informado';
				const destinationCity = entrega.sis_cidade_destino?.ds_city || 'Destino não informado';
				const destinationAddress = entrega.ds_endereco || '';

				// CTes da entrega
				const entregaCtes = entrega.js_entregas_ctes || [];
				const entregaNfes = entrega.js_entregas_nfes || [];
				const entregaCteSummaries = entregaCtes.map((cteLink) => {
					const cteData = cteLink.js_cte;
					const cteId = String(cteLink.id_cte || cteLink.id);
					const cteNumber = cteData?.ds_numero || String(cteLink.ordem ?? cteId);
					return { id: cteId, number: cteNumber };
				});
				const entregaNfeIds = entregaNfes.map((nfeLink) => String(nfeLink.id_nfe || nfeLink.id));

				entregaCtes.forEach((cteLink) => {
					const cteData = cteLink.js_cte;
					const cteId = String(cteLink.id_cte || cteLink.id);
					const cteNumber = cteData?.ds_numero || String(cteLink.ordem ?? cteId);

					// Extrair IDs de documentos relacionados do fis_documento_dfe
					const relatedDocIds: string[] = [];
					const documentosDfe = cteData?.fis_documento_dfe;

					if (Array.isArray(documentosDfe) && documentosDfe.length > 0) {
						documentosDfe.forEach((documentoDfe) => {
							// Documentos relacionados (docs que este documento aponta)
							if (Array.isArray(documentoDfe.fis_documento_relacionado)) {
								documentoDfe.fis_documento_relacionado.forEach((rel) => {
									if (rel.id_documento_referenciado) {
										relatedDocIds.push(rel.id_documento_referenciado);
									}
									if (rel.id_documento_origem) {
										relatedDocIds.push(rel.id_documento_origem);
									}
								});
							}

							// Documentos de origem (docs que apontam para este documento)
							if (Array.isArray(documentoDfe.fis_documento_origem)) {
								documentoDfe.fis_documento_origem.forEach((orig) => {
									if (typeof orig === 'object' && orig !== null) {
										if ('id_documento_origem' in orig && orig.id_documento_origem) {
											relatedDocIds.push(orig.id_documento_origem);
										}
										if ('id_documento_referenciado' in orig && orig.id_documento_referenciado) {
											relatedDocIds.push(orig.id_documento_referenciado);
										}
									}
								});
							}
						});
					}

					const relatedKeys: string[] = [];

					// Extrair chaves de NFes relacionadas
					if (Array.isArray(cteData?.js_chaves_nfe)) {
						relatedKeys.push(...cteData?.js_chaves_nfe.filter(Boolean));
					}
					if (Array.isArray(cteData?.js_documentos_anteriores)) {
						cteData.js_documentos_anteriores.forEach((docAnt) => {
							if (docAnt) relatedKeys.push(docAnt);
						});
					}

					allDocs.push({
						id: cteId,
						number: cteNumber,
						type: 'CTe',
						value: Number(cteData?.vl_total ?? 0) / 100,
						recipientName,
						destinationCity,
						destinationAddress,
						isSubcontracted: cteData?.id_fis_empresa_subcontratada ? true : false,
						emissionDate: cteData?.dt_emissao || '',
						dfeKey: cteData?.ds_chave || cteId,
						relatedDfeKeys: relatedKeys,
						relatedDocIds: [...new Set([...entregaNfeIds, ...relatedDocIds])],
						entregaId: entrega.id,
					});
				});
				entregaNfes.forEach((nfeLink) => {
					const nfeData = nfeLink.js_nfe;
					const nfeId = String(nfeLink.id_nfe || nfeLink.id);
					const nfeNumber = nfeData?.ds_numero || String(nfeLink.ordem ?? nfeId);
					const nfeChave = nfeData?.ds_chave || nfeId;
					const linkedCteNumber = entregaCteSummaries[0]?.number;

					// Extrair IDs de documentos relacionados do fis_documento_dfe
					const relatedDocIds: string[] = [];
					const documentosDfe = nfeData?.fis_documento_dfe;

					if (Array.isArray(documentosDfe) && documentosDfe.length > 0) {
						documentosDfe.forEach((documentoDfe) => {
							// Documentos relacionados (docs que este documento aponta)
							if (Array.isArray(documentoDfe.fis_documento_relacionado)) {
								documentoDfe.fis_documento_relacionado.forEach((rel) => {
									if (rel.id_documento_referenciado) {
										relatedDocIds.push(rel.id_documento_referenciado);
									}
									if (rel.id_documento_origem) {
										relatedDocIds.push(rel.id_documento_origem);
									}
								});
							}

							// Documentos de origem (docs que apontam para este documento)
							if (Array.isArray(documentoDfe.fis_documento_origem)) {
								documentoDfe.fis_documento_origem.forEach((orig) => {
									if (orig.id_documento_origem) {
										relatedDocIds.push(orig.id_documento_origem);
									}
									if (orig.id_documento_referenciado) {
										relatedDocIds.push(orig.id_documento_referenciado);
									}
								});
							}
						});
					}

					const referencedKeys: string[] = [];
					if (Array.isArray(nfeData?.js_nfes_referenciadas)) {
						nfeData.js_nfes_referenciadas.forEach((nfeRef) => {
							if (nfeRef) referencedKeys.push(nfeRef);
						});
					}

					allDocs.push({
						id: nfeId,
						number: nfeNumber,
						type: 'NF',
						value: 0,
						recipientName,
						destinationCity,
						destinationAddress,
						isSubcontracted: false,
						emissionDate: nfeData?.dt_emissao || '',
						dfeKey: nfeChave,
						linkedCteNumber,
						relatedDfeKeys: referencedKeys,
						relatedDocIds: [...new Set([...entregaCteSummaries.map((c) => c.id), ...relatedDocIds])],
						entregaId: entrega.id,
					});
				});
			});

			return allDocs;
		}

		// ESTRUTURA LEGADA: Fallback para js_entregas -> extrair links de NFes/CTes corretamente
		const nfes = (carga.js_entregas || []).flatMap((entrega) =>
			Array.isArray(entrega.js_entregas_nfes) ? entrega.js_entregas_nfes.map((link) => link.js_nfe).filter(Boolean) : [],
		);

		const ctes = (carga.js_entregas || []).flatMap((entrega) =>
			Array.isArray(entrega.js_entregas_ctes) ? entrega.js_entregas_ctes.map((link) => link.js_cte).filter(Boolean) : [],
		);
		const recipientName = (carga.fis_clientes ?? carga.tms_clientes)?.ds_nome || 'Destinatário não informado';
		const destinationCity = carga.destinationCity || 'Destino não informado';
		const destinationAddress = '';

		// Tipos locais para estrutura de documentos relacionais (usados apenas aqui)
		interface FisDocumentoRelacionado {
			// Algumas entradas possuem fis_documento_origem como objeto com id
			fis_documento_origem?: { id?: string | number } | null;
			// fallback para outros formatos
			id?: string | number;
			[key: string]: unknown;
		}

		const extractRelatedDocIds = (source: CTeData | NFe | null | undefined): string[] => {
			const relatedIds: string[] = [];
			if (!source) return relatedIds;

			// fis_documento_dfe is typically an array of DFE objects; iterate each item and then inspect its relationships
			if (Array.isArray(source.fis_documento_dfe)) {
				source.fis_documento_dfe.forEach((docDfe) => {
					if (Array.isArray(docDfe?.fis_documento_relacionado)) {
						docDfe.fis_documento_relacionado.forEach((rel) => {
							const origin = (rel as FisDocumentoRelacionado)?.fis_documento_origem as { id?: string | number } | undefined | null;
							if (origin?.id) relatedIds.push(String(origin.id));
							// legacy keys
							if (rel?.id_documento_origem) relatedIds.push(String(rel.id_documento_origem));
							if (rel?.id_documento_referenciado) relatedIds.push(String(rel.id_documento_referenciado));
						});
					}

					if (Array.isArray(docDfe?.fis_documento_origem)) {
						docDfe.fis_documento_origem.forEach((orig) => {
							const referenced = (orig as FisDocumentoRelacionado)?.fis_documento_relacionado as
								| { id?: string | number }
								| undefined
								| null;
							if (referenced?.id) relatedIds.push(String(referenced.id));
							// legacy keys
							if (orig?.id_documento_origem) relatedIds.push(String(orig.id_documento_origem));
							if (orig?.id_documento_referenciado) relatedIds.push(String(orig.id_documento_referenciado));
						});
					}
				});
			}

			// also support cases where fis_documento_origem exists directly on the source object
			// if (Array.isArray((source.fis_documento_origem)) {
			// 	(source as any).fis_documento_origem.forEach((rel: any) => {
			// 		const referenced = rel?.fis_documento_referenciado as { id?: string | number } | undefined | null;
			// 		if (referenced?.id) relatedIds.push(String(referenced.id));
			// 		if (rel?.id_documento_origem) relatedIds.push(String(rel.id_documento_origem));
			// 		if (rel?.id_documento_referenciado) relatedIds.push(String(rel.id_documento_referenciado));
			// 	});
			// }

			return relatedIds;
		};

		// Extrair chaves de NFe dos CTes (js_chaves_nfe ou js_documentos_anteriores)
		const cteRelatedKeys = new Map<string, string[]>();

		const cteDocs: Document[] = ctes.map((cte) => {
			const cteData = cte;
			const relatedKeys: string[] = [];

			// Extrair de js_chaves_nfe (array de chaves)
			if (Array.isArray(cteData?.js_chaves_nfe)) {
				relatedKeys.push(...cteData?.js_chaves_nfe.filter(Boolean));
			}

			// Extrair de js_documentos_anteriores (array de objetos com chave)
			if (Array.isArray(cteData?.js_documentos_anteriores)) {
				cteData.js_documentos_anteriores.forEach((docAnt) => {
					if (docAnt) {
						relatedKeys.push(docAnt);
					}
				});
			}

			const cteId = String(cte?.id);
			const cteNumber = cteData?.ds_numero;
			cteRelatedKeys.set(cteId, relatedKeys);
			const relatedDocIds = Array.from(new Set([...extractRelatedDocIds(cte), ...extractRelatedDocIds(cteData)]));

			return {
				id: cteId,
				number: cteNumber || '',
				type: 'CTe',
				value: Number(cteData?.vl_total ?? 0) / 100,
				recipientName,
				destinationCity,
				destinationAddress,
				isSubcontracted: cteData?.id_fis_empresa_subcontratada ? true : false,
				emissionDate: cteData?.dt_emissao || '',
				dfeKey: cteData?.ds_chave || cteId,
				relatedDfeKeys: relatedKeys,
				relatedDocIds,
			};
		});

		const nfeDocs: Document[] = nfes.map((nf) => {
			const nfeData = nf;
			const nfeId = String(nf?.id);
			const nfeNumber = nfeData?.ds_numero;
			const nfeChave = nfeData?.ds_chave || nfeId;
			const relatedDocIds = Array.from(new Set([...extractRelatedDocIds(nf), ...extractRelatedDocIds(nfeData)]));

			// Encontrar CTe que referencia esta NFe
			let linkedCteNumber: string | undefined;
			for (const [cteId, keys] of cteRelatedKeys.entries()) {
				if (keys.includes(nfeChave)) {
					const cteDoc = cteDocs.find((c) => c.id === cteId);
					if (cteDoc) {
						linkedCteNumber = cteDoc.number;
						break;
					}
				}
			}

			// Extrair chaves de js_nfes_referenciadas (NFes que esta NFe referencia)
			const referencedKeys: string[] = [];
			if (Array.isArray(nfeData?.js_nfes_referenciadas)) {
				nfeData.js_nfes_referenciadas.forEach((nfeRef) => {
					if (nfeRef) {
						referencedKeys.push(nfeRef);
					}
				});
			}

			return {
				id: nfeId,
				number: nfeNumber || '',
				type: 'NF',
				value: 0,
				recipientName,
				destinationCity,
				destinationAddress,
				isSubcontracted: false,
				emissionDate: nfeData?.dt_emissao || '',
				dfeKey: nfeChave,
				linkedCteNumber,
				relatedDfeKeys: referencedKeys,
				relatedDocIds,
			};
		});

		return [...cteDocs, ...nfeDocs];
	};

	const getCargaDeliveries = (carga: Carga, docs: Document[]): DeliveryLike[] => {
		if (!carga) return [];
		console.log('[getCargaDeliveries] carga:', carga);
		console.log('[getCargaDeliveries] docs:', docs);
		// NOVA ESTRUTURA: Usar js_entregas se disponível
		if (carga.js_entregas && carga.js_entregas.length > 0) {
			const sortedEntregas = [...carga.js_entregas].sort((a, b) => (a.nr_sequencia || 0) - (b.nr_sequencia || 0));
			// Quando a carga está EM_TRANSITO, a primeira entrega não entregue deve mostrar "Finalizar Entrega" (status Em Rota)
			const firstNonEntregueId =
				carga.ds_status === 'EM_TRANSITO'
					? sortedEntregas.find((e) => e.ds_status !== 'ENTREGUE')?.id ?? null
					: null;

			return sortedEntregas.map((entrega) => {
					const recipientName = (carga.fis_clientes ?? carga.tms_clientes)?.ds_nome || 'Destinatário não informado';
					const destinationCity = entrega.sis_cidade_destino?.ds_city || 'Destino não informado';
					const destinationUf = entrega.sis_cidade_destino?.js_uf?.ds_uf;
					const destinationAddress = entrega.ds_endereco || '';
					const isSubcontracted = entrega.js_entregas_ctes?.some((cteLink) => cteLink.js_cte?.id_fis_empresa_subcontratada) || false;

					// Mapear status da entrega para formato esperado pela UI (fonte única status-viagens)
					// Se carga EM_TRANSITO e esta é a primeira entrega não entregue, exibir como "Em Rota" para mostrar botão Finalizar Entrega
					let status = deliveryStatusLabelPt(entrega.ds_status);
					if (carga.ds_status === 'EM_TRANSITO' && entrega.ds_status !== 'ENTREGUE' && firstNonEntregueId === entrega.id) {
						status = 'Em Rota';
					}

					// Coletar documentos desta entrega
					const entregaDocs: Document[] = [];

					// CTes da entrega
					(entrega.js_entregas_ctes || []).forEach((cteLink) => {
						const cteData = cteLink.js_cte;
						const cteId = String(cteLink.id_cte || cteLink.id);
						const cteNumber = cteData?.ds_numero || String(cteLink.ordem ?? cteId);

						const relatedKeys: string[] = [];
						if (Array.isArray(cteData?.js_chaves_nfe)) {
							relatedKeys.push(...cteData?.js_chaves_nfe.filter(Boolean));
						}
						if (Array.isArray(cteData?.js_documentos_anteriores)) {
							cteData.js_documentos_anteriores.forEach((docAnt) => {
								if (docAnt) relatedKeys.push(docAnt);
							});
						}

						entregaDocs.push({
							id: cteId,
							number: cteNumber,
							type: 'CTe',
							value: Number(cteData?.vl_total ?? 0) / 100,
							recipientName,
							destinationCity: destinationUf ? `${destinationCity} - ${destinationUf}` : destinationCity,
							destinationAddress,
							isSubcontracted,
							emissionDate: cteData?.dt_emissao || '',
							dfeKey: cteData?.ds_chave || cteId,
							relatedDfeKeys: relatedKeys,
							relatedDocIds: [],
						});
					});

					// NFes da entrega
					(entrega.js_entregas_nfes || []).forEach((nfeLink) => {
						const nfeData = nfeLink.js_nfe;
						const nfeId = String(nfeLink.id_nfe || nfeLink.id);
						const nfeNumber = nfeData?.ds_numero || String(nfeLink.ordem ?? nfeId);
						const nfeChave = nfeData?.ds_chave || nfeId;

						const referencedKeys: string[] = [];
						if (Array.isArray(nfeData?.js_nfes_referenciadas)) {
							nfeData.js_nfes_referenciadas.forEach((nfeRef) => {
								if (nfeRef) referencedKeys.push(nfeRef);
							});
						}

						entregaDocs.push({
							id: nfeId,
							number: nfeNumber,
							type: 'NF',
							value: 0,
							recipientName,
							destinationCity: destinationUf ? `${destinationCity} - ${destinationUf}` : destinationCity,
							destinationAddress,
							isSubcontracted,
							emissionDate: nfeData?.dt_emissao || '',
							dfeKey: nfeChave,
							relatedDfeKeys: referencedKeys,
							relatedDocIds: [],
						});
					});

					return {
						id: String(entrega.id),
						entregaId: String(entrega.id),
						destinationCity: destinationUf ? `${destinationCity} - ${destinationUf}` : destinationCity,
						recipientName,
						status,
						documents: entregaDocs,
						isLegacy: false,
					};
				});
		}

		// ESTRUTURA LEGADA: Fallback para criar entrega única com todos os documentos
		if (docs.length === 0) return [];

		const destinationCity = carga.destinationCity || 'Destino não informado';
		const recipientName = (carga.fis_clientes ?? carga.tms_clientes)?.ds_nome || 'Destinatário não informado';
		const status = cargaStatusLabelPt(carga.ds_status);

		return [
			{
				id: `${carga.id}-delivery`,
				entregaId: undefined,
				destinationCity: destinationCity,
				recipientName,
				status,
				documents: docs,
				isLegacy: true,
			},
		];
	};

	const [activeLegForm, setActiveLegForm] = useState<'LOAD' | 'EMPTY' | null>(null);
	const [filterText, setFilterText] = useState('');
	const [activeEntregaDocs, setActiveEntregaDocs] = useState<{
		entregaId: string;
		loadId: string;
		existingDocIds: string[];
		destinationLabel: string;
	} | null>(null);
	const [entregaDocsFilter, setEntregaDocsFilter] = useState('');
	const [entregaDocsCompetencia, setEntregaDocsCompetencia] = useState<Date>(new Date());
	const [selectedEntregaDocIds, setSelectedEntregaDocIds] = useState<Set<string>>(new Set());
	const [isSavingEntregaDocs, setIsSavingEntregaDocs] = useState(false);
	const [finalizingEntregaId, setFinalizingEntregaId] = useState<string | null>(null);
	const [entregaConclusaoModal, setEntregaConclusaoModal] = useState<{
		delivery: DeliveryLike;
		loadId: string;
	} | null>(null);
	const [encerrarCargaModal, setEncerrarCargaModal] = useState<{ cargaId: string } | null>(null);
	const [iniciarViagemModalOpen, setIniciarViagemModalOpen] = useState(false);
	const [finalizarViagemModalOpen, setFinalizarViagemModalOpen] = useState(false);
	const finalizarCargaMutation = useFinalizarCarga();
	const [actionModal, setActionModal] = useState<{
		type: 'iniciarItem' | 'finalizarItem' | 'iniciarColeta' | 'finalizarColeta' | 'iniciarEntrega';
		itemId?: string;
		cargaId?: string;
		entregaId?: string;
		nextAction?: { type: 'iniciarColeta'; cargaId: string };
	} | null>(null);

	// DND Sensors
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = (event: DragEndEvent, loadId: string, deliveries: DeliveryLike[]) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = deliveries.findIndex((d) => d.id === active.id);
		const newIndex = deliveries.findIndex((d) => d.id === over.id);

		if (oldIndex !== -1 && newIndex !== -1) {
			const newOrder = arrayMove(deliveries, oldIndex, newIndex);
			// Não reordenar entregas legadas (sintéticas sem js_entregas)
			const hasLegacy = newOrder.some((d) => (d as { isLegacy?: boolean }).isLegacy);
			if (!hasLegacy && onReorderDeliveries) {
				onReorderDeliveries(trip.id, loadId, newOrder);
			}
		}
	};

	// State for collapsible sections
	const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);

	// Form Data State
	const [newLeg, setNewLeg] = useState({ originCity: '', originAddress: '', hubName: '', destinationCity: '', vehicleTypeReq: '' });
	const [deslVazio, setDeslVazio] = useState({ cidadeOrigem: '', cidadeDestino: '', carroceriaDesacoplada: false });

	// Selection State - NOW BASED ON CONTROL NUMBERS (strings)

	// Wizard: Nova Carga (dentro da viagem) com seleção de documentos e entregas
	const [showNewLoadWizard, setShowNewLoadWizard] = useState(false);
	const [newLoadStep, setNewLoadStep] = useState<'CARGA' | 'DOCUMENTOS' | 'ENTREGAS'>('CARGA');
	const [loadSearch, setLoadSearch] = useState('');
	const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);
	const [showCreateCargaModal, setShowCreateCargaModal] = useState(false);
	const [entregasDraft, setEntregasDraft] = useState<EntregaDraft[]>([]);
	const confirmEntregasInFlight = useRef(false);

	// Estado para competência (mês/ano)

	// Buscar cidades da API
	const { data: cidadesData } = useQuery({
		queryKey: ['get-cidades-all'],
		queryFn: () => getCidades({ page: 1, pageSize: 10000, search: '', orderBy: 'asc', orderColumn: 'ds_city' }),
		staleTime: 1000 * 60 * 60, // 1 hora
	});
	// Transformar os dados da API em array de strings no formato "Cidade - UF"
	const cities = React.useMemo(() => {
		if (!cidadesData?.cities) return [];
		return cidadesData.cities.map((city) => `${city.ds_city} - ${city.js_uf.ds_uf}`);
	}, [cidadesData]);
	// Formatar competência para YYYY-MM
	const competenciaStr = useMemo(() => {
		const year = competencia.getFullYear();
		const month = String(competencia.getMonth() + 1).padStart(2, '0');
		return `${year}-${month}`;
	}, [competencia]);

	const entregaDocsCompetenciaStr = useMemo(() => {
		const year = entregaDocsCompetencia.getFullYear();
		const month = String(entregaDocsCompetencia.getMonth() + 1).padStart(2, '0');
		return `${year}-${month}`;
	}, [entregaDocsCompetencia]);

	const getMonthRange = (value: Date) => {
		const start = new Date(value.getFullYear(), value.getMonth(), 1);
		const end = new Date(value.getFullYear(), value.getMonth() + 1, 0);
		return {
			dataInicio: start.toISOString().slice(0, 10),
			dataFim: end.toISOString().slice(0, 10),
		};
	};

	const DOCS_REQUEST_TIMEOUT_MS = 30000;

	// Query para buscar documentos disponíveis (inclui docs da carga selecionada no topo quando idCargaIncluir informado). backfill=false para resposta rápida.
	const {
		data: documentosDisponiveisRaw,
		isLoading: isLoadingDocs,
		isError: isErrorDocs,
		error: errorDocs,
		refetch: refetchDocs,
	} = useQuery({
		queryKey: ['documentos-vincular', competenciaStr, selectedLoadId ?? ''],
		queryFn: async () => {
			const range = getMonthRange(competencia);
			const promise = getDocumentosDisponiveis({
				dataInicio: range.dataInicio,
				dataFim: range.dataFim,
				idCargaIncluir: selectedLoadId ?? undefined,
				backfill: false,
			});
			let timeoutId: ReturnType<typeof setTimeout>;
			const timeoutPromise = new Promise<never>((_, reject) => {
				timeoutId = setTimeout(
					() => reject(new Error('Os documentos estão demorando. Tente novamente ou use um período menor.')),
					DOCS_REQUEST_TIMEOUT_MS,
				);
			});
			return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId!));
		},
		enabled: showNewLoadWizard && (newLoadStep === 'DOCUMENTOS' || newLoadStep === 'ENTREGAS'),
		staleTime: 1000 * 60 * 5,
	});

	// Query para buscar documentos disponíveis para adicionar à entrega. backfill=false para resposta rápida.
	const { data: entregaDocsDisponiveisRaw, isLoading: isLoadingEntregaDocs } = useQuery({
		queryKey: ['documentos-vincular-entrega', entregaDocsCompetenciaStr],
		queryFn: () => {
			const range = getMonthRange(entregaDocsCompetencia);
			return getDocumentosDisponiveis({ dataInicio: range.dataInicio, dataFim: range.dataFim, backfill: false });
		},
		enabled: !!activeEntregaDocs,
		staleTime: 1000 * 60 * 5,
	});

	// Mapear documentos da API para o formato AvailableDocument com relacionamentos
	const availableDocs = useMemo(() => {
		if (!documentosDisponiveisRaw) return availableDocsFromProps || [];

		// Build a lookup from known document keys (ds_chave) to their UUID `id` so we can
		// resolve references that come as DF-e keys (44-digit strings) back to the internal id.
		const chaveToId = new Map<string, string>();
		(documentosDisponiveisRaw as Doc[]).forEach((d) => {
			const nfeKey = d.js_nfe?.ds_chave;
			const cteKey = d.js_cte?.ds_chave;
			if (nfeKey) chaveToId.set(String(nfeKey), String(d.id));
			if (cteKey) chaveToId.set(String(cteKey), String(d.id));
		});

		const resolvePossibleKey = (value: string | number | undefined | null) => {
			if (value === null || value === undefined) return undefined;
			const s = String(value);
			// if we have a mapping from key -> id, return id, otherwise fallback to original string
			return chaveToId.get(s) ?? s;
		};

		const mapped = (documentosDisponiveisRaw as Doc[]).map((doc): AvailableDocument & { relatedDocIds: string[] } => {
			const isNFe = doc.ds_tipo === 'NFE';
			const isCTe = doc.ds_tipo === 'CTE';

			const nfeData = doc.js_nfe;
			const cteData = doc.js_cte;

			// Extrair IDs de documentos relacionados
			const relatedDocIds: string[] = [];

			// Documentos relacionados (docs que este documento aponta)
			if (doc.fis_documento_relacionado && Array.isArray(doc.fis_documento_relacionado)) {
				// doc.fis_documento_relacionado may be typed as unknown[]; cast to the expected shape and guard at runtime
				const rels = doc.fis_documento_relacionado as FisDocumentoRelacionado[];
				rels.forEach((rel) => {
					if (!rel || typeof rel !== 'object') return;
					if ('id_documento_referenciado' in rel && rel.id_documento_referenciado) {
						const resolved = resolvePossibleKey(rel.id_documento_referenciado as string);
						if (resolved) relatedDocIds.push(resolved);
					}
					if (rel.fis_documento_origem?.id) {
						const resolved = resolvePossibleKey(rel.fis_documento_origem.id as string);
						if (resolved) relatedDocIds.push(resolved);
					}
				});
			}
			if (doc.fis_documento_origem && Array.isArray(doc.fis_documento_origem)) {
				// Documentos de origem (docs que apontam para este documento)
				const origens = doc.fis_documento_origem as FisDocumentoRelacionado[] | undefined;
				if (origens && Array.isArray(origens)) {
					origens.forEach((orig: FisDocumentoRelacionado) => {
						if (!orig || typeof orig !== 'object') return;
						if ('id_documento_origem' in orig && orig.id_documento_origem) {
							const resolved = resolvePossibleKey(orig.id_documento_origem as string);
							if (resolved) relatedDocIds.push(resolved);
						}
						if (orig.fis_documento_referenciado?.id) {
							const resolved = resolvePossibleKey(orig.fis_documento_referenciado.id as string);
							if (resolved) relatedDocIds.push(resolved);
						}
					});
				}
			}
			if (doc.ds_tipo === 'NFE' && nfeData) {
				// Extrair chaves de NF-es referenciadas (array de strings)
				if (Array.isArray(nfeData?.js_nfes_referenciadas)) {
					nfeData.js_nfes_referenciadas.forEach((nfeRef: string) => {
						if (!nfeRef) return;
						const resolved = resolvePossibleKey(nfeRef);
						if (resolved) relatedDocIds.push(resolved);
					});
				}
			}
			const docBucket = classificarDocBucket(doc, empresaId || '');
			const docBadge = docBadgeFromBucket(docBucket, doc.ds_tipo);
			return {
				id: doc.id,
				ds_numero: isNFe ? nfeData?.ds_numero || 'S/N' : isCTe ? cteData?.ds_numero || 'S/N' : 'S/N',
				ds_tipo: (isNFe ? 'NFE' : 'CTE') as 'NFE' | 'CTE',
				ds_controle: doc.ds_controle,
				linkedCteNumber: undefined,
				ds_chave: isNFe ? nfeData?.ds_chave || '' : isCTe ? cteData?.ds_chave || '' : '',
				relatedDfeKeys: [],
				is_subcontratada: isCTe ? !!cteData?.id_fis_empresa_subcontratada : false,
				valor: isNFe ? parseFloat(nfeData?.vl_nf || '0') / 100 : isCTe ? parseFloat(cteData?.vl_total || '0') / 100 : 0,
				vl_peso_bruto: 0,
				ds_destinatario: isNFe
					? nfeData?.ds_razao_social_destinatario || 'Destinatário não informado'
					: isCTe
						? cteData?.ds_razao_social_destinatario || 'Destinatário não informado'
						: 'Não informado',
				ds_cidade_destino: isNFe
					? 'Cidade não informada'
					: isCTe
						? cteData?.ds_nome_mun_fim || 'Cidade não informada'
						: 'Não informada',
				ds_endereco_destino: isCTe ? (cteData?.ds_endereco_destino ?? '') : '',
				ds_complemento_destino: isCTe ? (cteData?.ds_complemento_destino ?? '') : '',
				dt_emissao: doc.dt_emissao || '',
				relatedDocIds, // IDs dos documentos relacionados
				docBucket,
				docBadge,
			};
		});

		return mapped;
	}, [documentosDisponiveisRaw, availableDocsFromProps, empresaId]);

	// Mapear documentos para o modal de adicionar à entrega
	const entregaAvailableDocs = useMemo(() => {
		if (!entregaDocsDisponiveisRaw) return [];

		const mapped = (entregaDocsDisponiveisRaw as Doc[]).map((doc): AvailableDocument & { relatedDocIds: string[] } => {
			const isNFe = doc.ds_tipo === 'NFE';
			const isCTe = doc.ds_tipo === 'CTE';

			const nfeData = doc.js_nfe;
			const cteData = doc.js_cte;

			// Extrair IDs de documentos relacionados
			const relatedDocIds: string[] = [];

			// Documentos relacionados (docs que este documento aponta)
			if (doc.fis_documento_relacionado && Array.isArray(doc.fis_documento_relacionado)) {
				// doc.fis_documento_relacionado may be typed as unknown[]; cast to the expected shape and guard at runtime
				const rels = doc.fis_documento_relacionado as FisDocumentoRelacionado[];
				rels.forEach((rel) => {
					if (!rel || typeof rel !== 'object') return;
					if ('id_documento_referenciado' in rel && rel.id_documento_referenciado) {
						relatedDocIds.push(String(rel.id_documento_referenciado));
					}
					if (rel.fis_documento_origem?.id) {
						relatedDocIds.push(String(rel.fis_documento_origem.id));
					}
				});
			}

			return {
				id: doc.id,
				ds_tipo: doc.ds_tipo as 'CTE' | 'NFE',
				ds_numero: isNFe ? nfeData?.ds_numero || 'S/N' : isCTe ? cteData?.ds_numero || 'S/N' : 'S/N',
				ds_controle: doc.ds_controle,
				linkedCteNumber: undefined,
				ds_chave: isNFe ? nfeData?.ds_chave || '' : isCTe ? cteData?.ds_chave || '' : '',
				relatedDfeKeys: [],
				is_subcontratada: isCTe ? !!cteData?.id_fis_empresa_subcontratada : false,
				valor: isNFe ? parseFloat(nfeData?.vl_nf || '0') / 100 : isCTe ? parseFloat(cteData?.vl_total || '0') / 100 : 0,
				vl_peso_bruto: 0,
				ds_destinatario: isNFe
					? nfeData?.ds_razao_social_destinatario || 'Destinatário não informado'
					: isCTe
						? cteData?.ds_razao_social_destinatario || 'Destinatário não informado'
						: 'Não informado',
				ds_cidade_destino: isNFe
					? 'Cidade não informada'
					: isCTe
						? cteData?.ds_nome_mun_fim || 'Cidade não informada'
						: 'Não informada',
				ds_endereco_destino: isCTe ? (cteData?.ds_endereco_destino ?? '') : '',
				ds_complemento_destino: isCTe ? (cteData?.ds_complemento_destino ?? '') : '',
				dt_emissao: doc.dt_emissao || '',
				relatedDocIds,
			};
		});

		return mapped;
	}, [entregaDocsDisponiveisRaw]);

	const entregaDocsDisponiveis = useMemo(() => {
		if (!activeEntregaDocs) return [];
		const existing = new Set(activeEntregaDocs.existingDocIds);
		return entregaAvailableDocs.filter((doc) => !existing.has(doc.id));
	}, [activeEntregaDocs, entregaAvailableDocs]);

	const agruparMutation = useMutation({
		mutationFn: (documentosIds: string[]) => agruparDocumentos(documentosIds),
		onError: (error) => {
			toast.error(`Erro ao agrupar documentos: ${error.message || 'Erro desconhecido'}`);
		},
	});

	const criarEntregasMutation = useMutation({
		mutationFn: (payload: { idCarga: string; entregas: EntregaDraft[] }) =>
			createEntregasLote(
				payload.idCarga,
				payload.entregas.map((e) => ({
					id_cidade_destino: e.id_cidade_destino || 0,
					nr_sequencia: e.nr_sequencia,
					ds_endereco: e.ds_endereco,
					ds_complemento: e.ds_complemento,
					dt_limite_entrega: e.dt_limite_entrega,
					ds_observacoes: e.ds_observacoes,
					vl_total_mercadoria: e.vl_total_mercadoria,
					js_produtos: e.js_produtos,
					documentosIds: e.documentosIds,
				})),
				trip.id,
			),
		onSuccess: (data, variables) => {
			toast.success('Entregas criadas com sucesso!');
			// Invalidar queries para atualizar a lista de viagens e a carga específica
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
			queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
			queryClient.invalidateQueries({ queryKey: ['documentos-vincular'] });
			queryClient.invalidateQueries({ queryKey: ['get-carga', variables.idCarga] });
			// Atualizar detalhes da viagem no modal para a nova carga aparecer
			queryClient.invalidateQueries({ queryKey: ['get-viagem', trip.id] });
			queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', trip.id] });
		},
		onError: (error) => {
			toast.error(`Erro ao criar entregas: ${error.message || 'Erro desconhecido'}`);
		},
	});

	// --- Logic for Document Selection with Auto-Related ---

	// Estado para documentos selecionados (armazena IDs)
	const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

	// Função para obter todos os documentos relacionados recursivamente
	const getAllRelatedDocIds = useCallback(
		(docId: string, visited = new Set<string>()): Set<string> => {
			if (visited.has(docId)) return visited;
			visited.add(docId);

			const doc = availableDocs.find((d) => d.id === docId) as (AvailableDocument & { relatedDocIds: string[] }) | undefined;
			if (!doc || !doc.relatedDocIds) return visited;

			// Buscar relacionados recursivamente
			doc.relatedDocIds.forEach((relatedId) => {
				if (!visited.has(relatedId)) {
					getAllRelatedDocIds(relatedId, visited);
				}
			});

			return visited;
		},
		[availableDocs],
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

	const toggleEntregaDocSelection = useCallback(
		(docId: string) => {
			setSelectedEntregaDocIds((prev) => {
				const newSet = new Set(prev);

				// const doc = entregaAvailableDocs.find((d) => d.id === docId) as (AvailableDocument & { relatedDocIds: string[] }) | undefined;

				if (newSet.has(docId)) {
					// Desselecionar: remove o documento e todos relacionados recursivamente
					const visited = new Set<string>();
					const toRemove = (id: string) => {
						if (visited.has(id)) return;
						visited.add(id);
						const relDoc = entregaAvailableDocs.find((d) => d.id === id) as
							| (AvailableDocument & { relatedDocIds: string[] })
							| undefined;
						if (relDoc?.relatedDocIds) {
							relDoc.relatedDocIds.forEach(toRemove);
						}
					};
					toRemove(docId);
					visited.forEach((id) => newSet.delete(id));
				} else {
					// Selecionar: adiciona o documento e todos relacionados recursivamente
					const visited = new Set<string>();
					const toAdd = (id: string) => {
						if (visited.has(id)) return;
						visited.add(id);
						const relDoc = entregaAvailableDocs.find((d) => d.id === id) as
							| (AvailableDocument & { relatedDocIds: string[] })
							| undefined;
						if (relDoc?.relatedDocIds) {
							relDoc.relatedDocIds.forEach(toAdd);
						}
					};
					toAdd(docId);
					visited.forEach((id) => newSet.add(id));
				}

				return newSet;
			});
		},
		[entregaAvailableDocs],
	);

	const handleSaveEntregaDocs = async () => {
		if (!activeEntregaDocs) return;
		if (selectedEntregaDocIds.size === 0) {
			toast.error('Selecione pelo menos um documento.');
			return;
		}

		try {
			setIsSavingEntregaDocs(true);
			const toastId = toast.loading('Adicionando documentos...');

			const documentos = Array.from(selectedEntregaDocIds)
				.filter((id) => !activeEntregaDocs.existingDocIds.includes(id))
				.map((id) => {
					const doc = entregaAvailableDocs.find((d) => d.id === id);
					if (!doc) return null;
					return { id: doc.id, tipo: doc.ds_tipo };
				})
				.filter(Boolean) as Array<{ id: string; tipo: 'CTE' | 'NFE' }>;

			if (documentos.length === 0) {
				toast.error('Nenhum documento válido para adicionar.', { id: toastId });
				setIsSavingEntregaDocs(false);
				return;
			}

			await addDocumentosToEntrega(activeEntregaDocs.entregaId, documentos);
			toast.success('Documentos adicionados com sucesso!', { id: toastId });
			setActiveEntregaDocs(null);
			setSelectedEntregaDocIds(new Set());
			setEntregaDocsFilter('');
			setEntregaDocsCompetencia(new Date());
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
			queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
			queryClient.invalidateQueries({ queryKey: ['get-carga', activeEntregaDocs.loadId] });
			queryClient.invalidateQueries({ queryKey: ['get-viagem', trip.id] });
		} catch (error) {
			const errorMessage =
				typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : undefined;
			toast.error(errorMessage || 'Erro ao adicionar documentos.');
		} finally {
			setIsSavingEntregaDocs(false);
		}
	};

	// Filtrar documentos baseado na busca
	const filteredDocs = useMemo(() => {
		if (!filterText) return availableDocs;

		const lowerFilter = filterText.toLowerCase();
		return availableDocs.filter(
			(doc) =>
				doc.ds_destinatario.toLowerCase().includes(lowerFilter) ||
				doc.ds_cidade_destino.toLowerCase().includes(lowerFilter) ||
				doc.ds_numero.toLowerCase().includes(lowerFilter) ||
				doc.ds_tipo.toLowerCase().includes(lowerFilter),
		);
	}, [availableDocs, filterText]);

	// Filtrar documentos do modal de entrega baseado na busca
	const filteredEntregaDocs = useMemo(() => {
		if (!entregaDocsFilter) return entregaDocsDisponiveis;

		const lowerFilter = entregaDocsFilter.toLowerCase();
		return entregaDocsDisponiveis.filter(
			(doc) =>
				doc.ds_destinatario.toLowerCase().includes(lowerFilter) ||
				doc.ds_cidade_destino.toLowerCase().includes(lowerFilter) ||
				doc.ds_numero.toLowerCase().includes(lowerFilter) ||
				doc.ds_tipo.toLowerCase().includes(lowerFilter),
		);
	}, [entregaDocsDisponiveis, entregaDocsFilter]);

	const availableLoads = useMemo(() => loads ?? [], [loads]);

	// Documentos já anexados à carga selecionada (para pré-seleção e ordenação no topo na aba DOCUMENTOS)
	const documentIdsFromSelectedLoad = useMemo(() => {
		if (!selectedLoadId) return new Set<string>();
		const carga = availableLoads.find((l) => l.id === selectedLoadId) as
			| (Carga & {
					js_cargas_ctes?: Array<{ js_cte?: { fis_documento_dfe?: Array<{ id: string }> } }>;
					js_cargas_nfes?: Array<{ js_nfe?: { fis_documento_dfe?: Array<{ id: string }> } }>;
			  })
			| undefined;
		if (!carga) return new Set<string>();
		const ids: string[] = [];
		(carga.js_cargas_ctes || []).forEach((link) => {
			(link.js_cte?.fis_documento_dfe || []).forEach((dfe) => ids.push(dfe.id));
		});
		(carga.js_cargas_nfes || []).forEach((link) => {
			(link.js_nfe?.fis_documento_dfe || []).forEach((dfe) => ids.push(dfe.id));
		});
		return new Set(ids);
	}, [selectedLoadId, availableLoads]);

	const documentIdsFromSelectedLoadKey = useMemo(() => [...documentIdsFromSelectedLoad].sort().join(','), [documentIdsFromSelectedLoad]);

	React.useEffect(() => {
		if (documentIdsFromSelectedLoad.size > 0) {
			setSelectedDocIds((prev) => {
				const next = new Set(prev);
				documentIdsFromSelectedLoad.forEach((id) => next.add(id));
				return next;
			});
		}
		// documentIdsFromSelectedLoadKey evita reexecução quando o Set tem o mesmo conteúdo
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedLoadId, documentIdsFromSelectedLoadKey]);

	// Ordenar documentos: selecionados no topo, depois CTEs, NFEs, ambos por número
	const sortedFilteredDocs = useMemo(() => {
		const list = [...filteredDocs].sort((a, b) => {
			if (a.ds_tipo !== b.ds_tipo) {
				return a.ds_tipo === 'CTE' ? -1 : 1;
			}
			const numA = a.ds_numero || '';
			const numB = b.ds_numero || '';
			return numA.localeCompare(numB);
		});
		if (selectedDocIds.size === 0) return list;
		const selected: typeof list = [];
		const rest: typeof list = [];
		list.forEach((doc) => {
			if (selectedDocIds.has(doc.id)) selected.push(doc);
			else rest.push(doc);
		});
		return [...selected, ...rest];
	}, [filteredDocs, selectedDocIds]);

	// Resumo da seleção (CT-e próprio, DF-e relacionado, pendentes) para o passo DOCUMENTOS
	const resumoSelecaoDocs = useMemo(() => {
		let cteProprio = 0;
		let dfeRelacionado = 0;
		let pendente = 0;
		sortedFilteredDocs.forEach((doc) => {
			if (!selectedDocIds.has(doc.id)) return;
			const bucket = (doc as { docBucket?: string }).docBucket;
			if (bucket === 'CTE_PROPRIO') cteProprio++;
			else if (bucket === 'DFE_RELACIONADO') dfeRelacionado++;
			else pendente++;
		});
		return { cteProprio, dfeRelacionado, pendente };
	}, [sortedFilteredDocs, selectedDocIds]);

	// Ordenar documentos do modal de entrega: CTEs primeiro, depois NFEs, ambos por número
	const sortedFilteredEntregaDocs = useMemo(() => {
		return [...filteredEntregaDocs].sort((a, b) => {
			if (a.ds_tipo !== b.ds_tipo) {
				return a.ds_tipo === 'CTE' ? -1 : 1;
			}
			const numA = a.ds_numero || '';
			const numB = b.ds_numero || '';
			return numA.localeCompare(numB);
		});
	}, [filteredEntregaDocs]);
	// };

	// const getDefaultOriginForNextLeg = () => {
	// 	let defaultOriginCity = '';
	// 	let defaultOriginAddress = '';

	// 	if (safeLegs.length === 0) {
	// 		defaultOriginCity = trip.originCity || '';
	// 		defaultOriginAddress = 'Pátio da Empresa / Matriz';
	// 	} else {
	// 		const lastLeg = safeLegs[safeLegs.length - 1];

	// 		if (lastLeg.type === 'EMPTY') {
	// 			defaultOriginCity = lastLeg.destinationCity || '';
	// 			defaultOriginAddress = 'Ponto de Parada (Fim do Vazio)';
	// 		} else {
	// 			// TODO: Implementar lógica de cargas quando dados estiverem disponíveis
	// 			defaultOriginCity = lastLeg.destinationCity || lastLeg.originCity;
	// 			defaultOriginAddress = lastLeg.destinationAddress || lastLeg.originAddress || '';
	// 		}
	// 	}

	// 	return { originCity: defaultOriginCity, originAddress: defaultOriginAddress };
	// };

	const normalizeCityName = (value?: string) =>
		(value || '')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.trim()
			.toLowerCase();

	const findCityIdByName = (name?: string) => {
		if (!name || !cidadesData?.cities) return undefined;
		const normalized = normalizeCityName(name);
		const normalizedPart = normalizeCityName(name.split(' - ')[0]?.trim() || name);
		const match = cidadesData.cities.find((city) => {
			const cityLabel = `${city.ds_city} - ${city.js_uf?.ds_uf || ''}`.trim();
			const cityNorm = normalizeCityName(city.ds_city);
			const labelNorm = normalizeCityName(cityLabel);
			return (
				cityNorm === normalized ||
				labelNorm === normalized ||
				cityNorm === normalizedPart ||
				labelNorm.startsWith(normalizedPart + ' ') ||
				labelNorm === normalizedPart
			);
		});
		return match?.id;
	};

	const openNewLoadWizard = () => {
		setShowNewLoadWizard(true);
		setNewLoadStep('CARGA');
		setLoadSearch('');
		setSelectedLoadId(null);
		setSelectedDocIds(new Set());
		setFilterText('');
		setEntregasDraft([]);
	};

	// const isContraNeeded = (doc: AvailableDocument) => {
	// 	if (doc.ds_tipo === 'NFE') return !doc.linkedCteNumber;
	// 	if (doc.ds_tipo === 'CTE') return !!doc.is_subcontratada;
	// 	return false;
	// }; // TODO: Implementar lógica real quando os dados estiverem disponíveis

	const handleAdvanceFromCarga = () => {
		if (availableLoads.length > 0 && !selectedLoadId) {
			toast.error('Selecione uma carga para continuar.');
			return;
		}

		if (!selectedLoadId && availableLoads.length === 0) {
			setShowCreateCargaModal(true);
			return;
		}

		setNewLoadStep('DOCUMENTOS');
	};

	type DocumentoGroup = {
		id?: string;
		sequencia?: number;
		destino?: { nome?: string } | null;
		documentos: Array<{
			id: string;
			destinatario?: string | null;
			recebedor?: string | null;
			ds_endereco_destino?: string | null;
			ds_complemento_destino?: string | null;
		}>;
	};

	/** Monta o draft de entregas a partir dos grupos da API; opcionalmente enriquece com availableDocs (cidade/endereço/complemento por doc). */
	const buildEntregasDraft = (
		groups: DocumentoGroup[],
		opts?: {
			defaultDtLimite?: string;
			docIdToExtra?: Map<string, { ds_cidade_destino?: string; ds_endereco_destino?: string; ds_complemento_destino?: string }>;
		},
	) => {
		const defaultDtLimite = opts?.defaultDtLimite
			? opts.defaultDtLimite.length >= 16
				? opts.defaultDtLimite.slice(0, 16)
				: opts.defaultDtLimite
			: undefined;
		const docExtra = opts?.docIdToExtra;
		return groups.map((group, index) => {
			const firstDocId = group.documentos?.[0]?.id;
			const firstDoc = group.documentos?.[0];
			const extra = firstDocId && docExtra ? docExtra.get(firstDocId) : undefined;
			const cidadeNome = group.destino?.nome || extra?.ds_cidade_destino;
			const idCidade = findCityIdByName(group.destino?.nome) ?? findCityIdByName(extra?.ds_cidade_destino);
			return {
				id: group.id || `temp-${index}`,
				nr_sequencia: group.sequencia ?? index + 1,
				id_cidade_destino: idCidade,
				destinoNome: cidadeNome,
				ds_nome_recebedor: firstDoc?.recebedor ?? undefined,
				ds_nome_destinatario: firstDoc?.destinatario ?? undefined,
				ds_endereco: extra?.ds_endereco_destino ?? firstDoc?.ds_endereco_destino ?? undefined,
				ds_complemento: extra?.ds_complemento_destino ?? firstDoc?.ds_complemento_destino ?? undefined,
				documentosIds: (group.documentos || []).map((doc) => doc.id),
				dt_limite_entrega: defaultDtLimite,
			};
		});
	};

	const handleSkipDocuments = () => {
		(async () => {
			if (!selectedLoadId) {
				toast.error('Selecione uma carga válida.');
				return;
			}

			try {
				const nextSequencia = (trip?.js_viagens_cargas?.length || loads.length || 0) + 1;
				await vincularCargaAViagem(trip.id, { id_carga: selectedLoadId, nr_sequencia: nextSequencia });
				toast.success('Carga vinculada sem documentos.');
				queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
				queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
				queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
				queryClient.invalidateQueries({ queryKey: ['get-carga', selectedLoadId] });
				queryClient.invalidateQueries({ queryKey: ['get-viagem', trip.id] });
				queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', trip.id] });
			} catch (error) {
				const message = error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
				toast.error(`Erro ao vincular carga: ${message || 'Erro desconhecido'}`);
				return;
			}

			// Fechar fluxo
			setEntregasDraft([]);
			setShowNewLoadWizard(false);
			setSelectedDocIds(new Set());
			setSelectedLoadId(null);
			setNewLoadStep('CARGA');
		})();
	};

	const handleConfirmDocuments = async () => {
		if (selectedDocIds.size === 0) {
			toast.error('Selecione pelo menos um documento.');
			return;
		}
		const onlyPendente = resumoSelecaoDocs.cteProprio === 0 && resumoSelecaoDocs.dfeRelacionado === 0 && resumoSelecaoDocs.pendente > 0;
		if (onlyPendente) {
			toast.warning(
				'Apenas documentos sem vínculo foram selecionados. Recomendado incluir CT-e próprio ou DF-e relacionado para melhor rastreabilidade.',
			);
		}

		try {
			const result = await agruparMutation.mutateAsync(Array.from(selectedDocIds));
			const load = availableLoads.find((l) => l.id === selectedLoadId);
			const defaultDtLimite = load?.dt_limite_entrega ?? undefined;
			const docIdToExtra = new Map<
				string,
				{ ds_cidade_destino?: string; ds_endereco_destino?: string; ds_complemento_destino?: string }
			>();
			availableDocs.forEach((d) => {
				if (d.ds_cidade_destino || d.ds_endereco_destino || d.ds_complemento_destino) {
					docIdToExtra.set(d.id, {
						ds_cidade_destino: d.ds_cidade_destino,
						ds_endereco_destino: d.ds_endereco_destino,
						ds_complemento_destino: d.ds_complemento_destino,
					});
				}
			});
			setEntregasDraft(buildEntregasDraft(result.grupos || [], { defaultDtLimite, docIdToExtra }));
			setNewLoadStep('ENTREGAS');
		} catch {
			return;
		}
	};

	const handleConfirmEntregas = async () => {
		if (confirmEntregasInFlight.current || criarEntregasMutation.isPending) return;
		if (!selectedLoadId) {
			toast.error('Selecione uma carga válida.');
			return;
		}
		if (entregasDraft.some((e) => !e.id_cidade_destino)) {
			toast.error('Informe a cidade de destino em todas as entregas.');
			return;
		}
		confirmEntregasInFlight.current = true;
		try {
			await criarEntregasMutation.mutateAsync({ idCarga: selectedLoadId, entregas: entregasDraft });
			setShowNewLoadWizard(false);
			setSelectedDocIds(new Set());
			setSelectedLoadId(null);
			setNewLoadStep('CARGA');
			setEntregasDraft([]);
		} finally {
			confirmEntregasInFlight.current = false;
		}
	};

	const toggleDelivery = (deliveryId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setExpandedDeliveryId((prev) => (prev === deliveryId ? null : deliveryId));
	};

	const handleOpenLegForm = (type: 'LOAD' | 'EMPTY') => {
		let defaultOriginCity = '';
		let defaultOriginAddress = '';

		if (safeLegs.length === 0) {
			defaultOriginCity = trip.originCity || '';
			defaultOriginAddress = 'Pátio da Empresa / Matriz';
		} else {
			const lastLeg = safeLegs[safeLegs.length - 1];

			if (lastLeg.type === 'EMPTY') {
				defaultOriginCity = lastLeg.destinationCity || '';
				defaultOriginAddress = 'Ponto de Parada (Fim do Vazio)';
			} else {
				// TODO: Implementar lógica de cargas quando dados estiverem disponíveis
				defaultOriginCity = lastLeg.destinationCity || lastLeg.originCity;
				defaultOriginAddress = lastLeg.destinationAddress || lastLeg.originAddress || '';
			}
		}

		setNewLeg({
			originCity: defaultOriginCity,
			originAddress: defaultOriginAddress,
			hubName: '',
			destinationCity: '',
			vehicleTypeReq: '',
		});

		// Pré-preencher também o estado de deslocamento vazio
		setDeslVazio({
			cidadeOrigem: defaultOriginCity,
			cidadeDestino: '',
			carroceriaDesacoplada: false,
		});

		setActiveLegForm(type);
	};

	const handleSaveLeg = (e: React.FormEvent) => {
		e.preventDefault();

		if (!newLeg.originCity && !deslVazio.cidadeOrigem) {
			alert('A cidade de origem é obrigatória. Por favor, preencha.');
			return;
		}

		const legType = activeLegForm || 'LOAD';

		if (legType === 'EMPTY' && !deslVazio.cidadeDestino) {
			alert('Para deslocamentos vazios, a cidade destino é obrigatória.');
			return;
		}

		if (legType === 'EMPTY') {
			(async () => {
				try {
					const origemId = findCityIdByName(newLeg.originCity || deslVazio.cidadeOrigem);
					const destinoId = findCityIdByName(newLeg.destinationCity || deslVazio.cidadeDestino);
					if (!origemId || !destinoId) {
						toast.error('Selecione origem e destino válidos.');
						return;
					}

					const created = await createCarga({
						// cd_carga omitido: backend gera VAZIO_ + sequência automaticamente
						fl_deslocamento_vazio: true,
						id_cidade_origem: origemId,
						id_cidade_destino: destinoId,
						ds_observacoes: `Deslocamento vazio: ${deslVazio.cidadeOrigem} -> ${deslVazio.cidadeDestino}`,
						fl_requer_seguro: false,
						fl_carroceria_desacoplada: deslVazio.carroceriaDesacoplada,
						ds_prioridade: 'NORMAL',
					});
					const nextSequencia = (trip?.js_viagens_cargas?.length || loads.length || 0) + 1;
					await vincularCargaAViagem(trip.id, {
						id_carga: created.id,
						nr_sequencia: nextSequencia,
					});

					queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
					queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
					queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
					queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
					queryClient.invalidateQueries({ queryKey: ['get-viagem', trip.id] });
					queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', trip.id] });
					toast.success('Deslocamento vazio criado com sucesso!');
				} catch (error) {
					const message = error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
					toast.error(`Erro ao criar deslocamento vazio: ${message || 'Erro desconhecido'}`);
					return;
				}
			})();
		} else {
			onAddLeg(trip.id, {
				originCity: newLeg.originCity,
				originAddress: newLeg.originAddress,
				hubName: newLeg.hubName,
				destinationCity: undefined,
				type: legType,
				vehicleTypeReq: legType === 'LOAD' ? newLeg.vehicleTypeReq : undefined,
			});
		}

		setActiveLegForm(null);
		setNewLeg({ originCity: '', originAddress: '', hubName: '', destinationCity: '', vehicleTypeReq: '' });
		setDeslVazio({ cidadeOrigem: '', cidadeDestino: '', carroceriaDesacoplada: false });
	};

	// Cálculo de receita total a partir das cargas vinculadas
	const totalRevenue = useMemo(() => {
		let receita = 0;

		// Iterar sobre todas as cargas da viagem
		for (const viagemCarga of trip.js_viagens_cargas || []) {
			const carga = viagemCarga.tms_cargas;
			if (!carga) continue;

			// NOVA ESTRUTURA: Somar CT-es das entregas
			if (carga.js_entregas && carga.js_entregas.length > 0) {
				carga.js_entregas.forEach((entrega) => {
					// Somar CT-es da entrega
					const valorCtes =
						entrega.js_entregas_ctes?.reduce((sum, cteLink) => {
							const valorCte = Number(cteLink.js_cte?.vl_total ?? 0);
							return sum + valorCte;
						}, 0) || 0;

					receita += valorCtes;
				});
			} else {
				// ESTRUTURA LEGADA: Fallback para js_cargas_ctes
				const valorLegado =
					carga.js_cargas_ctes?.reduce((sum, cteLink) => {
						return sum + Number(cteLink.js_cte?.vl_total ?? 0);
					}, 0) || 0;
				receita += valorLegado;
			}
		}

		// Converter de centavos para reais
		return receita / 100;
	}, [trip.js_viagens_cargas]);

	// Helpers for numbering
	let loadCount = 0;

	// Torre de controle: só uma etapa por vez. A "carga ativa" é a primeira não entregue na sequência; só ela recebe botões de ação.
	// Considera js_viagens_cargas; se vazio, fallback para trip.cargas (formato legado) com objeto sintético compatível.
	const activeTripLoad = useMemo(() => {
		const vcs = trip.js_viagens_cargas;
		if (vcs && vcs.length > 0) {
			const ordered = [...vcs].sort((a, b) => (a.nr_sequencia ?? 0) - (b.nr_sequencia ?? 0));
			const firstPending = ordered.find((vc) => vc.tms_cargas?.ds_status !== 'ENTREGUE');
			return firstPending ?? ordered[0];
		}
		const apiCargas = Array.isArray(trip.cargas) ? (trip.cargas as Carga[]) : [];
		if (apiCargas.length === 0) return null;
		const firstPending = apiCargas.find((c) => c.ds_status !== 'ENTREGUE');
		const carga = firstPending ?? apiCargas[0];
		const index = apiCargas.indexOf(carga);
		return {
			id: carga.id,
			id_carga: carga.id,
			nr_sequencia: index + 1,
			tms_cargas: carga,
		};
	}, [trip.js_viagens_cargas, trip.cargas]);

	// Ordem das cargas na viagem (para reordenar). Mesmo tamanho/ordem que safeLegs: js_viagens_cargas ou fallback trip.cargas (sintético).
	const orderedVCs = useMemo(() => {
		const vcs = trip.js_viagens_cargas;
		if (vcs && vcs.length > 0) {
			return [...vcs].sort((a, b) => (a.nr_sequencia ?? 0) - (b.nr_sequencia ?? 0));
		}
		const apiCargas = Array.isArray(trip.cargas) ? (trip.cargas as Carga[]) : [];
		if (apiCargas.length === 0) return [];
		return apiCargas.map((carga, index) => ({
			id: carga.id,
			id_carga: carga.id,
			nr_sequencia: index + 1,
			tms_cargas: carga,
		}));
	}, [trip.js_viagens_cargas, trip.cargas]);

	// Índices que podem ser remanejados:
	// - Se a viagem estiver CONCLUÍDA, bloqueia tudo.
	// - Itens EM_DESLOCAMENTO ou CONCLUIDO (ou carga ENTREGUE) ficam travados e não podem ser passados por cima:
	//   um item pendente/disponível não pode ser movido para cima de um item já em andamento ou finalizado.
	// - Usar fluxo (status_item) quando disponível; fallback: ds_status em vc ou tms_cargas.ds_status.
	const reorderableByIndex = useMemo(() => {
		const tripFinished = trip.ds_status === 'CONCLUIDA' || trip.status === 'Completed';
		if (tripFinished) return orderedVCs.map(() => false);

		// Status real por item: preferir fluxo (fonte da verdade da esteira), depois vc.ds_status, depois carga
		const getStatusItem = (vc: (typeof orderedVCs)[0]): string | undefined => {
			const idCarga = vc.id_carga ?? (vc as { tms_cargas?: Carga }).tms_cargas?.id;
			const fluxoItem = fluxo?.itens?.find((i) => i.id_carga === idCarga || i.id === vc.id);
			if (fluxoItem?.status_item) return fluxoItem.status_item;
			const vcStatus = (vc as { ds_status?: string }).ds_status;
			if (vcStatus) return vcStatus;
			if (vc.tms_cargas?.ds_status === 'ENTREGUE') return 'CONCLUIDO';
			return undefined;
		};

		// Item está “travado” se já iniciado ou concluído: não pode ser trocado de posição e nada pode passar por cima
		const isLockedAt = (index: number) => {
			const vc = orderedVCs[index];
			const statusItem = getStatusItem(vc);
			if (statusItem === 'EM_DESLOCAMENTO' || statusItem === 'CONCLUIDO') return true;
			if (vc?.tms_cargas?.ds_status === 'ENTREGUE') return true;
			return false;
		};

		let lastLockedIndex = -1;
		orderedVCs.forEach((_, index) => {
			if (isLockedAt(index)) lastLockedIndex = index;
		});

		// Só pode reordenar itens que estão depois do último travado (nunca passar pendente para cima de em andamento/concluído)
		return orderedVCs.map((_, index) => index > lastLockedIndex);
	}, [orderedVCs, trip.ds_status, trip.status, fluxo?.itens]);

	const reorderMutation = useMutation({
		mutationFn: (cargas: Array<{ id_carga: string; nr_sequencia: number }>) => reordenarCargasViagem(trip.id, cargas),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
			queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
			queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
			queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', trip.id] });
			queryClient.invalidateQueries({ queryKey: ['get-viagem', trip.id] });
			toast.success('Ordem atualizada');
		},
		onError: (err: Error) => toast.error(err?.message || 'Erro ao reordenar'),
	});

	const handleMoveSegment = useCallback(
		(fromIndex: number, direction: 'up' | 'down') => {
			const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
			if (toIndex < 0 || toIndex >= orderedVCs.length) return;
			if (!reorderableByIndex[fromIndex] || !reorderableByIndex[toIndex]) return;
			const newOrder = [...orderedVCs];
			[newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];
			const payload = newOrder.map((vc, idx) => ({
				id_carga: vc.id_carga ?? (vc as { tms_cargas?: Carga }).tms_cargas?.id ?? '',
				nr_sequencia: idx + 1,
			}));
			const hasEmptyId = payload.some((p) => !p.id_carga);
			if (hasEmptyId) {
				toast.error('Não foi possível reordenar: dados da carga incompletos.');
				return;
			}
			reorderMutation.mutate(payload);
		},
		[orderedVCs, reorderableByIndex, reorderMutation],
	);

	// Determine wrapper classes based on isInline
	const wrapperClasses = isInline
		? 'p-6 bg-muted/40 border-t border-border shadow-inner max-h-[75vh] overflow-y-auto'
		: 'p-6 bg-muted/40 min-h-screen ml-0 md:ml-64';

	return (
		<div className={wrapperClasses}>
			<div className={isInline ? '' : 'mx-auto max-w-7xl space-y-8'}>
				{!isInline && (
					<div className='mb-8 flex items-center justify-between'>
						<Button variant='ghost' onClick={onBack} className='text-muted-foreground hover:text-foreground flex items-center'>
							<ArrowLeft size={16} className='mr-2' />
							Voltar para listagem
						</Button>
						<div className='flex gap-2'>
							<StatusBadge status={trip.ds_status || trip.status} size='lg' />
						</div>
					</div>
				)}

				{/* Trip Overview Header */}
				<div className='border-border bg-card mb-8 flex flex-wrap items-center justify-between gap-6 rounded-xl border p-6 shadow-sm'>
					<div className='flex flex-col gap-1'>
						<div className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>Data da Viagem</div>
						<div className='text-foreground flex items-center gap-2 text-sm font-bold'>
							<span className='text-orange-700 dark:text-orange-300'>
								{new Date(trip.dt_created || trip.createdAt || '').toLocaleDateString()}
							</span>
							{(trip.dt_previsao_retorno || trip.estimatedReturnDate) && (
								<span className='text-muted-foreground'>
									Até {new Date(trip.dt_previsao_retorno || trip.estimatedReturnDate || '').toLocaleDateString()}
								</span>
							)}
						</div>
					</div>

					<div className='flex flex-col gap-1'>
						<div className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>Veículo</div>
						<div className='text-foreground text-sm font-bold uppercase'>{trip.ds_placa_cavalo || trip.truckPlate || '---'}</div>
						<div className='text-muted-foreground text-[10px] font-medium'>
							+ {trip.ds_placa_carreta_1 || trip.trailer1Plate || '---'}
						</div>
					</div>

					<div className='flex flex-col gap-1'>
						<div className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>Motorista</div>
						<div className='text-foreground text-sm font-bold'>{trip.ds_motorista || trip.driverName || 'Não informado'}</div>
					</div>

					{/* TODO: Adicionar campo vl_frete_total em tms_viagens */}
					<div className='flex flex-col gap-1 text-right'>
						<div className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>Frete Total</div>
						<div className='text-foreground text-sm font-bold'>
							{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
						</div>
					</div>

					{/* TODO: Implementar cálculo de lucro estimado baseado em custos reais */}
					<div className='flex flex-col gap-1 text-right'>
						<div className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>Lucro Estimado</div>
						<div className='text-sm font-bold text-green-700 dark:text-green-300'>
							{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue * 0.3)}
						</div>
					</div>

					<span aria-label={`Status: ${tripStatusLabelPt(trip.ds_status || trip.status)}`}>
						<StatusBadge status={trip.ds_status || trip.status} size='lg' />
					</span>
				</div>
				<div className='border-border my-4 border-t' />
				{/* <div>
					<Card>
						<div className='flex items-center gap-1 rounded-xl bg-muted p-1 shadow-inner'>
							<button
								onClick={() => setViewModel('CARGAS')}
								className={`flex items-center gap-2 rounded-lg px-6 py-2 text-xs font-black tracking-widest uppercase transition-all ${viewModel === 'CARGAS' ? 'bg-card text-foreground shadow-md ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'} `}
							>
								<MapIcon size={14} /> Viagens
							</button>
							<button
								onClick={() => setViewModel('DESPESAS')}
								className={`flex items-center gap-2 rounded-lg px-6 py-2 text-xs font-black tracking-widest uppercase transition-all ${viewModel === 'DESPESAS' ? 'bg-card text-foreground shadow-md ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'} `}
							>
								<LayoutGrid size={14} /> Cargas
							</button>
						</div>
					</Card>
				</div> */}
				{/* Fiscal Summary (MDF-es da Viagem) */}
				{/* TODO: Implementar tabela tms_mdfes e relacionamento com viagens */}
				{trip.mdfes && trip.mdfes.length > 0 && (
					<div className='mb-8 flex items-center justify-between rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/10 p-6 shadow-sm'>
						<div className='flex items-center gap-5'>
							<div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/30 shadow-lg'>
								<FileText size={24} className='text-emerald-700 dark:text-emerald-300' />
							</div>
							<div>
								<div className='mb-1 text-[10px] font-black tracking-[0.2em] text-emerald-700 uppercase opacity-80 dark:text-emerald-300'>
									Manifestos Autorizados (MDF-e)
								</div>
								<div className='flex flex-wrap gap-2'>
									{trip.mdfes.map((m) => (
										<span
											key={m.id}
											className='flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-700 uppercase shadow-sm dark:text-emerald-300'
										>
											<CheckCircle size={10} /> Nº {m.number}
										</span>
									))}
								</div>
							</div>
							<StatusBadge status={trip.ds_status || trip.status} size='lg' />
						</div>
						<Button
							variant='outline'
							className='flex h-auto items-center gap-2 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-xs font-semibold tracking-wide text-emerald-700 uppercase hover:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/20'
						>
							<Check size={16} strokeWidth={3} /> Imprimir DAMDFEs
						</Button>
					</div>
				)}
				<div className='border-border bg-muted/50 mb-6 rounded-2xl border-2 border-dashed p-4'>
					<Card className='p-0'>
						<div className='bg-muted flex justify-around gap-1 rounded-lg p-1 shadow-inner'>
							<Button
								onClick={() => setViewMode('CARGAS')}
								variant={viewMode === 'CARGAS' ? 'secondary' : 'ghost'}
								size='sm'
								className='flex h-auto items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wide uppercase'
							>
								<Box size={14} /> Cargas
							</Button>
							<Button
								onClick={() => setViewMode('DESPESAS')}
								variant={viewMode === 'DESPESAS' ? 'secondary' : 'ghost'}
								size='sm'
								className='flex h-auto items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wide uppercase'
							>
								<DollarSign size={14} /> Despesas
							</Button>
							<Button
								onClick={() => setViewMode('ADIANTAMENTOS')}
								variant={viewMode === 'ADIANTAMENTOS' ? 'secondary' : 'ghost'}
								size='sm'
								className='flex h-auto items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wide uppercase'
							>
								<Wallet size={14} /> Adiantamentos
							</Button>
						</div>{' '}
					</Card>
				</div>

				{/* Views: DESPESAS / ADIANTAMENTOS */}
				{viewMode === 'DESPESAS' && (
					<div className='mb-6 space-y-5'>
						<div className='border-border bg-card rounded-2xl border p-5'>
							<div className='mb-5 flex items-center gap-2.5'>
								<div className='bg-primary/20 flex h-9 w-9 items-center justify-center rounded-xl'>
									<Receipt size={18} className='text-primary' />
								</div>
								<h3 className='text-foreground text-base font-bold'>Nova Despesa</h3>
							</div>

							<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
								{/* Documento */}
								<div>
									<label className='flex items-center gap-2 text-xs font-semibold'>
										<FileText size={12} className='-mt-0.5 mr-1 inline' /> Documento
									</label>
									<div className='mt-1 flex items-center gap-2'>
										<input
											className='flex-1 rounded-md border p-2 text-sm'
											value={
												selectedDocument?.js_nfe?.ds_numero ||
												selectedDocument?.js_nfse?.ds_numero ||
												selectedDocument?.ds_controle ||
												''
											}
											onChange={() => {
												/* allow manual */
											}}
										/>
										<button
											type='button'
											onClick={() => setDocumentModalOpen(true)}
											className='rounded-md border px-3 py-2 text-sm'
										>
											<Search size={19} />
										</button>
									</div>
									{/* Conta (usada também para NFSe quando selecionada) */}
									<div className='mt-2'>
										<label className='flex items-center gap-2 text-xs font-semibold'>
											<Clipboard size={12} className='-mt-0.5 mr-1 inline' /> Conta
										</label>
										<select
											className='mt-1 w-full rounded-md border p-2 text-sm'
											value={selectedConta?.id || ''}
											disabled={selectedDocument !== null ? (selectedDocument.js_nfse ? false : true) : false}
											onChange={(e) => {
												const id = e.target.value;
												const found = (planoContas || []).find((p: ContaDespesa) => p.id === id) || null;
												setSelectedConta(found);
												// compute if odometer should be enabled: either this selected conta is ABASTECIMENTO or any per-item mapped conta is
												const anyItemAb = Object.values(contasPorItem || {}).some(
													(cid) =>
														(planoContas || []).find((p: ContaDespesa) => p.id === cid)?.ds_tipo_tms_despesa ===
														'ABASTECIMENTO',
												);
												setOdometerEnabled(Boolean(found?.ds_tipo_tms_despesa === 'ABASTECIMENTO' || anyItemAb));
											}}
										>
											<option value=''>-- Selecione Conta --</option>
											{(planoContas || [])
												.filter((c: ContaDespesa) => c.ds_tipo_tms_despesa && c.ds_tipo_tms_despesa !== 'ADIANTAMENTO')
												.map((c: ContaDespesa) => (
													<option key={c.id} value={c.id}>
														{c.ds_classificacao_cta} - {c.ds_nome_cta}
													</option>
												))}
										</select>
									</div>
								</div>
								{/* Data & Valor */}
								<div>
									<label className='flex items-center gap-2 text-xs font-semibold'>
										<Calendar size={12} className='-mt-0.5 mr-1 inline' /> Data
									</label>
									<div className='mt-1'>
										{/* date is filled from dataDespesa (set when selecting a document) */}
										<input
											type='date'
											className='w-full rounded-md border p-2 text-sm'
											value={dataDespesa || ''}
											onChange={(e) => setDataDespesa(e.target.value)}
										/>
									</div>
									<label className='mt-2 flex items-center gap-2 text-xs font-semibold'>
										<DollarSign size={12} className='-mt-0.5 mr-1 inline' /> Valor
									</label>
									<input
										type='number'
										className='mt-1 w-full rounded-md border p-2 text-sm'
										value={
											valorDespesa ??
											(selectedDocument
												? selectedDocument.js_nfe?.vl_nf
													? Number(selectedDocument.js_nfe.vl_nf) / 100
													: selectedDocument.js_nfse?.ds_valor_servicos
														? Number(selectedDocument.js_nfse.ds_valor_servicos) / 100
														: ''
												: '')
										}
										onChange={(e) => setValorDespesa(parseFloat(e.target.value || '0'))}
									/>
								</div>
							</div>

							{/* Descrição e Quem Pagou */}
							<div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
								<div>
									<label className='flex items-center gap-2 text-xs font-semibold'>
										<AlignLeft size={12} className='-mt-0.5 mr-1 inline' /> Descrição
									</label>
									<input
										className='mt-1 w-full rounded-md border p-2 text-sm'
										value={descricaoDespesa}
										onChange={(e) => setDescricaoDespesa(e.target.value)}
									/>
								</div>
								<div>
									<label className='flex items-center gap-2 text-xs font-semibold'>
										<User size={12} className='-mt-0.5 mr-1 inline' /> Quem Pagou
									</label>
									<select
										className='mt-1 w-full rounded-md border p-2 text-sm'
										value={quemPagou}
										onChange={(e) => setQuemPagou(e.target.value as 'EMPRESA' | 'MOTORISTA')}
									>
										<option value='EMPRESA'>Empresa</option>
										<option value='MOTORISTA'>Motorista</option>
									</select>
								</div>
							</div>
							<div className='mt-4 mb-2 md:col-span-2'>
								<div className='grid grid-cols-1 gap-4'>
									<div>
										<label className='text-xs font-semibold'>
											{' '}
											<Gauge size={12} className='-mt-0.5 mr-1 inline' /> Odômetro
										</label>
										<input
											type='number'
											className={`mt-1 w-full rounded-md border p-2 text-sm ${!odometerEnabled ? 'bg-muted/60 opacity-70' : ''}`}
											value={odometro ?? ''}
											onChange={(e) => setOdometro(e.target.value ? Number(e.target.value) : null)}
											disabled={!odometerEnabled}
										/>
									</div>
								</div>
							</div>
							{/* Itens da NFe: escolher conta por item */}
							{selectedDocument && selectedDocument.js_nfe && (
								<div className='mt-4'>
									<div className='mb-2 text-sm font-semibold'>Itens da NFe</div>
									{(selectedDocument.js_nfe?.fis_nfe_itens || []).map((it, idx: number) => (
										<div key={it.id || idx} className='mb-2 flex items-center gap-2'>
											<div className='flex-1 text-sm'>{it.ds_produto || `Item ${idx + 1}`}</div>
											<select
												className='rounded-md border p-1 text-sm'
												value={contasPorItem[it.id] || ''}
												onChange={(e) => {
													const val = e.target.value;
													setContasPorItem((prev) => {
														const next = { ...prev, [it.id]: val };
														const anyItemAb = Object.values(next || {}).some(
															(cid) =>
																(planoContas || []).find((p: ContaDespesa) => p.id === cid)?.ds_tipo_tms_despesa ===
																'ABASTECIMENTO',
														);
														setOdometerEnabled(Boolean(anyItemAb || selectedConta?.ds_tipo_tms_despesa === 'ABASTECIMENTO'));
														return next;
													});
												}}
											>
												<option value=''>-- Selecione Conta --</option>
												{(planoContas || [])
													.filter((c: ContaDespesa) => c.ds_tipo_tms_despesa && c.ds_tipo_tms_despesa !== 'ADIANTAMENTO')
													.map((c: ContaDespesa) => (
														<option key={c.id} value={c.id}>
															{c.ds_classificacao_cta} - {c.ds_nome_cta}
														</option>
													))}
											</select>
										</div>
									))}
								</div>
							)}

							{/* Serviços da NFSe: escolher conta por serviço */}
							{selectedDocument && selectedDocument.js_nfse && (selectedDocument.js_nfse.js_servicos || []).length > 0 && (
								<div className='mt-4'>
									<div className='mb-2 text-sm font-semibold'>Serviços da NFSe</div>
									{(selectedDocument.js_nfse.js_servicos || []).map((svc, idx: number) => (
										<div key={idx} className='mb-2 space-y-1'>
											{svc.ds_item_lista_servico && (
												<div className='text-muted-foreground truncate text-xs'>Código: {svc.ds_item_lista_servico}</div>
											)}
											{svc.ds_discriminacao && <div className='text-foreground text-sm'>{svc.ds_discriminacao}</div>}
										</div>
									))}
								</div>
							)}
							<div className='mt-4 flex justify-end'>
								<Button onClick={handleSaveDespesa} className='rounded-md'>
									Salvar Despesa
								</Button>
							</div>

							{/* Lista de Despesas adicionadas (rascunho local) */}
							<div className='border-border my-4 border-t' />
							{despesasToShow && despesasToShow.length > 0 && (
								<div className='bg-muted/40 mt-4 rounded-2xl border p-4'>
									<div className='mb-4 flex items-center justify-between'>
										<div className='flex items-center gap-2'>
											<h4 className='text-foreground text-sm font-bold'>Despesas</h4>
											<span className='inline-flex items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300'>
												{despesasToShow.length}
											</span>
										</div>
										<span className='text-muted-foreground text-xs font-medium'>{despesasFromApi ? 'Salvas' : ''}</span>
									</div>
									<ul className='space-y-2'>
										{despesasToShow.map((d: Despesa) => {
											if (d.ds_tipo === 'ADIANTAMENTO') return null;
											const isServer = !!(d && d.id && (d.vl_despesa !== undefined || d.ds_tipo));
											return (
												<li key={d.id} className='draft-item bg-card flex items-center justify-between rounded p-3'>
													<div className='min-w-0 flex-1'>
														{/* Tipo badge (prefere o tipo na conta de despesa, senão usa ds_tipo) */}
														{(() => {
															const tipoDespesaRaw = d?.con_conta_despesa?.ds_tipo_tms_despesa;
															const tipoDespesa = typeof tipoDespesaRaw === 'string' ? tipoDespesaRaw.toUpperCase() : null;
															if (!tipoDespesa) return null;

															switch (tipoDespesa) {
																case 'ABASTECIMENTO':
																	return (
																		<div className='mb-2 inline-flex items-center gap-2 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300'>
																			<Droplets className='h-4 w-4 text-blue-700 dark:text-blue-300' />
																			<span>Abastecimento</span>
																		</div>
																	);
																case 'ADIANTAMENTO':
																	return (
																		<div className='mb-2 inline-flex items-center gap-2 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs font-bold text-yellow-700 dark:text-yellow-300'>
																			<HandCoins className='h-4 w-4 text-yellow-700 dark:text-yellow-300' />
																			<span>Adiantamento</span>
																		</div>
																	);
																case 'PEDAGIO':
																	return (
																		<div className='mb-2 inline-flex items-center gap-2 rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300'>
																			<Tickets className='h-4 w-4 text-purple-700 dark:text-purple-300' />
																			<span>Pedágio</span>
																		</div>
																	);
																case 'DESPESA':
																default:
																	return (
																		<div className='border-border/70 bg-muted/40 text-foreground mb-2 inline-flex items-center gap-2 rounded border px-2 py-0.5 text-xs font-bold'>
																			<Receipt className='text-muted-foreground h-4 w-4' />
																			<span>Despesa</span>
																		</div>
																	);
															}
														})()}

														<div className='text-foreground truncate text-sm font-semibold'>
															{d.fis_nfe_item?.fis_nfe?.ds_numero || d?.fis_nfse?.ds_numero || d.ds_observacao || '—'} -{' '}
															{d.ds_observacao || 'Sem descrição'}
														</div>
														<div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
															<span>
																{(d.dt_despesa && new Date(d.dt_despesa).toISOString().slice(0, 10)) || d.dt_despesa || '—'}
															</span>
															{d.ds_observacao && (
																<>
																	<span>•</span>
																	<span className='truncate'>{d.ds_observacao}</span>
																</>
															)}
														</div>
													</div>
													{/* Valor centralizado */}
													<div className='mx-4 w-32 text-center'>
														<div className='text-foreground text-sm font-semibold'>
															{formatCurrency(Number(d.vl_despesa ?? 0))}
														</div>
													</div>
													<button
														onClick={() => (isServer ? handleDeleteDespesa(d.id) : handleRemoveDespesa(d.id))}
														className='btn-danger-outline ml-4 flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-red-600'
													>
														<Trash2 size={12} /> Remover
													</button>
												</li>
											);
										})}
									</ul>
									<div className='border-border/60 mt-4 flex items-center justify-between border-t pt-3'>
										<span className='text-muted-foreground text-xs'>Total</span>
										<span className='text-foreground text-sm font-bold'>
											{formatCurrency((despesasToShow as Despesa[]).reduce((s, d) => s + (Number(d.vl_despesa ?? 0) || 0), 0))}
										</span>
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Documentos de Despesas Modal */}
				<Dialog open={documentModalOpen} onOpenChange={(open) => setDocumentModalOpen(open)}>
					<DialogContentMedium className='max-h-[80vh] w-full overflow-auto'>
						<DialogHeader>
							<DialogTitle>Documentos de Despesa</DialogTitle>
							<DialogDescription>Selecione um documento para preencher os dados da despesa.</DialogDescription>
						</DialogHeader>
						<div className='mt-4'>
							<div className='items-around flex gap-4'>
								<input
									className='w-full rounded-md border p-2 text-sm'
									placeholder='Pesquisar...'
									value={docSearch}
									onChange={(e) => setDocSearch(e.target.value)}
								/>
								<div className=''>
									<MonthYearSelector
										placeholder='Mês/Ano'
										selected={competencia}
										onSelect={(date) => date && setCompetencia(date)}
									/>
								</div>
							</div>
							<div className='border-border/70 my-2 border-t' />
							<div className='mt-4 max-h-[50vh] space-y-2 overflow-y-auto'>
								{!documentosDespesas ? (
									<div className='text-muted-foreground text-sm'>Carregando...</div>
								) : documentosDespesas.length === 0 ? (
									<div className='text-muted-foreground text-sm'>Nenhum documento encontrado.</div>
								) : (
									documentosDespesas.map((doc: Doc) => (
										<div key={doc.id} className='bg-card rounded-md border p-2'>
											<div className='flex items-center justify-between gap-4'>
												<div className='min-w-0'>
													<div className='truncate text-sm font-bold'>
														{doc.ds_tipo} {doc.js_nfe?.ds_numero || doc.js_nfse?.ds_numero || doc.ds_controle} -{' '}
														{doc.dt_emissao ? new Date(doc.dt_emissao).toLocaleDateString() : '—'}
													</div>
													<div className='text-muted-foreground truncate text-xs'>
														{doc.js_nfe?.ds_razao_social_emitente || doc.js_nfse?.fis_fornecedor?.ds_nome}
													</div>
												</div>
												<div className='text-foreground/90 font-mono text-sm'>
													{doc.js_nfe?.vl_nf
														? `R$ ${(Number(doc.js_nfe.vl_nf) / 100).toFixed(2)}`
														: doc.js_nfse?.ds_valor_servicos
															? `R$ ${(Number(doc.js_nfse.ds_valor_servicos) / 100).toFixed(2)}`
															: ''}
												</div>
												<div className='flex gap-2'>
													<button
														type='button'
														className='rounded-md border px-3 py-1 text-xs font-medium'
														onClick={() => {
															setSelectedDocument(doc);
															setDataDespesa(
																formatDateForInput(doc.js_nfe?.dt_emissao || doc.js_nfse?.dt_emissao || doc.dt_emissao),
															);
															setValorDespesa(
																doc.js_nfe?.vl_nf
																	? Number(doc.js_nfe.vl_nf) / 100
																	: doc.js_nfse?.ds_valor_servicos
																		? Number(doc.js_nfse.ds_valor_servicos) / 100
																		: null,
															);
															setDocumentModalOpen(false);
														}}
													>
														Selecionar
													</button>
													<button
														type='button'
														className='text-muted-foreground hover:bg-muted rounded-md border px-3 py-1 text-xs'
														onClick={(e) => {
															e.stopPropagation();
															setDocExpanded((prev) => {
																const s = new Set(prev);
																if (s.has(doc.id)) s.delete(doc.id);
																else s.add(doc.id);
																return s;
															});
														}}
													>
														Detalhes
													</button>
												</div>
											</div>
											{/* expanded */}
											{docExpanded.has(doc.id) && (
												<div className='bg-muted/40 text-foreground/90 mt-2 w-full rounded p-2 text-xs'>
													{doc.js_nfe?.fis_nfe_itens && doc.js_nfe.fis_nfe_itens.length > 0 && (
														<div>
															<div className='mb-1 font-semibold'>Itens da NFe</div>
															<ul className='max-h-36 space-y-1 overflow-y-auto'>
																{doc.js_nfe.fis_nfe_itens.map((it) => (
																	<li key={it.id} className='flex justify-between'>
																		<span className='truncate'>{it.ds_produto || '—'}</span>
																		<span className='ml-4 font-mono'>
																			R$ {(Number(it.vl_total ?? it.vl_unitario ?? '0') / 100).toFixed(2)}
																		</span>
																	</li>
																))}
															</ul>
														</div>
													)}
													{doc.js_nfse && (
														<div>
															<div className='mb-1 font-semibold'>NFSe / Serviço</div>
															<div className='max-h-36 space-y-1 overflow-y-auto'>
																{doc.js_nfse?.js_servicos?.map((s: NfseServiceItem, index: number) => (
																	<div className='text-muted-foreground truncate text-xs' key={index}>
																		Serviço: {s.ds_item_lista_servico}
																	</div>
																))}
																{doc.js_nfse?.ds_discriminacao ? (
																	doc.js_nfse?.js_servicos?.map((s: NfseServiceItem, index: number) => (
																		<div className='text-foreground text-sm' key={index}>
																			{s.ds_discriminacao}
																		</div>
																	))
																) : doc.js_nfse?.js_servicos?.[0]?.ds_discriminacao ? (
																	doc.js_nfse.js_servicos.map((s: NfseServiceItem, index: number) => (
																		<div className='text-foreground text-sm' key={index}>
																			{JSON.stringify(s.ds_discriminacao)}
																		</div>
																	))
																) : (
																	<div className='text-foreground text-sm'>—</div>
																)}
															</div>
														</div>
													)}
												</div>
											)}
										</div>
									))
								)}
							</div>
						</div>
					</DialogContentMedium>
				</Dialog>
				<div className='border-border my-6 border-t' />

				{viewMode === 'ADIANTAMENTOS' && (
					<div className='mb-6 space-y-5'>
						<div className='border-border bg-card rounded-2xl border p-5'>
							<div className='mb-5 flex items-center gap-2.5'>
								<div className='flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/30'>
									<Banknote size={18} className='text-emerald-700 dark:text-emerald-300' />
								</div>
								<h3 className='text-foreground text-base font-bold'>Novo Adiantamento</h3>
							</div>

							<div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
								<div>
									<label className='flex items-center gap-2 text-xs font-semibold'>
										<Banknote size={12} className='-mt-0.5 mr-1 inline' /> Conta (Adiantamento)
									</label>
									<select
										className='mt-1 w-full rounded-md border p-2 text-sm'
										value={selectedConta?.id || ''}
										onChange={(e) => {
											const id = e.target.value;
											const found = (planoContas || []).find((p: ContaDespesa) => p.id === id);
											setSelectedConta(found || null);
										}}
									>
										<option value=''>-- Selecione --</option>
										{(planoContas || [])
											.filter((c: ContaDespesa) => c.ds_tipo_tms_despesa === 'ADIANTAMENTO')
											.map((c: ContaDespesa) => (
												<option key={c.id} value={c.id}>
													{c.ds_classificacao_cta} - {c.ds_nome_cta}
												</option>
											))}
									</select>
								</div>
								<div>
									<label className='flex items-center gap-2 text-xs font-semibold'>
										<Calendar size={12} className='-mt-0.5 mr-1 inline' /> Data
									</label>
									<input
										type='date'
										className='mt-1 w-full rounded-md border p-2 text-sm'
										value={dataAdiantamento ? dataAdiantamento.toISOString().slice(0, 10) : ''}
										onChange={(e) => setDataAdiantamento(e.target.value ? new Date(e.target.value) : undefined)}
									/>
								</div>
								<div>
									<label className='flex items-center gap-2 text-xs font-semibold'>
										<DollarSign size={12} className='-mt-0.5 mr-1 inline' /> Valor
									</label>
									<input
										type='number'
										className='mt-1 w-full rounded-md border p-2 text-sm'
										value={valorAdiantamento ?? ''}
										onChange={(e) => setValorAdiantamento(parseFloat(e.target.value || '0'))}
									/>
								</div>
							</div>
							<div className='mt-4'>
								<label className='flex items-center gap-2 text-xs font-semibold'>
									<MessageSquare size={12} className='-mt-0.5 mr-1 inline' /> Observação
								</label>
								<input
									className='mt-1 w-full rounded-md border p-2 text-sm'
									value={obsAdiantamento}
									onChange={(e) => setObsAdiantamento(e.target.value)}
								/>
							</div>
							<div className='mt-4 flex justify-end'>
								<Button
									onClick={handleSaveAdiantamento}
									variant='secondary'
									className='border-border bg-muted/60 text-foreground hover:bg-muted flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black tracking-widest uppercase shadow-sm'
								>
									<Banknote size={16} /> Salvar Adiantamento
								</Button>
							</div>

							{/* Lista de Adiantamentos (server or draft) */}
							{adiantamentosToShow && adiantamentosToShow.length > 0 && (
								<div className='bg-muted/40 mt-4 rounded-2xl border p-4'>
									<div className='mb-4 flex items-center justify-between'>
										<div className='flex items-center gap-2'>
											<h4 className='text-foreground text-sm font-bold'>Adiantamentos</h4>
											<span className='inline-flex items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300'>
												{adiantamentosToShow.length}
											</span>
										</div>
										<span className='text-muted-foreground text-xs font-medium'>
											{adiantamentosFromApi ? 'Salvas' : 'Rascunho'}
										</span>
									</div>
									<ul className='space-y-2'>
										{adiantamentosToShow.map((a: Despesa) => {
											const isServer = !!(
												a &&
												a.id &&
												!String(a.id).startsWith('a-') &&
												(a.vl_despesa !== undefined || a.ds_tipo)
											);
											const conta = isServer
												? (planoContas || []).find((p: ContaDespesa) => p.id === a.id_conta_despesa)
												: a.conta;
											const dateStr = isServer ? formatDateForInput(a.dt_despesa || a.data) : a.data;
											const valueNum = Number(a.vl_despesa ?? a.valor ?? 0);
											const obs = isServer ? a.ds_observacao : a.obs;

											return (
												<li key={a.id} className='draft-item bg-card flex items-center justify-between rounded p-3'>
													<div>
														<div className='text-foreground text-sm font-semibold'>
															{conta ? `${conta.ds_classificacao_cta || ''} ${conta.ds_nome_cta || ''}` : '—'}
														</div>
														<div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
															<span>{dateStr || '—'}</span>
															<span>•</span>
															<span className='text-foreground font-semibold'>{formatCurrency(valueNum)}</span>
														</div>
														{obs && <div className='text-muted-foreground mt-1 text-xs'>{obs}</div>}
													</div>
													<button
														onClick={() => (isServer ? handleDeleteAdiantamento(a.id) : handleRemoveAdiantamento(a.id))}
														className='btn-danger-outline ml-4 flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-red-600'
													>
														<Trash2 size={12} /> Remover
													</button>
												</li>
											);
										})}
									</ul>
									<div className='border-border/60 mt-4 flex items-center justify-between border-t pt-3'>
										<span className='text-muted-foreground text-xs'>Total</span>
										<span className='text-foreground text-sm font-bold'>
											{formatCurrency(
												(adiantamentosToShow || []).reduce(
													(sum: number, a: Despesa) => sum + Number(a.vl_despesa ?? a.valor ?? 0),
													0,
												),
											)}
										</span>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
				{/* --- CARGAS & DESLOCAMENTOS (Visual Timeline) --- */}
				{viewMode === 'CARGAS' && (
					<div className='space-y-6'>
						{safeLegs.length === 0 && !activeLegForm && (
							<div className='border-border bg-muted/50 rounded-2xl border-2 border-dashed p-16 text-center'>
								<p className='text-muted-foreground mb-3 font-medium'>O roteiro desta viagem está vazio.</p>
								<Button variant='link' onClick={openNewLoadWizard} className='font-bold'>
									Adicione a primeira carga
								</Button>
							</div>
						)}

						{safeLegs.map((leg, legIndex) => {
							const isLoad = leg.fl_deslocamento_vazio !== true && leg.cd_carga !== 'DESLOCAMENTO_VAZIO';
							// Match por tms_viagens_cargas.id (leg.id quando legs vêm de js_viagens_cargas) ou por id_carga (fallback quando leg.id = carga.id)
							const fluxoItem = fluxo?.itens?.find((i) => i.id === leg.id) ?? fluxo?.itens?.find((i) => i.id_carga === leg.loadId);

							if (!isLoad) {
								// Don't increment for empty
							} else {
								loadCount++;
							}

							const currentLoadNum = loadCount;
							// Buscar carga vinculada via leg.loadId, leg.cargaData ou trip.js_viagens_cargas (garante botão Finalizar em deslocamento vazio)
							const associatedLoad =
								loads?.find((c) => c?.id === leg.loadId) ||
								leg.cargaData ||
								trip.js_viagens_cargas?.find((vc) => vc.id === leg.id)?.tms_cargas;
							// Fallback para deslocamento vazio ativo quando a API não retorna tms_cargas (permite exibir Iniciar/Finalizar)
							const isActiveDeslocamentoVazio = !isLoad && activeTripLoad?.id === leg.id;
							type AssociatedLoad =
								| Carga
								| { id: string; cd_carga: string; fl_deslocamento_vazio?: boolean; ds_status: 'PLANEJADA' | 'EM_VIAGEM' };
							const effectiveAssociatedLoad: AssociatedLoad | undefined =
								associatedLoad ??
								(isActiveDeslocamentoVazio
									? {
											id: leg.loadId || leg.id,
											cd_carga: 'DESLOCAMENTO_VAZIO',
											fl_deslocamento_vazio: true,
											ds_status: trip.ds_status === 'EM_VIAGEM' ? ('EM_VIAGEM' as const) : ('PLANEJADA' as const),
										}
									: undefined);

							const isConcluidoOuBloqueado =
								trip.ds_status === 'CONCLUIDA' ||
								trip.status === 'Completed' ||
								fluxoItem?.status_item === 'CONCLUIDO' ||
								(associatedLoad as Carga | undefined)?.ds_status === 'ENTREGUE';

							const canMoveUp = legIndex > 0 && reorderableByIndex[legIndex] && reorderableByIndex[legIndex - 1];
							const canMoveDown = legIndex < safeLegs.length - 1 && reorderableByIndex[legIndex] && reorderableByIndex[legIndex + 1];

							const legBorderStatus = getLegBorderStatus(fluxoItem, associatedLoad as Carga | undefined);

							return (
								<LegCard key={leg.id} concluded={isConcluidoOuBloqueado} isEmptyLeg={!isLoad} borderStatus={legBorderStatus}>
									{/* Header Badge + Reordenar (setas só para não iniciados) */}
									<div className='mb-8 flex items-center gap-3'>
										{isLoad ? (
											<>
												<span className='border-border bg-muted text-muted-foreground rounded-lg border px-4 py-1.5 text-xs font-black tracking-wider uppercase'>
													Carga #{currentLoadNum}
												</span>
												{/* Badge de etapa sincronizado com fluxo (Agendada, Em Coleta, Em Rota, Concluído). Coleta não iniciada não deve mostrar "Em Rota". */}
												{fluxoItem && (
													<>
														{fluxoItem.status_item === 'CONCLUIDO' ? (
															<StatusBadge
																status='CONCLUIDO'
																size='md'
																icon={<CheckCircle size={10} className='mr-1 inline' />}
															/>
														) : fluxoItem.status_item === 'EM_DESLOCAMENTO' &&
														  fluxoItem.carga?.ds_status_coleta === 'EM_COLETA' ? (
															<StatusBadge status='EM_COLETA' label='Em Coleta' size='md' />
														) : fluxoItem.status_item === 'EM_DESLOCAMENTO' &&
														  (fluxoItem.carga?.ds_status_coleta === 'PENDENTE' || !fluxoItem.carga?.ds_status_coleta) ? (
															<StatusBadge status='AGENDADA' label='Agendada' size='md' />
														) : fluxoItem.status_item === 'EM_DESLOCAMENTO' ? (
															<StatusBadge status='EM_DESLOCAMENTO' size='md' />
														) : (
															<StatusBadge status={fluxoItem.status_item} size='md' />
														)}
													</>
												)}
												{leg.cd_carga && (
													<span className='border-border bg-muted/80 dark:bg-muted text-muted-foreground dark:text-foreground/90 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase'>
														<Tag size={10} /> {leg.cd_carga}
													</span>
												)}
												{(associatedLoad as Carga | undefined)?.tms_segmentos && (
													<span className='border-border bg-muted/80 text-muted-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase'>
														Segmento: {(associatedLoad as Carga).tms_segmentos!.cd_identificador
															? `${(associatedLoad as Carga).tms_segmentos!.cd_identificador} - ${(associatedLoad as Carga).tms_segmentos!.ds_nome}`
															: (associatedLoad as Carga).tms_segmentos!.ds_nome}
													</span>
												)}
											</>
										) : (
											<>
												<span className='bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-xs font-black tracking-wider uppercase'>
													Deslocamento Vazio
												</span>
												{/* Badge de etapa sincronizado com fluxo (Concluído / Em Rota / Agendada / Aguardando) */}
												{fluxoItem ? (
													<>
														{fluxoItem.status_item === 'CONCLUIDO' ? (
															<>
																<StatusBadge
																	status='CONCLUIDO'
																	size='md'
																	icon={<CheckCircle size={10} className='mr-1 inline' />}
																/>
																{associatedLoad?.dt_updated && (
																	<span className='ml-1 text-[10px] font-normal normal-case opacity-90'>
																		(
																		{new Date(associatedLoad.dt_updated).toLocaleDateString('pt-BR', {
																			day: '2-digit',
																			month: '2-digit',
																			year: 'numeric',
																		})}
																		)
																	</span>
																)}
															</>
														) : fluxoItem.status_item === 'EM_DESLOCAMENTO' ? (
															<StatusBadge
																status='EM_DESLOCAMENTO'
																size='md'
																icon={<Loader2 size={10} className='mr-1 inline animate-spin' />}
															/>
														) : (
															<StatusBadge status={fluxoItem.status_item} size='md' />
														)}
													</>
												) : associatedLoad?.ds_status === 'ENTREGUE' ? (
													<>
														<StatusBadge
															status='CONCLUIDO'
															label='Concluído'
															size='md'
															icon={<CheckCircle size={10} className='mr-1 inline' />}
														/>
														{associatedLoad.dt_updated && (
															<span className='ml-1 text-[10px] font-normal normal-case opacity-90'>
																(
																{new Date(associatedLoad.dt_updated).toLocaleDateString('pt-BR', {
																	day: '2-digit',
																	month: '2-digit',
																	year: 'numeric',
																})}
																)
															</span>
														)}
													</>
												) : activeTripLoad?.id === leg.id ? (
													<StatusBadge
														status='EM_DESLOCAMENTO'
														size='md'
														icon={<Loader2 size={10} className='mr-1 inline animate-spin' />}
													/>
												) : (
													<StatusBadge status='PLANEJADA' label='Agendada' size='md' />
												)}
												{associatedLoad?.fl_carroceria_desacoplada && (
													<span className='rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300'>
														Carroceria desacoplada
													</span>
												)}
											</>
										)}

										{/* Remanejar trajeto: setas para subir/descer na ordem (somente etapas não iniciadas) */}
										<div className='border-border bg-muted/60 dark:bg-muted ml-auto flex items-center gap-1.5 rounded-lg border px-2 py-1'>
											<span className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>Ordem</span>
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														type='button'
														onClick={() => handleMoveSegment(legIndex, 'up')}
														disabled={!canMoveUp || reorderMutation.isPending}
														className='text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40'
														aria-label='Subir na ordem'
													>
														<ChevronUp size={18} />
													</button>
												</TooltipTrigger>
												<TooltipContent>
													{!canMoveUp
														? 'Subir na ordem (somente etapas não iniciadas; primeira etapa não pode subir)'
														: 'Subir na ordem'}
												</TooltipContent>
											</Tooltip>
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														type='button'
														onClick={() => handleMoveSegment(legIndex, 'down')}
														disabled={!canMoveDown || reorderMutation.isPending}
														className='text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40'
														aria-label='Descer na ordem'
													>
														<ChevronDown size={18} />
													</button>
												</TooltipTrigger>
												<TooltipContent>
													{!canMoveDown
														? 'Descer na ordem (somente etapas não iniciadas; última etapa não pode descer)'
														: 'Descer na ordem'}
												</TooltipContent>
											</Tooltip>
										</div>
									</div>
									{/* Cargas vinculadas via js_viagens_cargas */}
									{isLoad && (
										<div className='mb-6'>
											{associatedLoad && (
												<LoadCardInTrip
													load={associatedLoad}
													tripId={trip.id}
													trip={trip}
													onEmitFiscal={onEmitFiscal}
													onViewDetails={onViewLoadDetails ? () => onViewLoadDetails(associatedLoad) : undefined}
													onFinalizarCarga={
														associatedLoad?.ds_status !== 'ENTREGUE'
															? () => setEncerrarCargaModal({ cargaId: associatedLoad.id })
															: undefined
													}
													isFinalizarCargaPending={finalizarCargaMutation.isPending}
												/>
											)}
										</div>
									)}
									{/* Ações da esteira (fluxo): botão contextual por etapa — dois percursos distintos */}
									{fluxoItem && (
										<div className='mb-6 space-y-4'>
											{!isLoad ? (
												/* Percurso 2: Deslocamento vazio — sem coleta, apenas iniciar/finalizar deslocamento */
												<div className='flex flex-wrap gap-2'>
													<TripFlowActionButton
														label='Iniciar deslocamento'
														canDo={fluxoItem.canStart}
														blockedReason={fluxoItem.blockedReason}
														loading={iniciarItemMutation.isPending && iniciarItemMutation.variables?.itemId === fluxoItem.id}
														onClick={() => setActionModal({ type: 'iniciarItem', itemId: fluxoItem.id })}
													/>
													<TripFlowActionButton
														label='Finalizar deslocamento'
														canDo={fluxoItem.canFinish}
														blockedReason={fluxoItem.blockedReason}
														loading={
															finalizarItemMutation.isPending && finalizarItemMutation.variables?.itemId === fluxoItem.id
														}
														onClick={() => setActionModal({ type: 'finalizarItem', itemId: fluxoItem.id })}
													/>
												</div>
											) : (
												/* Percurso 1: Carga — Agendada → Iniciar coleta; Em coleta → Iniciar; Em rota → Finalizar rota */
												<>
													{(() => {
														const statusItem = fluxoItem.status_item;
														const statusColeta = fluxoItem.carga?.ds_status_coleta ?? null;
														const entregas = fluxoItem.carga?.entregas ?? [];
														const entregaEmTransito = entregas.find((e) => e.ds_status === 'EM_TRANSITO');
														const entregaPendenteIniciar = entregas.find((e) => e.ds_status === 'PENDENTE' && e.canStart);
														const isAgendada =
															statusItem === 'DISPONIVEL' || (statusItem === 'EM_DESLOCAMENTO' && statusColeta === 'PENDENTE');
														const isEmColeta = statusItem === 'EM_DESLOCAMENTO' && statusColeta === 'EM_COLETA';
														const isEmRotaFinalizar =
															statusItem === 'EM_DESLOCAMENTO' && statusColeta === 'CONCLUIDO' && !!entregaEmTransito;
														const isEmRotaIniciar =
															statusItem === 'EM_DESLOCAMENTO' && statusColeta === 'CONCLUIDO' && !!entregaPendenteIniciar;
														const isConcluido = statusItem === 'CONCLUIDO';

														const handleIniciarColeta = () => {
															if (statusItem === 'DISPONIVEL' && fluxoItem.carga) {
																setActionModal({
																	type: 'iniciarItem',
																	itemId: fluxoItem.id,
																	nextAction: {
																		type: 'iniciarColeta',
																		cargaId: fluxoItem.carga.id_carga,
																	},
																});
															} else if (fluxoItem.carga) {
																setActionModal({
																	type: 'iniciarColeta',
																	cargaId: fluxoItem.carga.id_carga,
																});
															}
														};

														const loadingIniciarColeta =
															(iniciarItemMutation.isPending && iniciarItemMutation.variables?.itemId === fluxoItem.id) ||
															(iniciarColetaMutation.isPending &&
																iniciarColetaMutation.variables?.cargaId === fluxoItem.carga?.id_carga);

														if (isConcluido) return null;

														if (isEmRotaIniciar && entregaPendenteIniciar) {
															// Botão "Iniciar rota" removido do nível da carga pois o CargoDeliveriesList já o exibe por entrega
															return null;
														}

														if (isEmRotaFinalizar && entregaEmTransito) {
															// Botão "Finalizar rota" removido do nível da carga pois o CargoDeliveriesList já o exibe por entrega
															return null;
														}

														if (isEmColeta && fluxoItem.carga) {
															return (
																<div className='flex flex-wrap gap-2'>
																	<TripFlowActionButton
																		label='Finalizar coleta'
																		canDo={fluxoItem.carga.canFinishColeta}
																		blockedReason={fluxoItem.carga.blockedReasonColeta}
																		loading={
																			finalizarColetaMutation.isPending &&
																			finalizarColetaMutation.variables?.cargaId === fluxoItem.carga!.id_carga
																		}
																		onClick={() =>
																			setActionModal({
																				type: 'finalizarColeta',
																				cargaId: fluxoItem.carga!.id_carga,
																			})
																		}
																	/>
																</div>
															);
														}

														if (isAgendada) {
															const canDo = fluxoItem.canStart || (fluxoItem.carga?.canStartColeta ?? false);
															const blockedReason = fluxoItem.blockedReason ?? fluxoItem.carga?.blockedReasonColeta ?? null;
															return (
																<div className='flex flex-wrap gap-2'>
																	<TripFlowActionButton
																		label='Iniciar coleta'
																		canDo={!!canDo}
																		blockedReason={blockedReason}
																		loading={!!loadingIniciarColeta}
																		onClick={handleIniciarColeta}
																	/>
																</div>
															);
														}

														return null;
													})()}
													{/* CargoDeliveriesList removido: status e botões agora estão dentro de cada SortableDeliveryItem */}
												</>
											)}
										</div>
									)}
									{/* Fallback: sem fluxo ou carregando — botões legados (Torre de Controle) */}
									{!fluxoItem && isLoad && associatedLoad && activeTripLoad?.id_carga === associatedLoad.id && (
										<div className='mb-6'>
											<CargaActionButtons
												carga={associatedLoad}
												viagem={trip}
												isActiveCarga={true}
												isDeslocamentoVazio={false}
												onStatusUpdate={() => {
													queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
													queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
													queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
													queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
												}}
											/>
										</div>
									)}
									{!fluxoItem &&
										!isLoad &&
										effectiveAssociatedLoad &&
										effectiveAssociatedLoad.ds_status !== 'ENTREGUE' &&
										activeTripLoad?.id === leg.id && (
											<div className='mb-6'>
												<CargaActionButtons
													carga={effectiveAssociatedLoad as Carga}
													viagem={trip}
													isActiveCarga={true}
													isDeslocamentoVazio={true}
													onStatusUpdate={() => {
														queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
														queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
														queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
														queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
													}}
												/>
											</div>
										)}
									{/* TIMELINE CONTAINER */}
									{(() => {
										const timelineDocs = isLoad && associatedLoad ? getCargaDocumentos(associatedLoad) : [];
										const timelineDeliveries = isLoad && associatedLoad ? getCargaDeliveries(associatedLoad, timelineDocs) : [];
										const showOriginNode = !isLoad || !associatedLoad || timelineDeliveries.length === 0;

										return (
											<div className='relative space-y-6 pl-4 md:pl-8'>
												{/* Vertical Line - centralizada nos círculos de 24px (h-6 w-6) */}
												<div className='bg-muted absolute top-3 bottom-3 left-[11px] w-0.5 md:left-[42px]'></div>

												{/* --- ORIGIN NODE (oculto quando há entregas; origem integrada no primeiro card) --- */}
												{showOriginNode && (
													<div className='relative flex items-start gap-4'>
														{/* Dot */}
														<div
															className={`border-background relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-4 shadow-sm ${getDotBgClass(legBorderStatus)}`}
														>
															<div className='bg-card h-2 w-2 rounded-full'></div>
														</div>

														<TimelineNodeOrigin borderStatus={legBorderStatus}>
															<div className='text-muted-foreground mb-1 text-[10px] font-black tracking-widest uppercase'>
																Origem
															</div>
															<div className='text-foreground text-lg leading-tight font-black'>{leg.originCity}</div>
														</TimelineNodeOrigin>
													</div>
												)}

												{/* --- ENTREGAS (DELIVERIES) --- */}
												{isLoad && associatedLoad && timelineDeliveries.length > 0 && (
													<DndContext
														sensors={sensors}
														collisionDetection={closestCenter}
														onDragEnd={(event) => handleDragEnd(event, associatedLoad.id, timelineDeliveries)}
													>
														<SortableContext
															items={timelineDeliveries.map((d) => d.id)}
															strategy={verticalListSortingStrategy}
														>
															{timelineDeliveries.map((del, index) => (
																<SortableDeliveryItem
																	key={del.id}
																	delivery={del}
																	index={index}
																	tripId={trip.id}
																	legId={leg.id}
																	cargaId={associatedLoad.id}
																	isFirstInLoad={index === 0}
																	expandedDeliveryId={expandedDeliveryId}
																	toggleDelivery={toggleDelivery}
																	onFinalizeDelivery={(delivery: DeliveryLike) => {
																		if (delivery.isLegacy || !associatedLoad?.id) {
																			toast.error('Finalização disponível apenas para entregas reais.');
																			return;
																		}
																		setEntregaConclusaoModal({
																			delivery,
																			loadId: associatedLoad.id,
																		});
																	}}
																	onOpenAddDocs={(delivery: DeliveryLike) => {
																		if (delivery.isLegacy || !associatedLoad?.id) {
																			toast.error('Adição disponível apenas para entregas reais.');
																			return;
																		}
																		setActiveEntregaDocs({
																			entregaId: delivery.id,
																			loadId: associatedLoad.id,
																			existingDocIds: delivery.documents.map((d) => d.id),
																			destinationLabel: delivery.destinationCity,
																		});
																		setSelectedEntregaDocIds(new Set());
																		setEntregaDocsFilter('');
																	}}
																	isFinalizing={finalizingEntregaId === del.id}
																/>
															))}
														</SortableContext>
													</DndContext>
												)}

												{/* --- DESTINATION NODE --- */}
												{isLoad ? (
													<div className='relative flex items-start gap-4'>
														<div
															className={`border-background relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-4 shadow-sm ${getDotBgClass(legBorderStatus)}`}
														>
															<div className='bg-card h-2 w-2 rounded-full'></div>
														</div>

														<TimelineNodeDest borderStatus={legBorderStatus}>
															<div className='text-muted-foreground mb-1 text-[10px] font-black tracking-widest uppercase'>
																{(() => {
																	if (!associatedLoad) return 'Destino';
																	const deliveries = getCargaDeliveries(
																		associatedLoad,
																		getCargaDocumentos(associatedLoad),
																	);
																	return deliveries.length > 1 ? 'Destinos' : 'Destino';
																})()}
															</div>
															<div className='text-foreground text-lg leading-tight font-black'>
																{associatedLoad?.sis_cidade_destino?.ds_city || 'Destino não informado'} -{' '}
																{associatedLoad?.sis_cidade_destino?.js_uf?.ds_uf || ''}
															</div>
															{leg.destinationAddress && (
																<div className='text-muted-foreground mt-0.5 text-sm font-medium'>
																	{leg.destinationAddress}
																</div>
															)}
															{(() => {
																if (!associatedLoad) return null;
																const deliveries = getCargaDeliveries(associatedLoad, getCargaDocumentos(associatedLoad));
																if (deliveries.length > 1) {
																	return (
																		<div className='text-muted-foreground mt-2 text-xs'>
																			+ {deliveries.length - 1} destino(s) adicional(is)
																		</div>
																	);
																}
																return null;
															})()}
														</TimelineNodeDest>
													</div>
												) : (
													/* EMPTY LEG DESTINATION */
													<div className='relative flex items-start gap-4'>
														<div
															className={`border-background relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-4 shadow-sm ${getDotBgClass(legBorderStatus)}`}
														>
															<div className='bg-card h-2 w-2 rounded-full'></div>
														</div>
														<div
															className={`bg-card relative flex-1 overflow-hidden rounded-xl border p-4 transition-colors ${getBorderClasses(legBorderStatus)}`}
														>
															<div
																className={`absolute top-0 left-0 h-full w-[3px] rounded-l-xl ${getStripeBgClass(legBorderStatus)}`}
																aria-hidden
															/>
															<div className='pl-3'>
																<div className='text-muted-foreground mb-1 text-[10px] font-black tracking-widest uppercase'>
																	Destino (Deslocamento)
																</div>
																<div className='text-foreground/90 text-lg leading-tight font-black'>
																	{leg.destinationCity}
																</div>
																<div className='text-muted-foreground mt-1 text-xs italic'>Trajeto sem carga comercial</div>
															</div>
														</div>
													</div>
												)}

												{/* Botão vincular documentos */}
												{isLoad && (
													<div className='relative flex items-start gap-4'>
														<div className='relative z-10 w-6'></div>
														<button
															disabled={trip.ds_status === 'CONCLUIDA' || trip.status === 'Completed'}
															onClick={() => {
																setSelectedLoadId(associatedLoad?.id || null);
																setSelectedDocIds(new Set());
																setFilterText('');
																setShowNewLoadWizard(true);
																setNewLoadStep('DOCUMENTOS');
															}}
															className='border-border bg-muted/60 text-foreground hover:bg-muted flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold tracking-widest uppercase shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50'
														>
															<Plus size={12} />
															<span>Vincular documentos (CT-e / NF-e)</span>
														</button>
													</div>
												)}
											</div>
										);
									})()}
								</LegCard>
							);
						})}
					</div>
				)}

				{/* --- ACTION BUTTONS FOR NEW LEG --- */}

				{!activeLegForm ? (
					isInline ? (
						<div className='bg-muted/40 sticky right-0 bottom-0 left-0 z-30 pt-4'>
							<div className='border-border bg-card grid grid-cols-1 gap-4 rounded-xl border-t p-4 shadow-md md:grid-cols-2'>
								{/* Linha 1 */}
								<Button
									disabled={isConcluida}
									onClick={openNewLoadWizard}
									variant='secondary'
									className='border-border bg-muted/60 text-foreground hover:bg-muted h-auto w-full justify-center gap-2 rounded-xl border py-4 text-xs font-black tracking-widest uppercase shadow-sm'
								>
									<Plus size={16} /> Nova Carga
								</Button>
								<Button
									onClick={() => handleOpenLegForm('EMPTY')}
									disabled={isConcluida}
									variant='secondary'
									className='border-border bg-muted/60 text-foreground hover:bg-muted h-auto w-full justify-center gap-2 rounded-xl border py-4 text-xs font-black tracking-widest uppercase shadow-sm'
								>
									<Route size={16} /> Deslocamento Vazio
								</Button>
								{/* Linha 2: Iniciar Viagem | Finalizar Viagem */}
								<Button
									disabled={!isPlanejada}
									onClick={() => setIniciarViagemModalOpen(true)}
									variant='secondary'
									className='border-border bg-muted/60 text-foreground hover:bg-muted h-auto w-full justify-center gap-2 rounded-xl border py-4 text-xs font-black tracking-widest uppercase shadow-sm disabled:opacity-50'
								>
									<Play size={16} /> Iniciar Viagem
								</Button>
								{pendenciasFinalizar.podeFinalizar ? (
									<Button
										disabled={!isEmViagemOuColeta || isConcluida}
										onClick={() => setFinalizarViagemModalOpen(true)}
										variant='secondary'
										className='border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200 dark:hover:bg-emerald-500/30 h-auto w-full justify-center gap-2 rounded-xl border py-4 text-xs font-black tracking-widest uppercase shadow-sm disabled:opacity-50'
									>
										<CheckCircle size={16} /> Finalizar Viagem
									</Button>
								) : (
									<Tooltip>
										<TooltipTrigger asChild>
											<span className='inline-block w-full'>
												<Button
													disabled
													variant='secondary'
													className='border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200 h-auto w-full justify-center gap-2 rounded-xl border py-4 text-xs font-black tracking-widest uppercase shadow-sm cursor-not-allowed opacity-60'
												>
													<CheckCircle size={16} /> Finalizar Viagem
												</Button>
											</span>
										</TooltipTrigger>
										<TooltipContent side='top' className='max-w-sm'>
											{pendenciasFinalizar.mensagemTooltip}
										</TooltipContent>
									</Tooltip>
								)}
							</div>
						</div>
					) : (
						<div className='pointer-events-none sticky right-0 bottom-0 left-0 z-40'>
							<div className='pointer-events-auto mx-auto max-w-7xl px-4 pb-0'>
								<div className='border-border/70 bg-card grid grid-cols-1 gap-4 rounded-xl border-t p-4 shadow-md md:grid-cols-2'>
									{/* Linha 1 */}
									<Button
										disabled={isConcluida}
										onClick={openNewLoadWizard}
										variant='secondary'
										className='border-border bg-muted/60 text-foreground hover:bg-muted h-auto w-full justify-center gap-2 rounded-xl border py-4 text-xs font-black tracking-widest uppercase shadow-sm'
									>
										<Plus size={16} /> Nova Carga
									</Button>
									<Button
										onClick={() => handleOpenLegForm('EMPTY')}
										disabled={isConcluida}
										variant='secondary'
										className='border-border bg-muted/60 text-foreground hover:bg-muted h-auto w-full justify-center gap-2 rounded-xl border py-4 text-xs font-black tracking-widest uppercase shadow-sm'
									>
										<Route size={16} /> Deslocamento Vazio
									</Button>
									{/* Linha 2: Iniciar Viagem | Finalizar Viagem */}
									<Button
										disabled={!isPlanejada}
										onClick={() => setIniciarViagemModalOpen(true)}
										variant='secondary'
										className='border-border bg-muted/60 text-foreground hover:bg-muted h-auto w-full justify-center gap-2 rounded-xl border py-4 text-xs font-black tracking-widest uppercase shadow-sm disabled:opacity-50'
									>
										<Play size={16} /> Iniciar Viagem
									</Button>
									{pendenciasFinalizar.podeFinalizar ? (
										<Button
											disabled={!isEmViagemOuColeta || isConcluida}
											onClick={() => setFinalizarViagemModalOpen(true)}
											variant='secondary'
											className='border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200 dark:hover:bg-emerald-500/30 h-auto w-full justify-center gap-2 rounded-xl border py-4 text-xs font-black tracking-widest uppercase shadow-sm disabled:opacity-50'
										>
											<CheckCircle size={16} /> Finalizar Viagem
										</Button>
									) : (
										<Tooltip>
											<TooltipTrigger asChild>
												<span className='inline-block w-full'>
													<Button
														disabled
														variant='secondary'
														className='border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200 h-auto w-full justify-center gap-2 rounded-xl border py-4 text-xs font-black tracking-widest uppercase shadow-sm cursor-not-allowed opacity-60'
													>
														<CheckCircle size={16} /> Finalizar Viagem
													</Button>
												</span>
											</TooltipTrigger>
											<TooltipContent side='top' className='max-w-sm'>
												{pendenciasFinalizar.mensagemTooltip}
											</TooltipContent>
										</Tooltip>
									)}
								</div>
							</div>
						</div>
					)
				) : (
					<div className='animate-in fade-in slide-in-from-bottom-4 border-border bg-card mt-6 min-w-0 rounded-xl border p-6 shadow-lg'>
						<div className='mb-4 flex items-center justify-between gap-3'>
							<h3 className='text-foreground text-lg font-bold'>
								{activeLegForm === 'LOAD' ? 'Nova Carga' : 'Novo Deslocamento Vazio'}
							</h3>
							<Button
								variant='ghost'
								size='icon'
								onClick={() => setActiveLegForm(null)}
								className='text-muted-foreground hover:text-foreground'
								aria-label='Fechar'
							>
								<X size={20} />
							</Button>
						</div>
						<div className='mb-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
							{/* Origin Fields (Common) */}
							{/* <div>
								<label className='mb-1 block text-xs font-medium text-foreground/90'>Cidade Origem</label>
								<input
									className='w-full rounded border border-input px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
									value={newLeg.originCity}
									onChange={(e) => setNewLeg({ ...newLeg, originCity: e.target.value })}
									placeholder='Digite a cidade de origem...'
								/>
							</div>
							<div>
								<label className='mb-1 block text-xs font-medium text-foreground/90'>Endereço Origem</label>
								<input
									className='w-full rounded border border-input px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
									value={newLeg.originAddress}
									onChange={(e) => setNewLeg({ ...newLeg, originAddress: e.target.value })}
									placeholder='Endereço ou referência...'
								/>
							</div> */}

							{/* Tipo de carroceria (Only for Load) */}
							{activeLegForm === 'LOAD' && (
								<div className='md:col-span-2'>
									<label className='text-foreground/90 mb-1 block text-xs font-medium'>Tipo de Carroceria</label>
									<div className='relative'>
										<select
											className='border-input bg-card w-full appearance-none rounded border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
											value={newLeg.vehicleTypeReq}
											onChange={(e) => setNewLeg({ ...newLeg, vehicleTypeReq: e.target.value })}
										>
											<option value=''>Selecione o Tipo...</option>
											<div>
												<Card></Card>
											</div>{' '}
											{BODY_TYPE_OPTIONS.map((opt) => (
												<option key={opt} value={opt}>
													{opt}
												</option>
											))}
										</select>
										<div className='text-muted-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center px-2'>
											<ChevronDown size={14} />
										</div>
									</div>
								</div>
							)}

							{/* Empty Leg Specific (Destination Required) */}
							{activeLegForm === 'EMPTY' && (
								<div className='md:col-span-2'>
									{/* Origem e Destino */}
									<div className='grid grid-cols-2 gap-4'>
										<CitySearch
											value={deslVazio.cidadeOrigem}
											onChange={(city) => setDeslVazio({ ...deslVazio, cidadeOrigem: city })}
											cities={cities ?? []}
											label='Origem'
											placeholder='Selecione a origem...'
											required
										/>
										<CitySearch
											value={deslVazio.cidadeDestino}
											onChange={(city) => setDeslVazio({ ...deslVazio, cidadeDestino: city })}
											cities={cities ?? []}
											label='Destino (Vazio)'
											placeholder='Selecione o destino...'
											required
										/>
									</div>
									<label className='mt-3 flex cursor-pointer items-center gap-2'>
										<input
											type='checkbox'
											checked={deslVazio.carroceriaDesacoplada}
											onChange={(e) => setDeslVazio({ ...deslVazio, carroceriaDesacoplada: e.target.checked })}
											className='border-input h-4 w-4 rounded'
										/>
										<span className='text-foreground/90 text-sm'>Carroceria desacoplada</span>
									</label>
									<p className='text-muted-foreground mt-1 text-xs'>
										Para trajetos vazios, origem e destino devem ser informados.
									</p>
								</div>
							)}
						</div>
						<div className='border-border/70 flex flex-wrap items-center justify-end gap-3 border-t pt-4'>
							<Button
								type='button'
								variant='outline'
								onClick={() => setActiveLegForm(null)}
								className='border-border rounded-xl px-6 py-2.5 text-xs font-black tracking-widest uppercase'
							>
								Cancelar
							</Button>
							<Button
								type='button'
								onClick={handleSaveLeg}
								className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-6 py-2.5 text-xs font-black tracking-widest uppercase shadow-sm'
							>
								{activeLegForm === 'LOAD' ? 'Criar Carga' : 'Criar Deslocamento'}
							</Button>
						</div>
					</div>
				)}

				{/* NEW LOAD WIZARD (novo fluxo) */}
				{showNewLoadWizard && (
					<div className='fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4'>
						<div className='bg-card relative flex h-[75vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl shadow-2xl'>
							<div className='border-border/70 flex shrink-0 items-center justify-between border-b p-4'>
								<div>
									<h3 className='text-foreground text-lg font-bold'>Nova Carga (dentro da viagem)</h3>
									<p className='text-muted-foreground mt-1 text-xs'>Selecione a carga, os documentos e configure as entregas.</p>
								</div>
								<Button
									variant='ghost'
									size='icon'
									onClick={() => setShowNewLoadWizard(false)}
									className='text-muted-foreground hover:text-foreground'
									aria-label='Fechar'
								>
									<X size={20} />
								</Button>
							</div>

							<div className='border-border/70 bg-muted/40 shrink-0 border-b p-4'>
								<div className='flex gap-2'>
									{(['CARGA', 'DOCUMENTOS', 'ENTREGAS'] as const).map((step) => (
										<span
											key={step}
											className={`rounded-full px-3 py-1 text-[10px] font-black tracking-widest uppercase ${
												newLoadStep === step
													? 'border-primary/40 bg-primary/10 text-primary-foreground border'
													: 'border-border bg-muted/80 text-muted-foreground dark:text-foreground/80 border'
											}`}
										>
											{step}
										</span>
									))}
								</div>
							</div>

							<div className='min-h-0 flex-1 overflow-y-auto p-4 pb-20'>
								{newLoadStep === 'CARGA' && (
									<div className='space-y-4'>
										<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4'>
											<div className='relative min-w-0 flex-1'>
												<Search className='text-muted-foreground absolute top-1/2 left-3 z-10 -translate-y-1/2' size={16} />
												<Input
													type='text'
													placeholder='Buscar carga por cliente/origem/data...'
													className='border-input bg-background focus-visible:ring-ring w-full rounded-lg border py-3 pr-4 pl-10 text-sm focus-visible:ring-2'
													value={loadSearch}
													onChange={(e) => setLoadSearch(e.target.value)}
												/>
											</div>
											<Button
												onClick={() => setShowCreateCargaModal(true)}
												variant='secondary'
												className='border-border bg-muted/60 text-foreground hover:bg-muted shrink-0 rounded-xl border px-4 py-3 text-xs font-black tracking-widest uppercase shadow-sm'
											>
												<Plus size={14} className='mr-1.5' />
												Nova carga
											</Button>
										</div>

										{availableLoads.length === 0 || availableLoads.every((l) => l.ds_status === 'ENTREGUE') ? (
											<div className='border-border bg-muted/40 rounded-xl border-2 border-dashed p-8 text-center'>
												<p className='text-muted-foreground mb-3 text-sm font-medium'>Nenhuma carga disponível.</p>
												<Button
													onClick={() => setShowCreateCargaModal(true)}
													variant='secondary'
													className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-4 py-2 text-xs font-black tracking-widest uppercase shadow-sm'
												>
													<Plus size={14} className='mr-1.5' />
													Criar carga
												</Button>
											</div>
										) : (
											(() => {
												const q = loadSearch.toLowerCase().trim();
												const filtered = availableLoads
													.filter((l) => l.ds_status !== 'ENTREGUE')
													.filter((l) => {
														if (!q) return true;
														const clientName = (l.fis_clientes ?? l.tms_clientes)?.ds_nome || l.ds_nome || '';
														const originCity = l.sis_cidade_origem?.ds_city || '';
														const collectionDate = l.dt_coleta_inicio || '';
														return (
															clientName.toLowerCase().includes(q) ||
															originCity.toLowerCase().includes(q) ||
															collectionDate.toLowerCase().includes(q)
														);
													})
													.sort((a, b) => {
														const dateA = new Date(a.dt_coleta_inicio || a.dt_created || 0).getTime();
														const dateB = new Date(b.dt_coleta_inicio || b.dt_created || 0).getTime();
														return dateA - dateB;
													});

												if (filtered.length === 0) {
													return <div className='text-muted-foreground p-8 text-center italic'>Nenhuma carga encontrada.</div>;
												}

												return filtered.map((l) => {
													const isSelected = selectedLoadId === l.id;
													return (
														<div
															key={l.id}
															onClick={() => setSelectedLoadId(l.id)}
															className={`mb-2 cursor-pointer rounded-lg border p-4 transition-all ${
																isSelected
																	? 'border-primary/50 bg-primary/10 ring-primary ring-1'
																	: 'border-border bg-card hover:border-border'
															}`}
														>
															<div className='flex items-start justify-between gap-4'>
																<div>
																	<div className='flex items-center gap-2'>
																		<span
																			className={`flex h-4 w-4 items-center justify-center rounded-full border ${
																				isSelected ? 'border-primary bg-primary' : 'border-input'
																			}`}
																		>
																			{isSelected && <Check size={10} className='text-primary-foreground' />}
																		</span>
																		<span className='text-foreground text-sm font-black tracking-widest uppercase'>
																			{(l.fis_clientes ?? l.tms_clientes)?.ds_nome || l.ds_nome}
																		</span>
																	</div>
																	<div className='text-muted-foreground mt-1 ml-6 flex items-center gap-1 text-xs'>
																		<MapPin size={10} /> {l.sis_cidade_origem?.ds_city}
																	</div>
																	<div className='text-muted-foreground mt-1 ml-6 text-xs'>
																		{l.dt_coleta_inicio
																			? new Date(l.dt_coleta_inicio).toLocaleString('pt-BR')
																			: 'Sem data'}
																	</div>
																</div>
																<div className='text-right'>
																	<span className='border-border bg-muted/40 text-muted-foreground rounded border px-2 py-1 text-[10px] font-black uppercase'>
																		{l.ds_status}
																	</span>
																</div>
															</div>
														</div>
													);
												});
											})()
										)}
										{availableLoads.length > 0 && availableLoads.some((l) => l.ds_status !== 'ENTREGUE') && (
											<div className='border-border bg-muted/40 rounded-xl border-2 border-dashed p-2 text-center'>
												<Button onClick={() => setShowCreateCargaModal(true)} className='uppercase' variant='outline'>
													<Plus size={12} /> nova carga
												</Button>
											</div>
										)}
									</div>
								)}
								{newLoadStep === 'DOCUMENTOS' && (
									<div className='space-y-4'>
										<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
											<MonthYearSelector
												showClearButton={false}
												placeholder='Competência'
												className='!border-input !bg-card hover:!bg-card !h-auto w-full !rounded-lg !border !px-3 !py-3 !text-sm !font-bold focus:!ring-2 focus:!ring-blue-500 focus:!outline-none'
												selected={competencia}
												onSelect={(date) => date && setCompetencia(date)}
											/>
											{selectedDocIds.size > 0 && (
												<div className='flex flex-col items-end justify-center gap-0.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2'>
													<p className='text-sm font-bold text-blue-900 dark:text-blue-100'>
														{selectedDocIds.size} documento(s) selecionado(s)
													</p>
													<p className='text-xs text-blue-700 dark:text-blue-300'>
														{resumoSelecaoDocs.cteProprio} CT-e próprio(s), {resumoSelecaoDocs.dfeRelacionado} DF-e
														relacionado(s)
														{resumoSelecaoDocs.pendente > 0 ? `, ${resumoSelecaoDocs.pendente} sem vínculo` : ''}
													</p>
												</div>
											)}
										</div>
										{selectedLoadId && (
											<p className='text-muted-foreground text-xs'>
												Documentos já anexados a esta carga aparecem no topo, selecionados. Ajuste a seleção e clique em
												&quot;Gerar entregas&quot;.
											</p>
										)}
										<DocumentSelectTwoColumns
											documents={sortedFilteredDocs}
											selectedIds={selectedDocIds}
											filterText={filterText}
											onFilterChange={setFilterText}
											onToggle={toggleDocSelection}
											isLoading={isLoadingDocs}
											isError={isErrorDocs}
											errorMessage={errorDocs instanceof Error ? errorDocs.message : undefined}
											onRetry={() => refetchDocs()}
											variant='compact'
										/>
									</div>
								)}{' '}
								{newLoadStep === 'ENTREGAS' && (
									<EntregasPreviewEdit entregas={entregasDraft} cities={cidadesData?.cities || []} onChange={setEntregasDraft} />
								)}
							</div>

							<div className='border-border/70 bg-muted/40 sticky bottom-0 z-20 flex shrink-0 justify-between gap-3 border-t p-4'>
								<div>
									{newLoadStep !== 'CARGA' && (
										<Button
											type='button'
											variant='ghost'
											onClick={() => setNewLoadStep(newLoadStep === 'ENTREGAS' ? 'DOCUMENTOS' : 'CARGA')}
											className='rounded-lg px-4 py-2 text-sm font-medium'
										>
											Voltar
										</Button>
									)}
								</div>
								<div className='flex flex-wrap gap-2'>
									<Button
										type='button'
										variant='secondary'
										onClick={() => setShowNewLoadWizard(false)}
										className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-4 py-2 text-xs font-black tracking-widest uppercase shadow-sm'
									>
										Cancelar
									</Button>
									{newLoadStep === 'CARGA' && (
										<Button
											onClick={handleAdvanceFromCarga}
											variant='secondary'
											className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-6 py-2 text-xs font-black tracking-widest uppercase shadow-sm'
										>
											Continuar
										</Button>
									)}
									{newLoadStep === 'DOCUMENTOS' && (
										<Button
											onClick={handleConfirmDocuments}
											variant='secondary'
											className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-6 py-2 text-xs font-black tracking-widest uppercase shadow-sm'
										>
											Gerar entregas
										</Button>
									)}
									{newLoadStep === 'DOCUMENTOS' && (
										<Button
											type='button'
											variant='secondary'
											onClick={handleSkipDocuments}
											className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-6 py-2 text-xs font-black tracking-widest uppercase shadow-sm'
										>
											Criar sem documentos
										</Button>
									)}
									{newLoadStep === 'ENTREGAS' && (
										<Button
											type='button'
											variant='secondary'
											onClick={handleConfirmEntregas}
											disabled={criarEntregasMutation.isPending}
											className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-6 py-2 text-xs font-black tracking-widest uppercase shadow-sm disabled:opacity-50'
										>
											{criarEntregasMutation.isPending ? 'Salvando...' : 'Salvar entregas'}
										</Button>
									)}
								</div>
							</div>
						</div>
					</div>
				)}
				<CreateLoadModal
					isOpen={showCreateCargaModal}
					onClose={() => setShowCreateCargaModal(false)}
					onSaveLoad={() => undefined}
					onCreated={async (carga) => {
						setShowCreateCargaModal(false);
						// Criado pelos detalhes da viagem: vincular à viagem atual
						if (trip?.id) {
							try {
								const nextSequencia = (trip?.js_viagens_cargas?.length ?? 0) + 1;
								await vincularCargaAViagem(trip.id, { id_carga: carga.id, nr_sequencia: nextSequencia });
								queryClient.invalidateQueries({ queryKey: ['get-viagem', trip.id] });
								queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', trip.id] });
								toast.success('Carga criada e vinculada à viagem.');
								// Fecha o wizard "Nova Carga" e volta para os detalhes da viagem
								setShowNewLoadWizard(false);
								setSelectedLoadId(null);
								setNewLoadStep('CARGA');
							} catch (err) {
								toast.error(err instanceof Error ? err.message : 'Erro ao vincular carga à viagem.');
								setSelectedLoadId(carga.id);
								setNewLoadStep('CARGA');
							}
						} else {
							toast.success('Carga criada com sucesso!');
							setSelectedLoadId(carga.id);
							setShowNewLoadWizard(true);
							setNewLoadStep('CARGA');
						}
						queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
						queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
						queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
						queryClient.invalidateQueries({ queryKey: ['documentos-vincular'] });
					}}
				/>

				{/* Modal: Concluir entrega (agora ou informar data/hora) */}
				{entregaConclusaoModal && (
					<ModalConclusaoDataHora
						open={!!entregaConclusaoModal}
						onOpenChange={(open) => {
							if (!open) setEntregaConclusaoModal(null);
						}}
						title='Concluir entrega'
						isLoading={
							finalizingEntregaId === entregaConclusaoModal.delivery.id ||
							(finalizarEntregaSimplesMutation.isPending &&
								(finalizarEntregaSimplesMutation.variables as { entregaId: string })?.entregaId === entregaConclusaoModal.delivery.id)
						}
						onConfirm={async (dtIso) => {
							const { delivery, loadId } = entregaConclusaoModal;
							setFinalizingEntregaId(delivery.id);
							const toastId = toast.loading('Finalizando entrega...');
							try {
								// POST finalizar retorna o fluxo atualizado; atualiza o cache para a UI refletir na hora
								const fluxoAtualizado = await finalizarEntrega(delivery.id, dtIso ? { dt_entrega: dtIso } : undefined);
								if (trip?.id && fluxoAtualizado) {
									queryClient.setQueryData(['viagem-fluxo', trip.id], fluxoAtualizado);
								}
								queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
								queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
								queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
								queryClient.invalidateQueries({ queryKey: ['get-carga', loadId] });
								queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', trip?.id] });
								if (trip?.id) {
									queryClient.invalidateQueries({ queryKey: ['get-viagem', trip.id] });
								}
								await queryClient.refetchQueries({ queryKey: ['viagem-fluxo', trip?.id] });
								if (loadId) {
									await queryClient.refetchQueries({ queryKey: ['get-carga', loadId] });
								}
								toast.success('Entrega finalizada com sucesso!', { id: toastId });
							} catch (error) {
								toast.error((error as Error)?.message || 'Erro ao finalizar entrega.', { id: toastId });
							} finally {
								setFinalizingEntregaId(null);
								setEntregaConclusaoModal(null);
							}
						}}
					/>
				)}

				{/* Modal: Encerrar carga (finaliza carga + todas entregas) */}
				{encerrarCargaModal && (
					<ModalConclusaoDataHora
						open={!!encerrarCargaModal}
						onOpenChange={(open) => !open && setEncerrarCargaModal(null)}
						title='Finalizar carga (finaliza todas as entregas)'
						isLoading={finalizarCargaMutation.isPending}
						onConfirm={async (dtIso) => {
							await finalizarCargaMutation.mutateAsync({
								cargaId: encerrarCargaModal.cargaId,
								comprovante: dtIso ? { dt_conclusao: dtIso } : undefined,
							});
							queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
							queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
							queryClient.invalidateQueries({ queryKey: ['get-carga', encerrarCargaModal.cargaId] });
							queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
							queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
							if (trip?.id) {
								queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', trip.id] });
								queryClient.invalidateQueries({ queryKey: ['get-viagem', trip.id] });
							}
							setEncerrarCargaModal(null);
						}}
					/>
				)}

				{/* Modal: Iniciar viagem — concluir agora ou informar data/hora */}
				<ModalConclusaoDataHora
					open={iniciarViagemModalOpen}
					onOpenChange={setIniciarViagemModalOpen}
					title='Iniciar viagem'
					isLoading={false}
					onConfirm={async () => {
						await Promise.resolve(onUpdateStatus(trip.id, 'EM_VIAGEM'));
						queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', trip?.id] });
						queryClient.invalidateQueries({ queryKey: ['get-viagem', trip?.id] });
						setIniciarViagemModalOpen(false);
					}}
				/>

				{/* Modal: Finalizar viagem — concluir agora ou informar data/hora */}
				<ModalConclusaoDataHora
					open={finalizarViagemModalOpen}
					onOpenChange={setFinalizarViagemModalOpen}
					title='Finalizar viagem'
					isLoading={false}
					onConfirm={async () => {
						await Promise.resolve(onUpdateStatus(trip.id, 'CONCLUIDA'));
						queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', trip?.id] });
						queryClient.invalidateQueries({ queryKey: ['get-viagem', trip?.id] });
						setFinalizarViagemModalOpen(false);
					}}
				/>

				{/* Modal: ações da esteira (iniciar/finalizar item, coleta, iniciar rota) — agora ou informar data/hora */}
				{actionModal && (
					<ModalConclusaoDataHora
						open={!!actionModal}
						onOpenChange={(open) => {
							if (!open) setActionModal(null);
						}}
						title={
							actionModal.type === 'iniciarItem'
								? 'Iniciar item'
								: actionModal.type === 'finalizarItem'
									? 'Concluir deslocamento'
									: actionModal.type === 'iniciarColeta'
										? 'Iniciar coleta'
										: actionModal.type === 'finalizarColeta'
											? 'Finalizar coleta'
											: 'Iniciar rota'
						}
						isLoading={
							(actionModal.type === 'iniciarItem' &&
								iniciarItemMutation.isPending &&
								iniciarItemMutation.variables?.itemId === actionModal.itemId) ||
							(actionModal.type === 'finalizarItem' &&
								finalizarItemMutation.isPending &&
								finalizarItemMutation.variables?.itemId === actionModal.itemId) ||
							(actionModal.type === 'iniciarColeta' &&
								iniciarColetaMutation.isPending &&
								iniciarColetaMutation.variables?.cargaId === actionModal.cargaId) ||
							(actionModal.type === 'finalizarColeta' &&
								finalizarColetaMutation.isPending &&
								finalizarColetaMutation.variables?.cargaId === actionModal.cargaId) ||
							(actionModal.type === 'iniciarEntrega' &&
								iniciarEntregaMutation.isPending &&
								iniciarEntregaMutation.variables?.entregaId === actionModal.entregaId)
						}
						onConfirm={async (dtIso) => {
							const isIniciarItemComColeta =
								actionModal.type === 'iniciarItem' && actionModal.nextAction?.type === 'iniciarColeta';
							const toastId = toast.loading(
								actionModal.type === 'iniciarItem'
									? isIniciarItemComColeta
										? 'Iniciando item e coleta...'
										: 'Iniciando item...'
									: actionModal.type === 'finalizarItem'
										? 'Finalizando deslocamento...'
										: actionModal.type === 'iniciarColeta'
											? 'Iniciando coleta...'
											: actionModal.type === 'finalizarColeta'
												? 'Finalizando coleta...'
												: 'Iniciando rota...',
							);
							try {
								if (actionModal.type === 'iniciarItem' && actionModal.itemId) {
									await iniciarItemMutation.mutateAsync({
										itemId: actionModal.itemId,
										dt_inicio: dtIso ?? undefined,
									});
									// Sincronizar status da viagem para EM_COLETA (Torre de Controle e tabelas)
									if (trip?.id) await updateViagemStatusMutation.mutateAsync('EM_COLETA');
									if (actionModal.nextAction?.type === 'iniciarColeta' && actionModal.nextAction.cargaId) {
										// Uma única confirmação: item + coleta em sequência (carga já vai para "Em coleta" laranja)
										await iniciarColetaMutation.mutateAsync({
											cargaId: actionModal.nextAction.cargaId,
											dt_coleta_inicio: dtIso ?? undefined,
										});
										toast.success('Coleta iniciada.', { id: toastId });
									} else {
										toast.success('Item iniciado.', { id: toastId });
									}
									if (!actionModal.nextAction) {
										// Sem nextAction: fechar e invalidar abaixo
									} else if (actionModal.nextAction.type !== 'iniciarColeta') {
										setActionModal({
											type: actionModal.nextAction.type as 'iniciarColeta',
											cargaId: actionModal.nextAction.cargaId,
										});
										return;
									}
									// nextAction iniciarColeta já foi executado em sequência; seguir para invalidar e fechar
								} else if (actionModal.type === 'finalizarItem' && actionModal.itemId) {
									await finalizarItemMutation.mutateAsync({
										itemId: actionModal.itemId,
										dt_fim: dtIso ?? undefined,
									});
									toast.success('Deslocamento finalizado.', { id: toastId });
								} else if (actionModal.type === 'iniciarColeta' && actionModal.cargaId) {
									await iniciarColetaMutation.mutateAsync({
										cargaId: actionModal.cargaId,
										dt_coleta_inicio: dtIso ?? undefined,
									});
									toast.success('Coleta iniciada.', { id: toastId });
								} else if (actionModal.type === 'finalizarColeta' && actionModal.cargaId) {
									await finalizarColetaMutation.mutateAsync({
										cargaId: actionModal.cargaId,
										dt_coleta_fim: dtIso ?? undefined,
									});
									// Sincronizar status da viagem para EM_VIAGEM (em rota; Torre de Controle e tabelas)
									if (trip?.id) await updateViagemStatusMutation.mutateAsync('EM_VIAGEM');
									toast.success('Coleta finalizada.', { id: toastId });
								} else if (actionModal.type === 'iniciarEntrega' && actionModal.entregaId) {
									await iniciarEntregaMutation.mutateAsync({
										entregaId: actionModal.entregaId,
										dt_inicio_rota: dtIso ?? undefined,
									});
									// Sincronizar status da viagem para EM_VIAGEM (Torre de Controle e tabelas)
									if (trip?.id) await updateViagemStatusMutation.mutateAsync('EM_VIAGEM');
									toast.success('Rota iniciada.', { id: toastId });
								}
								queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
								queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
								queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });
								queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
								queryClient.invalidateQueries({ queryKey: ['viagem-fluxo', trip?.id] });
								await queryClient.refetchQueries({ queryKey: ['viagem-fluxo', trip?.id] });
								setActionModal(null);
							} catch (error) {
								toast.error((error as Error)?.message ?? 'Erro ao executar ação.', { id: toastId });
								// Fechar modal em erro (inclusive quando era iniciar item + iniciar coleta em sequência)
								setActionModal(null);
							}
						}}
					/>
				)}

				{/* Modal: Add Documents to Entrega */}
				{activeEntregaDocs && (
					<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={() => setActiveEntregaDocs(null)}>
						<div
							className='bg-card relative max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg shadow-xl'
							onClick={(e) => e.stopPropagation()}
						>
							<div className='border-border border-b px-6 py-4'>
								<h3 className='text-foreground text-lg font-semibold'>
									Adicionar Documentos à Entrega
									<span className='text-muted-foreground ml-2 text-sm font-normal'>({activeEntregaDocs.destinationLabel})</span>
								</h3>
							</div>
							<div className='p-6'>
								{/* Filters */}
								<div className='mb-4 grid grid-cols-1 gap-3 md:grid-cols-2'>
									<MonthYearSelector
										showClearButton={false}
										placeholder='Competência'
										className='!border-input !bg-card hover:!bg-card !h-auto w-full !rounded-lg !border !px-3 !py-2.5 !text-sm !font-medium focus:!ring-2 focus:!ring-blue-500 focus:!outline-none'
										selected={entregaDocsCompetencia}
										onSelect={(date) => date && setEntregaDocsCompetencia(date)}
									/>
									<Input
										placeholder='Buscar por número do documento...'
										value={entregaDocsFilter}
										onChange={(e) => setEntregaDocsFilter(e.target.value)}
										className='border-input bg-card h-auto w-full rounded-lg border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none'
									/>
								</div>{' '}
								{/* Document List */}
								<div className='max-h-[400px] space-y-2 overflow-y-auto'>
									{isLoadingEntregaDocs ? (
										<div className='flex items-center justify-center py-12'>
											<Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
										</div>
									) : sortedFilteredEntregaDocs.length === 0 ? (
										<p className='text-muted-foreground py-8 text-center text-sm'>Nenhum documento disponível para adicionar</p>
									) : (
										sortedFilteredEntregaDocs.map((doc) => (
											<DocumentSelectWithRelations
												key={doc.id}
												doc={doc}
												isSelected={selectedEntregaDocIds.has(doc.id)}
												onToggle={() => toggleEntregaDocSelection(doc.id)}
												allDocs={entregaAvailableDocs || []}
											/>
										))
									)}
								</div>
							</div>{' '}
							<div className='border-border flex items-center justify-end gap-3 border-t px-6 py-4'>
								<button
									onClick={() => {
										setActiveEntregaDocs(null);
										setSelectedEntregaDocIds(new Set());
										setEntregaDocsFilter('');
										setEntregaDocsCompetencia(new Date());
									}}
									className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-4 py-2 text-sm font-medium'
								>
									Cancelar
								</button>
								<Button
									onClick={handleSaveEntregaDocs}
									disabled={isSavingEntregaDocs || selectedEntregaDocIds.size === 0}
									variant='secondary'
									className='border-border bg-muted/60 text-foreground hover:bg-muted flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black tracking-widest uppercase shadow-sm disabled:cursor-not-allowed disabled:opacity-50'
								>
									{isSavingEntregaDocs && <Loader2 className='h-4 w-4 animate-spin' />}
									Adicionar {selectedEntregaDocIds.size > 0 ? `(${selectedEntregaDocIds.size})` : ''}
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
