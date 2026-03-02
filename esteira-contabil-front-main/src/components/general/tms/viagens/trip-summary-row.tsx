'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/general/tms/viagens/status-viagens';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TableCell, TableRow } from '@/components/ui/table';
import type { Carga, Despesa, Entrega, FluxoItemDTO, Viagem } from '@/types/tms';
import { Eye, FileText, Receipt, Banknote, Tag, Truck, Scale, Box, MapPin, ChevronDown, ArrowRight, Plus, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDespesasByViagem } from '@/services/api/tms/despesas';
import { useViagemFluxo } from '@/hooks/use-viagens';
import { CardAccent, type Accent } from '@/components/ui/card-accent';
import { cn } from '@/lib/utils';

/** Mapeia status do leg para accent do CardAccent (stripe semântico, sem moldura neon). */
function getAccentForLegStatus(
	status: 'agendado' | 'em_coleta' | 'em_rota' | 'entregue' | undefined,
): Accent {
	if (!status) return 'gray';
	const map: Record<'agendado' | 'em_coleta' | 'em_rota' | 'entregue', Accent> = {
		agendado: 'amber',
		em_coleta: 'orange',
		em_rota: 'purple',
		entregue: 'green',
	};
	return map[status] ?? 'gray';
}

function formatTipoCarroceria(tipo?: Carga['ds_tipo_carroceria']): string {
	if (!tipo) return '—';
	const labels: Record<NonNullable<Carga['ds_tipo_carroceria']>, string> = {
		GRANELEIRO: 'Graneleiro',
		BAU: 'Baú',
		SIDER: 'Sider',
		FRIGORIFICO: 'Frigorífico',
		TANQUE: 'Tanque',
		PORTA_CONTAINER: 'Porta Container',
	};
	return labels[tipo] ?? tipo;
}

function formatWeight(weight?: number): string {
	if (!weight) return '—';
	if (weight >= 1000) return `${(weight / 1000).toFixed(1)} ton`;
	return `${weight} kg`;
}

function formatDatePtBr(d: string | null | undefined): string {
	if (!d) return '—';
	try {
		const date = new Date(d);
		const hasTime = d.includes('T') && (d.length > 10 || d.includes(':'));
		return hasTime
			? date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
			: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
	} catch {
		return '—';
	}
}

function getLegDateSlots(
	fluxoItem: FluxoItemDTO | null | undefined,
	carga: Carga | undefined,
	trip: Viagem,
	legIndex: number,
	totalLegs: number,
): { slot1: { label: string; value: string }; slot2: { label: string; value: string } } {
	const startActual = fluxoItem?.dt_iniciado_em ?? null;
	const endActual = fluxoItem?.dt_finalizado_em ?? null;
	const startEst = carga?.dt_coleta_inicio ?? (legIndex === 0 ? trip.dt_agendada : undefined);
	const endEst =
		carga?.dt_coleta_fim ??
		carga?.dt_limite_entrega ??
		(legIndex === totalLegs - 1 ? trip.dt_previsao_retorno : undefined);

	const slot1 =
		startActual != null
			? { label: 'Dt. Iniciado', value: formatDatePtBr(startActual) }
			: startEst
				? { label: 'Dt. Início Estimada', value: formatDatePtBr(startEst) }
				: { label: 'Início', value: '—' };
	const slot2 =
		endActual != null
			? { label: 'Dt. Finalizado', value: formatDatePtBr(endActual) }
			: endEst
				? { label: 'Dt. Final Estimada', value: formatDatePtBr(endEst) }
				: { label: 'Fim', value: '—' };
	return { slot1, slot2 };
}

function getEntregaDateSlots(ent: Entrega): { slot1: { label: string; value: string } | null; slot2: { label: string; value: string } | null } {
	const s1 = ent.dt_limite_entrega ? { label: 'Dt. Limite Estimada', value: formatDatePtBr(ent.dt_limite_entrega) } : null;
	const s2 = ent.dt_entrega ? { label: 'Dt. Entrega', value: formatDatePtBr(ent.dt_entrega) } : null;
	return { slot1: s1, slot2: s2 };
}

/** Status do leg para borda do card: agendado, em_coleta, em_rota, entregue (compatível com viagem-details/viagem-timeline-cards). */
function getLegBorderStatus(
	fluxoItem: { status_item?: string; carga?: { ds_status_coleta?: string | null } } | null | undefined,
	carga: Carga | undefined,
): 'agendado' | 'em_coleta' | 'em_rota' | 'entregue' | undefined {
	if (carga?.ds_status === 'ENTREGUE') return 'entregue';
	if (fluxoItem?.status_item === 'CONCLUIDO') return 'entregue';
	if (fluxoItem?.status_item === 'EM_DESLOCAMENTO' && fluxoItem?.carga?.ds_status_coleta === 'EM_COLETA') return 'em_coleta';
	if (fluxoItem?.status_item === 'EM_DESLOCAMENTO') return 'em_rota';
	if (fluxoItem?.status_item === 'DISPONIVEL' || fluxoItem?.status_item === 'BLOQUEADO') return 'agendado';
	return 'agendado';
}

function getDocCounts(carga: Carga | undefined): { cte: number; nfe: number } {
	if (!carga?.js_entregas?.length) return { cte: 0, nfe: 0 };
	let cte = 0;
	let nfe = 0;
	carga.js_entregas.forEach((ent) => {
		cte += ent.js_entregas_ctes?.length ?? 0;
		nfe += ent.js_entregas_nfes?.length ?? 0;
	});
	return { cte, nfe };
}

function formatCurrency(value: number): string {
	return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export interface TripSummaryRowProps {
	trip: Viagem;
	onOpenFullDetails: (trip: Viagem) => void;
	onAddCargaToViagem?: (trip: Viagem) => void;
	onOpenDespesasAdiantamentos?: (trip: Viagem) => void;
}

/**
 * Resumo simples dos trajetos da viagem (estilo Viagens e cargas).
 * Usado na lista de Viagens ao expandir a linha; botão "Ver detalhes" abre o modal com TripDetails.
 */
export function TripSummaryRow({ trip, onOpenFullDetails, onAddCargaToViagem, onOpenDespesasAdiantamentos }: TripSummaryRowProps) {
	const [expandedLegIds, setExpandedLegIds] = useState<Set<string>>(new Set());

	const toggleLeg = useCallback((vcId: string) => {
		setExpandedLegIds((prev) => {
			const next = new Set(prev);
			if (next.has(vcId)) next.delete(vcId);
			else next.add(vcId);
			return next;
		});
	}, []);

	const orderedLegs = useMemo(() => {
		const vcs = trip.js_viagens_cargas;
		if (!vcs || vcs.length === 0) return [];
		return [...vcs].sort((a, b) => (a.nr_sequencia ?? 0) - (b.nr_sequencia ?? 0));
	}, [trip.js_viagens_cargas]);

	const legsWithLabels = useMemo(() => {
		let cargaNum = 0;
		let deslocamentoVazioNum = 0;
		return orderedLegs.map((vc) => {
			const isVazio = vc.tms_cargas?.fl_deslocamento_vazio === true || vc.tms_cargas?.cd_carga === 'DESLOCAMENTO_VAZIO';
			const label = isVazio
				? `Deslocamento vazio #${++deslocamentoVazioNum}`
				: `Carga #${++cargaNum}`;
			return { vc, label, isVazio };
		});
	}, [orderedLegs]);

	const { data: fluxo } = useViagemFluxo(trip.id);

	const { data: despesasRaw } = useQuery({
		queryKey: ['viagem-despesas', trip.id],
		queryFn: () => (trip?.id ? getDespesasByViagem(trip.id) : []),
		enabled: !!trip?.id,
	});

	const despesasList = Array.isArray(despesasRaw) ? (despesasRaw as Despesa[]) : [];
	const adiantamentosList = despesasList.filter((d) => d?.ds_tipo === 'ADIANTAMENTO');
	const despesasOnly = despesasList.filter((d) => d?.ds_tipo !== 'ADIANTAMENTO');

	const totalDespesas = despesasOnly.reduce(
		(sum, d) => sum + (Number(d.vl_despesa ?? 0) || 0),
		0,
	);
	const totalAdiantamentos = adiantamentosList.reduce(
		(sum, a) => sum + (Number(a.vl_despesa ?? 0) || 0),
		0,
	);

	return (
		<TableRow>
			<TableCell colSpan={8} className="p-5">
				<div className="flex flex-col gap-4">
					{orderedLegs.length === 0 ? (
						<Card className="border-dashed">
							<CardContent className="py-6 flex flex-col items-center justify-center gap-4 text-center text-sm text-muted-foreground">
								<p>Nenhum trajeto ou carga vinculada a esta viagem.</p>
								<div className="flex flex-wrap items-center justify-center gap-2">
									{onAddCargaToViagem && (
										<Button
											type="button"
											variant="default"
											size="sm"
											className="gap-2"
											onClick={() => onAddCargaToViagem(trip)}
										>
											<Plus size={14} />
											Adicionar carga
										</Button>
									)}
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="gap-2"
										onClick={() => onOpenFullDetails(trip)}
									>
										<Eye size={14} />
										Ver detalhes completos
									</Button>
								</div>
							</CardContent>
						</Card>
					) : (
						legsWithLabels.map(({ vc, label, isVazio }, legIndex) => {
							const carga = vc.tms_cargas;
							const fluxoItem = fluxo?.itens?.find((i) => i.id === vc.id) ?? null;
							const legBorderStatus = getLegBorderStatus(fluxoItem, carga);
							const legDates = getLegDateSlots(fluxoItem, carga, trip, legIndex, orderedLegs.length);
							const origemCidade = carga?.sis_cidade_origem
								? `${carga.sis_cidade_origem.ds_city}${carga.sis_cidade_origem.js_uf ? `/${carga.sis_cidade_origem.js_uf.ds_uf}` : ''}`
								: '—';
							const destinoCidade = carga?.sis_cidade_destino
								? `${carga.sis_cidade_destino.ds_city}${carga.sis_cidade_destino.js_uf ? `/${carga.sis_cidade_destino.js_uf.ds_uf}` : ''}`
								: null;
							const entregas = carga?.js_entregas ?? [];
							const docCounts = getDocCounts(carga);
							const blockClass = 'rounded-xl border border-border/70 bg-muted/40 p-3';
							const labelClass = 'text-[9px] font-black tracking-widest uppercase text-muted-foreground';
							const valueClass = 'text-sm font-semibold text-foreground';
							const isExpanded = expandedLegIds.has(vc.id);
							const firstDest = entregas[0]?.sis_cidade_destino
								? `${entregas[0].sis_cidade_destino.ds_city}${entregas[0].sis_cidade_destino.js_uf ? `/${entregas[0].sis_cidade_destino.js_uf.ds_uf}` : ''}`
								: destinoCidade;
							const basicDestinatario = isVazio
								? (destinoCidade ? `Destino: ${destinoCidade}` : null)
								: (firstDest ? `Destino: ${firstDest}` : null);
							const trajetoNum = vc.nr_sequencia ?? legIndex + 1;

							return (
								<CardAccent
									key={vc.id}
									accent={getAccentForLegStatus(legBorderStatus)}
									className="flex flex-col gap-4 py-4 transition-colors"
								>
									<div className="flex flex-col gap-4">
										<CardHeader
											className="cursor-pointer pb-2 transition-colors hover:bg-muted/30"
										onClick={() => toggleLeg(vc.id)}
										>
											<div className="flex flex-wrap items-start justify-between gap-3">
											{/* Esquerda: Trajeto N + badges + resumo básico */}
											<div className="flex flex-col gap-2 min-w-0 flex-1">
												<div className="flex flex-wrap items-center gap-2">
													<span
														className="inline-flex items-center rounded-lg border-2 border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-primary dark:border-primary/50 dark:bg-primary/15 dark:text-primary"
														title="Ordem na viagem (tms_viagens_cargas.nr_sequencia)"
													>
														Trajeto {trajetoNum}
													</span>
													<Badge
														variant={isVazio ? 'muted' : 'cargo'}
														className="px-3 py-1"
													>
														{label}
													</Badge>
													<StatusBadge
														status={carga?.ds_status ?? 'PENDENTE'}
														context="carga"
														size="md"
														className="border-transparent px-2 py-1"
													/>
												</div>
												{/* Resumo básico: código, destinatário (datas estão à direita) */}
												<div className="space-y-0.5 text-sm text-muted-foreground">
													{!isVazio && carga?.cd_carga && carga.fl_deslocamento_vazio !== true && (
														<p className="font-medium text-foreground">Código: {carga.cd_carga}</p>
													)}
													{basicDestinatario && <p className="text-[13px]">{basicDestinatario}</p>}
												</div>
											</div>
											{/* Direita: datas do deslocamento + chevron */}
											<div className="flex flex-shrink-0 items-start gap-2">
												<div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-right dark:border-border/70 dark:bg-muted/30">
													<div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
														{legDates.slot1.label}
													</div>
													<div className="text-xs font-semibold text-foreground">{legDates.slot1.value}</div>
													<div className="mt-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
														{legDates.slot2.label}
													</div>
													<div className="text-xs font-semibold text-foreground">{legDates.slot2.value}</div>
												</div>
												<button
													type="button"
													className={cn(
														'rounded p-1 text-muted-foreground transition-transform duration-200 hover:bg-muted hover:text-foreground',
														isExpanded && 'rotate-180',
													)}
													onClick={(e) => { e.stopPropagation(); toggleLeg(vc.id); }}
													aria-expanded={isExpanded}
												>
													<ChevronDown size={18} />
												</button>
											</div>
											</div>
										</CardHeader>
										{isExpanded && (
											<CardContent className="space-y-4 border-t border-border/70 pt-4">
										{/* Destaque: Origem → Destino (datas já estão no header) */}
										<div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-border/80 bg-muted/30 px-4 py-3 dark:border-border dark:bg-muted/20">
											<div className="flex flex-1 min-w-[140px] flex-col gap-0.5">
												<span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Origem</span>
												<span className="text-base font-bold text-foreground">{origemCidade}</span>
											</div>
											<ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
											<div className="flex flex-1 min-w-[140px] flex-col gap-0.5">
												<span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
													{isVazio ? 'Destino' : 'Destino(s)'}
												</span>
												{isVazio ? (
													<>
														<span className="text-base font-bold text-foreground">{destinoCidade ?? '—'}</span>
														<span className="text-xs italic text-muted-foreground">Trajeto sem carga comercial</span>
													</>
												) : (
													<span className="text-base font-bold text-foreground">
														{entregas.length > 0
															? entregas.map((e) => e.sis_cidade_destino?.ds_city && e.sis_cidade_destino?.js_uf?.ds_uf ? `${e.sis_cidade_destino.ds_city}/${e.sis_cidade_destino.js_uf.ds_uf}` : '—').join(' · ')
															: destinoCidade ?? '—'}
													</span>
												)}
											</div>
										</div>

										{isVazio ? (
											<>
												{carga?.fl_carroceria_desacoplada && (
													<div className={blockClass}>
														<p className={labelClass}>Carroceria desacoplada</p>
														<p className={valueClass}>Sim</p>
													</div>
												)}
												{carga?.ds_observacoes && (
													<div className={blockClass}>
														<p className={labelClass}>Observações</p>
														<p className={`${valueClass} line-clamp-2 max-w-[32rem]`}>
															{carga.ds_observacoes.length > 120 ? `${carga.ds_observacoes.slice(0, 120)}…` : carga.ds_observacoes}
														</p>
													</div>
												)}
											</>
										) : (
											<>
												{/* Dados básicos por carga */}
												<div className="grid grid-cols-2 gap-3">
													{carga?.cd_carga && carga.fl_deslocamento_vazio !== true && carga.cd_carga !== 'DESLOCAMENTO_VAZIO' && (
														<div className={blockClass}>
															<div className="mb-1 flex items-center gap-2 text-muted-foreground">
																<FileText size={12} />
																<span className={labelClass}>Código / OP</span>
															</div>
															<p className={valueClass}>{carga.cd_carga}</p>
														</div>
													)}
													{carga?.tms_segmentos?.ds_nome && (
														<div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
															<div className="mb-1 flex items-center gap-2 text-purple-700 dark:text-purple-300">
																<Tag size={12} />
																<span className={labelClass}>Segmento gerencial</span>
															</div>
															<p className="text-sm font-semibold text-purple-900 dark:text-purple-100">{carga.tms_segmentos.ds_nome}</p>
														</div>
													)}
													{carga?.ds_tipo_carroceria && (
														<div className={blockClass}>
															<div className="mb-1 flex items-center gap-2 text-muted-foreground">
																<Truck size={12} />
																<span className={labelClass}>Tipo veículo</span>
															</div>
															<p className={valueClass}>{formatTipoCarroceria(carga.ds_tipo_carroceria)}</p>
														</div>
													)}
													{(carga?.vl_peso_bruto != null || carga?.vl_cubagem != null) && (
														<>
															{carga?.vl_peso_bruto != null && (
																<div className={blockClass}>
																	<div className="mb-1 flex items-center gap-2 text-muted-foreground">
																		<Scale size={12} />
																		<span className={labelClass}>Peso</span>
																	</div>
																	<p className={valueClass}>{formatWeight(carga.vl_peso_bruto)}</p>
																</div>
															)}
															{carga?.vl_cubagem != null && (
																<div className={blockClass}>
																	<div className="mb-1 flex items-center gap-2 text-muted-foreground">
																		<Box size={12} />
																		<span className={labelClass}>Cubagem</span>
																	</div>
																	<p className={valueClass}>{carga.vl_cubagem} m³</p>
																</div>
															)}
														</>
													)}
												</div>
												{carga?.ds_observacoes && (
													<div className={blockClass}>
														<p className={labelClass}>Observações</p>
														<p className={`${valueClass} line-clamp-2 max-w-[32rem]`}>
															{carga.ds_observacoes.length > 120 ? `${carga.ds_observacoes.slice(0, 120)}…` : carga.ds_observacoes}
														</p>
													</div>
												)}

												{/* Entregas: cidade, destinatário, endereço, duas datas */}
												{entregas.length > 0 ? (
													entregas.map((ent, ei) => {
														const destCity = ent.sis_cidade_destino
															? `${ent.sis_cidade_destino.ds_city}${ent.sis_cidade_destino.js_uf ? `/${ent.sis_cidade_destino.js_uf.ds_uf}` : ''}`
															: '—';
														const entDates = getEntregaDateSlots(ent);
														return (
															<div key={ent.id || ei} className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-3">
																<div className="flex flex-wrap items-center gap-4">
																	<div className="min-w-[200px]">
																		<p className="text-sm font-semibold">{destCity}</p>
																		{(ent.ds_nome_recebedor || ent.ds_nome_destinatario) && (
																			<p className="text-[13px] text-muted-foreground">
																				Destinatário:{' '}
																				{ent.ds_nome_recebedor || ent.ds_nome_destinatario}
																			</p>
																		)}
																		{ent.ds_endereco && (
																			<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
																				<MapPin size={10} /> {ent.ds_endereco}
																			</p>
																		)}
																	</div>
																	<StatusBadge
																		status={carga?.ds_status ?? 'PENDENTE'}
																		context="carga"
																		size="md"
																		className="border-transparent px-2 py-1"
																	/>
																</div>
																{(entDates.slot1 || entDates.slot2) && (
																	<div className="flex flex-wrap gap-4 border-t border-border/50 pt-2">
																		{entDates.slot1 && (
																			<div>
																				<p className={labelClass}>{entDates.slot1.label}</p>
																				<p className={valueClass}>{entDates.slot1.value}</p>
																			</div>
																		)}
																		{entDates.slot2 && (
																			<div>
																				<p className={labelClass}>{entDates.slot2.label}</p>
																				<p className={valueClass}>{entDates.slot2.value}</p>
																			</div>
																		)}
																	</div>
																)}
															</div>
														);
													})
												) : (
													<div className="flex flex-wrap items-center gap-4">
														<div className="min-w-[200px]">
															<p className="text-sm font-semibold">
																{destinoCidade || carga?.cd_carga || '—'}
															</p>
														</div>
														<StatusBadge
															status={carga?.ds_status ?? 'PENDENTE'}
															context="carga"
															size="md"
															className="border-transparent px-2 py-1"
														/>
													</div>
												)}
												{(docCounts.cte > 0 || docCounts.nfe > 0) && (
													<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
														<FileText size={12} className="shrink-0" />
														<span>
															CT-e: {docCounts.cte}
															{docCounts.nfe > 0 ? ` · NF-e: ${docCounts.nfe}` : ''}
														</span>
													</div>
												)}
											</>
										)}
									</CardContent>
									)}
									</div>
								</CardAccent>
							);
						})
					)}

					{/* Despesas e adiantamentos: sempre exibir bloco com botão para abrir detalhe na aba */}
					<div className="rounded-xl border border-border bg-muted/30 p-4">
						{despesasOnly.length > 0 || adiantamentosList.length > 0 ? (
							<div className="flex flex-wrap items-center justify-between gap-4">
								<div className="flex flex-wrap gap-4">
									{despesasOnly.length > 0 && (
										<div className="flex items-center gap-2">
											<Receipt size={16} className="text-muted-foreground" />
											<span className="text-sm font-medium text-foreground">
												Despesas: {despesasOnly.length} itens · {formatCurrency(totalDespesas)}
											</span>
										</div>
									)}
									{adiantamentosList.length > 0 && (
										<div className="flex items-center gap-2">
											<Banknote size={16} className="text-muted-foreground" />
											<span className="text-sm font-medium text-foreground">
												Adiantamentos: {adiantamentosList.length} itens ·{' '}
												{formatCurrency(totalAdiantamentos)}
											</span>
										</div>
									)}
								</div>
								{onOpenDespesasAdiantamentos && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="gap-2 shrink-0"
										onClick={() => onOpenDespesasAdiantamentos(trip)}
									>
										<Wallet size={14} />
										Ver despesas e adiantamentos
									</Button>
								)}
							</div>
						) : (
							<div className="flex flex-wrap items-center justify-between gap-4">
								<p className="text-sm text-muted-foreground">Nenhuma despesa ou adiantamento registrada.</p>
								{onOpenDespesasAdiantamentos && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="gap-2 shrink-0"
										onClick={() => onOpenDespesasAdiantamentos(trip)}
									>
										<Wallet size={14} />
										Ver despesas e adiantamentos
									</Button>
								)}
							</div>
						)}
					</div>

					<div className="flex flex-wrap items-center justify-end gap-2 pt-2">
						{onAddCargaToViagem && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="gap-2"
								onClick={() => onAddCargaToViagem(trip)}
							>
								<Plus size={14} />
								Adicionar carga
							</Button>
						)}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-2"
							onClick={() => onOpenFullDetails(trip)}
						>
							<Eye size={14} />
							Ver detalhes completos
						</Button>
					</div>
				</div>
			</TableCell>
		</TableRow>
	);
}