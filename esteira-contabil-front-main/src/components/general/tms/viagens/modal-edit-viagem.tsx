import React, { useState, useEffect } from 'react';
import { Viagem, Veiculo } from '@/types/tms';
import { X, Calendar, Truck, User, Save, CheckCircle } from 'lucide-react';
import { useUpdateViagem } from '@/hooks/use-viagens';
import { useCompanyContext } from '@/context/company-context';
import { useQuery } from '@tanstack/react-query';
import { getVeiculos } from '@/services/api/tms/tms';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EditTripModalProps {
	isOpen: boolean;
	onClose: () => void;
	trip: Viagem;
}

type MotoristaVeiculoOption = {
	id_motorista_veiculo: string | null;
	placa: string;
	motoristaNome: string;
};

/** Lista todos os veículos; cada um com o vínculo motorista (se houver) para escolha no fechamento. */
function buildVehicleOptions(veiculos: Veiculo[] | undefined): MotoristaVeiculoOption[] {
	if (!veiculos?.length) return [];
	return veiculos.map((v) => {
		const arr = Array.isArray(v.tms_motoristas_veiculos)
			? v.tms_motoristas_veiculos
			: v.tms_motoristas_veiculos
				? [v.tms_motoristas_veiculos]
				: [];
		const withId = arr.filter((mv) => mv?.id);
		const principal = withId.find((mv) => mv.is_principal && mv.is_ativo);
		const ativo = withId.find((mv) => mv.is_ativo);
		const mv = principal || ativo || withId[0];
		const nome = mv?.tms_motoristas?.rh_funcionarios?.ds_nome || null;
		return {
			id_motorista_veiculo: mv?.id ?? null,
			placa: v.ds_placa || 'Sem placa',
			motoristaNome: nome || 'Sem motorista vinculado',
		};
	});
}

export const EditTripModal: React.FC<EditTripModalProps> = ({ isOpen, onClose, trip }) => {
	const { state: empresaId } = useCompanyContext();
	const [formData, setFormData] = useState({
		cd_viagem: trip.cd_viagem || '',
		ds_motorista: trip.ds_motorista || '',
		ds_placa_cavalo: trip.ds_placa_cavalo || '',
		ds_placa_carreta_1: trip.ds_placa_carreta_1 || '',
		ds_placa_carreta_2: trip.ds_placa_carreta_2 || '',
		ds_placa_carreta_3: trip.ds_placa_carreta_3 || '',
		dt_agendada: trip.dt_agendada ? new Date(trip.dt_agendada).toISOString().slice(0, 16) : '',
		dt_previsao_retorno: trip.dt_previsao_retorno ? new Date(trip.dt_previsao_retorno).toISOString().slice(0, 16) : '',
		ds_status: trip.ds_status,
		id_motorista_veiculo: trip.id_motorista_veiculo ?? null as string | null,
	});

	const updateMutation = useUpdateViagem(trip.id);

	const { data: veiculos } = useQuery({
		queryKey: ['get-veiculos-all', empresaId],
		queryFn: () => getVeiculos(empresaId ?? '', true),
		enabled: !!empresaId && isOpen,
		staleTime: 1000 * 60 * 5,
	});

	const vehicleOptions = buildVehicleOptions(veiculos);
	const useCadastro = formData.id_motorista_veiculo != null && formData.id_motorista_veiculo !== '';

	useEffect(() => {
		if (isOpen) {
			setFormData({
				cd_viagem: trip.cd_viagem || '',
				ds_motorista: trip.ds_motorista || '',
				ds_placa_cavalo: trip.ds_placa_cavalo || '',
				ds_placa_carreta_1: trip.ds_placa_carreta_1 || '',
				ds_placa_carreta_2: trip.ds_placa_carreta_2 || '',
				ds_placa_carreta_3: trip.ds_placa_carreta_3 || '',
				dt_agendada: trip.dt_agendada ? new Date(trip.dt_agendada).toISOString().slice(0, 16) : '',
				dt_previsao_retorno: trip.dt_previsao_retorno ? new Date(trip.dt_previsao_retorno).toISOString().slice(0, 16) : '',
				ds_status: trip.ds_status,
				id_motorista_veiculo: trip.id_motorista_veiculo ?? null,
			});
		}
	}, [isOpen, trip]);

	const handleSelectOption = (option: MotoristaVeiculoOption | null) => {
		if (!option) {
			setFormData((prev) => ({ ...prev, id_motorista_veiculo: null }));
			return;
		}
		if (option.id_motorista_veiculo) {
			setFormData((prev) => ({
				...prev,
				id_motorista_veiculo: option.id_motorista_veiculo,
				ds_motorista: option.motoristaNome,
				ds_placa_cavalo: option.placa,
			}));
		} else {
			setFormData((prev) => ({
				...prev,
				id_motorista_veiculo: null,
				ds_placa_cavalo: option.placa,
			}));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			await updateMutation.mutateAsync({
				ds_motorista: formData.ds_motorista || undefined,
				ds_placa_cavalo: formData.ds_placa_cavalo || undefined,
				ds_placa_carreta_1: formData.ds_placa_carreta_1 || null,
				ds_placa_carreta_2: formData.ds_placa_carreta_2 || null,
				ds_placa_carreta_3: formData.ds_placa_carreta_3 || null,
				dt_agendada: formData.dt_agendada || undefined,
				dt_previsao_retorno: formData.dt_previsao_retorno || undefined,
				ds_status: formData.ds_status,
				id_motorista_veiculo: formData.id_motorista_veiculo ?? null,
			});

			toast.success('Viagem atualizada com sucesso!');
			onClose();
		} catch (error) {
			console.error('Erro ao atualizar viagem:', error);
			toast.error('Erro ao atualizar viagem. Tente novamente.');
		}
	};

	if (!isOpen) return null;

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
			<div className='w-full max-w-2xl rounded-lg bg-card shadow-xl'>
				{/* Header */}
				<div className='flex items-center justify-between border-b border-border p-6'>
					<div>
						<h2 className='text-xl font-semibold text-foreground'>Editar Viagem</h2>
						<p className='mt-1 text-sm text-muted-foreground'>Atualize as informações da viagem #{formData.cd_viagem || trip.id}</p>
					</div>
					<Button onClick={onClose} variant='ghost' size='icon' className='rounded-lg p-2'>
						<X size={20} />
					</Button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className='p-6'>
					<div className='space-y-6'>
						{/* Código da Viagem (somente leitura) */}
						<div>
							<label className='mb-2 block text-sm font-medium text-foreground/90'>
								Código da Viagem
							</label>
							<Input
								type='text'
								value={formData.cd_viagem}
								readOnly
								disabled
								className='w-full rounded-lg bg-muted/50'
								title='Código sequencial da empresa (não editável)'
							/>
						</div>

						{/* Motorista + Veículo: seletor do cadastro */}
						<div>
							<label className='mb-2 flex items-center gap-2 text-sm font-medium text-foreground/90'>
								<Truck size={16} />
								Motorista e Veículo (cadastro)
							</label>
							<p className='mb-2 text-xs text-muted-foreground'>
								Selecione um par do cadastro para vincular ao fechamento. Ou use &quot;Nenhum&quot; e preencha apenas texto abaixo.
							</p>
							<div className='mb-2 flex flex-wrap gap-2'>
								<Button
									type='button'
									variant={!useCadastro ? 'default' : 'outline'}
									size='sm'
									className='rounded-lg'
									onClick={() => handleSelectOption(null)}
								>
									Nenhum (apenas texto)
								</Button>
							</div>
							<div className='custom-scrollbar max-h-44 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2'>
								{vehicleOptions.length === 0 && (
									<p className='py-2 text-center text-xs text-muted-foreground'>Nenhum veículo cadastrado para esta empresa.</p>
								)}
								{vehicleOptions.map((opt, idx) => {
									const isSelected =
										opt.id_motorista_veiculo != null
											? formData.id_motorista_veiculo === opt.id_motorista_veiculo
											: !useCadastro && formData.ds_placa_cavalo === opt.placa;
									return (
										<div
											key={`opt-${idx}-${opt.placa}-${opt.id_motorista_veiculo ?? 'x'}`}
											role='button'
											tabIndex={0}
											onClick={() => handleSelectOption(opt)}
											onKeyDown={(e) => e.key === 'Enter' && handleSelectOption(opt)}
											className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
												isSelected
													? 'border-primary bg-primary/10 ring-1 ring-primary'
													: 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
											}`}
										>
											<div className='flex items-center gap-3'>
												<div className='rounded-lg border border-border/70 bg-muted/50 p-2'>
													<Truck size={14} className='text-muted-foreground' />
												</div>
												<div>
													<div className='text-sm font-semibold text-foreground'>{opt.placa}</div>
													<div className={`text-xs ${opt.id_motorista_veiculo ? 'text-muted-foreground' : 'text-amber-600'}`}>
														{opt.motoristaNome}
													</div>
												</div>
											</div>
											{isSelected && <CheckCircle size={18} className='text-primary' />}
										</div>
									);
								})}
							</div>
						</div>

						{/* Motorista (texto: editável se "Nenhum", readonly se par selecionado) */}
						<div>
							<label className='mb-2 flex items-center gap-2 text-sm font-medium text-foreground/90'>
								<User size={16} />
								Motorista
								<span className='ml-1 text-red-500'>*</span>
							</label>
							<Input
								type='text'
								value={formData.ds_motorista}
								onChange={(e) => setFormData({ ...formData, ds_motorista: e.target.value })}
								readOnly={useCadastro}
								className='w-full rounded-lg bg-muted/30'
								placeholder='Nome do motorista'
								required
							/>
						</div>

						{/* Veículos (placas) */}
						<div>
							<label className='mb-2 flex items-center gap-2 text-sm font-medium text-foreground/90'>
								<Truck size={16} />
								Veículos
							</label>
							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='mb-1 block text-xs text-muted-foreground'>
										Cavalo
										<span className='ml-1 text-red-500'>*</span>
									</label>
									<Input
										type='text'
										value={formData.ds_placa_cavalo}
										onChange={(e) => setFormData({ ...formData, ds_placa_cavalo: e.target.value })}
										readOnly={useCadastro}
										className='w-full rounded-lg bg-muted/30'
										placeholder='ABC-1234'
										required
									/>
								</div>
								<div>
									<label className='mb-1 block text-xs text-muted-foreground'>Carreta 1</label>
									<Input
										type='text'
										value={formData.ds_placa_carreta_1}
										onChange={(e) => setFormData({ ...formData, ds_placa_carreta_1: e.target.value })}
										className='w-full rounded-lg'
										placeholder='DEF-5678'
									/>
								</div>
								<div>
									<label className='mb-1 block text-xs text-muted-foreground'>Carreta 2</label>
									<Input
										type='text'
										value={formData.ds_placa_carreta_2}
										onChange={(e) => setFormData({ ...formData, ds_placa_carreta_2: e.target.value })}
										className='w-full rounded-lg'
										placeholder='GHI-9012'
									/>
								</div>
								<div>
									<label className='mb-1 block text-xs text-muted-foreground'>Carreta 3</label>
									<Input
										type='text'
										value={formData.ds_placa_carreta_3}
										onChange={(e) => setFormData({ ...formData, ds_placa_carreta_3: e.target.value })}
										className='w-full rounded-lg'
										placeholder='JKL-3456'
									/>
								</div>
							</div>
						</div>

						{/* Datas */}
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<label className='mb-2 flex items-center gap-2 text-sm font-medium text-foreground/90'>
									<Calendar size={16} />
									Data Agendada
								</label>
								<Input
									type='datetime-local'
									value={formData.dt_agendada}
									onChange={(e) => setFormData({ ...formData, dt_agendada: e.target.value })}
									className='w-full rounded-lg'
								/>
							</div>
							<div>
								<label className='mb-2 flex items-center gap-2 text-sm font-medium text-foreground/90'>
									<Calendar size={16} />
									Previsão de Retorno
								</label>
								<Input
									type='datetime-local'
									value={formData.dt_previsao_retorno}
									onChange={(e) => setFormData({ ...formData, dt_previsao_retorno: e.target.value })}
									className='w-full rounded-lg'
								/>
							</div>
						</div>

						{/* Status */}
						<div>
							<label className='mb-2 block text-sm font-medium text-foreground/90'>Status</label>
							<select
								value={formData.ds_status}
								onChange={(e) =>
									setFormData({
										...formData,
										ds_status: e.target.value as Viagem['ds_status'],
									})
								}
								className='w-full rounded-lg border border-input px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
							>
								<option value='PLANEJADA'>Planejada</option>
								<option value='EM_COLETA'>Em Coleta</option>
								<option value='EM_VIAGEM'>Em Trânsito</option>
								<option value='CONCLUIDA'>Concluída</option>
								<option value='ATRASADA'>Atrasada</option>
								<option value='CANCELADA'>Cancelada</option>
							</select>
						</div>
					</div>

					{/* Actions */}
					<div className='mt-8 flex justify-end gap-3 border-t border-border pt-6'>
						<Button
							type='button'
							onClick={onClose}
							variant='secondary'
							className='rounded-xl border border-border bg-muted/60 px-6 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
						>
							Cancelar
						</Button>
						<Button
							type='submit'
							variant='secondary'
							disabled={updateMutation.isPending}
							className='flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-6 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted disabled:opacity-50'
						>
							<Save size={16} />
							{updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};
