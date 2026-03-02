'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { ColunaPersonalizada } from '@/types/colunas-personalizadas';

function normalizeHex(hex: string): string {
	const cleaned = (hex ?? '').replace(/^#/, '').trim();
	if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) return `#${cleaned}`;
	if (/^[0-9A-Fa-f]{3}$/.test(cleaned)) {
		return `#${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`;
	}
	return hex ? (hex.startsWith('#') ? hex : `#${hex}`) : '#6b7280';
}

interface CelulaColunaPersonalizadaProps {
	coluna: ColunaPersonalizada;
	idReferencia: string;
	valor: string;
	onSave: (idColuna: string, idReferencia: string, dsValor: string) => Promise<void>;
	disabled?: boolean;
}

export function CelulaColunaPersonalizada({
	coluna,
	idReferencia,
	valor,
	onSave,
	disabled,
}: CelulaColunaPersonalizadaProps) {
	const [localValue, setLocalValue] = useState(valor);
	const [saving, setSaving] = useState(false);

	React.useEffect(() => {
		setLocalValue(valor);
	}, [valor]);

	const handleSave = async () => {
		setSaving(true);
		try {
			await onSave(coluna.id, idReferencia, localValue);
		} finally {
			setSaving(false);
		}
	};

	const jsValores = coluna.js_valores && typeof coluna.js_valores === 'object' && !Array.isArray(coluna.js_valores)
		? (coluna.js_valores as Record<string, string>)
		: null;
	const opcoes = jsValores ? Object.keys(jsValores) : [];

	if (coluna.ds_tipo === 'TEXTO') {
		return (
			<div
				className='flex h-8 w-32 max-w-full items-center rounded-md border border-input bg-background overflow-hidden'
				onClick={(e) => e.stopPropagation()}
			>
				<Input
					className='h-full flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 pr-1 text-sm'
					value={localValue}
					onChange={(e) => setLocalValue(e.target.value)}
					placeholder={coluna.ds_nome_coluna}
					disabled={disabled}
				/>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className='h-8 w-8 shrink-0 rounded-none'
					onClick={handleSave}
					disabled={saving || disabled}
					title='Salvar'
				>
					<Save size={14} />
				</Button>
			</div>
		);
	}

	if (coluna.ds_tipo === 'DATA') {
		const dateVal = localValue ? localValue.slice(0, 10) : '';
		return (
			<div
				className='flex h-8 w-36 max-w-full items-center rounded-md border border-input bg-background overflow-hidden'
				onClick={(e) => e.stopPropagation()}
			>
				<Input
					type='date'
					className='h-full flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 pr-1 text-sm'
					value={dateVal}
					onChange={(e) => setLocalValue(e.target.value || '')}
					disabled={disabled}
				/>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className='h-8 w-8 shrink-0 rounded-none'
					onClick={handleSave}
					disabled={saving || disabled}
					title='Salvar'
				>
					<Save size={14} />
				</Button>
			</div>
		);
	}

	if (coluna.ds_tipo === 'OPCAO') {
		return (
			<div
				className='flex h-8 min-w-[8rem] max-w-full items-center rounded-md border border-input bg-background overflow-hidden'
				onClick={(e) => e.stopPropagation()}
			>
				<Select
					value={localValue || '__vazio__'}
					onValueChange={(v) => setLocalValue(v === '__vazio__' ? '' : v)}
					disabled={disabled}
				>
					<SelectTrigger className='h-full flex-1 border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 pr-1 text-sm [&>span]:flex-1'>
						<SelectValue placeholder='Selecione' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='__vazio__'>—</SelectItem>
						{opcoes.map((op) => (
							<SelectItem key={op} value={op}>
								<span className='flex items-center gap-2'>
									{jsValores && jsValores[op] && (
										<span
											className='h-3 w-3 shrink-0 rounded border'
											style={{ backgroundColor: normalizeHex(jsValores[op]) }}
										/>
									)}
									{op}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className='h-8 w-8 shrink-0 rounded-none'
					onClick={handleSave}
					disabled={saving || disabled}
					title='Salvar'
				>
					<Save size={14} />
				</Button>
			</div>
		);
	}

	return (
		<div
			className='flex h-8 w-32 max-w-full items-center rounded-md border border-input bg-background overflow-hidden'
			onClick={(e) => e.stopPropagation()}
		>
			<Input
				className='h-full flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 pr-1 text-sm'
				value={localValue}
				onChange={(e) => setLocalValue(e.target.value)}
				disabled={disabled}
			/>
			<Button
				type='button'
				variant='ghost'
				size='icon'
				className='h-8 w-8 shrink-0 rounded-none'
				onClick={handleSave}
				disabled={saving || disabled}
				title='Salvar'
			>
				<Save size={14} />
			</Button>
		</div>
	);
}
