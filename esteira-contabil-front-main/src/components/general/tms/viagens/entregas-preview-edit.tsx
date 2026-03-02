import React from 'react';
import { MapPin } from 'lucide-react';

export type EntregaDraft = {
	id: string;
	nr_sequencia: number;
	id_cidade_destino?: number;
	destinoNome?: string;
	/** Recebedor (CT-e); destino da entrega quando preenchido */
	ds_nome_recebedor?: string;
	/** Destinatário; usado como destino quando não houver recebedor */
	ds_nome_destinatario?: string;
	ds_endereco?: string;
	ds_complemento?: string;
	dt_limite_entrega?: string;
	ds_observacoes?: string;
	vl_total_mercadoria?: number;
	js_produtos?: string[];
	documentosIds: string[];
};

interface EntregasPreviewEditProps {
	entregas: EntregaDraft[];
	cities: Array<{ id: number; ds_city: string; js_uf?: { ds_uf: string } }>;
	onChange: (next: EntregaDraft[]) => void;
}

export const EntregasPreviewEdit: React.FC<EntregasPreviewEditProps> = ({ entregas, cities, onChange }) => {
	const updateEntrega = (id: string, patch: Partial<EntregaDraft>) => {
		onChange(entregas.map((e) => (e.id === id ? { ...e, ...patch } : e)));
	};

	return (
		<div className='space-y-4'>
			{entregas.map((entrega) => (
				<div key={entrega.id} className='rounded-2xl border border-border bg-card p-4'>
					{/* Header */}
					<div className='mb-4 flex items-start justify-between gap-4'>
						<div>
							<div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>Entrega {entrega.nr_sequencia}</div>
							<div className='mt-1 text-sm font-bold text-foreground'>{entrega.documentosIds.length} documento(s)</div>
							{(entrega.ds_nome_recebedor || entrega.ds_nome_destinatario) && (
								<div className='mt-0.5 text-xs text-muted-foreground'>
									Recebedor/Destinatário: {entrega.ds_nome_recebedor || entrega.ds_nome_destinatario}
								</div>
							)}
						</div>
						<div className='shrink-0 text-[10px] font-bold text-muted-foreground uppercase'>Destino</div>
					</div>

					{/* Campos de destino - layout em grid com alinhamento correto */}
					<div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start'>
						<div className='flex flex-col gap-1.5'>
							<label className='flex items-center gap-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
								<MapPin size={10} /> Cidade de destino
							</label>
							<select
								className='w-full rounded-xl border border-border p-3 text-sm font-bold transition-all outline-none focus:border-black focus:ring-2 focus:ring-gray-100'
								value={entrega.id_cidade_destino || ''}
								onChange={(e) => updateEntrega(entrega.id, { id_cidade_destino: Number(e.target.value) || undefined })}
							>
								<option value=''>Selecione...</option>
								{cities.map((city) => (
									<option key={city.id} value={city.id}>
										{city.ds_city} - {city.js_uf?.ds_uf || ''}
									</option>
								))}
							</select>
						</div>
						<div className='flex flex-col gap-1.5'>
							<label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>Endereço</label>
							<input
								className='w-full rounded-xl border border-border p-3 text-sm font-medium outline-none focus:border-black focus:ring-2 focus:ring-gray-100'
								value={entrega.ds_endereco || ''}
								onChange={(e) => updateEntrega(entrega.id, { ds_endereco: e.target.value })}
								placeholder='Rua, número, bairro'
							/>
						</div>
						<div className='flex flex-col gap-1.5'>
							<label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>Complemento</label>
							<input
								className='w-full rounded-xl border border-border p-3 text-sm font-medium outline-none focus:border-black focus:ring-2 focus:ring-gray-100'
								value={entrega.ds_complemento || ''}
								onChange={(e) => updateEntrega(entrega.id, { ds_complemento: e.target.value })}
								placeholder='Bloco, sala, referência'
							/>
						</div>
						<div className='flex flex-col gap-1.5'>
							<label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
								Prazo limite <span className='font-normal normal-case text-muted-foreground'>(opcional)</span>
							</label>
							<input
								type='datetime-local'
								className='w-full rounded-xl border border-border p-3 text-sm font-medium outline-none focus:border-black focus:ring-2 focus:ring-gray-100'
								value={entrega.dt_limite_entrega || ''}
								onChange={(e) => updateEntrega(entrega.id, { dt_limite_entrega: e.target.value || undefined })}
							/>
						</div>
					</div>

					{/* Observações */}
					<div className='mt-4 flex flex-col gap-1.5'>
						<label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
							Observações da entrega <span className='font-normal normal-case text-muted-foreground'>(opcional)</span>
						</label>
						<textarea
							className='h-20 w-full resize-none rounded-xl border border-border p-3 text-sm font-medium outline-none focus:border-black focus:ring-2 focus:ring-gray-100'
							value={entrega.ds_observacoes || ''}
							onChange={(e) => updateEntrega(entrega.id, { ds_observacoes: e.target.value })}
							placeholder='Informe observações adicionais'
						/>
					</div>
				</div>
			))}
		</div>
	);
};
