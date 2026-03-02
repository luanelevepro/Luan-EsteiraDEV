import React from 'react';
import { Veiculo } from '@/types/tms';
import { Truck } from 'lucide-react';

interface VehicleCardProps {
	vehicle: Veiculo;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle }) => {
	return (
		<div className='group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md'>
			{/* Tipo de Veículo em Azul */}
			{/* <div className='mb-2 flex items-center gap-2'>
				<span className='text-[11px] font-black tracking-tight text-blue-600 uppercase'>{vehicle.type}</span>
			</div> */}

			{/* Placa do Veículo - Destacada (padrão dark-safe) */}
			<div className='mb-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2.5'>
				<div className='flex items-center gap-2'>
					<Truck size={16} className='shrink-0 text-blue-700 dark:text-blue-300' />
					<span className='font-mono text-[12px] font-black tracking-wide text-blue-700 dark:text-blue-300'>
						{vehicle.ds_placa}
					</span>
				</div>
			</div>

			{/* Modelo e Motorista */}
			<div className='space-y-2'>
				{/* Nome/Modelo do Veículo */}
				<div className='text-[11px] font-bold text-foreground'>
					{vehicle.ds_nome ? vehicle.ds_nome.split(']')[1]?.trim() || vehicle.ds_nome : 'Modelo não informado'}
				</div>

				{/* Motorista */}
				<div className='text-[11px] font-medium text-muted-foreground'>
					{vehicle.tms_motoristas_veiculos?.[0]?.tms_motoristas?.rh_funcionarios?.ds_nome || 'Motorista não atribuído'}
				</div>
			</div>

			{/* Status */}
			<div className='text-[11px] font-medium text-muted-foreground'>Aguardando programação</div>

			{/* Tag "+2 na fila" - Mock para demonstração -- TODO conferir */}
			{/* <div className='flex items-center gap-1'>
				<Badge className='flex items-center gap-1 border-yellow-200 bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700'>
					<ChevronRight size={10} />
					+2 na fila
				</Badge>
			</div> */}

			{/* Footer / Meta - Peso e Volume -- TODO */}
			{/* {(vehicle.capacity || vehicle.volumeCapacity) && (
				<div className='flex gap-3 border-t border-border/60 pt-2 text-[10px] font-bold text-muted-foreground uppercase'>
					{vehicle.capacity && <span>{(vehicle.capacity / 1000).toFixed(1)}t</span>}
					{vehicle.volumeCapacity && <span>{vehicle.volumeCapacity}m³</span>}
				</div>
			)} */}

			{/* {vehicle.ds_status === 'Maintenance' && (
				<div className='absolute top-0 right-0 p-1'>
					<div className='animate-pulse text-orange-500'>
						<AlertTriangle size={12} strokeWidth={3} />
					</div>
				</div>
			)} */}
		</div>
	);
};
