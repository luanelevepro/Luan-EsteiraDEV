'use client';

import React, { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContentMedium,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { updateVeiculo } from '@/services/api/tms/tms';
import {
	getFipeMarcas,
	getFipeModelos,
	getFipeAnosPorModelo,
	getFipeAnosPorCodigo,
	getFipeInfoHierarquico,
	getFipeInfoPorCodigo,
	type VehicleTypeFipe,
} from '@/services/api/tms/fipe';
import { Search, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIPO_UNIDADE_OPTIONS = [
	{ value: 'TRACIONADOR', label: 'Tracionador' },
	{ value: 'CARROCERIA', label: 'Carroceria' },
	{ value: 'RIGIDO', label: 'Rígido' },
] as const;

const CLASSIFICACAO_TRACIONADOR = [
	{ value: 'CAVALO_4X2', label: 'Cavalo 4x2' },
	{ value: 'CAVALO_6X2', label: 'Cavalo 6x2' },
	{ value: 'CAVALO_6X4', label: 'Cavalo 6x4' },
	{ value: 'CAVALO_8X2', label: 'Cavalo 8x2' },
	{ value: 'CAVALO_8X4', label: 'Cavalo 8x4' },
];

const CLASSIFICACAO_CARROCERIA = [
	{ value: 'CARRETA_LS', label: 'Carreta LS' },
	{ value: 'CARRETA_VANDERLEIA', label: 'Carreta Vanderleia' },
	{ value: 'CARRETA_4_EIXO', label: 'Carreta 4 eixos' },
	{ value: 'BITREM', label: 'Bitrem' },
	{ value: 'RODOTREM', label: 'Rodotrem' },
	{ value: 'ROMEU_E_JULIETA', label: 'Romeu e Julieta' },
	{ value: 'REBOQUE_SIMPLES', label: 'Reboque Simples' },
];

const CLASSIFICACAO_RIGIDO = [
	{ value: 'CARRO', label: 'Carro' },
	{ value: 'MINI_VAN', label: 'Mini Van' },
	{ value: 'VAN', label: 'Van' },
	{ value: 'VUC', label: 'VUC' },
	{ value: 'CAMINHAO_TOCO', label: 'Caminhão Toco' },
	{ value: 'CAMINHAO_TRUCK', label: 'Caminhão Truck' },
];

const TIPO_CARROCERIA_CARGA = [
	{ value: 'GRANELEIRO', label: 'Graneleiro' },
	{ value: 'BAU', label: 'Baú' },
	{ value: 'SIDER', label: 'Sider' },
	{ value: 'FRIGORIFICO', label: 'Frigorífico' },
	{ value: 'TANQUE', label: 'Tanque' },
	{ value: 'PORTA_CONTAINER', label: 'Porta Container' },
];

const VEHICLE_TYPE_OPTIONS: { value: VehicleTypeFipe; label: string }[] = [
	{ value: 'cars', label: 'Carros' },
	{ value: 'motorcycles', label: 'Motos' },
	{ value: 'trucks', label: 'Caminhões' },
];

type ComboOption = { value: string; label: string };

function SearchableCombobox({
	value,
	onChange,
	options,
	placeholder,
	emptyLabel = 'Nenhum item encontrado',
	disabled,
	searchPlaceholder = 'Pesquisar...',
	portalled = true,
	container,
}: {
	value: string;
	onChange: (v: string) => void;
	options: ComboOption[];
	placeholder: string;
	emptyLabel?: string;
	disabled?: boolean;
	searchPlaceholder?: string;
	portalled?: boolean;
	container?: HTMLElement | null;
}) {
	const [open, setOpen] = useState(false);
	const selectedLabel = options.find((o) => o.value === value)?.label;
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type='button'
					variant='outline'
					role='combobox'
					aria-expanded={open}
					className='w-full justify-between'
					disabled={disabled}
				>
					<span className='truncate text-left'>{selectedLabel ?? placeholder}</span>
					<ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-[260px] p-0 z-[210]'
				portalled={portalled}
				container={container}
				sideOffset={6}
				align='start'
			>
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyLabel}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.label}
									onSelect={() => {
										onChange(option.value);
										setOpen(false);
									}}
								>
									{option.label}
									<Check
										className={cn(
											'ml-auto h-4 w-4',
											option.value === value ? 'opacity-100' : 'opacity-0',
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export interface VeiculoFormData {
	ds_placa: string;
	ds_nome: string;
	ds_tipo_unidade?: string;
	ds_classificacao_tracionador?: string;
	ds_classificacao_carroceria?: string;
	ds_classificacao_rigido?: string;
	ds_tipo_carroceria_carga?: string;
	ds_marca?: string;
	ds_modelo?: string;
	vl_ano_modelo?: string;
	vl_ano_fabricacao?: string;
	vl_eixos?: string;
	vl_aquisicao?: string;
	id_centro_custos?: string;
	dt_aquisicao?: string;
	dt_baixa?: string;
	id_modelo?: number;
}

interface ModalVeiculoProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
	editData: (VeiculoFormData & { id: string }) | null;
}

export default function ModalVeiculo({
	open,
	onOpenChange,
	onSuccess,
	editData,
}: ModalVeiculoProps) {
	const [formData, setFormData] = useState<VeiculoFormData>({
		ds_placa: '',
		ds_nome: '',
		ds_tipo_unidade: undefined,
		ds_classificacao_tracionador: undefined,
		ds_classificacao_carroceria: undefined,
		ds_classificacao_rigido: undefined,
		ds_tipo_carroceria_carga: undefined,
		ds_marca: '',
		ds_modelo: '',
		vl_ano_modelo: '',
		vl_ano_fabricacao: '',
		vl_eixos: '',
		vl_aquisicao: '',
	});
	const [fipeDialogOpen, setFipeDialogOpen] = useState(false);
	const [vehicleTypeFipe, setVehicleTypeFipe] = useState<VehicleTypeFipe>('trucks');
	const [fipeBuscaMode, setFipeBuscaMode] = useState<'hierarquico' | 'codigo'>('hierarquico');
	const [fipeCodigo, setFipeCodigo] = useState('');
	const [fipeMarcas, setFipeMarcas] = useState<{ code: string; name: string }[]>([]);
	const [fipeModelos, setFipeModelos] = useState<{ code: string; name: string }[]>([]);
	const [fipeAnos, setFipeAnos] = useState<{ code: string; name: string }[]>([]);
	const [fipeSelectedMarca, setFipeSelectedMarca] = useState('');
	const [fipeSelectedModelo, setFipeSelectedModelo] = useState('');
	const [fipeSelectedAno, setFipeSelectedAno] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fipeLoading, setFipeLoading] = useState(false);

	// Corrige bug do Radix: ao fechar Dialog com Selects, pointer-events/overflow podem ficar bloqueando cliques
	useEffect(() => {
		if (open || fipeDialogOpen) return;
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
	}, [open, fipeDialogOpen]);

	useEffect(() => {
		if (editData && open) {
			setFormData({
				ds_placa: editData.ds_placa ?? '',
				ds_nome: editData.ds_nome ?? '',
				ds_tipo_unidade: editData.ds_tipo_unidade ?? undefined,
				ds_classificacao_tracionador: editData.ds_classificacao_tracionador ?? undefined,
				ds_classificacao_carroceria: editData.ds_classificacao_carroceria ?? undefined,
				ds_classificacao_rigido: editData.ds_classificacao_rigido ?? undefined,
				ds_tipo_carroceria_carga: editData.ds_tipo_carroceria_carga ?? undefined,
				ds_marca: editData.ds_marca ?? '',
				ds_modelo: editData.ds_modelo ?? '',
				vl_ano_modelo: editData.vl_ano_modelo ?? '',
				vl_ano_fabricacao: editData.vl_ano_fabricacao ?? '',
				vl_eixos: editData.vl_eixos ?? '',
				vl_aquisicao: editData.vl_aquisicao ?? '',
				id_modelo: editData.id_modelo,
			});
		}
	}, [editData, open]);

	useEffect(() => {
		if (!open) return;
		setFipeLoading(true);
		getFipeMarcas(vehicleTypeFipe)
			.then(setFipeMarcas)
			.catch(() => setFipeMarcas([]))
			.finally(() => setFipeLoading(false));
	}, [open, vehicleTypeFipe]);

	useEffect(() => {
		if (!fipeSelectedMarca) {
			setFipeModelos([]);
		setFipeAnos([]);
		return;
	}
	setFipeLoading(true);
		getFipeModelos(vehicleTypeFipe, fipeSelectedMarca)
			.then(setFipeModelos)
			.catch(() => setFipeModelos([]))
			.finally(() => setFipeLoading(false));
		setFipeSelectedModelo('');
		setFipeSelectedAno('');
		setFipeAnos([]);
	}, [fipeSelectedMarca, vehicleTypeFipe]);

	useEffect(() => {
		if (fipeBuscaMode === 'codigo') {
			if (!fipeCodigo.trim()) {
				setFipeAnos([]);
				return;
			}
			setFipeLoading(true);
			getFipeAnosPorCodigo(vehicleTypeFipe, fipeCodigo.replace(/\D/g, '').replace(/(\d{6})(\d)/, '$1-$2'))
				.then(setFipeAnos)
				.catch(() => setFipeAnos([]))
				.finally(() => setFipeLoading(false));
			return;
		}
		if (!fipeSelectedModelo) {
			setFipeAnos([]);
			return;
		}
		setFipeLoading(true);
		getFipeAnosPorModelo(vehicleTypeFipe, fipeSelectedMarca, fipeSelectedModelo)
			.then(setFipeAnos)
			.catch(() => setFipeAnos([]))
			.finally(() => setFipeLoading(false));
		setFipeSelectedAno('');
	}, [fipeBuscaMode, fipeSelectedMarca, fipeSelectedModelo, fipeCodigo, vehicleTypeFipe]);

	async function handleBuscarFipe() {
		try {
			setFipeLoading(true);
			let info: { ds_marca: string; ds_modelo: string; vl_ano_modelo: string };
			if (fipeBuscaMode === 'codigo') {
				if (!fipeCodigo.trim() || !fipeSelectedAno) {
					toast.error('Informe o código FIPE e selecione o ano.');
					setFipeLoading(false);
					return;
				}
				const codigo = fipeCodigo.replace(/\D/g, '').replace(/(\d{6})(\d)/, '$1-$2');
				info = await getFipeInfoPorCodigo(vehicleTypeFipe, codigo, fipeSelectedAno);
			} else {
				if (!fipeSelectedMarca || !fipeSelectedModelo || !fipeSelectedAno) {
					toast.error('Selecione marca, modelo e ano.');
					setFipeLoading(false);
					return;
				}
				info = await getFipeInfoHierarquico(
					vehicleTypeFipe,
					fipeSelectedMarca,
					fipeSelectedModelo,
					fipeSelectedAno,
				);
			}
			setFormData((prev) => ({
				...prev,
				ds_marca: info.ds_marca,
				ds_modelo: info.ds_modelo,
				vl_ano_modelo: info.vl_ano_modelo?.slice(0, 4) ?? prev.vl_ano_modelo,
				vl_ano_fabricacao: info.vl_ano_modelo?.slice(0, 4) ?? prev.vl_ano_fabricacao,
			}));
			toast.success('Dados preenchidos.');
			setFipeDialogOpen(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erro ao buscar FIPE.');
		} finally {
			setFipeLoading(false);
		}
	}

	function getClassificacaoOptions() {
		switch (formData.ds_tipo_unidade) {
			case 'TRACIONADOR':
				return CLASSIFICACAO_TRACIONADOR;
			case 'CARROCERIA':
				return CLASSIFICACAO_CARROCERIA;
			case 'RIGIDO':
				return CLASSIFICACAO_RIGIDO;
			default:
				return [];
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!editData?.id) {
			toast.error('Veículo inválido.');
			return;
		}
		if (!formData.ds_placa?.trim()) {
			toast.error('Placa é obrigatória.');
			return;
		}
		if (!formData.ds_tipo_unidade) {
			toast.error('Tipo de unidade é obrigatório.');
			return;
		}
		const classificacaoRequired =
			(formData.ds_tipo_unidade === 'TRACIONADOR' && !formData.ds_classificacao_tracionador) ||
			(formData.ds_tipo_unidade === 'CARROCERIA' && !formData.ds_classificacao_carroceria) ||
			(formData.ds_tipo_unidade === 'RIGIDO' && !formData.ds_classificacao_rigido);
		if (classificacaoRequired) {
			toast.error('Classificação é obrigatória.');
			return;
		}
		if (formData.ds_tipo_unidade === 'CARROCERIA' && !formData.ds_tipo_carroceria_carga) {
			toast.error('Tipo de carroceria (compatibilidade) é obrigatório.');
			return;
		}

		setIsSubmitting(true);
		try {
			const payload: Record<string, unknown> = {
				ds_placa: formData.ds_placa.trim().toUpperCase().replace(/-/g, ''),
				ds_nome: formData.ds_nome?.trim() || formData.ds_placa.trim(),
				ds_tipo_unidade: formData.ds_tipo_unidade,
				ds_classificacao_tracionador: formData.ds_classificacao_tracionador || null,
				ds_classificacao_carroceria: formData.ds_classificacao_carroceria || null,
				ds_classificacao_rigido: formData.ds_classificacao_rigido || null,
				ds_tipo_carroceria_carga: formData.ds_tipo_carroceria_carga || null,
				ds_marca: formData.ds_marca || null,
				ds_modelo: formData.ds_modelo || null,
				vl_ano_modelo: formData.vl_ano_modelo || null,
				vl_ano_fabricacao: formData.vl_ano_fabricacao || null,
				vl_eixos: formData.vl_eixos || null,
				vl_aquisicao: formData.vl_aquisicao || null,
			};
			if (formData.id_modelo) payload.id_modelo = formData.id_modelo;

			await updateVeiculo(editData.id, payload);
			toast.success('Veículo atualizado.');
			onSuccess();
			onOpenChange(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleTipoUnidadeChange(value: string) {
		setFormData((prev) => ({
			...prev,
			ds_tipo_unidade: value,
			ds_classificacao_tracionador: undefined,
			ds_classificacao_carroceria: undefined,
			ds_classificacao_rigido: undefined,
			ds_tipo_carroceria_carga: value !== 'CARROCERIA' ? undefined : prev.ds_tipo_carroceria_carga,
		}));
	}

	if (!editData?.id) {
		return null;
	}

	return (
		<>
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContentMedium className='max-w-2xl'>
					<DialogHeader>
						<DialogTitle>Editar veículo</DialogTitle>
						<DialogDescription>
							Altere os dados do veículo. Use a busca FIPE para preencher marca, modelo e ano.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<Label htmlFor='ds_placa' className='text-xs text-muted-foreground mb-1 block'>
								Placa *
							</Label>
							<Input
								id='ds_placa'
								value={formData.ds_placa}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										ds_placa: e.target.value.toUpperCase().slice(0, 7),
									}))
								}
								placeholder='ABC1D23'
								disabled
								className='font-mono'
							/>
						</div>
						<div>
							<Label htmlFor='ds_nome' className='text-xs text-muted-foreground mb-1 block'>
								Nome
							</Label>
							<Input
								id='ds_nome'
								value={formData.ds_nome}
								disabled
								placeholder='Ex: Cavalo Mercedes'
								className='bg-muted'
							/>
						</div>
					</div>

					<div className='space-y-1'>
						<Label className='text-xs text-muted-foreground'>Tipo de veículo *</Label>
						<Select value={formData.ds_tipo_unidade ?? ''} onValueChange={handleTipoUnidadeChange}>
							<SelectTrigger className='w-full'>
								<SelectValue placeholder='Selecione' />
							</SelectTrigger>
							<SelectContent>
								{TIPO_UNIDADE_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{formData.ds_tipo_unidade && (
						<div className='space-y-1'>
							<Label className='text-xs text-muted-foreground'>Classificação *</Label>
							<Select
								value={
									formData.ds_classificacao_tracionador ??
									formData.ds_classificacao_carroceria ??
									formData.ds_classificacao_rigido ??
									''
								}
								onValueChange={(value) =>
									setFormData((prev) => ({
										...prev,
										ds_classificacao_tracionador: prev.ds_tipo_unidade === 'TRACIONADOR' ? value : undefined,
										ds_classificacao_carroceria: prev.ds_tipo_unidade === 'CARROCERIA' ? value : undefined,
										ds_classificacao_rigido: prev.ds_tipo_unidade === 'RIGIDO' ? value : undefined,
									}))
								}
							>
								<SelectTrigger className='w-full'>
									<SelectValue placeholder='Selecione' />
								</SelectTrigger>
								<SelectContent>
									{getClassificacaoOptions().map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{(formData.ds_tipo_unidade === 'CARROCERIA' || formData.ds_tipo_unidade === 'RIGIDO') && (
						<div className='space-y-1'>
							<Label className='text-xs text-muted-foreground'>
								Tipo de carroceria (carga) {formData.ds_tipo_unidade === 'CARROCERIA' && '*'}
							</Label>
							<Select
								value={formData.ds_tipo_carroceria_carga ?? ''}
								onValueChange={(value) =>
									setFormData((prev) => ({ ...prev, ds_tipo_carroceria_carga: value }))
								}
							>
								<SelectTrigger className='w-full'>
									<SelectValue placeholder='Selecione' />
								</SelectTrigger>
								<SelectContent>
									{TIPO_CARROCERIA_CARGA.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					<div>
						<div className='flex items-center justify-between gap-3 mb-3'>
							<Label className='flex-1 text-sm font-medium'>Marca, modelo e anos</Label>
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => setFipeDialogOpen(true)}
							>
								<Search className='h-4 w-4 mr-2' />
								Buscar FIPE
							</Button>
						</div>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
							<div>
								<Label className='text-xs text-muted-foreground'>Marca</Label>
								<Input
									value={formData.ds_marca}
									onChange={(e) => setFormData((prev) => ({ ...prev, ds_marca: e.target.value }))}
									placeholder='Ex.: Volkswagen'
									className='mt-1 h-9'
								/>
							</div>
							<div>
								<Label className='text-xs text-muted-foreground'>Modelo</Label>
								<Input
									value={formData.ds_modelo}
									onChange={(e) => setFormData((prev) => ({ ...prev, ds_modelo: e.target.value }))}
									placeholder='Ex.: Gol 1.0'
									className='mt-1 h-9'
								/>
							</div>
							<div>
								<Label className='text-xs text-muted-foreground'>Ano do modelo (FIPE)</Label>
								<Input
									value={formData.vl_ano_modelo}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, vl_ano_modelo: e.target.value.slice(0, 4) }))
									}
									placeholder='2024'
									type='text'
									inputMode='numeric'
									maxLength={4}
									className='mt-1 h-9'
								/>
							</div>
							<div>
								<Label className='text-xs text-muted-foreground'>Ano de fabricação</Label>
								<Input
									value={formData.vl_ano_fabricacao}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, vl_ano_fabricacao: e.target.value.slice(0, 4) }))
									}
									placeholder='2023'
									type='text'
									inputMode='numeric'
									maxLength={4}
									className='mt-1 h-9'
								/>
							</div>
						</div>
						<p className='text-xs text-muted-foreground mt-2'>
							Use a busca FIPE para preencher automaticamente ou edite manualmente os campos acima.
						</p>
					</div>

					<div className='grid grid-cols-2 gap-4'>
						<div>
							<Label className='text-xs text-muted-foreground mb-1 block'>Eixos</Label>
							<Input
								value={formData.vl_eixos}
								onChange={(e) => setFormData((prev) => ({ ...prev, vl_eixos: e.target.value }))}
								placeholder='Ex: 6'
								type='text'
								inputMode='numeric'
							/>
						</div>
						<div>
							<Label className='text-xs text-muted-foreground mb-1 block'>Valor aquisição</Label>
							<Input
								value={formData.vl_aquisicao}
								onChange={(e) => setFormData((prev) => ({ ...prev, vl_aquisicao: e.target.value }))}
								placeholder='R$ 0,00'
							/>
						</div>
					</div>

					<DialogFooter>
						<Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
						<Button type='submit' disabled={isSubmitting}>
							{isSubmitting ? 'Salvando...' : 'Atualizar'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContentMedium>
		</Dialog>

		<Dialog open={fipeDialogOpen} onOpenChange={setFipeDialogOpen} modal>
			<DialogContentMedium className='max-w-md z-[110] overflow-visible'>
				<DialogHeader>
					<DialogTitle>Buscar na tabela FIPE</DialogTitle>
					<DialogDescription>
						Selecione marca, modelo e ano para preencher os campos automaticamente.
					</DialogDescription>
				</DialogHeader>
				<div className='space-y-4'>
					<div className='flex gap-1'>
						<button
							type='button'
							onClick={() => setFipeBuscaMode('hierarquico')}
							className={`text-xs px-2 py-1 rounded ${
								fipeBuscaMode === 'hierarquico' ? 'bg-primary text-primary-foreground' : 'bg-muted'
							}`}
						>
							Marca → Modelo → Ano
						</button>
						<button
							type='button'
							onClick={() => setFipeBuscaMode('codigo')}
							className={`text-xs px-2 py-1 rounded ${
								fipeBuscaMode === 'codigo' ? 'bg-primary text-primary-foreground' : 'bg-muted'
							}`}
						>
							Código FIPE
						</button>
					</div>
					<div>
						<Label className='text-xs'>Tipo de veículo</Label>
						<Select
							value={vehicleTypeFipe}
							onValueChange={(v) => setVehicleTypeFipe(v as VehicleTypeFipe)}
						>
							<SelectTrigger className='mt-1'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{VEHICLE_TYPE_OPTIONS.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{fipeBuscaMode === 'codigo' ? (
						<div className='space-y-3'>
							<div>
								<Label className='text-xs'>Código FIPE</Label>
								<Input
									value={fipeCodigo}
									onChange={(e) => setFipeCodigo(e.target.value)}
									placeholder='005340-6'
									className='mt-1 font-mono'
								/>
							</div>
							<div>
								<Label className='text-xs'>Ano</Label>
								<Select
									value={fipeSelectedAno}
									onValueChange={setFipeSelectedAno}
									disabled={!fipeCodigo.trim() || fipeLoading}
								>
									<SelectTrigger className='mt-1'>
										<SelectValue placeholder='Selecione o ano' />
									</SelectTrigger>
									<SelectContent>
										{fipeAnos.map((a) => (
											<SelectItem key={a.code} value={a.code}>
												{a.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					) : (
						<div className='grid grid-cols-1 gap-4'>
							<div>
								<Label className='text-xs mb-1 block'>Marca</Label>
								<SearchableCombobox
									value={fipeSelectedMarca}
									onChange={(v) => {
										setFipeSelectedMarca(v);
										setFipeSelectedModelo('');
										setFipeSelectedAno('');
									}}
									options={fipeMarcas.map((m) => ({ value: m.code, label: m.name }))}
									placeholder='Selecione ou pesquise a marca'
									disabled={fipeLoading}
									searchPlaceholder='Buscar marca...'
									
								/>
							</div>
							<div>
								<Label className='text-xs mb-1 block'>Modelo</Label>
								<SearchableCombobox
									value={fipeSelectedModelo}
									onChange={(v) => {
										setFipeSelectedModelo(v);
										setFipeSelectedAno('');
									}}
									options={fipeModelos.map((m) => ({ value: m.code, label: m.name }))}
									placeholder='Selecione ou pesquise o modelo'
									disabled={!fipeSelectedMarca || fipeLoading}
									searchPlaceholder='Buscar modelo...'
									
								/>
							</div>
							<div>
								<Label className='text-xs mb-1 block'>Ano</Label>
								<SearchableCombobox
									value={fipeSelectedAno}
									onChange={setFipeSelectedAno}
									options={fipeAnos.map((a) => ({ value: a.code, label: a.name }))}
									placeholder='Selecione ou pesquise o ano'
									disabled={!fipeSelectedModelo || fipeLoading}
									searchPlaceholder='Buscar ano...'
									
								/>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button type='button' variant='outline' onClick={() => setFipeDialogOpen(false)}>
							Cancelar
						</Button>
						<Button type='button' onClick={handleBuscarFipe} disabled={fipeLoading}>
							{fipeLoading ? 'Buscando...' : 'Aplicar'}
						</Button>
					</DialogFooter>
				</div>
			</DialogContentMedium>
		</Dialog>
		</>
	);
}
