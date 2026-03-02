import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Carga } from '@/types/tms';
import { X, Truck, Tag, CheckCircle, Info } from 'lucide-react';
import { getSegmentos } from '@/services/api/tms/tms';

interface ConfigureLoadModalProps {
	isOpen: boolean;
	onClose: () => void;
	load: Carga | null;
	onConfirm: (load: Carga, segment: string, vehicleType: string) => void;
	onBack?: () => void;
}

const VEHICLE_TYPES = [
	{ id: 'Vuc', label: 'Vuc', icon: Truck },
	{ id: 'Truck', label: 'Truck', icon: Truck },
	{ id: 'Carreta', label: 'Carreta', icon: Truck },
	{ id: 'Bitrem', label: 'Bitrem', icon: Truck },
];

export const ConfigureLoadModal: React.FC<ConfigureLoadModalProps> = ({ isOpen, onClose, load, onConfirm, onBack }) => {
	const [selectedSegment, setSelectedSegment] = useState(load?.tms_segmentos?.ds_nome || '');
	const [selectedVehicleType, setSelectedVehicleType] = useState(load?.ds_tipo_carroceria || '');
	const { data: segments } = useQuery({
		queryKey: ['get-segmentos'],
		queryFn: () => getSegmentos(),
		staleTime: 1000 * 60 * 10, // 10 minutos
	});
	interface SegmentData {
		id: number | string;
		ds_nome: string;
		cd_identificador: string;
		is_ativo: boolean;
	}
	const segmentsData = React.useMemo(() => {
		if (!segments) return [];
		return segments
			.filter((seg: SegmentData) => seg.is_ativo)
			.map((seg: SegmentData) => ({
				id: seg.id,
				ds_nome: seg.ds_nome,
				cd_identificador: seg.cd_identificador,
			}));
	}, [segments]);
	if (!isOpen || !load) return null;
	const handleConfirm = () => {
		if (!selectedSegment || !selectedVehicleType) {
			alert('Por favor, selecione o segmento e o tipo de veículo.');
			return;
		}
		if (load) {
			onConfirm(load, selectedSegment, selectedVehicleType);
		} else {
			alert('Carga não disponível.');
		}
	};

	return (
		<div className='absolute inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
			<div className='animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl duration-200'>
				{/* Header */}
				<div className='flex items-center justify-between border-b border-border/70 bg-muted/50 p-6'>
					<div>
						<h3 className='text-xl font-black tracking-tight text-foreground uppercase'>Configurar Carga</h3>
						<p className='mt-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase'>
							Defina os parâmetros operacionais para {(load?.fis_clientes ?? load?.tms_clientes)?.ds_nome}
						</p>
					</div>
					<button onClick={onClose} className='rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'>
						<X size={20} />
					</button>
				</div>

				<div className='custom-scrollbar flex-1 space-y-8 overflow-y-auto p-8'>
					{/* Info Alert */}
					<div className='flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4'>
						<div className='rounded-xl border border-blue-50 bg-card p-2 text-blue-600 shadow-sm'>
							<Info size={18} />
						</div>
						<div>
							<div className='text-xs font-black tracking-wide text-blue-900 uppercase'>Ação Necessária</div>
							<p className='mt-0.5 text-[11px] leading-relaxed font-medium text-blue-700'>
								Esta carga ainda não possui um segmento ou tipo de veículo definido. Informe-os abaixo para que possamos recomendar
								os veículos compatíveis.
							</p>
						</div>
					</div>

					{/* Segment Selection */}
					<div>
						<h4 className='mb-4 flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
							<Tag size={12} /> Segmento Gerencial
						</h4>
						<div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
							{(segmentsData ?? []).map((seg: SegmentData) => {
								const isSelected: boolean = selectedSegment === seg.ds_nome;
								return (
									<button
										key={seg.id}
										onClick={() => setSelectedSegment(seg.ds_nome)}
										className={`group relative flex flex-col gap-2 overflow-hidden rounded-2xl border-2 p-4 text-left transition-all ${
											isSelected
												? '-translate-y-1 border-black bg-primary text-white shadow-xl'
												: 'border-border/70 bg-muted/40 text-muted-foreground hover:border-input hover:bg-card'
										} `}
									>
										<div className={`text-sm font-black tracking-tight uppercase ${isSelected ? 'text-white' : 'text-foreground'}`}>
											{seg.ds_nome}
										</div>
										{/* <div className={`text-[9px] leading-tight font-bold ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
											{seg.description}
										</div> */}
										{isSelected && (
											<div className='absolute top-2 right-2'>
												<CheckCircle size={14} className='text-white' />
											</div>
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Vehicle Type Selection */}
					<div>
						<h4 className='mb-4 flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
							<Truck size={12} /> Tipo de Veículo Necessário
						</h4>
						<div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
							{VEHICLE_TYPES.map((type) => {
								const isSelected = selectedVehicleType === type.id;
								const Icon = type.icon;
								return (
									<button
										key={type.id}
										onClick={() => setSelectedVehicleType(type.id)}
										className={`group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 transition-all ${
											isSelected
												? '-translate-y-1 border-black bg-primary text-white shadow-xl'
												: 'border-border/70 bg-muted/40 text-muted-foreground hover:border-input hover:bg-card'
										} `}
									>
										<div
											className={`rounded-xl p-2 transition-all ${isSelected ? 'bg-card/20 text-white' : 'bg-card text-muted-foreground shadow-sm group-hover:text-foreground'}`}
										>
											<Icon size={20} />
										</div>
										<div className='text-[10px] font-black tracking-widest uppercase'>{type.label}</div>
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className='flex items-center justify-between gap-3 border-t border-border/70 bg-muted/40 p-6'>
					<button
						onClick={onClose}
						className='rounded-xl px-6 py-3 text-xs font-black tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground'
					>
						Cancelar
					</button>

					<div className='flex gap-3'>
						{onBack && (
							<button
								onClick={onBack}
								className='rounded-xl border border-border bg-muted/60 px-6 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
							>
								Voltar
							</button>
						)}
						<button
							onClick={handleConfirm}
							className='flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-8 py-3 text-xs font-black tracking-widest uppercase text-foreground shadow-sm hover:bg-muted'
						>
							Confirmar e Continuar <CheckCircle size={16} />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
