'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
	getColunasPersonalizadas,
	createColunaPersonalizada,
	updateColunaPersonalizada,
	deleteColunaPersonalizada,
	reorderColunasPersonalizadas,
} from '@/services/api/tms/colunas-personalizadas';
import type { ColunaPersonalizada, ColunaPersonalizadaCreate, TabelasPersonalizadas, TipoColunas } from '@/types/colunas-personalizadas';
import { Grid2x2Plus, Plus, Pencil, Trash2, ArrowLeft, GripVertical } from 'lucide-react';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

const TIPO_OPCOES: { value: TipoColunas; label: string }[] = [
	{ value: 'TEXTO', label: 'Texto' },
	{ value: 'DATA', label: 'Data' },
	{ value: 'OPCAO', label: 'Opção' },
];

function normalizeHex(hex: string): string {
	const cleaned = (hex ?? '').replace(/^#/, '').trim();
	if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) return `#${cleaned}`;
	if (/^[0-9A-Fa-f]{3}$/.test(cleaned)) {
		return `#${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`;
	}
	return hex ? (hex.startsWith('#') ? hex : `#${hex}`) : '#6b7280';
}

function isValidHex(hex: string): boolean {
	const n = normalizeHex(hex);
	return /^#[0-9A-Fa-f]{6}$/.test(n) || /^#[0-9A-Fa-f]{3}$/.test(n);
}

function ColorSwatch({ hex, className }: { hex: string; className?: string }) {
	const normalized = normalizeHex(hex ?? '');
	return (
		<div
			className={className}
			style={{
				width: 24,
				height: 24,
				borderRadius: 6,
				backgroundColor: normalized,
				border: '1px solid var(--border)',
				flexShrink: 0,
			}}
			title={normalized}
		/>
	);
}

interface ColunasPersonalizadasSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	ds_tabela: TabelasPersonalizadas;
}

export function ColunasPersonalizadasSheet({ open, onOpenChange, ds_tabela }: ColunasPersonalizadasSheetProps) {
	const queryClient = useQueryClient();
	const [view, setView] = useState<'list' | 'form'>('list');
	const [editingId, setEditingId] = useState<string | null>(null);

	const { data: colunas = [], isLoading } = useQuery({
		queryKey: ['colunas-personalizadas', ds_tabela],
		queryFn: () => getColunasPersonalizadas(ds_tabela),
		enabled: open,
		staleTime: 1000 * 60 * 2,
	});

	const createMutation = useMutation({
		mutationFn: (data: ColunaPersonalizadaCreate) => createColunaPersonalizada(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['colunas-personalizadas'] });
			toast.success('Coluna criada com sucesso');
			setView('list');
			setEditingId(null);
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateColunaPersonalizada>[1] }) =>
			updateColunaPersonalizada(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['colunas-personalizadas'] });
			toast.success('Coluna atualizada com sucesso');
			setView('list');
			setEditingId(null);
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteColunaPersonalizada(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['colunas-personalizadas'] });
			toast.success('Coluna removida');
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const reorderMutation = useMutation({
		mutationFn: (orderedIds: string[]) => reorderColunasPersonalizadas(ds_tabela, orderedIds),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['colunas-personalizadas'] });
			toast.success('Ordem atualizada');
		},
		onError: (err: Error) => toast.error(err.message),
	});

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = colunas.findIndex((c) => c.id === active.id);
		const newIndex = colunas.findIndex((c) => c.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;
		const reordered = arrayMove(colunas, oldIndex, newIndex);
		reorderMutation.mutate(reordered.map((c) => c.id));
	};

	const handleNew = () => {
		setEditingId(null);
		setView('form');
	};

	const handleEdit = (c: ColunaPersonalizada) => {
		setEditingId(c.id);
		setView('form');
	};

	const handleBack = () => {
		setView('list');
		setEditingId(null);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side='right' className='flex w-full flex-col px-5 sm:max-w-md'>
				<SheetHeader className='pb-4 pr-10'>
					<SheetTitle className='flex items-center gap-2'>
						{view === 'form' ? (
							<Button variant='ghost' size='icon' className='h-8 w-8' onClick={handleBack}>
								<ArrowLeft size={18} />
							</Button>
						) : (
							<Grid2x2Plus size={20} />
						)}
						{view === 'list' ? 'Colunas personalizadas' : editingId ? 'Editar coluna' : 'Nova coluna'}
					</SheetTitle>
				</SheetHeader>

				{view === 'list' ? (
					<div className='flex flex-1 flex-col gap-4 overflow-auto'>
						<Button onClick={handleNew} className='w-full gap-2' variant='secondary'>
							<Plus size={16} /> Nova coluna
						</Button>
						{isLoading ? (
							<p className='text-muted-foreground text-sm'>Carregando...</p>
						) : colunas.length === 0 ? (
							<p className='text-muted-foreground text-sm'>Nenhuma coluna personalizada. Clique em &quot;Nova coluna&quot; para criar.</p>
						) : (
							<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
								<SortableContext items={colunas.map((c) => c.id)} strategy={verticalListSortingStrategy}>
									<ul className='space-y-3'>
										{colunas.map((c) => (
											<SortableColunaItem
												key={c.id}
												coluna={c}
												onEdit={() => handleEdit(c)}
												onDelete={() => deleteMutation.mutate(c.id)}
												isDeleting={deleteMutation.isPending}
											/>
										))}
									</ul>
								</SortableContext>
							</DndContext>
						)}
					</div>
				) : (
					<ColunaForm
						ds_tabela={ds_tabela}
						editingColuna={editingId ? colunas.find((c) => c.id === editingId) ?? null : null}
						onSubmit={(data) => {
							if (editingId) {
								updateMutation.mutate({ id: editingId, data });
							} else {
								createMutation.mutate(data as ColunaPersonalizadaCreate);
							}
						}}
						isSubmitting={createMutation.isPending || updateMutation.isPending}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}

function SortableColunaItem({
	coluna,
	onEdit,
	onDelete,
	isDeleting,
}: {
	coluna: ColunaPersonalizada;
	onEdit: () => void;
	onDelete: () => void;
	isDeleting: boolean;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: coluna.id });
	const style = { transform: CSS.Transform.toString(transform), transition };

	return (
		<li
			ref={setNodeRef}
			style={style}
			className={`bg-muted/50 flex items-center justify-between gap-2 rounded-lg border border-border p-4 ${isDragging ? 'opacity-60 shadow-md' : ''}`}
		>
			<div
				{...attributes}
				{...listeners}
				className='cursor-grab active:cursor-grabbing shrink-0 touch-none p-1 rounded hover:bg-muted'
				title='Arrastar para reordenar'
			>
				<GripVertical size={18} className='text-muted-foreground' />
			</div>
			<div className='min-w-0 flex-1'>
				<p className='text-foreground font-medium truncate'>{coluna.ds_nome_coluna}</p>
				<p className='text-muted-foreground text-xs'>{TIPO_OPCOES.find((t) => t.value === coluna.ds_tipo)?.label ?? coluna.ds_tipo}</p>
				{coluna.ds_descricao && (
					<p className='text-muted-foreground mt-0.5 truncate text-xs'>{coluna.ds_descricao}</p>
				)}
				{coluna.ds_tipo === 'OPCAO' && coluna.js_valores && typeof coluna.js_valores === 'object' && (
					<div className='mt-2 flex flex-wrap gap-1'>
						{Object.entries(coluna.js_valores).map(([opLabel, cor]) => (
							<span
								key={opLabel}
								className='inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs'
								style={{ borderColor: cor }}
							>
								<ColorSwatch hex={cor} className='h-3 w-3 rounded' />
								<span className='truncate max-w-[80px]'>{opLabel}</span>
							</span>
						))}
					</div>
				)}
			</div>
			<div className='flex shrink-0 gap-1'>
				<Button variant='ghost' size='icon' className='h-8 w-8' onClick={onEdit}>
					<Pencil size={14} />
				</Button>
				<Button
					variant='ghost'
					size='icon'
					className='h-8 w-8 text-destructive hover:text-destructive'
					onClick={onDelete}
					disabled={isDeleting}
				>
					<Trash2 size={14} />
				</Button>
			</div>
		</li>
	);
}

interface OpcaoRow {
	id: string;
	label: string;
	cor: string;
}

interface ColunaFormProps {
	ds_tabela: TabelasPersonalizadas;
	editingColuna: ColunaPersonalizada | null;
	onSubmit: (data: ColunaPersonalizadaCreate | Record<string, unknown>) => void;
	isSubmitting: boolean;
}

function ColunaForm({ ds_tabela, editingColuna, onSubmit, isSubmitting }: ColunaFormProps) {
	const [ds_nome_coluna, setDsNomeColuna] = useState(editingColuna?.ds_nome_coluna ?? '');
	const [ds_descricao, setDsDescricao] = useState(editingColuna?.ds_descricao ?? '');
	const [ds_tipo, setDsTipo] = useState<TipoColunas>(editingColuna?.ds_tipo ?? 'TEXTO');
	const [opcoes, setOpcoes] = useState<OpcaoRow[]>(() => {
		if (editingColuna?.ds_tipo === 'OPCAO' && editingColuna.js_valores && typeof editingColuna.js_valores === 'object') {
			return Object.entries(editingColuna.js_valores).map(([label, cor], i) => ({
				id: `opt-${i}-${label}`,
				label,
				cor: cor?.startsWith('#') ? cor : `#${cor}`,
			}));
		}
		return [{ id: 'opt-0', label: '', cor: '#6b7280' }];
	});

	React.useEffect(() => {
		if (editingColuna) {
			setDsNomeColuna(editingColuna.ds_nome_coluna);
			setDsDescricao(editingColuna.ds_descricao ?? '');
			setDsTipo(editingColuna.ds_tipo);
			if (editingColuna.ds_tipo === 'OPCAO' && editingColuna.js_valores && typeof editingColuna.js_valores === 'object') {
				const entries = Object.entries(editingColuna.js_valores).map(([label, cor], i) => ({
					id: `opt-${i}-${label}`,
					label,
					cor: cor?.startsWith('#') ? cor : `#${cor}`,
				}));
				setOpcoes(entries.length > 0 ? entries : [{ id: 'opt-0', label: '', cor: '#6b7280' }]);
			} else {
				setOpcoes([{ id: 'opt-0', label: '', cor: '#6b7280' }]);
			}
		} else {
			setDsNomeColuna('');
			setDsDescricao('');
			setDsTipo('TEXTO');
			setOpcoes([{ id: 'opt-0', label: '', cor: '#6b7280' }]);
		}
	}, [editingColuna]);

	const addOpcao = () => {
		setOpcoes((prev) => [...prev, { id: `opt-${Date.now()}`, label: '', cor: '#6b7280' }]);
	};

	const removeOpcao = (id: string) => {
		setOpcoes((prev) => (prev.length > 1 ? prev.filter((o) => o.id !== id) : prev));
	};

	const updateOpcao = (id: string, field: 'label' | 'cor', value: string) => {
		setOpcoes((prev) =>
			prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
		);
	};

	const handleHexChange = (id: string, value: string) => {
		updateOpcao(id, 'cor', value);
	};

	const handleColorPickerChange = (id: string, value: string) => {
		const hex = value.length === 7 ? value : normalizeHex(value);
		updateOpcao(id, 'cor', hex);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const nome = ds_nome_coluna.trim();
		if (!nome) {
			toast.error('Nome da coluna é obrigatório');
			return;
		}
		if (ds_tipo === 'OPCAO') {
			const valid = opcoes.filter((o) => o.label.trim());
			if (valid.length === 0) {
				toast.error('Adicione pelo menos uma opção com nome e cor');
				return;
			}
			for (const o of valid) {
				if (!isValidHex(o.cor)) {
					toast.error(`Cor inválida na opção "${o.label || '(sem nome)'}". Use hex (ex: #F54927).`);
					return;
				}
			}
		}
		const js_valores =
			ds_tipo === 'OPCAO'
				? Object.fromEntries(
						opcoes
							.filter((o) => o.label.trim())
							.map((o) => [o.label.trim(), normalizeHex(o.cor) || '#6b7280'])
					)
				: undefined;
		if (Object.keys(js_valores ?? {}).length === 0 && ds_tipo === 'OPCAO') {
			toast.error('Defina pelo menos uma opção com nome');
			return;
		}
		if (editingColuna) {
			onSubmit({
				ds_nome_coluna: nome,
				ds_descricao: ds_descricao.trim() || undefined,
				ds_tipo,
				js_valores: ds_tipo === 'OPCAO' ? js_valores : undefined,
			});
		} else {
			onSubmit({
				ds_nome_coluna: nome,
				ds_descricao: ds_descricao.trim() || undefined,
				ds_tipo,
				js_valores: ds_tipo === 'OPCAO' ? js_valores : undefined,
				ds_tabela,
			});
		}
	};

	const needsOpcoes = ds_tipo === 'OPCAO';

	return (
		<form onSubmit={handleSubmit} className='flex flex-1 flex-col gap-6 overflow-auto'>
			<div className='space-y-3'>
				<Label htmlFor='ds_nome_coluna'>Nome da coluna</Label>
				<Input
					id='ds_nome_coluna'
					value={ds_nome_coluna}
					onChange={(e) => setDsNomeColuna(e.target.value)}
					placeholder='Ex: Status da Carga'
				/>
			</div>
			<div className='space-y-3'>
				<Label htmlFor='ds_descricao'>Descrição (opcional)</Label>
				<Input
					id='ds_descricao'
					value={ds_descricao}
					onChange={(e) => setDsDescricao(e.target.value)}
					placeholder='Ex: Campo informando status do container'
				/>
			</div>
			<div className='space-y-3'>
				<Label>Tipo</Label>
				<Select value={ds_tipo} onValueChange={(v) => setDsTipo(v as TipoColunas)}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{TIPO_OPCOES.map((o) => (
							<SelectItem key={o.value} value={o.value}>
								{o.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{needsOpcoes && (
				<div className='space-y-3 rounded-lg border border-border bg-muted/20 p-5'>
					<div className='flex items-center justify-between'>
						<Label className='text-sm font-medium'>Opções (nome + cor)</Label>
						<Button type='button' variant='outline' size='sm' onClick={addOpcao}>
							<Plus size={14} className='mr-1' /> Adicionar opção
						</Button>
					</div>
					<div className='space-y-5'>
						{opcoes.map((opt) => (
							<div key={opt.id} className='flex flex-col gap-3 rounded border border-border bg-background p-4'>
								<div className='flex gap-2'>
									<Input
										placeholder='Nome da opção (ex: Retornando com Papelão)'
										value={opt.label}
										onChange={(e) => updateOpcao(opt.id, 'label', e.target.value)}
										className='flex-1'
									/>
									<Button
										type='button'
										variant='ghost'
										size='icon'
										className='text-destructive shrink-0'
										onClick={() => removeOpcao(opt.id)}
										disabled={opcoes.length <= 1}
									>
										<Trash2 size={14} />
									</Button>
								</div>
								<div className='flex items-center gap-3'>
									<ColorSwatch hex={opt.cor} className='ring-2 ring-offset-2 ring-border' />
									<div className='flex-1 space-y-1'>
										<Label className='text-xs text-muted-foreground'>Hexadecimal</Label>
										<Input
											placeholder='#F54927'
											value={opt.cor}
											onChange={(e) => handleHexChange(opt.id, e.target.value)}
										/>
									</div>
									<div className='space-y-1'>
										<Label className='text-xs text-muted-foreground'>Seletor</Label>
										<input
											type='color'
											value={/^#[0-9A-Fa-f]{6}$/.test(normalizeHex(opt.cor)) ? normalizeHex(opt.cor) : '#6b7280'}
											onChange={(e) => handleColorPickerChange(opt.id, e.target.value)}
											className='h-10 w-14 cursor-pointer rounded border border-input bg-transparent p-0'
										/>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<div className='mt-auto pt-6'>
				<Button type='submit' className='w-full' disabled={isSubmitting}>
					{editingColuna ? 'Salvar alterações' : 'Criar coluna'}
				</Button>
			</div>
		</form>
	);
}
