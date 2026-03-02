import React, { useState } from 'react';
import { Carga, Veiculo, Viagem } from '@/types/tms';
import { X, CheckCircle, Truck, Clock, User, Loader2, Plus } from 'lucide-react';
import { useCreateViagemComCargas } from '@/hooks/use-viagens';
import { useCompanyContext } from '@/context/company-context';
import { useQuery } from 'node_modules/@tanstack/react-query/build/modern/useQuery';
import { getVeiculos } from '@/services/api/tms/tms';
import { getMotoristas, vincularMotoristaVeiculo, type Motorista } from '@/services/api/tms/motoristas';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface NewTripWizardProps {
	isOpen: boolean;
	onClose: () => void;
	cargas: Carga[];
	// veiculos: Veiculo[];
	activeTrips: Viagem[];
	onCreateTrip: (tripData: { loads: Carga[]; vehicle: Veiculo | null; driverName: string }) => void;
	/** Callback para abrir o modal de criar nova carga (ex.: quando não há cargas disponíveis). */
	onOpenCreateCarga?: () => void;
}

export const NewTripWizard: React.FC<NewTripWizardProps> = ({ isOpen, onClose, cargas, activeTrips, onCreateTrip, onOpenCreateCarga }) => {
	const { state: empresaId } = useCompanyContext();
	const [wizardStep, setWizardStep] = useState(1);
	const [selectedLoads, setSelectedLoads] = useState<Carga[]>([]);
	const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);
	const [selectedDriver, setSelectedDriver] = useState('');
	const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
	const [showMotoristaSelector, setShowMotoristaSelector] = useState(false);
	const [searchMotorista, setSearchMotorista] = useState('');
	const [showLinkConfirmation, setShowLinkConfirmation] = useState(false);
	const [linkAsPrincipal, setLinkAsPrincipal] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isLinkingMotorista, setIsLinkingMotorista] = useState(false);
	const [idMotoristaVeiculo, setIdMotoristaVeiculo] = useState<string | null>(null);
	const [searchVeiculo, setSearchVeiculo] = useState('');
	const [dtAgendada, setDtAgendada] = useState('');
	const [dtPrevisaoRetorno, setDtPrevisaoRetorno] = useState('');

	const { data: veiculos } = useQuery({
		queryKey: ['get-veiculos-all', empresaId],
		queryFn: () => getVeiculos(empresaId, true),
		enabled: !!empresaId,
		staleTime: 1000 * 60 * 5,
	});

	const { data: motoristas } = useQuery({
		queryKey: ['get-motoristas-all'],
		queryFn: () => getMotoristas(),
		staleTime: 1000 * 60 * 5,
	});

	// Hook para criar viagem com cargas
	const createViagemMutation = useCreateViagemComCargas();

	const handleWizardSubmit = async () => {
		if (!selectedVehicle) {
			toast.error('Selecione um veículo.');
			return;
		}

		if (!selectedDriver) {
			toast.error('Selecione ou informe um motorista para a viagem.');
			return;
		}

		if (!dtAgendada) {
			toast.error('Informe a data agendada da viagem.');
			return;
		}

		try {
			setIsLoading(true);
			const toastId = toast.loading('Criando viagem...');

			// Extrair placa do veículo de diferentes estruturas possíveis
			const placaVeiculo = selectedVehicle.ds_placa || selectedVehicle.ds_placa || '';

			// Preparar dados da viagem (cd_viagem é gerado no backend como sequencial por empresa)
			const viagemData = {
				ds_motorista: selectedDriver || 'Motorista Não Informado',
				ds_placa_cavalo: placaVeiculo,
				ds_placa_carreta_1: undefined,
				ds_placa_carreta_2: undefined,
				ds_placa_carreta_3: undefined,
				dt_agendada: new Date(dtAgendada).toISOString(),
				dt_previsao_retorno: dtPrevisaoRetorno ? new Date(dtPrevisaoRetorno).toISOString() : undefined,
				id_motorista_veiculo: idMotoristaVeiculo,
			};

			// Preparar cargas vinculadas com sequência
			const cargasVinculadas = selectedLoads.map((carga, index) => ({
				id_carga: carga.id,
				nr_sequencia: index + 1,
			}));

			// Criar viagem com cargas via API
			await createViagemMutation.mutateAsync({
				viagemData,
				cargas: cargasVinculadas,
			});

			// Callback para componente pai (compatibilidade)
			onCreateTrip({
				loads: selectedLoads,
				vehicle: selectedVehicle,
				driverName: selectedDriver || 'Motorista Não Informado',
			});

			toast.success('Viagem criada com sucesso!', { id: toastId });
			onClose();
		} catch (error) {
			console.error('Erro ao criar viagem:', error);
			toast.error(error instanceof Error ? error.message : 'Erro ao criar viagem. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className='absolute inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md'>
			<div className='animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-visible rounded-3xl border border-border/40 bg-card shadow-2xl duration-300'>
				{/* Wizard Header */}
				<div className='flex shrink-0 items-center justify-between border-b border-border/70 bg-muted/40 p-8'>
					<div>
						<h3 className='flex items-center gap-3 text-2xl font-black tracking-tighter text-foreground uppercase'>
							<span className='flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-sm font-black text-foreground'>{wizardStep}</span>
							Nova Viagem
						</h3>
						<p className='mt-1 ml-11 text-[10px] font-bold tracking-widest text-muted-foreground uppercase'>
							{wizardStep === 1 ? 'Selecione as Cargas' : wizardStep === 2 ? 'Defina Datas da Viagem' : 'Defina o Veículo e Motorista'}
						</p>
					</div>
					<button onClick={onClose} className='rounded-full p-3 transition-colors hover:bg-muted' disabled={isLoading}>
						<X size={24} />
					</button>
				</div>

				{/* Wizard Content */}
				<div className='custom-scrollbar flex-1 overflow-y-auto bg-card p-10'>
					{wizardStep === 1 && (
						<div className='space-y-6'>
							<h4 className='text-xs font-black tracking-widest text-muted-foreground uppercase'>
								Cargas Disponíveis ({(cargas ?? []).filter((load) => load.ds_status_viagem === null).length})
							</h4>
							<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
								{(cargas ?? []).map((load) => {
									const isSelected = selectedLoads.some((l) => l.id === load.id);
									if (load.ds_status_viagem !== null) return null; // Filtrar cargas que já estão em viagem
									return (
										<div
											key={load.id}
											onClick={() => {
												if (isSelected) setSelectedLoads((prev) => prev.filter((l) => l.id !== load.id));
												else setSelectedLoads((prev) => [...prev, load]);
											}}
											className={`flex cursor-pointer items-center justify-between rounded-3xl border-2 p-5 transition-all ${isSelected ? 'border-blue-500/60 bg-blue-950/40 shadow-md ring-1 ring-blue-500/30' : 'border-border/70 bg-card hover:border-input hover:bg-muted/50'} `}
										>
											<div>
												<div className='mb-1 text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
													{load.sis_cidade_origem?.ds_city} ➔ {load.sis_cidade_destino?.ds_city || 'A definir'}
												</div>
												<div className='text-sm font-black tracking-tighter text-foreground uppercase'>
													{(load.fis_clientes ?? load.tms_clientes)?.ds_nome || load.ds_nome}
												</div>
												<div className='mt-2 flex items-center gap-1 text-[10px] font-bold text-muted-foreground'>
													<Clock size={12} />{' '}
													{load.dt_coleta_inicio ? new Date(load.dt_coleta_inicio).toLocaleDateString('pt-BR') : 'Sem data'}
												</div>
											</div>
											{isSelected && <CheckCircle className='text-blue-400' size={24} />}
										</div>
									);
								})}
								{(cargas ?? []).filter((l) => l.ds_status_viagem === null).length === 0 && (
									<div className='col-span-2 flex flex-col items-center justify-center gap-4 py-10'>
										<p className='text-center text-muted-foreground'>Nenhuma carga disponível.</p>
										{onOpenCreateCarga && (
											<Button
												type='button'
												variant='outline'
												onClick={onOpenCreateCarga}
												className='flex items-center gap-2'
											>
												<Plus size={16} />
												Criar nova carga
											</Button>
										)}
									</div>
								)}
							</div>
						</div>
					)}

					{wizardStep === 2 && (
						<div className='space-y-8'>
							<h4 className='text-xs font-black tracking-widest text-muted-foreground uppercase'>Datas da Viagem</h4>

							<div className='grid gap-6 md:grid-cols-2'>
								<div className='space-y-2'>
									<label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
										Data agendada <span className='text-red-500'>*</span>
									</label>
									<input
										type='datetime-local'
										value={dtAgendada}
										onChange={(e) => setDtAgendada(e.target.value)}
										className='w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold uppercase outline-none transition-all focus:border-black focus:ring-1 focus:ring-black'
									/>
									<p className='text-[11px] text-muted-foreground'>Quando a viagem está prevista para sair.</p>
								</div>

								<div className='space-y-2'>
									<label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>Previsão de retorno</label>
									<input
										type='datetime-local'
										value={dtPrevisaoRetorno}
										onChange={(e) => setDtPrevisaoRetorno(e.target.value)}
										className='w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold uppercase outline-none transition-all focus:border-black focus:ring-1 focus:ring-black'
									/>
									<p className='text-[11px] text-muted-foreground'>Opcional. Ajuda no planejamento de disponibilidade.</p>
								</div>
							</div>
						</div>
					)}

					{wizardStep === 3 && (
						<div className='space-y-8'>
							{/* Selected Loads Summary */}
							<div className='flex gap-3 overflow-x-auto pb-2'>
								{selectedLoads.map((l) => (
									<div key={l.id} className='shrink-0 rounded-xl border border-blue-500/40 bg-blue-950/40 px-4 py-2'>
										<div className='text-[8px] font-black tracking-widest text-blue-400 uppercase'>Carga</div>
										<div className='text-xs font-black text-blue-100 uppercase'>{(l.fis_clientes ?? l.tms_clientes)?.ds_nome || l.ds_nome}</div>
									</div>
								))}
							</div>

							<div className='grid grid-cols-1 gap-10 md:grid-cols-2'>
								<div className='space-y-6'>
									<h4 className='text-xs font-black tracking-widest text-muted-foreground uppercase'>Selecionar Cavalo/Conjunto</h4>

									{/* Campo de pesquisa de veículo */}
									<input
										type='text'
										value={searchVeiculo}
										onChange={(e) => setSearchVeiculo(e.target.value)}
										placeholder='Buscar por placa ou nome...'
										className='w-full rounded-lg border border-input bg-card px-3 py-2 text-xs transition-all outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
									/>

									{/* Categorized List */}
									<div className='custom-scrollbar max-h-[400px] space-y-6 overflow-y-auto pr-2'>
										{/* Recommended */}
										<div>
											<div className='mb-2 flex items-center gap-2 text-green-600'>
												<CheckCircle size={12} />
												<span className='text-[10px] font-black tracking-widest uppercase'>Recomendados</span>
											</div>
											<div className='space-y-2'>
												{(() => {
													// Obter IDs dos veículos vinculados às cargas selecionadas
													const linkedVehicleIds = new Set<string>();
													selectedLoads.forEach((carga) => {
														if (carga.id_motorista_veiculo) {
															linkedVehicleIds.add(carga.id_motorista_veiculo);
														}
														if (carga.tms_motoristas_veiculos?.tms_veiculos?.id) {
															linkedVehicleIds.add(carga.tms_motoristas_veiculos.tms_veiculos.id);
														}
													});

													const filteredVehicles = veiculos?.filter((v) => v.ds_tipo_unidade === 'TRACIONADOR');
													// Aplicar filtro de pesquisa
													const searchedVehicles = filteredVehicles?.filter((v) => {
														if (!searchVeiculo) return true;
														const searchLower = searchVeiculo.toLowerCase();
														const placa = v.ds_placa?.toLowerCase() || '';
														const nome = v.ds_nome?.toLowerCase() || '';
														return placa.includes(searchLower) || nome.includes(searchLower);
													});

													if (!searchedVehicles || searchedVehicles.length === 0) {
														return (
															<div className='pl-2 text-[10px] text-muted-foreground italic'>
																{searchVeiculo
																	? 'Nenhum veículo encontrado.'
																	: 'Nenhum veículo vinculado às cargas selecionadas.'}
															</div>
														);
													}

													return searchedVehicles.map((v) => {
														// Buscar motorista ativo e principal
														const motoristasVeiculosArray = Array.isArray(v.tms_motoristas_veiculos)
															? v.tms_motoristas_veiculos
															: v.tms_motoristas_veiculos
																? [v.tms_motoristas_veiculos]
																: [];

														// Prioridade: is_principal=true e is_ativo=true, senão o primeiro ativo, senão qualquer um
														const motoristaPrincipal = motoristasVeiculosArray.find((mv) => mv.is_principal && mv.is_ativo);
														const motoristaAtivo = motoristasVeiculosArray.find((mv) => mv.is_ativo);
														const motoristasVeiculos = motoristaPrincipal || motoristaAtivo || motoristasVeiculosArray[0];

														const motoristaNome = motoristasVeiculos?.tms_motoristas?.rh_funcionarios?.ds_nome || null;

														const temMotorista = !!motoristaNome;
														const placaVeiculo = v.ds_placa || 'Sem placa';
														const nomeVeiculo = v.ds_nome || ''; // TODO adicionar modelo

														return (
															<div
																key={v.id}
																onClick={() => {
																	setSelectedVehicle(v);
																	if (temMotorista) {
																		setSelectedDriver(motoristaNome);
																		setShowMotoristaSelector(false);
																		setSelectedMotorista(null);
																		// Capturar o id da relação motorista-veículo
																		if (motoristasVeiculos?.id) {
																			setIdMotoristaVeiculo(motoristasVeiculos.id);
																		}
																	} else {
																		setSelectedDriver('');
																		setShowMotoristaSelector(true);
																		setSelectedMotorista(null);
																		setIdMotoristaVeiculo(null);
																	}
																}}
																className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${selectedVehicle?.id === v.id ? 'border-green-500/60 bg-green-950/40 ring-1 ring-green-500/30' : 'border-border hover:border-green-500/40 hover:bg-green-950/30'} `}
															>
																<div className='flex items-center gap-3'>
																	<div className='rounded-lg border border-border/70 bg-card p-2'>
																		<Truck size={16} className='text-green-600' />
																	</div>
																	<div>
																		<div className='text-xs font-black text-foreground uppercase'>{placaVeiculo}</div>
																		<div className='text-[9px] font-bold text-muted-foreground uppercase'>
																			{nomeVeiculo.substring(0, 40)}
																		</div>
																		<div className='mt-0.5 text-[9px] font-bold text-muted-foreground uppercase'>
																			Motorista:{' '}
																			<span className={temMotorista ? 'text-foreground/90' : 'text-orange-600'}>
																				{motoristaNome || 'Selecionar motorista'}
																			</span>
																		</div>
																	</div>
																</div>
																{selectedVehicle?.id === v.id && <div className='h-2 w-2 rounded-full bg-green-400'></div>}
															</div>
														);
													});
												})()}
											</div>
										</div>

										{/* Todos os Veículos Disponíveis */}
										<div>
											<div className='mb-2 flex items-center gap-2 text-muted-foreground'>
												<Truck size={12} />
												<span className='text-[10px] font-black tracking-widest uppercase'>Todos os Veículos</span>
											</div>
											<div className='space-y-2'>
												{(() => {
													// Filtrar veículos que não estão em viagem ativa
													const availableVehicles = veiculos?.filter((v) =>
														activeTrips.every((t) => t.ds_placa_cavalo !== v.ds_placa),
													);

													// Aplicar filtro de pesquisa
													const searchedVehicles = availableVehicles?.filter((v) => {
														if (!searchVeiculo) return true;
														const searchLower = searchVeiculo.toLowerCase();
														const placa = v.ds_placa?.toLowerCase() || '';
														const nome = v.ds_nome?.toLowerCase() || '';
														return placa.includes(searchLower) || nome.includes(searchLower);
													});

													if (!searchedVehicles || searchedVehicles.length === 0) {
														return (
															<div className='pl-2 text-[10px] text-muted-foreground italic'>
																{searchVeiculo ? 'Nenhum veículo encontrado.' : 'Nenhum veículo disponível no momento.'}
															</div>
														);
													}

													return searchedVehicles.map((v) => {
														// Buscar motorista ativo e principal
														const motoristasVeiculosArray = Array.isArray(v.tms_motoristas_veiculos)
															? v.tms_motoristas_veiculos
															: v.tms_motoristas_veiculos
																? [v.tms_motoristas_veiculos]
																: [];

														// Prioridade: is_principal=true e is_ativo=true, senão o primeiro ativo, senão qualquer um
														const motoristaPrincipal = motoristasVeiculosArray.find((mv) => mv.is_principal && mv.is_ativo);
														const motoristaAtivo = motoristasVeiculosArray.find((mv) => mv.is_ativo);
														const motoristasVeiculos = motoristaPrincipal || motoristaAtivo || motoristasVeiculosArray[0];

														const motoristaNome = motoristasVeiculos?.tms_motoristas?.rh_funcionarios?.ds_nome || null;

														const temMotorista = !!motoristaNome;
														const placaVeiculo = v.ds_placa || 'Sem placa';
														const nomeVeiculo = v.ds_nome || ''; // TODO adicionar modelo

														return (
															<div
																key={v.id}
																onClick={() => {
																	setSelectedVehicle(v);
																	if (temMotorista) {
																		setSelectedDriver(motoristaNome);
																		setShowMotoristaSelector(false);
																		setSelectedMotorista(null);
																		// Capturar o id da relação motorista-veículo
																		if (motoristasVeiculos?.id) {
																			setIdMotoristaVeiculo(motoristasVeiculos.id);
																		}
																	} else {
																		setSelectedDriver('');
																		setShowMotoristaSelector(true);
																		setSelectedMotorista(null);
																		setIdMotoristaVeiculo(null);
																	}
																}}
																className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${selectedVehicle?.id === v.id ? 'border-blue-500/60 bg-blue-950/40 ring-1 ring-blue-500/30' : 'border-border hover:border-blue-500/40 hover:bg-blue-950/30'} `}
															>
																<div className='flex items-center gap-3'>
																	<div className='rounded-lg border border-border/70 bg-card p-2'>
																		<Truck size={16} className='text-muted-foreground' />
																	</div>
																	<div>
																		<div className='text-xs font-black text-foreground uppercase'>{placaVeiculo}</div>
																		<div className='text-[9px] font-bold text-muted-foreground uppercase'>
																			{nomeVeiculo.substring(0, 40)}
																		</div>
																		<div className='mt-0.5 text-[9px] font-bold text-muted-foreground uppercase'>
																			Motorista:{' '}
																			<span className={temMotorista ? 'text-foreground/90' : 'text-orange-600'}>
																				{motoristaNome || 'Selecionar motorista'}
																			</span>
																		</div>
																	</div>
																</div>
																{selectedVehicle?.id === v.id && <div className='h-2 w-2 rounded-full bg-blue-400'></div>}
															</div>
														);
													});
												})()}
											</div>
										</div>
									</div>
								</div>

								<div className='space-y-6'>
									<h4 className='text-xs font-black tracking-widest text-muted-foreground uppercase'>
										Motorista {showMotoristaSelector && <span className='text-destructive'>*</span>}
									</h4>

									{showMotoristaSelector ? (
										<div className='rounded-xl border border-border bg-card p-4'>
											<p className='mb-3 text-[10px] font-bold text-muted-foreground'>Selecione um motorista para este veículo:</p>
											<input
												type='text'
												value={searchMotorista}
												onChange={(e) => setSearchMotorista(e.target.value)}
												placeholder='Buscar por nome ou CNH...'
												className='mb-3 w-full rounded-xl border border-border bg-input/50 px-3 py-2.5 text-sm font-medium transition-all outline-none focus:border-ring focus:ring-2 focus:ring-ring/20'
											/>
											<div className='custom-scrollbar max-h-[240px] space-y-2 overflow-y-auto'>
												{(motoristas?.data ?? [])
													.filter((m: Motorista) => m.is_ativo)
													.filter((m: Motorista) => {
														const searchLower: string = searchMotorista.toLowerCase();
														const nome: string = m.rh_funcionarios?.ds_nome?.toLowerCase() || '';
														const cnh: string = m.ds_cnh_numero?.toLowerCase() || '';
														return nome.includes(searchLower) || cnh.includes(searchLower);
													})
													.map((motorista: Motorista) => {
														const nomeMot: string = motorista.rh_funcionarios?.ds_nome || 'Motorista sem nome';
														const cnh: string = motorista.ds_cnh_numero || 'CNH não informada';

														return (
															<div
																key={motorista.id}
																onClick={() => {
																	setSelectedMotorista(motorista);
																	setSelectedDriver(nomeMot);
																	setShowMotoristaSelector(false);
																	const veiculoTemMotorista: boolean | undefined =
																		selectedVehicle?.tms_motoristas_veiculos?.some(
																			(mv) => mv.tms_motoristas?.id === motorista.id,
																		);
																	if (!veiculoTemMotorista && selectedVehicle) {
																		setShowLinkConfirmation(true);
																	}
																}}
																className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
																	selectedMotorista?.id === motorista.id
																		? 'border-primary bg-primary/10 ring-1 ring-primary'
																		: 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
																}`}
															>
																<div className='flex items-center gap-3'>
																	<div className='rounded-lg border border-border/70 bg-card p-2'>
																		<User size={14} className='text-muted-foreground' />
																	</div>
																	<div>
																		<div className='text-xs font-black text-foreground'>{nomeMot}</div>
																		<div className='text-[9px] font-bold text-muted-foreground'>CNH: {cnh}</div>
																	</div>
																</div>
																{selectedMotorista?.id === motorista.id && (
																	<CheckCircle size={16} className='text-primary' />
																)}
															</div>
														);
													})}
												{((motoristas?.data as Motorista[] ?? [])
													.filter((m: Motorista) => m.is_ativo)
													.filter((m: Motorista) => {
														const searchLower: string = searchMotorista.toLowerCase();
														const nome: string = m.rh_funcionarios?.ds_nome?.toLowerCase() || '';
														const cnh: string = m.ds_cnh_numero?.toLowerCase() || '';
														return nome.includes(searchLower) || cnh.includes(searchLower);
													}) as Motorista[]).length === 0 && (
													<p className='py-4 text-center text-xs text-muted-foreground italic'>
														{searchMotorista ? 'Nenhum motorista encontrado.' : 'Nenhum motorista ativo disponível.'}
													</p>
												)}
											</div>
										</div>
									) : (
										<div className='rounded-xl border border-border bg-muted/40 p-4'>
											<div className='flex items-center justify-between gap-3'>
												<div className='flex min-w-0 flex-1 items-center gap-3'>
													<div className='rounded-lg border border-border/70 bg-card p-2.5'>
														<User size={18} className='text-muted-foreground' />
													</div>
													<div className='min-w-0 flex-1'>
														<input
															type='text'
															value={selectedDriver}
															onChange={(e) => setSelectedDriver(e.target.value)}
															disabled={!selectedVehicle}
															className='w-full rounded-lg border-0 bg-transparent py-1 text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50'
															placeholder='Nome do motorista'
														/>
														{selectedDriver && (
															<p className='text-[9px] font-medium text-muted-foreground'>Motorista da viagem</p>
														)}
													</div>
												</div>
												{selectedVehicle && (
													<Button
														type='button'
														variant='outline'
														size='sm'
														onClick={() => {
															setShowMotoristaSelector(true);
															setSelectedDriver('');
															setSelectedMotorista(null);
														}}
														className='shrink-0 rounded-xl text-[10px] font-bold uppercase'
													>
														Escolher da lista
													</Button>
												)}
											</div>
										</div>
									)}

									{selectedVehicle && (
										<div className='rounded-2xl border border-amber-500/40 bg-amber-100 p-5 dark:bg-amber-900/40 dark:border-amber-500/50'>
											<h4 className='mb-2 flex items-center gap-2 text-xs font-black tracking-widest text-amber-800 uppercase dark:text-amber-200'>
												⚠️ Atenção
											</h4>
											<p className='text-[10px] leading-relaxed font-medium text-amber-800 dark:text-amber-200/90'>
												{selectedLoads.length > 0 ? (
													<>
														Ao confirmar, uma nova viagem será criada com <b>{selectedLoads.length} carga(s)</b>{' '}
														sequencial(is) baseada(s) na seleção.
													</>
												) : (
													<>
														Ao confirmar, uma nova viagem <b>sem cargas</b> será criada. Você poderá adicionar cargas
														posteriormente.
													</>
												)}
											</p>
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Wizard Footer */}
				<div className='flex shrink-0 items-center justify-between border-t border-border/70 bg-muted/40 p-8'>
					{wizardStep > 1 ? (
						<Button
							type='button'
							variant='secondary'
							onClick={() => setWizardStep((prev) => prev - 1)}
							disabled={isLoading}
							className='rounded-xl border border-border bg-muted/60 px-5 py-2.5 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
						>
							Voltar
						</Button>
					) : (
						<span />
					)}

					{wizardStep === 1 ? (
						<Button
							disabled={isLoading}
							variant='secondary'
							onClick={() => setWizardStep(2)}
							className='rounded-xl border border-border bg-muted/60 px-10 py-4 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
						>
							{selectedLoads.length > 0 ? 'Próximo: Veículo' : 'Pular: Criar sem Cargas'}
						</Button>
					) : wizardStep === 2 ? (
						<Button
							disabled={isLoading || !dtAgendada}
							variant='secondary'
							onClick={() => setWizardStep(3)}
							className='rounded-xl border border-border bg-muted/60 px-10 py-4 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
						>
							Próximo: Veículo
						</Button>
					) : (
						<Button
							disabled={!selectedVehicle || isLoading}
							variant='secondary'
							onClick={handleWizardSubmit}
							className='flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-12 py-4 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted disabled:opacity-50'
						>
							{isLoading ? (
								<>
									<Loader2 size={16} className='animate-spin' />
									Criando...
								</>
							) : (
								'Confirmar Viagem'
							)}
						</Button>
					)}
				</div>
			</div>

			{/* Modal de Confirmação de Vínculo */}
			{showLinkConfirmation && selectedMotorista && selectedVehicle && (
				<div className='absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm'>
					<div className='animate-in zoom-in-95 w-full max-w-md rounded-2xl border border-border/40 bg-card p-6 shadow-2xl'>
						<h3 className='mb-4 text-lg font-black text-foreground uppercase'>Vincular Motorista ao Veículo?</h3>
						<p className='mb-4 text-sm text-muted-foreground'>
							Deseja vincular permanentemente <b>{selectedMotorista.rh_funcionarios?.ds_nome}</b> ao veículo{' '}
							<b>{selectedVehicle.ds_placa}</b>?
						</p>

						<div className='mb-6 rounded-lg border border-blue-500/40 bg-blue-950/40 p-4'>
							<label className='flex cursor-pointer items-center gap-3'>
								<input
									type='checkbox'
									checked={linkAsPrincipal}
									onChange={(e) => setLinkAsPrincipal(e.target.checked)}
									className='h-4 w-4 rounded border-input text-blue-600 focus:ring-2 focus:ring-blue-500'
								/>
								<div>
									<div className='text-sm font-bold text-foreground'>Definir como motorista principal</div>
									<div className='text-xs text-muted-foreground'>Este será o motorista padrão deste veículo</div>
								</div>
							</label>
						</div>

						<div className='flex gap-3'>
							<button
								onClick={() => {
									setShowLinkConfirmation(false);
									setLinkAsPrincipal(false);
								}}
								disabled={isLinkingMotorista}
								className='flex-1 rounded-xl border border-border bg-muted/60 px-4 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
							>
								Não Vincular
							</button>
							<button
								onClick={async () => {
									setIsLinkingMotorista(true);
									const toastId = toast.loading('Vinculando motorista...');
									try {
										const result = await vincularMotoristaVeiculo({
											id_tms_motoristas: selectedMotorista.id,
											id_tms_veiculos: selectedVehicle.id,
											is_principal: linkAsPrincipal,
											is_ativo: true,
										});
										// Armazenar o ID da relação motorista-veículo
										if (result?.id) {
											setIdMotoristaVeiculo(result.id);
										}
										setShowLinkConfirmation(false);
										setLinkAsPrincipal(false);
										toast.success('Motorista vinculado com sucesso!', { id: toastId });
									} catch (error) {
										console.error('Erro ao vincular motorista:', error);
										toast.error(error instanceof Error ? error.message : 'Erro ao vincular motorista. Tente novamente.', {
											id: toastId,
										});
									} finally {
										setIsLinkingMotorista(false);
									}
								}}
								disabled={isLinkingMotorista}
								className='flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-4 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
							>
								{isLinkingMotorista ? (
									<>
										<Loader2 size={16} className='animate-spin' />
										Vinculando...
									</>
								) : (
									'Vincular'
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
