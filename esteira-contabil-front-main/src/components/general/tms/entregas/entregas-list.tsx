import React from 'react';
import { MapPin, Package, Calendar, Truck, CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react';
import type { Entrega } from '@/types/tms';

interface EntregaCardProps {
	entrega: Entrega;
	showCargaInfo?: boolean;
	onEdit?: (entrega: Entrega) => void;
	onDelete?: (entrega: Entrega) => void;
	onUpdateStatus?: (entrega: Entrega, newStatus: Entrega['ds_status']) => void;
}

const statusIcons = {
	PENDENTE: Clock,
	EM_TRANSITO: Truck,
	ENTREGUE: CheckCircle,
	DEVOLVIDA: RotateCcw,
	CANCELADA: XCircle,
};

const statusColors = {
	PENDENTE: 'text-yellow-600 bg-yellow-50',
	EM_TRANSITO: 'text-blue-600 bg-blue-50',
	ENTREGUE: 'text-green-600 bg-green-50',
	DEVOLVIDA: 'text-orange-600 bg-orange-50',
	CANCELADA: 'text-red-600 bg-red-50',
};

const statusLabels = {
	PENDENTE: 'Pendente',
	EM_TRANSITO: 'Em Trânsito',
	ENTREGUE: 'Entregue',
	DEVOLVIDA: 'Devolvida',
	CANCELADA: 'Cancelada',
};

export const EntregaCard: React.FC<EntregaCardProps> = ({ entrega, onEdit, onDelete, onUpdateStatus }) => {
	const StatusIcon = statusIcons[entrega.ds_status];
	const totalDocs = (entrega.js_entregas_ctes?.length || 0) + (entrega.js_entregas_nfes?.length || 0);

	return (
		<div className='rounded-lg border bg-white p-4 transition-shadow hover:shadow-md'>
			{/* Header */}
			<div className='mb-3 flex items-start justify-between'>
				<div className='flex items-center gap-2'>
					<div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600'>
						{entrega.nr_sequencia}
					</div>
					<div>
						{entrega.cd_entrega && <div className='text-xs text-gray-500'>#{entrega.cd_entrega}</div>}
						<div
							className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusColors[entrega.ds_status]}`}
						>
							<StatusIcon className='h-3 w-3' />
							{statusLabels[entrega.ds_status]}
						</div>
					</div>
				</div>

				{/* Actions */}
				{(onEdit || onDelete) && (
					<div className='flex gap-1'>
						{onEdit && (
							<button
								onClick={() => onEdit(entrega)}
								className='rounded p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600'
								title='Editar entrega'
							>
								<svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
									/>
								</svg>
							</button>
						)}
						{onDelete && entrega.ds_status === 'PENDENTE' && (
							<button
								onClick={() => onDelete(entrega)}
								className='rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600'
								title='Deletar entrega'
							>
								<svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
									/>
								</svg>
							</button>
						)}
					</div>
				)}
			</div>

			{/* Destino */}
			<div className='space-y-2'>
				<div className='flex items-start gap-2'>
					<MapPin className='mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400' />
					<div className='min-w-0 flex-1'>
						<div className='font-medium text-gray-900'>
							{entrega.sis_cidade_destino?.ds_city || 'Cidade não especificada'}
							{entrega.sis_cidade_destino?.js_uf && (
								<span className='ml-1 text-gray-500'>- {entrega.sis_cidade_destino.js_uf.ds_uf}</span>
							)}
						</div>
						{entrega.ds_endereco && <div className='truncate text-sm text-gray-600'>{entrega.ds_endereco}</div>}
						{entrega.ds_complemento && <div className='text-xs text-gray-500'>{entrega.ds_complemento}</div>}
					</div>
				</div>

				{/* Documentos */}
				{totalDocs > 0 && (
					<div className='flex items-center gap-2 text-sm'>
						<Package className='h-4 w-4 text-gray-400' />
						<span className='text-gray-600'>
							{totalDocs} documento{totalDocs !== 1 ? 's' : ''}
						</span>
						{entrega.js_entregas_ctes && entrega.js_entregas_ctes.length > 0 && (
							<span className='text-xs text-gray-500'>({entrega.js_entregas_ctes.length} CT-e)</span>
						)}
						{entrega.js_entregas_nfes && entrega.js_entregas_nfes.length > 0 && (
							<span className='text-xs text-gray-500'>({entrega.js_entregas_nfes.length} NF-e)</span>
						)}
					</div>
				)}

				{/* Datas */}
				{(entrega.dt_limite_entrega || entrega.dt_entrega) && (
					<div className='flex items-center gap-2 text-sm'>
						<Calendar className='h-4 w-4 text-gray-400' />
						<div className='flex gap-3'>
							{entrega.dt_limite_entrega && (
								<div>
									<span className='text-xs text-gray-500'>Limite: </span>
									<span className='text-gray-700'>{new Date(entrega.dt_limite_entrega).toLocaleDateString('pt-BR')}</span>
								</div>
							)}
							{entrega.dt_entrega && (
								<div>
									<span className='text-xs text-gray-500'>Entregue: </span>
									<span className='font-medium text-green-700'>{new Date(entrega.dt_entrega).toLocaleDateString('pt-BR')}</span>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Dimensões */}
				{(entrega.vl_peso_bruto || entrega.vl_cubagem || entrega.vl_qtd_volumes) && (
					<div className='flex gap-3 border-t pt-2 text-xs text-gray-600'>
						{entrega.vl_peso_bruto && (
							<div>
								<span className='text-gray-500'>Peso: </span>
								<span className='font-medium'>{entrega.vl_peso_bruto.toLocaleString('pt-BR')} kg</span>
							</div>
						)}
						{entrega.vl_cubagem && (
							<div>
								<span className='text-gray-500'>Cubagem: </span>
								<span className='font-medium'>{entrega.vl_cubagem.toFixed(2)} m³</span>
							</div>
						)}
						{entrega.vl_qtd_volumes && (
							<div>
								<span className='text-gray-500'>Volumes: </span>
								<span className='font-medium'>{entrega.vl_qtd_volumes}</span>
							</div>
						)}
					</div>
				)}

				{/* Observações */}
				{entrega.ds_observacoes && <div className='border-t pt-2 text-xs text-gray-600 italic'>{entrega.ds_observacoes}</div>}
			</div>

			{/* Quick Status Actions */}
			{onUpdateStatus && entrega.ds_status !== 'ENTREGUE' && entrega.ds_status !== 'CANCELADA' && (
				<div className='mt-3 flex gap-2 border-t pt-3'>
					{entrega.ds_status === 'PENDENTE' && (
						<button
							onClick={() => onUpdateStatus(entrega, 'EM_TRANSITO')}
							className='flex-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100'
						>
							Iniciar Transporte
						</button>
					)}
					{entrega.ds_status === 'EM_TRANSITO' && (
						<button
							onClick={() => onUpdateStatus(entrega, 'ENTREGUE')}
							className='flex-1 rounded bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100'
						>
							Confirmar Entrega
						</button>
					)}
				</div>
			)}
		</div>
	);
};

interface EntregasListProps {
	entregas: Entrega[];
	showCargaInfo?: boolean;
	onEdit?: (entrega: Entrega) => void;
	onDelete?: (entrega: Entrega) => void;
	onUpdateStatus?: (entrega: Entrega, newStatus: Entrega['ds_status']) => void;
}

export const EntregasList: React.FC<EntregasListProps> = ({ entregas, showCargaInfo, onEdit, onDelete, onUpdateStatus }) => {
	if (!entregas || entregas.length === 0) {
		return (
			<div className='py-8 text-center text-gray-500'>
				<MapPin className='mx-auto mb-2 h-12 w-12 text-gray-300' />
				<p>Nenhuma entrega cadastrada</p>
			</div>
		);
	}

	return (
		<div className='space-y-3'>
			{entregas.map((entrega) => (
				<EntregaCard
					key={entrega.id}
					entrega={entrega}
					showCargaInfo={showCargaInfo}
					onEdit={onEdit}
					onDelete={onDelete}
					onUpdateStatus={onUpdateStatus}
				/>
			))}
		</div>
	);
};
