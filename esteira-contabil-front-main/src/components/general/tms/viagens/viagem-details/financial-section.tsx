import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	AlignLeft,
	Banknote,
	Calendar,
	Check,
	DollarSign,
	Droplets,
	FileText,
	Gauge,
	MessageSquare,
	Receipt,
	Search,
	Tickets,
	Trash2,
	User,
	Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { MonthYearSelector } from '@/components/ui/month-year-selector';
import { Dialog, DialogContentMedium, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCompanyContext } from '@/context/company-context';
import { getContasDespesaTmsByEmpresaId } from '@/services/api/plano-contas';
import { getDocumentosDespesasDisponiveis } from '@/services/api/tms/documentos';
import { createDespesas, deleteDespesa, getDespesasByViagem } from '@/services/api/tms/despesas';
import { Button } from '@/components/ui/button';
import { Viagem, Doc, ContaDespesa, Despesa, NFeItem, NfseServiceItem } from '@/types/tms';
import { DespesaRecord, PlanoContaAnalitica } from './types';

interface FinancialSectionProps {
	trip: Viagem;
	mode: 'DESPESAS' | 'ADIANTAMENTOS' | 'CARGAS';
}

const formatCurrency = (v: number | null | undefined) => {
	if (v === null || v === undefined || Number.isNaN(v)) return 'R$ 0,00';
	return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
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

export const FinancialSection: React.FC<FinancialSectionProps> = ({ trip, mode }) => {
	const queryClient = useQueryClient();
	const { state: empresaId } = useCompanyContext();
	const [competencia, setCompetencia] = useState<Date>(new Date());

	// DESPESAS state
	const [selectedConta, setSelectedConta] = useState<PlanoContaAnalitica | null>(null);
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

	React.useEffect(() => {
		setOdometerEnabled(Boolean(needsOdometer));
	}, [needsOdometer]);

	// despesas from API
	const { data: despesasFromApi } = useQuery({
		queryKey: ['viagem-despesas', trip.id],
		queryFn: () => (trip?.id ? getDespesasByViagem(trip.id) : []),
		enabled: !!trip?.id && mode === 'DESPESAS',
	});

	const createDespMutation = useMutation({
		mutationFn: (payload: DespesaRecord[]) => createDespesas(trip.id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['viagem-despesas', trip.id] });
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
		queryKey: ['viagem-adiantamentos', trip.id],
		queryFn: () => (trip?.id ? getDespesasByViagem(trip.id) : []),
		enabled: !!trip?.id && mode === 'ADIANTAMENTOS',
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
				params.competencia = `${competencia.getFullYear()}-${String(competencia.getMonth() + 1).padStart(2, '0')}`;
			}
			return getDocumentosDespesasDisponiveis(params);
		},
		enabled: !!empresaId && mode === 'DESPESAS' && documentModalOpen,
	});

	const handleSaveDespesa = async () => {
		const payload: DespesaRecord[] = [];

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

				const contaIdForItem = contasPorItem[it.id] || null;
				const contaForItem = (planoContas || []).find((p: ContaDespesa) => p.id === contaIdForItem) || null;
				if (contaForItem?.ds_tipo_tms_despesa === 'ABASTECIMENTO' && odometro !== null) {
					rec.odometro = odometro;
				}

				payload.push(rec);
			});
		} else if (
			selectedDocument?.js_nfse &&
			Array.isArray(selectedDocument.js_nfse.js_servicos) &&
			selectedDocument.js_nfse.js_servicos.length > 0
		) {
			const valorNum = Number(selectedDocument.js_nfse.ds_valor_servicos ?? '0') / 100;
			const valorStr = valorNum.toFixed(2);
			const rec: DespesaRecord = {
				tipo: 'DESPESA',
				valor: valorStr,
				data: dataDespesa ? new Date(dataDespesa).toISOString() : new Date().toISOString(),
				nfseId: selectedDocument.js_nfse?.id || selectedDocument.js_nfse?.ds_numero || null,
				observacao: descricaoDespesa || null,
				id_conta_despesa: selectedConta?.id ?? (contasPorItem[selectedDocument.js_nfse?.id] || null),
			};

			const contaIdForNfse = selectedConta?.id || contasPorItem[selectedDocument.js_nfse?.id] || null;
			const contaForNfse = (planoContas || []).find((p: ContaDespesa) => p.id === contaIdForNfse) || null;
			if (contaForNfse?.ds_tipo_tms_despesa === 'ABASTECIMENTO' && odometro !== null) {
				rec.odometro = odometro;
			}

			payload.push(rec);
		} else if (valorDespesa) {
			const rec: DespesaRecord = {
				tipo: 'DESPESA',
				valor: (Number(valorDespesa) || 0).toFixed(2),
				data: dataDespesa ? new Date(dataDespesa).toISOString() : new Date().toISOString(),
				observacao: descricaoDespesa || null,
				id_conta_despesa: selectedConta?.id || null,
			};

			if (selectedConta?.ds_tipo_tms_despesa === 'ABASTECIMENTO' && odometro !== null) {
				rec.odometro = odometro;
			}

			payload.push(rec);
		} else {
			toast.error('Nada para salvar. Selecione um documento ou informe um valor.');
			return;
		}

		try {
			if (odometerEnabled && odometro === null) {
				toast.error('Informe odômetro para despesas de abastecimento.');
				return;
			}
			await createDespMutation.mutateAsync(payload);
			toast.success('Despesas salvas com sucesso');
			setSelectedDocument(null);
			setDataDespesa(null);
			setValorDespesa(null);
			setDescricaoDespesa('');
			setContasPorItem({});
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
			setSelectedConta(null);
			setDataAdiantamento(undefined);
			setValorAdiantamento(null);
			setObsAdiantamento('');
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

	const viewIsDespesa = mode === 'DESPESAS';
	const viewIsAdiant = mode === 'ADIANTAMENTOS';

	if (!viewIsDespesa && !viewIsAdiant) return null;

	return (
		<>
			{viewIsDespesa && (
				<div className='mb-6 space-y-5'>
					<div className='rounded-2xl border border-border bg-muted/40 p-5'>
						<div className='mb-5 flex items-center gap-2.5'>
							<div className='flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white'>
								<Receipt size={18} />
							</div>
						<h3 className='text-base font-bold text-foreground'>Nova Despesa</h3>
						</div>

						<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
										readOnly
									/>
									<Button
										type='button'
										variant='outline'
										onClick={() => setDocumentModalOpen(true)}
										className='flex items-center gap-1'
									>
										<Search size={19} />
										Buscar
									</Button>
								</div>
								<div className='mt-2'>
									<label className='flex items-center gap-2 text-xs font-semibold'>
										<Receipt size={12} className='-mt-0.5 mr-1 inline' /> Conta
									</label>
									<select
										className='mt-1 w-full rounded-md border p-2 text-sm'
										value={selectedConta?.id || ''}
										disabled={selectedDocument !== null ? (selectedDocument.js_nfse ? false : true) : false}
										onChange={(e) => {
											const id = e.target.value;
											const found = (planoContas || []).find((p: ContaDespesa) => p.id === id) || null;
											setSelectedConta(found);
											const anyItemAb = Object.values(contasPorItem || {}).some(
												(cid) => (planoContas || []).find((p: ContaDespesa) => p.id === cid)?.ds_tipo_tms_despesa === 'ABASTECIMENTO',
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
							<div>
								<label className='flex items-center gap-2 text-xs font-semibold'>
									<Calendar size={12} className='-mt-0.5 mr-1 inline' /> Data
								</label>
								<div className='mt-1'>
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
										<Gauge size={12} className='-mt-0.5 mr-1 inline' /> Odômetro
									</label>
									<input
										type='number'
										className={`mt-1 w-full rounded-md border p-2 text-sm ${!odometerEnabled ? 'bg-gray-50/60 opacity-70' : ''}`}
										value={odometro ?? ''}
										onChange={(e) => setOdometro(e.target.value ? Number(e.target.value) : null)}
										disabled={!odometerEnabled}
									/>
								</div>
							</div>
						</div>

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
														(cid) => (planoContas || []).find((p: ContaDespesa) => p.id === cid)?.ds_tipo_tms_despesa === 'ABASTECIMENTO',
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

						{selectedDocument && selectedDocument.js_nfse && (selectedDocument.js_nfse.js_servicos || []).length > 0 && (
							<div className='mt-4'>
								<div className='mb-2 text-sm font-semibold'>Serviços da NFSe</div>
								{(selectedDocument.js_nfse.js_servicos || []).map((svc, idx: number) => (
									<div key={idx} className='mb-2 space-y-1'>
										{svc.ds_item_lista_servico && <div className='truncate text-xs text-gray-600'>Código: {svc.ds_item_lista_servico}</div>}
										{svc.ds_discriminacao && <div className='text-sm text-gray-800'>{svc.ds_discriminacao}</div>}
									</div>
								))}
							</div>
						)}
						<div className='mt-4 flex justify-end'>
							<Button onClick={handleSaveDespesa} className='flex items-center gap-2'>
								<Check size={16} strokeWidth={3} /> Salvar Despesa
							</Button>
						</div>

						<div className='my-4 border-t border-gray-200' />
						{despesasToShow && despesasToShow.length > 0 && (
							<div className='mt-4 rounded-2xl border bg-gray-50 p-4'>
								<div className='mb-4 flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<h4 className='text-sm font-bold text-gray-900'>Despesas</h4>
										<span className='inline-flex items-center justify-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700'>
											{despesasToShow.length}
										</span>
									</div>
									<span className='text-xs font-medium text-gray-500'>{despesasFromApi ? 'Salvas' : ''}</span>
								</div>
								<ul className='space-y-2'>
									{despesasToShow.map((d: Despesa) => {
										if (d.ds_tipo === 'ADIANTAMENTO') return null;
										const isServer = !!(d && d.id && (d.vl_despesa !== undefined || d.ds_tipo));
										return (
											<li key={d.id} className='draft-item flex items-center justify-between rounded bg-white p-3'>
												<div className='min-w-0 flex-1'>
													{(() => {
														const tipoDespesaRaw = d?.con_conta_despesa?.ds_tipo_tms_despesa;
														const tipoDespesa = typeof tipoDespesaRaw === 'string' ? tipoDespesaRaw.toUpperCase() : null;
														if (!tipoDespesa) return null;

														switch (tipoDespesa) {
															case 'ABASTECIMENTO':
																return (
																	<div className='mb-2 inline-flex items-center gap-2 rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700'>
																		<Droplets className='h-4 w-4 text-blue-600' />
																		<span>Abastecimento</span>
																	</div>
																);
															case 'ADIANTAMENTO':
																return (
																	<div className='mb-2 inline-flex items-center gap-2 rounded border border-yellow-100 bg-yellow-50 px-2 py-0.5 text-xs font-bold text-yellow-700'>
																		<Wallet className='h-4 w-4 text-yellow-600' />
																		<span>Adiantamento</span>
																	</div>
																);
															case 'PEDAGIO':
																return (
																	<div className='mb-2 inline-flex items-center gap-2 rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700'>
																		<Tickets className='h-4 w-4 text-purple-600' />
																		<span>Pedágio</span>
																	</div>
																);
															case 'DESPESA':
															default:
																return (
																	<div className='mb-2 inline-flex items-center gap-2 rounded border border-gray-100 bg-gray-50 px-2 py-0.5 text-xs font-bold text-gray-800'>
																		<Receipt className='h-4 w-4 text-gray-600' />
																		<span>Despesa</span>
																	</div>
																);
														}
													})()}

													<div className='truncate text-sm font-semibold text-gray-900'>
														{d.fis_nfe_item?.fis_nfe?.ds_numero || d?.fis_nfse?.ds_numero || d.ds_observacao || '—'} -{' '}
														{d.ds_observacao || 'Sem descrição'}
													</div>
													<div className='mt-1 flex items-center gap-2 text-xs text-gray-500'>
														<span>{(d.dt_despesa && new Date(d.dt_despesa).toISOString().slice(0, 10)) || d.dt_despesa || '—'}</span>
														{d.ds_observacao && (
															<>
																<span>•</span>
																<span className='truncate'>{d.ds_observacao}</span>
															</>
														)}
													</div>
												</div>
												<div className='mx-4 w-32 text-center'>
													<div className='text-sm font-semibold text-gray-900'>{formatCurrency(Number(d.vl_despesa ?? 0))}</div>
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
								<div className='mt-4 flex items-center justify-between border-t border-gray-200/60 pt-3'>
									<span className='text-xs text-gray-500'>Total</span>
									<span className='text-sm font-bold text-gray-900'>
										{formatCurrency((despesasToShow as Despesa[]).reduce((s, d) => s + (Number(d.vl_despesa ?? 0) || 0), 0))}
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

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
								<MonthYearSelector placeholder='Mês/Ano' selected={competencia} onSelect={(date) => date && setCompetencia(date)} />
							</div>
						</div>
						<div className='my-2 border-t border-gray-100' />
						<div className='mt-4 max-h-[50vh] space-y-2 overflow-y-auto'>
							{!documentosDespesas ? (
								<div className='text-sm text-gray-500'>Carregando...</div>
							) : documentosDespesas.length === 0 ? (
								<div className='text-sm text-gray-500'>Nenhum documento encontrado.</div>
							) : (
								documentosDespesas.map((doc: Doc) => (
									<div key={doc.id} className='rounded-md border bg-white p-2'>
										<div className='flex items-center justify-between gap-4'>
											<div className='min-w-0'>
												<div className='truncate text-sm font-bold'>
													{doc.ds_tipo} {doc.js_nfe?.ds_numero || doc.js_nfse?.ds_numero || doc.ds_controle} -{' '}
													{doc.dt_emissao ? new Date(doc.dt_emissao).toLocaleDateString() : '—'}
												</div>
												<div className='truncate text-xs text-gray-500'>
													{doc.js_nfe?.ds_razao_social_emitente || doc.js_nfse?.fis_fornecedor?.ds_nome}
												</div>
											</div>
											<div className='font-mono text-sm text-gray-700'>
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
														setDataDespesa(formatDateForInput(doc.js_nfe?.dt_emissao || doc.js_nfse?.dt_emissao || doc.dt_emissao));
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
													className='rounded-md border px-3 py-1 text-xs text-gray-600 hover:bg-gray-100'
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
										{docExpanded.has(doc.id) && (
											<div className='mt-2 w-full rounded bg-gray-50 p-2 text-xs text-gray-700'>
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
																<div className='truncate text-xs text-gray-600' key={index}>
																	Serviço: {s.ds_item_lista_servico}
																</div>
															))}
															{doc.js_nfse?.ds_discriminacao ? (
																doc.js_nfse?.js_servicos?.map((s: NfseServiceItem, index: number) => (
																	<div className='text-sm text-gray-800' key={index}>
																		{s.ds_discriminacao}
																	</div>
																))
															) : doc.js_nfse?.js_servicos?.[0]?.ds_discriminacao ? (
																doc.js_nfse.js_servicos.map((s: NfseServiceItem, index: number) => (
																	<div className='text-sm text-gray-800' key={index}>
																		{JSON.stringify(s.ds_discriminacao)}
																	</div>
																))
															) : (
																<div className='text-sm text-gray-800'>—</div>
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

			{viewIsAdiant && (
				<div className='mb-6 space-y-5'>
					<div className='rounded-2xl border border-border bg-muted/40 p-5'>
						<div className='mb-5 flex items-center gap-2.5'>
							<div className='flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white'>
								<Banknote size={18} />
							</div>
							<h3 className='text-base font-bold text-gray-900'>Novo Adiantamento</h3>
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
							<Button onClick={handleSaveAdiantamento} className='flex items-center gap-2'>
								<Banknote size={16} /> Salvar Adiantamento
							</Button>
						</div>

						{adiantamentosToShow && adiantamentosToShow.length > 0 && (
							<div className='mt-4 rounded-2xl border bg-gray-50 p-4'>
								<div className='mb-4 flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<h4 className='text-sm font-bold text-gray-900'>Adiantamentos</h4>
										<span className='inline-flex items-center justify-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700'>
											{adiantamentosToShow.length}
										</span>
									</div>
									<span className='text-xs font-medium text-gray-500'>{adiantamentosFromApi ? 'Salvas' : 'Rascunho'}</span>
								</div>
								<ul className='space-y-2'>
									{adiantamentosToShow.map((a: Despesa) => {
										const isServer = !!(a && a.id && !String(a.id).startsWith('a-') && (a.vl_despesa !== undefined || a.ds_tipo));
										const conta = isServer ? (planoContas || []).find((p: ContaDespesa) => p.id === a.id_conta_despesa) : a.conta;
										const dateStr = isServer ? formatDateForInput(a.dt_despesa || a.data) : a.data;
										const valueNum = Number(a.vl_despesa ?? a.valor ?? 0);
										const obs = isServer ? a.ds_observacao : a.obs;

										return (
											<li key={a.id} className='draft-item flex items-center justify-between rounded bg-white p-3'>
												<div>
													<div className='text-sm font-semibold text-gray-900'>
														{conta ? `${conta.ds_classificacao_cta || ''} ${conta.ds_nome_cta || ''}` : '—'}
													</div>
													<div className='mt-1 flex items-center gap-2 text-xs text-gray-500'>
														<span>{dateStr || '—'}</span>
														<span>•</span>
														<span className='font-semibold text-gray-900'>{formatCurrency(valueNum)}</span>
													</div>
													{obs && <div className='mt-1 text-xs text-gray-500'>{obs}</div>}
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
								<div className='mt-4 flex items-center justify-between border-t border-gray-200/60 pt-3'>
									<span className='text-xs text-gray-500'>Total</span>
									<span className='text-sm font-bold text-gray-900'>
										{formatCurrency(
											(adiantamentosToShow || []).reduce((sum: number, a: Despesa) => sum + Number(a.vl_despesa ?? a.valor ?? 0), 0),
										)}
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
};
