import React, { useState } from 'react';
import { Carga, Veiculo, Viagem } from '@/types/tms';
import { X, CheckCircle, Truck, Loader2, User } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVeiculos } from '@/services/api/tms/tms';
import { scheduleCarga } from '@/services/api/tms/cargas';
import { useCompanyContext } from '@/context/company-context';
import { toast } from 'sonner';
import { getMotoristas, Motorista, vincularMotoristaVeiculo } from '@/services/api/tms/motoristas';

interface ScheduleLoadModalProps {
	isOpen: boolean;
	onClose: () => void;
	load: Carga | null;
	vehicles: Veiculo[];
	activeTrips: Viagem[];
	onConfirm: (load: Carga, vehicle: Veiculo, date: string) => void;
	onBack?: () => void;
	existingTrip?: Viagem | null;
}

export const ScheduleLoadModal: React.FC<ScheduleLoadModalProps> = ({ isOpen, onClose, load, vehicles, activeTrips, onConfirm }) => {
	const { state: empresaId } = useCompanyContext();
	const queryClient = useQueryClient();
	const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);
	const [selectedDriver, setSelectedDriver] = useState('');
	const [searchMotorista, setSearchMotorista] = useState('');
	const [showLinkConfirmation, setShowLinkConfirmation] = useState(false);
	const [idMotoristaVeiculo, setIdMotoristaVeiculo] = useState<string | null>(null);
	const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
	const [showMotoristaSelector, setShowMotoristaSelector] = useState(false);
	const [linkAsPrincipal, setLinkAsPrincipal] = useState(false);
	const [isLinkingMotorista, setIsLinkingMotorista] = useState(false);
	const [searchVeiculo, setSearchVeiculo] = useState('');
	const [isLoading, setIsLoading] = useState(false);

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

	if (!isOpen || !load) return null;

	const handleConfirm = async () => {
		if (!selectedVehicle) {
			toast.error('Selecione um veículo.');
			return;
		}
		if (!selectedDriver) {
			toast.error('Selecione ou informe um motorista para a viagem.');
			return;
		}

		if (!idMotoristaVeiculo) {
			toast.error('Selecione um veículo com motorista vinculado ou vincule um motorista ao veículo selecionado.');
			return;
		}

		try {
			setIsLoading(true);
			const toastId = toast.loading('Agendando carga...');

			// Envia o ID da relação tms_motoristas_veiculos (não mais strings separadas)
			const result = await scheduleCarga(load.id, {
				id_motorista_veiculo: idMotoristaVeiculo,
				dt_agendada: new Date().toISOString(),
			});

			toast.success('Carga agendada com sucesso!', { id: toastId });

			// Força refetch das listas principais para refletir status/veículo atualizado
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] }),
				queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] }),
				queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] }),
				queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] }),
				queryClient.invalidateQueries({ queryKey: ['get-veiculos-all'] }),
			]);

			// Recupera o veículo correspondente para o callback
			const veiculoParaCallback = veiculos?.find((v) => v.id === selectedVehicle.id) || vehicles[0];

			onConfirm(result.carga, veiculoParaCallback, new Date().toISOString());
			onClose();
		} catch (error) {
			console.error('Erro ao agendar carga:', error);
			toast.error(`Erro ao agendar carga: ${error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.'}`);
		} finally {
			setIsLoading(false);
		}
	};

	// Passo único: Selecionar combinação de veículo + motorista
	return (
		<div className='absolute inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md'>
			<div className='animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border/40 bg-card shadow-2xl duration-300'>
				{/* Header */}
				<div className='flex shrink-0 items-center justify-between border-b border-border/70 bg-muted/40 p-8'>
					<div>
						<h3 className='flex items-center gap-3 text-2xl font-black tracking-tighter text-foreground uppercase'>
							<span className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-white'>1</span>
							Programar Carga
						</h3>
						<p className='mt-1 ml-11 text-[10px] font-bold tracking-widest text-muted-foreground uppercase'>
							Selecione um veículo com motorista
						</p>
					</div>
					<button onClick={onClose} className='rounded-full p-3 transition-colors hover:bg-muted' disabled={isLoading}>
						<X size={24} />
					</button>
				</div>

				{/* Load Summary */}
				<div className='flex items-center justify-between border-b border-blue-100 bg-blue-50 px-8 py-4'>
					<div>
						<div className='text-xs font-bold tracking-wide text-blue-900 uppercase'>
							{(load.fis_clientes ?? load.tms_clientes)?.ds_nome || load.cd_carga}
						</div>
						<div className='mt-0.5 text-[10px] font-semibold text-blue-500'>
							{load.sis_cidade_origem?.ds_city} <span className='mx-1 text-blue-300'>➔</span>{' '}
							{load.sis_cidade_destino?.ds_city || 'A definir'}
						</div>
					</div>
				</div>

				{/* Content */}
				<div className='custom-scrollbar flex-1 overflow-y-auto bg-card p-8'>
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

											if (load.id_motorista_veiculo) {
												linkedVehicleIds.add(load.id_motorista_veiculo);
											}
											if (load.tms_motoristas_veiculos?.tms_veiculos?.id) {
												linkedVehicleIds.add(load.tms_motoristas_veiculos.tms_veiculos.id);
											}

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
														className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${selectedVehicle?.id === v.id ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-border hover:border-green-300 hover:bg-green-50/50'} `}
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
														{selectedVehicle?.id === v.id && <div className='h-2 w-2 rounded-full bg-green-500'></div>}
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
														className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${selectedVehicle?.id === v.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-border hover:border-blue-300 hover:bg-blue-50/50'} `}
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
														{selectedVehicle?.id === v.id && <div className='h-2 w-2 rounded-full bg-blue-500'></div>}
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
								Motorista {showMotoristaSelector && <span className='text-orange-600'>*</span>}
							</h4>

							{showMotoristaSelector ? (
								<div className='rounded-xl border border-orange-200 bg-orange-50/30 p-3'>
									<p className='mb-2 text-[10px] font-bold text-orange-700'>Selecione um motorista para este veículo:</p>
									<input
										type='text'
										value={searchMotorista}
										onChange={(e) => setSearchMotorista(e.target.value)}
										placeholder='Buscar por nome ou CNH...'
										className='mb-3 w-full rounded-lg border border-orange-300 bg-card px-3 py-2 text-xs transition-all outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
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
															// Verificar se veículo não tem esse motorista vinculado
															const veiculoTemMotorista: boolean | undefined =
																selectedVehicle?.tms_motoristas_veiculos?.some(
																	(mv) => mv.tms_motoristas?.id === motorista.id,
																);
															if (!veiculoTemMotorista && selectedVehicle) {
																setShowLinkConfirmation(true);
															}
														}}
														className={`group flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
															selectedMotorista?.id === motorista.id
																? 'border-orange-500 bg-orange-100 ring-1 ring-orange-500'
																: 'border-border bg-card hover:border-orange-300 hover:bg-orange-50'
														}`}
													>
														<div className='flex items-center gap-3'>
															<div className='rounded-lg border border-border/70 bg-card p-2'>
																<User size={14} className='text-orange-600' />
															</div>
															<div>
																<div className='text-xs font-black text-foreground'>{nomeMot}</div>
																<div className='text-[9px] font-bold text-muted-foreground'>CNH: {cnh}</div>
															</div>
														</div>
														{selectedMotorista?.id === motorista.id && <CheckCircle size={16} className='text-orange-600' />}
													</div>
												);
											})}
										{(
											((motoristas?.data as Motorista[]) ?? [])
												.filter((m: Motorista) => m.is_ativo)
												.filter((m: Motorista) => {
													const searchLower: string = searchMotorista.toLowerCase();
													const nome: string = m.rh_funcionarios?.ds_nome?.toLowerCase() || '';
													const cnh: string = m.ds_cnh_numero?.toLowerCase() || '';
													return nome.includes(searchLower) || cnh.includes(searchLower);
												}) as Motorista[]
										).length === 0 && (
											<p className='py-4 text-center text-xs text-muted-foreground italic'>
												{searchMotorista ? 'Nenhum motorista encontrado.' : 'Nenhum motorista ativo disponível.'}
											</p>
										)}
									</div>
								</div>
							) : (
								<div>
									<input
										type='text'
										value={selectedDriver}
										onChange={(e) => setSelectedDriver(e.target.value)}
										disabled={!selectedVehicle}
										className='w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm font-bold uppercase transition-all outline-none focus:border-black focus:ring-1 focus:ring-black disabled:cursor-not-allowed disabled:opacity-50'
										placeholder='Nome do Motorista'
									/>
									{selectedVehicle && (
										<button
											onClick={() => {
												setShowMotoristaSelector(true);
												setSelectedDriver('');
												setSelectedMotorista(null);
											}}
											className='mt-2 text-xs text-blue-600 hover:text-blue-700 hover:underline'
										>
											Escolher motorista da lista
										</button>
									)}
								</div>
							)}

							{/* {selectedVehicle && (
								<div className='rounded-3xl border border-yellow-100 bg-yellow-50 p-6'>
									<h4 className='mb-2 flex items-center gap-2 text-xs font-black tracking-widest text-yellow-800 uppercase'>
										⚠️ Atenção
									</h4>
									<p className='text-[10px] leading-relaxed font-medium text-yellow-700'>
										{load ? (
											<>
												Ao confirmar, uma nova viagem será criada com <b>{selectedLoads.length} carga(s)</b> sequencial(is)
												baseada(s) na seleção.
											</>
										) : (
											<>
												Ao confirmar, uma nova viagem <b>sem cargas</b> será criada. Você poderá adicionar cargas
												posteriormente.
											</>
										)}
									</p>
								</div>
							)} */}
						</div>
					</div>

					{/* Footer */}
					<div className='flex items-center justify-between border-t border-border/70 bg-muted/50 px-8 py-4'>
						<button
							onClick={onClose}
							className='rounded-xl border border-border bg-muted/60 px-6 py-2.5 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted disabled:opacity-50'
							disabled={isLoading}
						>
							Cancelar
						</button>
						<button
							onClick={handleConfirm}
							disabled={!selectedVehicle || isLoading}
							className='flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-8 py-2.5 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted disabled:opacity-50'
						>
							{isLoading ? <Loader2 size={16} className='animate-spin' /> : <CheckCircle size={16} />}
							Confirmar Agendamento
						</button>
					</div>
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

						<div className='mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4'>
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
