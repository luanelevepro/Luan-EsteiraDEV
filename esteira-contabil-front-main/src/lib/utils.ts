import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatBusinessDate(dateString?: string | null): string {
	if (!dateString) return '—';

	const trimmed = dateString.trim();
	if (!trimmed) return '—';

	const datePart = trimmed.slice(0, 10);

	if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
		const [year, month, day] = datePart.split('-');
		return `${day}/${month}/${year}`;
	}

	try {
		const d = new Date(trimmed);
		if (Number.isNaN(d.getTime())) return trimmed;
		return d.toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		});
	} catch {
		return trimmed;
	}
}
