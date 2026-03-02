import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

export interface ServerPaginationBarProps {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
	isFetching?: boolean;
}

export function ServerPaginationBar({
	page,
	pageSize,
	total,
	totalPages,
	onPageChange,
	onPageSizeChange,
	isFetching,
}: ServerPaginationBarProps) {
	return (
		<div className='px-6 py-4'>
			<div className='flex items-center justify-between gap-4'>
				<div className='flex items-center gap-3'>
					<Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
						<SelectTrigger className='h-8 w-[70px]'>
							<SelectValue placeholder={pageSize} />
						</SelectTrigger>
						<SelectContent side='top'>
							{[10, 20, 30, 40, 50].map((size) => (
								<SelectItem key={size} value={`${size}`}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className='text-muted-foreground text-sm'>de {total} registros</p>
					{isFetching && (
						<p className='text-muted-foreground text-xs italic'>Atualizando...</p>
					)}
				</div>
				<div className='flex items-center gap-4'>
					<div className='text-muted-foreground hidden items-center justify-center text-sm sm:flex'>
						Página {page} de {totalPages}
					</div>
					<div className='flex items-center gap-3'>
						<Button variant='outline' className='h-8 w-8 shrink-0 p-0' onClick={() => onPageChange(1)} disabled={page === 1}>
							<ChevronsLeft />
						</Button>
						<Button variant='outline' className='h-8 w-8 shrink-0 p-0' onClick={() => onPageChange(page - 1)} disabled={page === 1}>
							<ChevronLeft />
						</Button>
						<Button
							variant='outline'
							className='h-8 w-8 shrink-0 p-0'
							onClick={() => onPageChange(page + 1)}
							disabled={page >= totalPages}
						>
							<ChevronRight />
						</Button>
						<Button
							variant='outline'
							className='h-8 w-8 shrink-0 p-0'
							onClick={() => onPageChange(totalPages)}
							disabled={page >= totalPages}
						>
							<ChevronsRight />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
