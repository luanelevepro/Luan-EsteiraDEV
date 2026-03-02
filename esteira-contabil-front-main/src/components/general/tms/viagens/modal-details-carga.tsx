import React from 'react';
import { Carga } from '@/types/tms';
import {
	X,
	MapPin,
	Calendar,
	Package,
	ArrowRight,
	StickyNote,
	Weight,
	Box,
	Clock,
	DollarSign,
	Shield,
	Zap,
	AlertTriangle,
	Tag,
	Target,
	Truck,
	User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/general/tms/viagens/status-viagens';
import { getStripeBgClass, type BorderStatus } from '@/components/general/tms/viagens/viagem-timeline-cards';

interface LoadDetailsModalProps {
	load: Carga | null;
	onClose: () => void;
	onSchedule: (load: Carga) => void;
	onEdit?: (load: Carga) => void;
}

// ===== HELPERS =====

/** Mapeia ds_status da entrega para BorderStatus (faixa lateral do card). */
function entregaStatusToBorderStatus(ds_status: string | undefined): BorderStatus {
	if (ds_status === 'ENTREGUE') return 'entregue';
	if (ds_status === 'EM_TRANSITO') return 'em_rota';
	return 'agendado';
}

const getHoursUntilDeadline = (deadline?: string): number | null => {
	if (!deadline) return null;
	const now = new Date();
	const deadlineDate = new Date(deadline);
	return (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
};

// Extrai a menor data de entrega da carga (usando js_entregas ou fallback)
const getEarliestDeadline = (load: Carga): string | undefined => {
	// Busca a menor data de entrega entre todas as entregas (js_entregas)
	if (load.js_entregas && load.js_entregas.length > 0) {
		// Ordena entregas por nr_sequencia (primeira entrega tem prioridade)
		const sortedEntregas = [...load.js_entregas].sort((a, b) => a.nr_sequencia - b.nr_sequencia);

		// Pega a primeira entrega com data limite
		const firstEntregaWithDeadline = sortedEntregas.find((e) => e.dt_limite_entrega);

		if (firstEntregaWithDeadline?.dt_limite_entrega) {
			return firstEntregaWithDeadline.dt_limite_entrega;
		}
	}

	return undefined;
};

const getUrgencyLevel = (load: Carga): 'critical' | 'warning' | 'attention' | 'normal' => {
	// Primeiro verifica prioridade explícita
	if (load.ds_prioridade === 'URGENTE') return 'critical';

	const deadline = getEarliestDeadline(load);
	const hours = getHoursUntilDeadline(deadline);

	if (hours === null) return 'normal';

	if (hours <= 12) return 'critical'; // Menos de 12h - CRÍTICO
	if (hours <= 24) return 'warning'; // Menos de 24h - ALERTA
	if (hours <= 48) return 'attention'; // Menos de 48h - ATENÇÃO
	return 'normal';
};

const formatWeight = (weight?: number): string => {
	if (!weight) return '-';
	if (weight >= 1000) return `${(weight / 1000).toFixed(1)} ton`;
	return `${weight} kg`;
};

const formatCurrency = (value?: number): string => {
	if (!value) return '-';
	return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Soma o valor total das mercadorias da carga: entrega.vl_total_mercadoria ou fallback (CT-e vl_total + NF-e vl_nf em centavos)
const getValorTotalMercadoriasCarga = (load: Carga): number | undefined => {
	if (!load.js_entregas?.length) return undefined;
	const porEntregas = load.js_entregas.reduce((acc, e) => acc + (e.vl_total_mercadoria ?? 0), 0);
	if (porEntregas > 0) return porEntregas;
	// Fallback: soma dos valores dos documentos (CT-e e NF-e, valores em centavos)
	let totalCentavos = 0;
	for (const e of load.js_entregas) {
		for (const ec of e.js_entregas_ctes ?? []) {
			if (ec.js_cte?.vl_total) totalCentavos += Number(ec.js_cte.vl_total);
		}
		for (const en of e.js_entregas_nfes ?? []) {
			if (en.js_nfe?.vl_nf) totalCentavos += Number(en.js_nfe.vl_nf);
		}
	}
	return totalCentavos > 0 ? totalCentavos / 100 : undefined;
};

const formatTimeRemaining = (deadline?: string): string => {
	const hours = getHoursUntilDeadline(deadline);
	if (hours === null) return 'Sem prazo definido';
	if (hours < 0) return 'PRAZO VENCIDO';
	if (hours < 1) return `${Math.round(hours * 60)} minutos`;
	if (hours < 24) return `${Math.round(hours)} horas`;
	const days = Math.floor(hours / 24);
	const remainingHours = Math.round(hours % 24);
	return `${days} dia${days > 1 ? 's' : ''} e ${remainingHours}h`;
};

// Formata com segurança strings de data/hora, evitando "Invalid Date" quando o valor for nulo ou inválido
const safeFormatDateTime = (iso?: string): { date: string; time?: string } => {
	if (!iso) return { date: 'A definir' };
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return { date: 'A definir' };
	return {
		date: d.toLocaleDateString('pt-BR'),
		time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
	};
};

const formatPriority = (priority?: Carga['ds_prioridade']): { label: string; color: string } => {
	switch (priority) {
		case 'URGENTE':
			return { label: 'Urgente', color: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' };
		case 'ALTA':
			return { label: 'Alta', color: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300' };
		case 'NORMAL':
			return { label: 'Normal', color: 'bg-muted text-muted-foreground border-border' };
		case 'BAIXA':
			return { label: 'Baixa', color: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300' };
		default:
			return { label: 'Normal', color: 'bg-muted text-muted-foreground border-border' };
	}
};

const formatTipoCarroceria = (tipo?: Carga['ds_tipo_carroceria']): string => {
	if (!tipo) return '-';
	const labels: Record<NonNullable<Carga['ds_tipo_carroceria']>, string> = {
		GRANELEIRO: 'Graneleiro',
		BAU: 'Baú',
		SIDER: 'Sider',
		FRIGORIFICO: 'Frigorífico',
		TANQUE: 'Tanque',
		PORTA_CONTAINER: 'Porta Container',
	};
	return labels[tipo] ?? tipo;
};

// ===== COMPONENT =====

export const LoadDetailsModal: React.FC<LoadDetailsModalProps> = ({ load, onClose, onSchedule, onEdit }) => {
	if (!load) return null;
	const urgency = getUrgencyLevel(load);
	const priority = formatPriority(load.ds_prioridade);

	const urgencyConfig = {
		critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-700 dark:text-red-300', icon: Zap, label: 'CRÍTICO' },
		warning: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-700 dark:text-orange-300', icon: AlertTriangle, label: 'ALERTA' },
		attention: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-700 dark:text-yellow-300', icon: Clock, label: 'ATENÇÃO' },
		normal: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-700 dark:text-green-300', icon: null, label: 'NO PRAZO' },
	};

	const urg = urgencyConfig[urgency];

	// Filtrar entregas que não possuem status ENTREGUE, CANCELADA ou DEVOLVIDA
	const CLOSED_STATUS = ['ENTREGUE', 'CANCELADA', 'DEVOLVIDA'];
	const activeDeliveries = load.js_entregas?.filter((entrega) => !CLOSED_STATUS.includes(entrega.ds_status)) || [];
	const latestActiveDelivery = activeDeliveries.length > 0 ? activeDeliveries[activeDeliveries.length - 1] : null;

	return (
		<div className='absolute inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
			<div className='animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl duration-200'>
				{/* Header */}
				<div className='flex items-start justify-between border-b border-border/70 bg-muted/50 p-8'>
					<div>
						<div className='mb-2 flex flex-wrap items-center gap-3'>
							<StatusBadge status={load.ds_status} context='carga' size='sm' />
							<span className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-widest uppercase ${priority.color}`}>
								{priority.label}
							</span>
							{load.tms_segmentos?.ds_nome && (
								<span className='flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-purple-700 dark:text-purple-300 uppercase'>
									<Tag size={10} /> {load.tms_segmentos?.ds_nome}
								</span>
							)}
							<span className='font-mono text-xs text-muted-foreground'>#{load.cd_carga}</span>
						</div>
						<h3 className='text-2xl font-black tracking-tight text-foreground uppercase'>
							{load.tms_embarcadores?.ds_nome || (load.fis_clientes ?? load.tms_clientes)?.ds_nome || `Carga ${load.cd_carga || load.id}`}
						</h3>
					</div>
					<div className='flex items-center gap-2'>
						{onEdit && (
							<button
								onClick={() => onEdit(load)}
								className='rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
								title='Editar Carga'
							>
								<StickyNote size={20} />
							</button>
						)}
						<button
							onClick={onClose}
							className='rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
						>
							<X size={24} />
						</button>
					</div>
				</div>
				{/* SLA Banner */}
				{latestActiveDelivery && load.ds_status === 'PENDENTE' && (
					<div className={`px-8 py-4 ${urg.bg} border-b ${urg.border} flex items-center justify-between`}>
						<div className='flex items-center gap-3'>
							{urg.icon && <urg.icon size={20} className={urg.text} />}
							<div>
								<div className={`text-[10px] font-black tracking-widest uppercase ${urg.text}`}>Status do SLA: {urg.label}</div>
								<div className={`text-sm font-bold ${urg.text}`}>
									{(() => {
										const earliest = safeFormatDateTime(getEarliestDeadline(load));
										return (
											<>
												Prazo de entrega: {earliest.date}
												{earliest.time ? ` às ${earliest.time}` : ''}
											</>
										);
									})()}
								</div>
							</div>
						</div>
						<div className={`text-right`}>
							<div className={`text-2xl font-black ${urg.text}`}>{formatTimeRemaining(latestActiveDelivery.dt_limite_entrega)}</div>
							<div className={`text-[10px] font-bold uppercase ${urg.text} opacity-70`}>restantes</div>
						</div>
					</div>
				)}{' '}
				{/* Content */}
				<div className='custom-scrollbar flex-1 overflow-y-auto bg-card p-8'>
					<div className='grid grid-cols-1 gap-10 md:grid-cols-2'>
						{/* Column 1: Route & Dates */}
						<div className='space-y-8'>
							{/* Rota */}
							<div>
								<h4 className='mb-4 flex items-center gap-2 text-xs font-black tracking-widest text-muted-foreground uppercase'>
									<MapPin size={14} /> Rota
								</h4>
								<div className='relative space-y-8 border-l-2 border-border/70 pl-6'>
									<div className='relative'>
										<div className='absolute top-1 -left-[29px] h-3 w-3 rounded-full border border-blue-500/30 bg-blue-500/20 shadow-sm ring-4 ring-background'></div>
										<div className='mb-0.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase'>Origem</div>
										<div className='text-lg font-black text-foreground uppercase'>{`${load.sis_cidade_origem?.ds_city} - ${load.sis_cidade_origem?.js_uf?.ds_uf}`}</div>
									</div>
									<div className='relative'>
										<div className='absolute top-1 -left-[29px] h-3 w-3 rounded-full border border-border bg-muted ring-4 ring-background'></div>
										<div className='mb-0.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase'>Destino</div>
										<div className='text-lg font-black text-foreground uppercase'>{`${load.sis_cidade_destino?.ds_city} - ${load.sis_cidade_destino?.js_uf?.ds_uf}`}</div>
									</div>
								</div>
							</div>

							{/* Janelas de Tempo */}
							<div>
								<h4 className='mb-4 flex items-center gap-2 text-xs font-black tracking-widest text-muted-foreground uppercase'>
									<Calendar size={14} /> Janelas de Tempo
								</h4>
								<div className='space-y-3'>
									{/* PRAZOS DE COLETA: Data de Coleta (sempre quando existir) + Janela (só se usuário preencheu início/fim) */}
									{load.dt_coleta && (
										<div className='rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 backdrop-blur-sm'>
											<div className='mb-4 flex items-center gap-3'>
												<div className='rounded-xl border border-blue-500/30 bg-blue-500/20 p-2.5 shadow-md'>
													<Target size={20} className='text-blue-700 dark:text-blue-300' />
												</div>
												<div className='flex-1'>
													<div className='text-[9px] font-black tracking-widest text-blue-700 dark:text-blue-300 uppercase'>Prazos de Coleta</div>
													<div className='flex items-center gap-1.5 text-sm font-black text-foreground'>
														<span>
															Data de Coleta: {new Date(load.dt_coleta).toLocaleDateString('pt-BR')}
															{new Date(load.dt_coleta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) !== '00:00' && (
																<> às {new Date(load.dt_coleta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
															)}
														</span>
														{(load.ds_status === 'PENDENTE' || load.ds_status === 'AGENDADA') && (
															<span className='text-[10px] font-medium uppercase text-blue-700/80 dark:text-blue-300/80'>Est.</span>
														)}
													</div>
												</div>
											</div>

											{load.dt_coleta_inicio && load.dt_coleta_fim && (
												<>
													<div className='mb-3 text-[9px] font-black tracking-widest text-blue-700 dark:text-blue-300 uppercase'>Janela de Coleta</div>
													<div className='grid grid-cols-2 gap-3'>
														<div className='rounded-lg border border-blue-500/20 bg-card p-3'>
															<div className='mb-1 text-[8px] font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase'>Início</div>
															<div className='text-xs font-black text-foreground'>
																{new Date(load.dt_coleta_inicio).toLocaleDateString('pt-BR')}
															</div>
															<div className='mt-1 text-[11px] font-bold text-blue-700 dark:text-blue-300'>
																{new Date(load.dt_coleta_inicio).toLocaleTimeString('pt-BR', {
																	hour: '2-digit',
																	minute: '2-digit',
																})}
															</div>
														</div>
														<div className='rounded-lg border border-blue-500/20 bg-card p-3'>
															<div className='mb-1 text-[8px] font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase'>Término</div>
															<div className='text-xs font-black text-foreground'>
																{new Date(load.dt_coleta_fim).toLocaleDateString('pt-BR')}
															</div>
															<div className='mt-1 text-[11px] font-bold text-blue-700 dark:text-blue-300'>
																{new Date(load.dt_coleta_fim).toLocaleTimeString('pt-BR', {
																	hour: '2-digit',
																	minute: '2-digit',
																})}
															</div>
														</div>
													</div>
													<div className='mt-4 flex items-center justify-between rounded-lg border border-blue-500/20 bg-card/80 px-3 py-2'>
														<div className='flex items-center gap-2'>
															<Clock size={14} className='text-blue-700 dark:text-blue-300' />
															<span className='text-[10px] font-bold text-muted-foreground uppercase'>Duração da Janela</span>
														</div>
														<span className='text-xs font-black text-blue-700 dark:text-blue-300'>
															{Math.ceil(
																(new Date(load.dt_coleta_fim).getTime() - new Date(load.dt_coleta_inicio).getTime()) /
																	(1000 * 60 * 60),
															)}{' '}
															hora
															{Math.ceil(
																(new Date(load.dt_coleta_fim).getTime() - new Date(load.dt_coleta_inicio).getTime()) /
																	(1000 * 60 * 60),
															) > 1
																? 's'
																: ''}
														</span>
													</div>
												</>
											)}
										</div>
									)}

									{/* Prazo de Entrega (SLA) - só quando o usuário definiu (existe dt_limite_entrega em alguma entrega) */}
									{(() => {
										const entregasComSla = load.js_entregas?.filter((e) => e.dt_limite_entrega) ?? [];
										return entregasComSla.length > 0 ? (
											<div className={`rounded-2xl border p-4 ${urg.bg} ${urg.border}`}>
												<div className='flex items-center gap-3'>
													<div className={`rounded-xl bg-card p-2 shadow-sm ${urg.text}`}>
														<Clock size={18} />
													</div>
													<div className='flex-1'>
														<div className={`text-[10px] font-bold tracking-wide uppercase ${urg.text}`}>
															Prazo de Entrega (SLA)
														</div>
														<div className={`text-sm font-black ${urg.text}`}>
															{entregasComSla.map((dt, idx) => {
																const formatted = safeFormatDateTime(dt.dt_limite_entrega);
																return (
																	<div key={idx}>
																		{formatted.date}
																		{formatted.time ? ` às ${formatted.time}` : ''} - {dt.sis_cidade_destino?.ds_city}/{' '}
																		{dt.sis_cidade_destino?.js_uf?.ds_uf}
																	</div>
																);
															})}
														</div>
													</div>
												</div>
											</div>
										) : null;
									})()}
								</div>
							</div>

						</div>

						{/* Column 2: Specs & Requirements */}
						<div className='space-y-8'>
							{/* Direita superior: Tipo de Carroceria + Segmento Gerencial */}
							<div className='grid grid-cols-2 gap-3'>
								<div className='rounded-xl border border-border/70 bg-muted/40 p-4'>
									<div className='mb-1 flex items-center gap-2 text-muted-foreground'>
										<Truck size={14} />
										<span className='text-[9px] font-black tracking-widest uppercase'>Tipo de Carroceria</span>
									</div>
									<div className='text-xl font-black text-foreground'>{formatTipoCarroceria(load.ds_tipo_carroceria)}</div>
								</div>
								{load.tms_segmentos?.ds_nome && (
									<div className='rounded-xl border border-purple-500/30 bg-purple-500/10 p-4'>
										<div className='mb-1 flex items-center gap-2 text-purple-700 dark:text-purple-300'>
											<Tag size={14} />
											<span className='text-[9px] font-black tracking-widest uppercase'>Segmento Gerencial</span>
										</div>
										<div className='text-xl font-black text-purple-900 dark:text-purple-100'>{load.tms_segmentos.ds_nome}</div>
									</div>
								)}
							</div>

							{/* Carroceria (carreta) e Veículo (cavalo) - da viagem vinculada ou carroceria planejada da carga (ex.: importação) */}
							{(() => {
								const viagem = load.tms_viagens_cargas?.[0]?.tms_viagens;
								const carretas = [viagem?.ds_placa_carreta_1, viagem?.ds_placa_carreta_2, viagem?.ds_placa_carreta_3].filter(Boolean) as string[];
								const temCarroceriaViagem = carretas.length > 0;
								const temVeiculo = !!viagem?.ds_placa_cavalo;
								const carroceriaPlanejada = load.tms_carroceria_planejada;
								const temCarroceriaPlanejada = !!carroceriaPlanejada?.ds_placa;
								return (
									<div>
										<h4 className='mb-4 flex items-center gap-2 text-xs font-black tracking-widest text-muted-foreground uppercase'>
											<Truck size={14} /> Carroceria e veículo
										</h4>
										{viagem ? (
											<div className='rounded-xl border border-border/70 bg-muted/40 p-4 space-y-3'>
												{temCarroceriaViagem && (
													<div>
														<div className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>Carroceria (carreta)</div>
														<div className='flex flex-wrap gap-2 text-lg font-black text-foreground font-mono'>
															{carretas.map((placa, i) => (
																<span key={i}>{placa}</span>
															))}
														</div>
													</div>
												)}
												{temVeiculo && (
													<div>
														<div className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>Veículo (cavalo)</div>
														<div className='text-lg font-black text-foreground font-mono'>{viagem.ds_placa_cavalo}</div>
													</div>
												)}
												{viagem?.ds_motorista?.trim() && (
													<div>
														<div className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>Motorista</div>
														<div className='flex items-center gap-2 text-lg font-black text-foreground'>
															<User size={16} className='text-muted-foreground' />
															{viagem.ds_motorista}
														</div>
													</div>
												)}
												{!temCarroceriaViagem && !temVeiculo && !viagem?.ds_motorista?.trim() && (
													<div className='text-sm text-muted-foreground'>Não informado.</div>
												)}
											</div>
										) : (
											<div className='rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 space-y-3'>
												{temCarroceriaPlanejada && (
													<div>
														<div className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>Carroceria planejada</div>
														<div className='text-lg font-black text-foreground font-mono'>
															{carroceriaPlanejada.ds_placa}
														</div>
													</div>
												)}
												<div className='text-sm text-muted-foreground'>
													{temCarroceriaPlanejada ? 'Veículo (cavalo) vinculado à viagem quando programada.' : 'Vinculado à viagem quando programada.'}
												</div>
											</div>
										)}
									</div>
								);
							})()}

							{/* Características Físicas (direita inferior) */}
							<div>
								<h4 className='mb-4 flex items-center gap-2 text-xs font-black tracking-widest text-muted-foreground uppercase'>
									<Package size={14} /> Características Físicas
								</h4>
								<div className='grid grid-cols-2 gap-3'>
									<div className='rounded-xl border border-border/70 bg-muted/40 p-4'>
										<div className='mb-1 flex items-center gap-2 text-muted-foreground'>
											<Weight size={14} />
											<span className='text-[9px] font-black tracking-widest uppercase'>Peso Bruto</span>
										</div>
										<div className='text-xl font-black text-foreground'>{formatWeight(load.vl_peso_bruto)}</div>
									</div>
									<div className='rounded-xl border border-border/70 bg-muted/40 p-4'>
										<div className='mb-1 flex items-center gap-2 text-muted-foreground'>
											<Box size={14} />
											<span className='text-[9px] font-black tracking-widest uppercase'>Cubagem</span>
										</div>
										<div className='text-xl font-black text-foreground'>{load.vl_cubagem ? `${load.vl_cubagem} m³` : '-'}</div>
									</div>
									<div className='rounded-xl border border-border/70 bg-muted/40 p-4'>
										<div className='mb-1 flex items-center gap-2 text-muted-foreground'>
											<Package size={14} />
											<span className='text-[9px] font-black tracking-widest uppercase'>Volumes</span>
										</div>
										<div className='text-xl font-black text-foreground'>{load.vl_qtd_volumes || '-'}</div>
									</div>
									{(() => {
										const valorMercadorias = getValorTotalMercadoriasCarga(load);
										return valorMercadorias != null ? (
											<div className='rounded-xl border border-border/70 bg-muted/40 p-4'>
												<div className='mb-1 flex items-center gap-2 text-muted-foreground'>
													<DollarSign size={14} />
													<span className='text-[9px] font-black tracking-widest uppercase'>Valor total das mercadorias</span>
												</div>
												<div className='text-xl font-black text-foreground'>{formatCurrency(valorMercadorias)}</div>
											</div>
										) : null;
									})()}
									{load.vl_limite_empilhamento && (
										<div className='rounded-xl border border-border/70 bg-muted/40 p-4'>
											<div className='mb-1 text-[9px] font-black tracking-widest text-muted-foreground uppercase'>Empilhamento Máx.</div>
											<div className='text-xl font-black text-foreground'>{load.vl_limite_empilhamento}x</div>
										</div>
									)}
								</div>
							</div>

							{/* Observações */}
							{load.ds_observacoes && (
								<div>
									<h4 className='mb-4 flex items-center gap-2 text-xs font-black tracking-widest text-muted-foreground uppercase'>
										<StickyNote size={14} /> Observações
									</h4>
									<div className='rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-xs leading-relaxed font-medium text-yellow-800 dark:text-yellow-200 italic'>
										&quot;{load.ds_observacoes}&quot;
									</div>
								</div>
							)}

							{/* Financeiro */}
							{load.fl_requer_seguro && (
								<div>
									<h4 className='mb-4 flex items-center gap-2 text-xs font-black tracking-widest text-muted-foreground uppercase'>
										<DollarSign size={14} /> Informações Financeiras
									</h4>
									<div className='space-y-3'>
										{load.fl_requer_seguro && (
											<div className='flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4'>
												<Shield size={24} className='text-blue-700 dark:text-blue-300' />
												<div>
													<div className='text-[9px] font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase'>
														Seguro Obrigatório
													</div>
													<div className='text-sm font-bold text-blue-900 dark:text-blue-100'>RCTR-C / RCF-DC necessário</div>
												</div>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Entregas e Documentos Section */}
					{load.js_entregas && load.js_entregas.length > 0 && (
						<div className='mt-10 border-t border-border/70 pt-8'>
							<div className='mb-6'>
								<h4 className='mb-2 flex items-center gap-2 text-xs font-black tracking-widest text-muted-foreground uppercase'>
									<Package size={14} /> Entregas ({load.js_entregas.length})
								</h4>
								{load.tms_embarcadores?.ds_nome && (
									<p className='text-sm text-muted-foreground'>
										<span className='font-semibold'>Expedidor:</span> {load.tms_embarcadores.ds_nome}
									</p>
								)}
							</div>
							<div className='space-y-4'>
								{load.js_entregas
									.sort((a, b) => a.nr_sequencia - b.nr_sequencia)
									.map((entrega, idx) => {
										const ctesCount = entrega.js_entregas_ctes?.length || 0;
										const nfesCount = entrega.js_entregas_nfes?.length || 0;
										const borderStatus = entregaStatusToBorderStatus(entrega.ds_status);

										return (
											<div
												key={entrega.id}
												className='relative overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-sm transition-shadow hover:shadow-md'
											>
												{/* Faixa lateral por status (igual viagem-details) */}
												<div
													className={`absolute left-0 top-0 h-full w-[3px] rounded-l-2xl ${getStripeBgClass(borderStatus)}`}
													aria-hidden
												/>
												<div className='p-5 pl-[calc(1.5rem+3px)]'>
													{/* Header: rótulo, status, cidade, recebedor + badges documentos */}
													<div className='mb-4 flex flex-col gap-1 md:flex-row md:items-start md:justify-between'>
														<div>
															<div className='mb-1 flex flex-wrap items-center gap-2'>
																<span className='text-[10px] font-black tracking-widest text-purple-600 uppercase'>
																	Entrega {idx + 1}
																</span>
																<StatusBadge
																	status={entrega.ds_status || 'PENDENTE'}
																	context='entrega'
																	size='sm'
																/>
															</div>
															<div className='text-lg font-black leading-tight text-foreground'>
																{entrega.sis_cidade_destino?.ds_city} - {entrega.sis_cidade_destino?.js_uf?.ds_uf}
															</div>
															{(entrega.ds_nome_recebedor || entrega.ds_nome_destinatario) && (
																<div className='mt-0.5 text-sm font-medium text-muted-foreground'>
																	{entrega.ds_nome_recebedor || entrega.ds_nome_destinatario}
																</div>
															)}
														</div>
														<div className='flex flex-wrap items-center gap-2'>
															{ctesCount > 0 && (
																<span className='rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-xs font-black text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/20 dark:text-blue-300'>
																	CT-e: {ctesCount}
																</span>
															)}
															<span className='rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-black text-foreground'>
																NF-e: {nfesCount}
															</span>
														</div>
													</div>

													{/* Recebedor (destino da mercadoria) */}
													{(entrega.ds_nome_recebedor || entrega.ds_nome_destinatario) && (
														<div className='mb-4 rounded-lg border border-border bg-card p-3'>
															<div className='text-[9px] font-bold text-muted-foreground uppercase'>Recebedor</div>
															<div className='text-xs font-medium text-foreground/90'>
																{entrega.ds_nome_recebedor || entrega.ds_nome_destinatario}
															</div>
														</div>
													)}

													{/* Endereço */}
													{entrega.ds_endereco && (
														<div className='mb-4 rounded-lg border border-border bg-card p-3'>
															<div className='text-[9px] font-bold text-muted-foreground uppercase'>Endereço</div>
															<div className='text-xs font-medium text-foreground/90'>{entrega.ds_endereco}</div>
														</div>
													)}

													{/* Data de Entrega (status já no header) */}
													{(entrega.dt_entrega || entrega.dt_limite_entrega) && (
														<div className='mb-4 rounded-lg border border-border bg-card p-3'>
															<div className='text-[9px] font-bold text-muted-foreground uppercase'>Data de Entrega</div>
															<div className='flex items-center gap-1.5 text-xs font-black text-foreground'>
																{(() => {
																	const raw = entrega.dt_entrega || entrega.dt_limite_entrega;
																	if (!raw) return '-';
																	const f = safeFormatDateTime(raw);
																	return f.date + (f.time ? ` às ${f.time}` : '');
																})()}
																{!entrega.dt_entrega && entrega.dt_limite_entrega && (
																	<span className='text-[10px] font-medium uppercase text-muted-foreground/80'>Est.</span>
																)}
															</div>
														</div>
													)}

													{/* CT-es */}
												{entrega.js_entregas_ctes && entrega.js_entregas_ctes.length > 0 && (
													<div className='mb-3'>
														<div className='mb-2 text-[9px] font-bold text-muted-foreground uppercase'>CT-es desta Entrega</div>
														<div className='space-y-2'>
															{entrega.js_entregas_ctes.map((ec) => {
																const cte = ec.js_cte;
																if (!cte) return null;

																return (
																	<div
																		key={ec.id}
																		className='flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-500/10 p-3'
																	>
																		<div className='flex-1'>
																			<div className='mb-1 flex items-center gap-2'>
																				<span className='text-[8px] font-black text-orange-700 dark:text-orange-300 uppercase'>CT-e</span>
																				{cte.ds_numero && (
																					<span className='font-mono text-xs font-bold text-foreground'>
																						#{cte.ds_numero}
																					</span>
																				)}
																			</div>
																			{cte.ds_chave && (
																				<div className='font-mono text-[10px] text-muted-foreground'>{cte.ds_chave}</div>
																			)}
																		</div>
																		{cte.vl_total && (
																			<div className='text-right'>
<div className='text-sm font-black text-orange-700 dark:text-orange-300'>
													{formatCurrency(Number(cte.vl_total) / 100)}
												</div>
																			</div>
																		)}
																	</div>
																);
															})}
														</div>
													</div>
												)}

												{/* NF-es */}
												{entrega.js_entregas_nfes && entrega.js_entregas_nfes.length > 0 && (
													<div>
														<div className='mb-2 text-[9px] font-bold text-muted-foreground uppercase'>NF-es desta Entrega</div>
														<div className='space-y-2'>
															{entrega.js_entregas_nfes.map((en) => {
																const nfe = en.js_nfe;
																if (!nfe) return null;

																return (
																	<div
																		key={en.id}
																		className='flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 p-3'
																	>
																		<div className='flex-1'>
																			<div className='mb-1 flex items-center gap-2'>
																				<span className='text-[8px] font-black text-blue-700 dark:text-blue-300 uppercase'>NF-e</span>
																				{nfe.ds_numero && (
																					<span className='font-mono text-xs font-bold text-foreground'>
																						#{nfe.ds_numero}
																					</span>
																				)}
																			</div>
																			{nfe.ds_chave && (
																				<div className='font-mono text-[10px] text-muted-foreground'>{nfe.ds_chave}</div>
																			)}
																		</div>
																		{nfe.vl_nf && (
																			<div className='text-right'>
<div className='text-sm font-black text-blue-700 dark:text-blue-300'>
													{formatCurrency(Number(nfe.vl_nf) / 100)}
												</div>
																			</div>
																		)}
																	</div>
																);
															})}
														</div>
													</div>
												)}
												</div>
											</div>
										);
									})}
							</div>
						</div>
					)}
				</div>
				{/* Footer */}
				<div className='flex items-center justify-between border-t border-border/70 bg-muted/40 p-6'>
					<div className='text-[10px] text-muted-foreground'>
						{load.vl_peso_bruto && load.vl_cubagem && (
							<span>
								Densidade: <strong className='text-muted-foreground'>{(load.vl_peso_bruto / load.vl_cubagem).toFixed(0)} kg/m³</strong>
							</span>
						)}
					</div>
					<div className='flex gap-3'>
						<Button variant='secondary' onClick={onClose} className='rounded-xl border border-border bg-muted/60 px-6 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'>
							Fechar
						</Button>
						{onEdit && (
							<Button
								variant='secondary'
								onClick={() => onEdit(load)}
								className='flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-6 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
							>
								Editar Carga
							</Button>
						)}
						{load.ds_status === 'PENDENTE' && (
							<Button
								variant='secondary'
								onClick={() => {
									onClose();
									onSchedule(load);
								}}
								className='flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-8 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
							>
								Programar Veículo <ArrowRight size={16} />
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
