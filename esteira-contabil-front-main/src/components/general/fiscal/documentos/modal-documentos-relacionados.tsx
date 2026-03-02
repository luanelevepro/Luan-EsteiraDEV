import { useQuery } from '@tanstack/react-query';
import { getDocumentosRelacionados } from '@/services/api/documentos-fiscais';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, ChevronDown, ChevronUp, FileStack } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ModalDocumentosRelacionadosProps {
	documentoId: string;
	empresaId: string;
	trigger?: React.ReactNode;
}

type DocumentoRelacionado = {
	id: string;
	ds_numero?: string;
	ds_chave?: string;
	dt_emissao?: string | Date;
};

function ListaDocumentos({ documentos, tipo }: { documentos: DocumentoRelacionado[]; tipo: 'cte' | 'nfe' }) {
	if (!documentos || documentos.length === 0) {
		return <div className='text-muted-foreground p-4 text-sm'>Nenhum documento relacionado encontrado.</div>;
	}
	return (
		<div className='max-h-60 space-y-2 overflow-y-auto p-2'>
			{documentos.map((doc) => (
				<div key={doc.id} className='bg-muted/30 flex items-center gap-3 rounded-lg border p-3'>
					<FileText className='text-primary/70 h-5 w-5 shrink-0' />
					<div className='min-w-0 flex-1'>
						<div className='truncate text-sm font-medium'>{doc.ds_numero || '--'}</div>
						<div className='text-muted-foreground flex items-center text-xs'>
							<span className='font-medium'>Chave:</span>
							<span className='bg-muted/50 scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent ml-2 inline-block max-w-[420px] overflow-x-auto rounded px-1 py-0.5 whitespace-nowrap'>
								{doc.ds_chave || '--'}
							</span>
						</div>
					</div>
					<Badge variant='outline' className='bg-primary/10 text-primary text-xs'>
						{tipo === 'cte' ? 'CTe' : 'NFe'}
					</Badge>
					<div className='text-muted-foreground min-w-[80px] text-right text-xs'>
						{doc.dt_emissao ? format(new Date(doc.dt_emissao), 'dd/MM/yyyy') : '--'}
					</div>
				</div>
			))}
		</div>
	);
}

export function ModalDocumentosRelacionados({ documentoId, empresaId, trigger }: ModalDocumentosRelacionadosProps) {
	const [open, setOpen] = useState(false);
	const [expandCte, setExpandCte] = useState(true);
	const [expandNfe, setExpandNfe] = useState(false);

	const { data, isLoading, error } = useQuery({
		queryKey: ['documentos-relacionados', documentoId],
		queryFn: () => getDocumentosRelacionados(documentoId),
		enabled: open && !!documentoId && !!empresaId,
		staleTime: 1000 * 60 * 5,
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className='overflow-hidden p-0 sm:max-w-2xl'>
				<DialogHeader className='from-primary via-primary to-primary/80 bg-gradient-to-br px-6 py-5'>
					<div className='flex items-center gap-3'>
						<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm'>
							<FileStack className='text-primary-foreground h-5 w-5' />
						</div>
						<div>
							<DialogTitle className='text-primary-foreground text-lg font-semibold'>Documentos Relacionados</DialogTitle>
							<p className='text-primary-foreground/70 mt-0.5 text-sm'>Veja os CTe e NFe vinculados a este documento</p>
						</div>
					</div>
				</DialogHeader>
				<div className='bg-card p-6'>
					{isLoading ? (
						<div className='flex items-center justify-center p-8'>
							<Loader2 className='mr-2 h-5 w-5 animate-spin' />
							<span className='text-muted-foreground'>Carregando documentos relacionados...</span>
						</div>
					) : error ? (
						<div className='text-destructive p-4 text-center'>Erro ao buscar documentos relacionados.</div>
					) : (
						<div className='space-y-4'>
							{/* CTe Section */}
							<div className='overflow-hidden rounded-xl border'>
								<button
									type='button'
									className={cn(
										'bg-muted/40 text-primary flex w-full items-center justify-between px-4 py-3 font-medium transition-colors',
										expandCte && 'bg-primary/10',
									)}
									onClick={() => setExpandCte((v) => !v)}
								>
									<span>CTe Relacionados ({data?.ctes?.length || 0})</span>
									{expandCte ? <ChevronUp /> : <ChevronDown />}
								</button>
								{expandCte && <ListaDocumentos documentos={data?.ctes || []} tipo='cte' />}
							</div>
							{/* NFe Section */}
							<div className='overflow-hidden rounded-xl border'>
								<button
									type='button'
									className={cn(
										'bg-muted/40 text-primary flex w-full items-center justify-between px-4 py-3 font-medium transition-colors',
										expandNfe && 'bg-primary/10',
									)}
									onClick={() => setExpandNfe((v) => !v)}
								>
									<span>NFe Relacionadas ({data?.nfes?.length || 0})</span>
									{expandNfe ? <ChevronUp /> : <ChevronDown />}
								</button>
								{expandNfe && <ListaDocumentos documentos={data?.nfes || []} tipo='nfe' />}
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
