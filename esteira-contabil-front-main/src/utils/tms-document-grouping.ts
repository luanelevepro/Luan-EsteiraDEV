export type DocumentGroup = {
	id: string;
	documentos: Array<{
		id: string;
		tipo: 'CTE' | 'NFE';
		numero?: string;
		chave?: string;
		emitente?: string;
		destinatario?: string;
	}>;
	destino: {
		nome: string;
		id?: number;
	};
	origem: {
		nome: string;
		id?: number;
	};
	sequencia?: number;
};

const normalizeKey = (value?: string) =>
	(value || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim()
		.toLowerCase();

export const mergeGroupsByDestination = (groups: DocumentGroup[]): DocumentGroup[] => {
	const merged = new Map<string, DocumentGroup>();
	const usedDocIds = new Set<string>();

	groups.forEach((group) => {
		const key = normalizeKey(group.destino?.nome || '');
		const existing = merged.get(key);
		const documentos = group.documentos.filter((doc) => !usedDocIds.has(doc.id));
		documentos.forEach((doc) => usedDocIds.add(doc.id));

		if (!existing) {
			merged.set(key, {
				...group,
				documentos,
			});
			return;
		}

		existing.documentos = [...existing.documentos, ...documentos];
		merged.set(key, existing);
	});

	return Array.from(merged.values());
};

export const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
	const seen = new Set<string>();
	return items.filter((item) => {
		if (seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	});
};
