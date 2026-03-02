'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Calendar, Building2, Car, Gauge, BadgeDollarSign } from 'lucide-react';

export interface VeiculoDetalhesData {
	id: string;
	ds_placa: string;
	ds_nome?: string;
	id_centro_custos?: string | null;
	ds_centro_custos?: string | null;
	dt_aquisicao?: string | null;
	dt_baixa?: string | null;
	vl_ano_modelo?: string | null;
	vl_aquisicao?: number | string | null;
	ds_tipo_unidade?: string | null;
	ds_marca?: string | null;
	ds_modelo?: string | null;
	ds_classificacao_tracionador?: string | null;
	ds_classificacao_carroceria?: string | null;
	ds_classificacao_rigido?: string | null;
	ds_tipo_carroceria_carga?: string | null;
}

interface ModalDetalhesVeiculoProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	veiculo: VeiculoDetalhesData | null;
}

function formatDate(iso?: string | null): string {
	if (!iso) return '-';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '-';
	return d.toLocaleDateString('pt-BR');
}

export default function ModalDetalhesVeiculo({
	open,
	onOpenChange,
	veiculo,
}: ModalDetalhesVeiculoProps) {
	if (!veiculo) return null;

const classificacao =
		veiculo.ds_classificacao_tracionador ||
		veiculo.ds_classificacao_carroceria ||
		veiculo.ds_classificacao_rigido ||
		null;

	const tipoCarroceria =
		veiculo.ds_tipo_carroceria_carga ? veiculo.ds_tipo_carroceria_carga.replace(/_/g, ' ') : '-';
	const centroCustos = veiculo.ds_centro_custos || '-';
	const valorAquisicao =
		veiculo.vl_aquisicao !== undefined &&
		veiculo.vl_aquisicao !== null &&
		String(veiculo.vl_aquisicao).toString().trim() !== '' &&
		!Number.isNaN(Number(veiculo.vl_aquisicao))
			? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(veiculo.vl_aquisicao))
			: '-';
	const marcaModeloAno =
		[veiculo.ds_marca, veiculo.ds_modelo, veiculo.vl_ano_modelo].filter(Boolean).join(' • ') || '-';

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side='right' className='w-full sm:max-w-lg'>
				<SheetHeader className='space-y-1'>
					<SheetTitle className='font-mono text-xl'>{veiculo.ds_placa}</SheetTitle>
					<SheetDescription className='text-sm leading-5'>
						{veiculo.ds_nome || 'Veículo'}
					</SheetDescription>
				</SheetHeader>

				<div className='mt-6 space-y-6'>
					<section className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<div className='rounded-lg border bg-muted/40 p-3 space-y-2'>
							<div className='flex items-center gap-2 text-sm text-muted-foreground'>
								<Gauge className='h-4 w-4' />
								<span>Tipo</span>
							</div>
							<p className='font-medium'>
								{veiculo.ds_tipo_unidade
									? veiculo.ds_tipo_unidade.toUpperCase() === 'TRACIONADOR'
										? 'Tracionador'
										: veiculo.ds_tipo_unidade.toUpperCase() === 'CARROCERIA'
											? 'Carroceria'
											: 'Rígido'
									: '-'}
							</p>
							<p className='text-xs text-muted-foreground'>
								Classificação: {classificacao ? classificacao.replace(/_/g, ' ') : '-'}
							</p>
							{veiculo.ds_tipo_carroceria_carga && (
								<p className='text-xs text-muted-foreground'>Carroceria: {tipoCarroceria}</p>
							)}
						</div>

						<div className='rounded-lg border bg-muted/40 p-3 space-y-2'>
							<div className='flex items-center gap-2 text-sm text-muted-foreground'>
								<Car className='h-4 w-4' />
								<span>Marca / Modelo / Ano</span>
							</div>
							<p className='font-medium break-words'>
								{marcaModeloAno}
							</p>
						</div>
					</section>

					<section className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<div className='rounded-lg border bg-muted/40 p-3 space-y-2'>
							<div className='flex items-center gap-2 text-sm text-muted-foreground'>
								<Building2 className='h-4 w-4' />
								<span>Centro de custos</span>
							</div>
							<p className='font-medium break-words'>{centroCustos}</p>
						</div>

						<div className='rounded-lg border bg-muted/40 p-3 space-y-2'>
							<div className='flex items-center gap-2 text-sm text-muted-foreground'>
								<BadgeDollarSign className='h-4 w-4' />
								<span>Valor aquisição</span>
							</div>
							<p className='font-medium'>{valorAquisicao}</p>
						</div>
					</section>

					<section className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<div className='rounded-lg border bg-muted/40 p-3 space-y-2'>
							<div className='flex items-center gap-2 text-sm text-muted-foreground'>
								<Calendar className='h-4 w-4' />
								<span>Data de aquisição</span>
							</div>
							<p className='font-medium'>{formatDate(veiculo.dt_aquisicao)}</p>
						</div>

						<div className='rounded-lg border bg-muted/40 p-3 space-y-2'>
							<div className='flex items-center gap-2 text-sm text-muted-foreground'>
								<Calendar className='h-4 w-4' />
								<span>Data de baixa</span>
							</div>
							<p className='font-medium'>{formatDate(veiculo.dt_baixa)}</p>
						</div>
					</section>
				</div>
			</SheetContent>
		</Sheet>
	);
}
