'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTmsStatusVariant } from '@/components/general/tms/viagens/status-viagens';
import { badgeTripStatus } from '@/utils/functions';
import { formatCnpjCpf } from '@/utils/format-cnpj-cpf';
import type { Carga, Despesa, Viagem } from '@/types/tms';
import { CheckCircle, Eye, Play, Plus, Route } from 'lucide-react';

export type StatusParaBadge = 'transit' | 'successTwo' | 'late' | 'planned';

export interface TrajetoDestino {
	id: string;
	cidade: string;
	endereco: string;
	destinatario: string;
	/** CNPJ/CPF do destinatário (para exibir abaixo do nome, estilo fiscal/entradas) */
	destinatarioDocumento?: string;
	docs: string[];
	statusParaBadge: StatusParaBadge;
}

export interface TrajetoDados {
	id: string;
	/** true = item é deslocamento vazio (rótulo "Deslocamento Vazio N") */
	isDeslocamentoVazio: boolean;
	/** "Carga N" ou "Deslocamento Vazio N" */
	rotuloTrajeto: string;
	origem: {
		cidade: string;
		endereco: string;
		embarcadorExpedidor: string;
		embarcadorDocumento?: string;
		clienteTomador: string;
		clienteDocumento?: string;
	};
	destinos: TrajetoDestino[];
}

export interface CustosDados {
	combustivel: number;
	pedagio: number;
	outrasDespesas: number;
	custosPessoal: number;
	custosTotal: number;
	margemLucroPercent: number;
	faturamentoMenosCustos: number;
}

export interface ViagemAccordionDetailsProps {
	trajetos: TrajetoDados[];
	custos: CustosDados;
	onOpenFullDetails?: () => void;
	onAddCarga?: () => void;
	onAddDeslocamentoVazio?: () => void;
	/** Viagem atual (para exibir botões Iniciar/Finalizar viagem). */
	trip?: Viagem;
	/** Callback para iniciar a viagem (status EM_VIAGEM). Exibido apenas quando trip está PLANEJADA. */
	onIniciarViagem?: (tripId: string) => void;
	/** Callback para finalizar a viagem (status CONCLUIDA). Exibido apenas quando trip está EM_VIAGEM ou EM_COLETA. dtConclusao opcional para "selecionar quando". */
	onFinalizarViagem?: (tripId: string, dtConclusao?: string) => void;
	/** @deprecated Use onFinalizarViagem. Callback para encerrar a viagem (status CONCLUIDA). Mantido para compatibilidade. */
	onEncerrarViagem?: (tripId: string) => void;
}

function itemAndValue(title: string, value: number, color?: string, isPercentage?: boolean) {
	return (
		<div className="min-w-[120px]">
			<p className="text-[13px]">{title}</p>
			<p className={`text-base font-semibold ${color ?? ''}`}>
				{isPercentage
					? `${value}%`
					: value.toLocaleString('pt-br', {
							style: 'currency',
							currency: 'BRL',
						})}
			</p>
		</div>
	);
}

/**
 * Accordion de detalhes de viagem usado em TMS > Viagens (modal do olho).
 * Este é o componente em evolução; o accordion da tela Faturamento > Viagens e Cargas é legado (FaturamentoViagensCargasAccordionDetails).
 */
const isPlanejada = (t: Viagem | undefined) =>
	t && t.ds_status === 'PLANEJADA' && t.status !== 'Completed';
const isEmViagemOuColeta = (t: Viagem | undefined) =>
	t && (t.ds_status === 'EM_VIAGEM' || t.ds_status === 'EM_COLETA');

export function ViagemAccordionDetails({
	trajetos,
	custos,
	onOpenFullDetails,
	onAddCarga,
	onAddDeslocamentoVazio,
	trip,
	onIniciarViagem,
	onFinalizarViagem,
	onEncerrarViagem,
}: ViagemAccordionDetailsProps) {
	const showIniciar = isPlanejada(trip) && onIniciarViagem;
	const showFinalizar = isEmViagemOuColeta(trip) && (onFinalizarViagem ?? onEncerrarViagem);
	const hasTripActions = showIniciar || showFinalizar;
	return (
		<div className="flex w-full min-w-0 flex-col gap-4 p-5">
			<div className="flex flex-col gap-4">
				{trajetos.map((trajeto) => (
					<div
						className="bg-secondary/80 flex flex-col gap-4 rounded-2xl border border-border/60 p-5 text-sm shadow-sm"
						key={trajeto.id}
					>
						<p className="bg-foreground text-background m-0 w-fit rounded-md px-3 py-1.5 text-sm font-bold tracking-wide">
							{trajeto.rotuloTrajeto}
						</p>
						{/* Origem: grid simétrico — badge | local | embarcador | cliente (colunas 3 e 4 com largura igual) */}
						<div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr_1fr_1fr] sm:items-start">
							<Badge variant="transit" className="w-[86px] shrink-0 border-none px-4 py-2 sm:mt-0.5">
								Origem
							</Badge>
							<div className="min-w-0 space-y-0.5">
								<p className="text-sm font-semibold text-foreground">{trajeto.origem.cidade}</p>
								<p className="text-[13px] text-muted-foreground">{trajeto.origem.endereco}</p>
							</div>
							<div className="min-w-0 space-y-1 border-border/50 sm:border-l sm:pl-4">
								<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Embarcador/Expedidor</p>
								<p className="text-[13px] text-foreground">{trajeto.origem.embarcadorExpedidor}</p>
								{trajeto.origem.embarcadorDocumento && (
									<p className="text-xs text-muted-foreground">({formatCnpjCpf(trajeto.origem.embarcadorDocumento)})</p>
								)}
							</div>
							<div className="min-w-0 space-y-1 border-border/50 sm:border-l sm:pl-4">
								<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente/Tomador</p>
								<p className="text-[13px] text-foreground">{trajeto.origem.clienteTomador}</p>
								{trajeto.origem.clienteDocumento && (
									<p className="text-xs text-muted-foreground">({formatCnpjCpf(trajeto.origem.clienteDocumento)})</p>
								)}
							</div>
						</div>
						{trajeto.destinos.map((destino, destIndex) => (
							<div
								className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border/50 pt-4 sm:grid-cols-[auto_1fr_1fr_auto_auto] sm:items-start"
								key={destino.id}
							>
								<Badge variant="cargo" className="w-[86px] shrink-0 border-none px-4 py-2 sm:mt-0.5">
									{trajeto.isDeslocamentoVazio ? 'Destino' : `Entrega ${destIndex + 1}`}
								</Badge>
								<div className="min-w-0 space-y-0.5">
									<p className="text-sm font-semibold text-foreground">{destino.cidade}</p>
									<p className="text-[13px] text-muted-foreground">{destino.endereco}</p>
								</div>
								<div className="min-w-0 space-y-1 border-border/50 sm:border-l sm:pl-4">
									<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Destinatário</p>
									<p className="text-[13px] font-medium text-foreground">{destino.destinatario}</p>
									{destino.destinatarioDocumento && (
										<p className="text-xs text-muted-foreground">
											({formatCnpjCpf(destino.destinatarioDocumento)} | {destino.cidade})
										</p>
									)}
								</div>
								<div className="min-w-0 space-y-1 border-border/50 sm:border-l sm:pl-4 sm:min-w-[72px]">
									<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Docs</p>
									<div className="flex flex-wrap gap-1.5">
										{destino.docs.map((doc, docIndex) => (
											<Badge variant="successTwo" key={docIndex} className="text-[12px]">
												{doc}
											</Badge>
										))}
										{destino.docs.length === 0 && <span className="text-[13px] text-muted-foreground">—</span>}
									</div>
								</div>
								<div className="min-w-0 space-y-1 border-border/50 sm:border-l sm:pl-4 sm:min-w-[88px]">
									<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
									<Badge
										variant={destino.statusParaBadge === 'planned' ? 'muted' : destino.statusParaBadge}
										className="border-transparent p-2"
									>
										{badgeTripStatus(destino.statusParaBadge)}
									</Badge>
								</div>
							</div>
						))}
					</div>
				))}
			</div>
			<h6 className="text-sm font-semibold text-foreground">Detalhes dos custos</h6>
			<div className="bg-secondary/80 flex flex-wrap gap-6 rounded-2xl border border-border/60 p-6 shadow-sm">
				{itemAndValue('Combustível', custos.combustivel)}
				{itemAndValue('Pedágio', custos.pedagio)}
				{itemAndValue('Outras despesas', custos.outrasDespesas)}
				{itemAndValue('Custos pessoal', custos.custosPessoal)}
				{itemAndValue('Custos total', custos.custosTotal, 'text-[#D00000]')}
				{itemAndValue('Margem de lucro', Math.round(custos.margemLucroPercent), 'text-[#38B000]', true)}
				{itemAndValue('Faturamento - custos totais', custos.faturamentoMenosCustos, 'text-[#38B000]')}
			</div>
			{(onOpenFullDetails || onAddCarga || onAddDeslocamentoVazio || hasTripActions) && (
				<div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/50 pt-4">
					{onAddCarga && (
						<Button type="button" variant="outline" size="sm" className="gap-2" onClick={onAddCarga}>
							<Plus size={14} />
							Nova carga
						</Button>
					)}
					{onAddDeslocamentoVazio && (
						<Button type="button" variant="outline" size="sm" className="gap-2" onClick={onAddDeslocamentoVazio}>
							<Route size={14} />
							Deslocamento vazio
						</Button>
					)}
					{onOpenFullDetails && (
						<Button type="button" variant="outline" size="sm" className="gap-2" onClick={onOpenFullDetails}>
							<Eye size={14} />
							Abrir detalhes completos
						</Button>
					)}
					{showIniciar && trip && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-2 border-blue-500/30 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-300"
							onClick={() => onIniciarViagem?.(trip.id)}
						>
							<Play size={14} />
							Iniciar viagem
						</Button>
					)}
					{showFinalizar && trip && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
							onClick={() => (onFinalizarViagem ?? onEncerrarViagem)?.(trip.id)}
						>
							<CheckCircle size={14} />
							Finalizar viagem
						</Button>
					)}
				</div>
			)}
		</div>
	);
}

/** Mapeia status da carga/entrega TMS para o badge (fonte única status-viagens). Quando a viagem está PLANEJADA, entregas ainda não iniciadas exibem "Planejado". */
function mapStatusToBadge(dsStatus: string | undefined, tripStatus: string | undefined): StatusParaBadge {
	if (!dsStatus) return tripStatus === 'PLANEJADA' ? 'planned' : 'transit';
	const variant = getTmsStatusVariant(dsStatus);
	if (variant === 'successTwo') return 'successTwo';
	if (variant === 'late') return 'late';
	if (variant === 'transit') return 'transit';
	return tripStatus === 'PLANEJADA' ? 'planned' : 'transit';
}

/**
 * Calcula receita da viagem em centavos (soma dos CT-e das cargas).
 * Mesma lógica usada na tabela de viagens.
 */
export function calcularReceitaViagemCentavos(trip: Viagem): number {
	let receita = 0;
	for (const viagemCarga of trip.js_viagens_cargas || []) {
		const carga = viagemCarga.tms_cargas;
		if (!carga) continue;
		if (carga.js_entregas && carga.js_entregas.length > 0) {
			carga.js_entregas.forEach((entrega: { js_entregas_ctes?: Array<{ js_cte?: { vl_total?: string | number } }> }) => {
				const valorCtes =
					entrega.js_entregas_ctes?.reduce((sum, cteLink) => {
						return sum + Number(cteLink.js_cte?.vl_total ?? 0);
					}, 0) ?? 0;
				receita += valorCtes;
			});
		} else {
			const valorLegado =
				(carga as Carga & { js_cargas_ctes?: Array<{ js_cte?: { vl_total?: string | number } }> }).js_cargas_ctes?.reduce(
					(sum, cteLink) => sum + Number(cteLink.js_cte?.vl_total ?? 0),
					0,
				) ?? 0;
			receita += valorLegado;
		}
	}
	return receita;
}

/**
 * Agrega despesas por tipo para o bloco de custos.
 * - ABASTECIMENTO → combustível
 * - PEDAGIO → pedágio
 * - PESSOAL (ou CUSTO_PESSOAL) → custos pessoal
 * - Demais tipos → outras despesas
 * Despesas com ds_tipo === 'ADIANTAMENTO' são ignoradas.
 */
function agregarDespesasPorTipo(despesas: Despesa[]): {
	combustivel: number;
	pedagio: number;
	outrasDespesas: number;
	custosPessoal: number;
	total: number;
} {
	let combustivel = 0;
	let pedagio = 0;
	let outrasDespesas = 0;
	let custosPessoal = 0;
	const onlyDespesas = despesas.filter((d) => d.ds_tipo !== 'ADIANTAMENTO');
	for (const d of onlyDespesas) {
		const valor = Number(d.vl_despesa ?? d.valor ?? 0) || 0;
		const tipo = (d.con_conta_despesa?.ds_tipo_tms_despesa ?? '').toUpperCase();
		if (tipo === 'ABASTECIMENTO') combustivel += valor;
		else if (tipo === 'PEDAGIO') pedagio += valor;
		else if (tipo === 'PESSOAL' || tipo === 'CUSTO_PESSOAL') custosPessoal += valor;
		else if (tipo === 'ADIANTAMENTO') continue;
		else outrasDespesas += valor;
	}
	// Custo total = soma de combustível + pedágio + outras despesas + custos pessoal
	const total = combustivel + pedagio + outrasDespesas + custosPessoal;
	return { combustivel, pedagio, outrasDespesas, custosPessoal, total };
}

/** Carga com relações (API pode retornar snake_case ou camelCase). */
type CargaComRelacoes = Carga & {
	fis_clientes?: { ds_nome?: string; ds_documento?: string } | null;
	tms_embarcadores?: {
		ds_nome?: string;
		ds_documento?: string;
		ds_logradouro?: string;
		ds_numero?: string;
		ds_complemento?: string;
		ds_bairro?: string;
		ds_cep?: string;
		ds_uf?: string;
		sis_igbe_city?: { ds_city?: string; ds_uf?: string } | null;
	} | null;
	cliente?: { ds_nome?: string } | null;
	embarcador?: { ds_nome?: string } | null;
	origem?: { ds_nome_mun?: string; ds_uf?: string } | null;
	destino?: { ds_nome_mun?: string; ds_uf?: string } | null;
};

/** Lê nome do cliente/tomador de qualquer formato que a API retornar. */
function getClienteTomador(carga: CargaComRelacoes | undefined): string {
	if (!carga) return '—';
	const c = carga as unknown as Record<string, unknown>;
	const rel = (key: string) => (c[key] as { ds_nome?: string } | null | undefined)?.ds_nome;
	return (
		rel('fis_clientes') ??
		rel('fisClientes') ??
		rel('FisClientes') ??
		rel('cliente') ??
		rel('tms_clientes') ?? // legado: fallback se API ainda enviar
		'—'
	);
}

/** Lê nome do embarcador/expedidor de qualquer formato que a API retornar. */
function getEmbarcadorExpedidor(carga: CargaComRelacoes | undefined): string {
	if (!carga) return '—';
	const c = carga as unknown as Record<string, unknown>;
	const rel = (key: string) => (c[key] as { ds_nome?: string } | null | undefined)?.ds_nome;
	return (
		rel('tms_embarcadores') ??
		rel('tmsEmbarcadores') ??
		rel('TmsEmbarcadores') ??
		rel('embarcador') ??
		'—'
	);
}

/** Lê CNPJ/CPF do embarcador de qualquer formato que a API retornar. */
function getEmbarcadorDocumento(carga: CargaComRelacoes | undefined): string | undefined {
	if (!carga) return undefined;
	const c = carga as unknown as Record<string, unknown>;
	const rel = (key: string) => (c[key] as { ds_documento?: string } | null | undefined)?.ds_documento;
	const doc = rel('tms_embarcadores') ?? rel('tmsEmbarcadores') ?? rel('TmsEmbarcadores') ?? rel('embarcador');
	return doc && String(doc).trim() ? String(doc).trim() : undefined;
}

/** Lê CNPJ/CPF do cliente (fis_clientes) de qualquer formato que a API retornar. */
function getClienteDocumento(carga: CargaComRelacoes | undefined): string | undefined {
	if (!carga) return undefined;
	const c = carga as unknown as Record<string, unknown>;
	const rel = (key: string) => (c[key] as { ds_documento?: string } | null | undefined)?.ds_documento;
	const doc = rel('fis_clientes') ?? rel('fisClientes') ?? rel('FisClientes') ?? rel('cliente');
	return doc && String(doc).trim() ? String(doc).trim() : undefined;
}

/** Lê endereço da origem da carga (vários nomes de campo da API). */
function getEnderecoOrigem(carga: CargaComRelacoes | Record<string, unknown> | undefined): string {
	if (!carga) return '—';
	const c = carga as Record<string, unknown>;
	const tryFields = (keys: string[]) => {
		for (const k of keys) {
			const v = c[k];
			if (v != null && String(v).trim()) return String(v).trim();
		}
		return '';
	};
	const val =
		tryFields([
			'ds_endereco_origem',
			'endereco_origem',
			'dsEnderecoOrigem',
			'enderecoOrigem',
			'ds_endereco_coleta',
			'dsEnderecoColeta',
			'ds_endereco',
			'dsEndereco',
			'endereco',
		]) ||
		(c?.js_entregas as Array<{ ds_endereco?: string }> | undefined)?.[0]?.ds_endereco?.trim() ||
		'';
	return val || '—';
}

/** Monta endereço completo a partir do cadastro do embarcador (origem quando carga tem id_embarcador). */
function getEnderecoEmbarcador(carga: CargaComRelacoes | undefined): string {
	if (!carga) return '—';
	const c = carga as unknown as Record<string, unknown>;
	const emb = (c.tms_embarcadores ?? c.tmsEmbarcadores ?? c.TmsEmbarcadores) as
		| {
				ds_logradouro?: string;
				ds_numero?: string;
				ds_complemento?: string;
				ds_bairro?: string;
				ds_cep?: string;
				ds_uf?: string;
				sis_igbe_city?: { ds_city?: string; ds_uf?: string } | null;
		  }
		| null
		| undefined;
	if (!emb) return '—';
	const parts: string[] = [];
	if (emb.ds_logradouro?.trim()) {
		let logr = emb.ds_logradouro.trim();
		if (emb.ds_numero?.trim()) logr += `, ${emb.ds_numero.trim()}`;
		if (emb.ds_complemento?.trim()) logr += ` - ${emb.ds_complemento.trim()}`;
		parts.push(logr);
	}
	if (emb.ds_bairro?.trim()) parts.push(emb.ds_bairro.trim());
	const cidadeUf = emb.sis_igbe_city?.ds_city
		? [emb.sis_igbe_city.ds_city, emb.sis_igbe_city.ds_uf ?? emb.ds_uf].filter(Boolean).join('/')
		: emb.ds_uf?.trim();
	if (cidadeUf) parts.push(cidadeUf);
	if (emb.ds_cep?.trim()) parts.push(`CEP ${emb.ds_cep.trim()}`);
	return parts.length > 0 ? parts.join(' - ') : '—';
}

/** Lê endereço do destino da entrega (vários nomes de campo da API). Se vazio, usa CTe (ds_endereco_destino). */
function getEnderecoDestino(ent: Record<string, unknown> & { ds_endereco?: string }): string {
	const tryFields = (keys: string[]) => {
		for (const k of keys) {
			const v = ent[k];
			if (v != null && String(v).trim()) return String(v).trim();
		}
		return '';
	};
	let val = tryFields([
		'ds_endereco',
		'dsEndereco',
		'ds_endereco_destino',
		'dsEnderecoDestino',
		'endereco_destino',
		'enderecoDestino',
		'endereco',
	]);
	if (!val) {
		const ctes = ent.js_entregas_ctes as Array<{ js_cte?: { ds_endereco_destino?: string; ds_complemento_destino?: string } }> | undefined;
		const cte = ctes?.[0]?.js_cte;
		if (cte?.ds_endereco_destino?.trim()) {
			val = cte.ds_endereco_destino.trim();
			if (cte.ds_complemento_destino?.trim()) val += ` - ${cte.ds_complemento_destino.trim()}`;
		}
	}
	return val || '—';
}

/** Monta string cidade/UF a partir de sis_cidade (ds_city + js_uf.ds_uf) ou objeto origem/destino (ds_nome_mun + ds_uf). */
function formatCidadeUf(
	sisCidade?: { ds_city?: string; js_uf?: { ds_uf?: string } } | null,
	fallback?: { ds_nome_mun?: string; ds_uf?: string } | null,
): string {
	if (sisCidade?.ds_city) {
		const uf = sisCidade.js_uf?.ds_uf ?? '';
		return uf ? `${sisCidade.ds_city}/${uf}` : sisCidade.ds_city;
	}
	if (fallback?.ds_nome_mun) {
		const uf = fallback.ds_uf ?? '';
		return uf ? `${fallback.ds_nome_mun}/${uf}` : fallback.ds_nome_mun;
	}
	return '—';
}

/** Dados do remetente (toma) ou emitente do primeiro CTe/NFe da carga (para preencher origem). Prioriza remetente e usa endereço do remetente quando disponível. */
function getRemetenteFromCarga(carga: CargaComRelacoes | undefined): {
	cidade: string;
	endereco: string;
	razaoSocial: string;
} | null {
	if (!carga?.js_entregas?.length) return null;
	for (const ent of carga.js_entregas as unknown as Array<Record<string, unknown>>) {
		const cte = (ent.js_entregas_ctes as Array<{ js_cte?: Record<string, unknown> }> | undefined)?.[0]?.js_cte;
		// Priorizar remetente (toma) do CTe e usar endereço do remetente quando existir
		if (cte?.ds_razao_social_remetente || cte?.ds_documento_remetente) {
			const cidade = [cte.ds_nome_mun_ini, cte.ds_uf_ini].filter(Boolean).join('/') || '—';
			let endereco = (cte.ds_endereco_remetente as string)?.trim() || '—';
			if (endereco !== '—' && (cte.ds_complemento_remetente as string)?.trim()) {
				endereco += ` - ${(cte.ds_complemento_remetente as string).trim()}`;
			}
			return {
				cidade: cidade as string,
				endereco,
				razaoSocial: (cte.ds_razao_social_remetente as string) || (cte.ds_documento_remetente as string) || '—',
			};
		}
		// Fallback: emitente do CTe (sem endereço remetente)
		if (cte?.ds_razao_social_emitente || cte?.ds_documento_emitente) {
			const cidade = [cte.ds_nome_mun_ini, cte.ds_uf_ini].filter(Boolean).join('/') || '—';
			return {
				cidade: cidade as string,
				endereco: '—',
				razaoSocial: (cte.ds_razao_social_emitente as string) || (cte.ds_documento_emitente as string) || '—',
			};
		}
		const nfe = (ent.js_entregas_nfes as Array<{ js_nfe?: Record<string, unknown> }> | undefined)?.[0]?.js_nfe;
		if (nfe?.ds_razao_social_emitente || nfe?.ds_documento_emitente) {
			const cidade = [nfe.ds_municipio_emitente, nfe.ds_uf_emitente].filter(Boolean).join(' - ') || '—';
			return {
				cidade: cidade as string,
				endereco: '—',
				razaoSocial: (nfe.ds_razao_social_emitente as string) || (nfe.ds_documento_emitente as string) || '—',
			};
		}
	}
	return null;
}

/**
 * Converte Viagem + despesas + receita (centavos) nos dados para ViagemAccordionDetails.
 */
export function viagemToAccordionData(
	trip: Viagem,
	despesas: Despesa[],
	receitaCentavos: number,
): { trajetos: TrajetoDados[]; custos: CustosDados } {
	const rawOrdered = [...(trip.js_viagens_cargas ?? [])].sort((a, b) => (a.nr_sequencia ?? 0) - (b.nr_sequencia ?? 0));
	// Deduplicar por id_carga (manter primeira ocorrência)
	const seenCargas = new Set<string>();
	const ordered = rawOrdered.filter((vc) => {
		const id = vc.id_carga;
		if (id && seenCargas.has(id)) return false;
		if (id) seenCargas.add(id);
		return true;
	});

	const tripCargas = (trip as Viagem & { cargas?: Carga[] }).cargas;
	const trajetos: TrajetoDados[] = ordered.map((vc, index) => {
		const carga = (tripCargas?.find((c) => c.id === vc.id_carga) ?? vc.tms_cargas) as CargaComRelacoes | undefined;
		const isDeslocamentoVazio = carga?.fl_deslocamento_vazio === true || carga?.cd_carga === 'DESLOCAMENTO_VAZIO';
		const rotuloTrajeto = isDeslocamentoVazio ? `Deslocamento Vazio ${index + 1}` : `Carga ${index + 1}`;

		let origemCidade = formatCidadeUf(carga?.sis_cidade_origem, carga?.origem);
		let origemEnderecoStr = getEnderecoOrigem(carga);
		if (!origemEnderecoStr || origemEnderecoStr === '—') {
			origemEnderecoStr = getEnderecoEmbarcador(carga);
		}
		let embarcador = getEmbarcadorExpedidor(carga);
		const remetente = getRemetenteFromCarga(carga);
		if ((!origemCidade || origemCidade === '—') && (!origemEnderecoStr || origemEnderecoStr === '—') && remetente) {
			origemCidade = remetente.cidade;
			origemEnderecoStr = remetente.endereco;
			if (!embarcador || embarcador === '—') embarcador = remetente.razaoSocial;
		} else if ((!origemEnderecoStr || origemEnderecoStr === '—') && remetente?.endereco && remetente.endereco !== '—') {
			origemEnderecoStr = remetente.endereco;
		}

		const entregas = carga?.js_entregas ?? [];
		const destinos: TrajetoDestino[] = [];
		const destinatarioNome = getClienteTomador(carga);
		if (entregas.length > 0) {
			entregas.forEach((ent, idx) => {
				const entAny = ent as unknown as Record<string, unknown>;
				const sisDestino = ent.sis_cidade_destino;
				const destinoFallback = entAny.destino as { ds_nome_mun?: string; ds_uf?: string } | undefined;
				const cidade = formatCidadeUf(sisDestino, destinoFallback);
				const enderecoStr = getEnderecoDestino(ent as unknown as Record<string, unknown> & { ds_endereco?: string });
				const destNome = (entAny.ds_nome_destinatario ?? entAny.ds_nome_recebedor) as string | undefined;
				const destinatario = destNome && String(destNome).trim() ? String(destNome) : destinatarioNome;
				const docDest = (entAny.ds_documento_destinatario ?? entAny.ds_documento_recebedor) as string | undefined;
				const docs: string[] = [];
				ent.js_entregas_ctes?.forEach((lc) => {
					if (lc.js_cte?.ds_numero) docs.push(lc.js_cte.ds_numero);
				});
				ent.js_entregas_nfes?.forEach((ln) => {
					if (ln.js_nfe?.ds_numero) docs.push(ln.js_nfe.ds_numero);
				});
				const status = (ent as { ds_status?: string }).ds_status ?? carga?.ds_status ?? 'PENDENTE';
				const tripStatus = (trip as { ds_status?: string }).ds_status;
				destinos.push({
					id: ent.id ?? `e-${idx}`,
					cidade,
					endereco: enderecoStr,
					destinatario,
					destinatarioDocumento: docDest && String(docDest).trim() ? String(docDest) : undefined,
					docs,
					statusParaBadge: mapStatusToBadge(status, tripStatus),
				});
			});
		} else {
			const cidade = formatCidadeUf(carga?.sis_cidade_destino, carga?.destino);
			const tripStatus = (trip as { ds_status?: string }).ds_status;
			destinos.push({
				id: carga?.id ?? vc.id,
				cidade,
				endereco: '—',
				destinatario: isDeslocamentoVazio ? 'Deslocamento vazio' : destinatarioNome,
				docs: [],
				statusParaBadge: mapStatusToBadge(carga?.ds_status, tripStatus),
			});
		}
		return {
			id: vc.id,
			isDeslocamentoVazio,
			rotuloTrajeto,
			origem: {
				cidade: origemCidade,
				endereco: origemEnderecoStr,
				embarcadorExpedidor: embarcador,
				embarcadorDocumento: getEmbarcadorDocumento(carga),
				clienteTomador: destinatarioNome,
				clienteDocumento: getClienteDocumento(carga),
			},
			destinos,
		};
	});

	const agg = agregarDespesasPorTipo(despesas);
	// Custo total = soma das despesas (combustível + pedágio + outras despesas + custos pessoal)
	const custosTotal = agg.total;
	const receitaReais = receitaCentavos / 100;
	const faturamentoMenosCustos = Math.max(0, receitaReais - custosTotal);
	// Margem de lucro: regra de negócio será definida ainda
	const margemLucroPercent = receitaReais > 0 ? (faturamentoMenosCustos / receitaReais) * 100 : 0;

	const custos: CustosDados = {
		combustivel: agg.combustivel,
		pedagio: agg.pedagio,
		outrasDespesas: agg.outrasDespesas,
		custosPessoal: agg.custosPessoal,
		custosTotal,
		margemLucroPercent,
		faturamentoMenosCustos,
	};

	return { trajetos, custos };
}
