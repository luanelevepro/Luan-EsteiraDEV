import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCompanyContext } from '@/context/company-context';
import { getVeiculos } from '@/services/api/tms/tms';
import { vincularMotoristaVeiculo, type Motorista } from '@/services/api/tms/motoristas';
import { Veiculo } from '@/types/tms';
import { toast } from 'sonner';
import { Truck, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContentMedium, DialogHeader, DialogDescription } from '@/components/ui/dialog';

interface ModalLinkVeiculoMotoristaProps {
	isOpen: boolean;
	onClose: () => void;
	motorista: Motorista | null;
	onLinked?: (result: unknown) => void;
}

export const ModalLinkVeiculoMotorista: React.FC<ModalLinkVeiculoMotoristaProps> = ({ isOpen, onClose, motorista, onLinked }) => {
	const { state: empresaId } = useCompanyContext();
	const [searchVeiculo, setSearchVeiculo] = useState('');
	const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);
	const [linkAsPrincipal, setLinkAsPrincipal] = useState(false);
	const [isLinking, setIsLinking] = useState(false);

	const { data: veiculos } = useQuery({
		queryKey: ['get-veiculos-all-link', empresaId],
		queryFn: () => getVeiculos(empresaId, true),
		enabled: !!empresaId,
		staleTime: 1000 * 60 * 5,
	});

	// Pre-selecionar veículo caso o motorista já tenha vínculo
	useEffect(() => {
		if (!isOpen) return;
		if (!motorista || !veiculos || veiculos.length === 0) return;

		type MotoristaVeiculoRel = {
			id?: string;
			id_tms_veiculos?: string;
			id_tms_veiculo?: string;
			is_principal?: boolean;
			is_ativo?: boolean;
			[key: string]: unknown;
		};

		const rels = motorista.tms_motoristas_veiculos as MotoristaVeiculoRel[] | undefined;
		if (!rels || rels.length === 0) return;

		// Prioriza is_principal && is_ativo, senão primeiro ativo, senão primeiro registro
		const relArray: MotoristaVeiculoRel[] = Array.isArray(rels) ? rels : [rels];
		const principal = relArray.find((r) => r.is_principal && r.is_ativo);
		const ativo = relArray.find((r) => r.is_ativo);
		const chosen = principal || ativo || relArray[0];
		if (!chosen) return;

		// Tolerância a shapes diferentes: procura a chave que contenha 'veicul' (ex: id_tms_veiculos, id_tms_veiculo)
		const vehicleKey = Object.keys(chosen).find((k) => k.toLowerCase().includes('veicul'));
		const vehicleId = vehicleKey ? (chosen[vehicleKey] as string | undefined) : undefined;
		if (!vehicleId) return;

		const found = veiculos.find((v: Veiculo) => String(v.id) === String(vehicleId));
		if (found) setSelectedVehicle(found);
	}, [isOpen, motorista, veiculos]);

	useEffect(() => {
		if (!isOpen) {
			setSearchVeiculo('');
			setSelectedVehicle(null);
			setLinkAsPrincipal(false);
		}
	}, [isOpen]);

	// Corrige bug do Radix: ao fechar Dialog, pointer-events/overflow podem ficar bloqueando cliques
	useEffect(() => {
		if (isOpen) return;
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
	}, [isOpen]);

	const filtered = (veiculos || []).filter((v: Veiculo) => {
		if (!searchVeiculo) return true;
		const q = searchVeiculo.toLowerCase();
		return (v.ds_placa || '').toLowerCase().includes(q) || (v.ds_nome || '').toLowerCase().includes(q);
	});

	const handleConfirm = async () => {
		if (!motorista) {
			toast.error('Motorista inválido.');
			return;
		}
		if (!selectedVehicle) {
			toast.error('Selecione um veículo.');
			return;
		}

		setIsLinking(true);
		const toastId = toast.loading('Vinculando motorista ao veículo...');
		try {
			const result = await vincularMotoristaVeiculo({
				id_tms_motoristas: motorista.id,
				id_tms_veiculos: selectedVehicle.id,
				is_principal: linkAsPrincipal,
				is_ativo: true,
			});
			toast.success('Motorista vinculado com sucesso!', { id: toastId });
			if (onLinked) onLinked(result);
			onClose();
		} catch (err: unknown) {
			console.error('Erro ao vincular motorista:', err);
			const msg = err instanceof Error ? err.message : 'Erro ao vincular motorista.';
			toast.error(msg, { id: toastId });
		} finally {
			setIsLinking(false);
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContentMedium className='animate-in zoom-in-95 w-full max-w-3xl rounded-2xl border p-0'>
				<div className='p-6'>
					<DialogHeader>
						<div className='flex w-full items-center justify-between'>
							<div>
								<CardTitle className='text-lg font-black uppercase'>Vincular veículo ao motorista</CardTitle>
								<DialogDescription>
									Selecione um veículo para vincular ao motorista {motorista?.rh_funcionarios?.ds_nome}.
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					<div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
						<div>
							<input
								type='text'
								value={searchVeiculo}
								onChange={(e) => setSearchVeiculo(e.target.value)}
								placeholder='Buscar por placa ou nome...'
								className='mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800/20 dark:text-gray-100 dark:focus:border-blue-500'
							/>

							<div className='max-h-64 space-y-2 overflow-y-auto pr-2'>
								{filtered.length === 0 && (
									<div className='text-muted-foreground py-6 text-center text-sm'>Nenhum veículo encontrado.</div>
								)}
								{filtered.map((v: Veiculo) => {
									const placa = v.ds_placa || 'Sem placa';
									const nome = v.ds_nome || '';
									const hasDriver = Array.isArray(v.tms_motoristas_veiculos) && v.tms_motoristas_veiculos.length > 0;
									const selectedClass =
										selectedVehicle?.id === v.id
											? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
											: 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/30';

									return (
										<div
											key={v.id}
											onClick={() => setSelectedVehicle(v)}
											className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${selectedClass}`}
										>
											<div className='flex items-center gap-3'>
												<div className='rounded-lg border border-gray-100 bg-white p-2'>
													<Truck size={16} className='text-gray-600' />
												</div>
												<div>
													<div className='text-sm font-black uppercase'>{placa}</div>
													<div className='text-muted-foreground text-xs font-bold uppercase'>{nome.substring(0, 40)}</div>
													<div className='text-muted-foreground text-[10px]'>
														{hasDriver ? 'Tem motorista vinculado' : 'Sem motorista vinculado'}
													</div>
												</div>
											</div>
											{selectedVehicle?.id === v.id && <CheckCircle size={16} className='text-blue-600' />}
										</div>
									);
								})}
							</div>
						</div>

						<div>
							<Card className='rounded-xl p-0'>
								<CardContent className='p-4'>
									<div className='text-muted-foreground mb-2 text-xs font-black tracking-widest uppercase'>Resumo</div>
									<div className='text-sm font-bold'>{motorista?.rh_funcionarios?.ds_nome || 'Motorista não selecionado'}</div>
									<div className='text-muted-foreground mt-1 text-sm'>{motorista?.rh_funcionarios?.ds_documento || ''}</div>

									<div className='mt-4 space-y-3'>
										<div className='flex items-center justify-between'>
											<div className='text-muted-foreground text-sm font-medium'>Veículo selecionado</div>
											<div className='text-sm font-bold'>{selectedVehicle?.ds_placa || '-'}</div>
										</div>

										<label className='flex items-center gap-3'>
											<input
												type='checkbox'
												checked={linkAsPrincipal}
												onChange={(e) => setLinkAsPrincipal(e.target.checked)}
												className='h-4 w-4'
											/>
											<div className='text-sm'>Definir como motorista principal</div>
										</label>

										{/* Vínculo ativo removido — vínculo será criado como ativo por padrão */}
									</div>
								</CardContent>
							</Card>

							<div className='mt-6 flex gap-3'>
								<Button onClick={onClose} className='flex-1 rounded-xl border px-4 py-3 text-sm font-bold hover:bg-gray-50'>
									Cancelar
								</Button>
								<Button
									onClick={handleConfirm}
									disabled={!selectedVehicle || isLinking}
									className='flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
								>
									{isLinking ? (
										<>
											<Loader2 size={16} className='animate-spin' /> Vinculando...
										</>
									) : (
										'Vincular'
									)}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</DialogContentMedium>
		</Dialog>
	);
};

export default ModalLinkVeiculoMotorista;
