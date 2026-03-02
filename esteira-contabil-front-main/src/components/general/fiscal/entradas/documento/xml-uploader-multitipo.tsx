import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircleIcon, PaperclipIcon, UploadIcon, XIcon, FileWarningIcon } from 'lucide-react';
import { format } from 'date-fns';
import { formatBytes, useFileUpload } from '@/hooks/use-file-upload';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useState } from 'react';
import { Icons } from '../../../../layout/icons';
import { useQueryClient } from '@tanstack/react-query';
import { importarXmlsMultitipo, ImportarXmlsResponse } from '@/services/api/documentos-fiscais';
import { Badge } from '@/components/ui/badge';

/**
 * XMLUploaderMultitipo - Componente para importação em lote de XMLs (NFe, CTe, NFCe)
 * IMPORTANTE: Este componente deve ser usado APENAS para NFe, CTe e NFCe.
 * Não utilize para NFSe (use XMLUploader simples para NFSe).
 *
 * Características:
 * - Suporta até 50 arquivos simultâneos - NÃO PRATICADO
 * - Importação com concorrência de 5 documentos
 * - Exibe resultados detalhados por tipo (sucesso/falha)
 * - Mostra arquivos desconhecidos e erros
 */
interface XMLUploaderMultitipoProps {
	children: React.ReactNode;
	selectedDate?: Date | string;
}

export function XMLUploaderMultitipo({ children, selectedDate }: XMLUploaderMultitipoProps) {
	const maxSize = 5 * 1024 * 1024; // 5MB por arquivo
	// const maxFiles = 50; // Limite de 50 arquivos
	const [modalOpen, setModalOpen] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [result, setResult] = useState<ImportarXmlsResponse | null>(null);
	const queryClient = useQueryClient();

	const [
		{ files, isDragging, errors },
		{ handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, removeFile, getInputProps },
	] = useFileUpload({
		maxSize,
		accept: 'text/xml',
		// maxFiles,
	});

	const validateFiles = () => {
		if (!files || files.length === 0) {
			return 'Selecione pelo menos um arquivo';
		}
		// if (files.length > maxFiles) {
		// 	return `Máximo de ${maxFiles} arquivos permitidos`;
		// }
		return null;
	};

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const error = validateFiles();
		if (error) {
			toast.error(error);
			return;
		}

		setIsUploading(true);
		setResult(null);

		try {
			const filesToUpload = files.map((f) => f.file as File);
			const response = await importarXmlsMultitipo(
				filesToUpload,
				selectedDate ? format(selectedDate, 'yyyy-MM') : undefined
			);
			setResult(response);

			const totalSuccess =
				response.results.nfe.success.length + response.results.nfce.success.length + response.results.cte.success.length;
			const totalFailed = response.results.nfe.failed.length + response.results.nfce.failed.length + response.results.cte.failed.length;

			if (totalSuccess > 0) {
				toast.success(`${totalSuccess} arquivo(s) importado(s) com sucesso!`);
			}

			if (totalFailed > 0) {
				toast.error(`${totalFailed} arquivo(s) falharam na importação`);
			}

			if (response.results.desconhecido.length > 0) {
				toast.warning(`${response.results.desconhecido.length} arquivo(s) não identificado(s)`);
			}

			queryClient.invalidateQueries({ queryKey: ['dfes'] });
			queryClient.invalidateQueries({ queryKey: ['get-documentos-fiscal-entrada'] });

			// Limpar arquivos após sucesso
			if (totalFailed === 0 && response.results.desconhecido.length === 0) {
				setTimeout(() => {
					setModalOpen(false);
					files.forEach((file) => removeFile(file.id));
					setResult(null);
				}, 1500);
			}
		} catch (error) {
			console.error('Error uploading files:', error);
			if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error('Erro ao importar arquivos');
			}
		} finally {
			setIsUploading(false);
		}
	}

	const nfeSuccess = result?.results.nfe.success.length ?? 0;
	const nfeFailed = result?.results.nfe.failed.length ?? 0;
	const nfceSuccess = result?.results.nfce.success.length ?? 0;
	const nfceFailed = result?.results.nfce.failed.length ?? 0;
	const cteSuccess = result?.results.cte.success.length ?? 0;
	const cteFailed = result?.results.cte.failed.length ?? 0;
	const unknownCount = result?.results.desconhecido.length ?? 0;

	// Função utilitária para truncar nomes de arquivos longos
	function truncateFileName(name: string, maxLength = 45) {
		if (name.length <= maxLength) return name;
		return name.slice(0, maxLength) + '...';
	}

	return (
		<Dialog open={modalOpen} onOpenChange={setModalOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className='sm:max-w-[600px]'>
				<DialogHeader>
					<DialogTitle>Importar XMLs em Lote (NFe e CTe)</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className='space-y-6'>
					{!result ? (
						<div className='flex flex-col gap-2'>
							{/* Drop area */}
							<div
								role='button'
								onClick={openFileDialog}
								onDragEnter={handleDragEnter}
								onDragLeave={handleDragLeave}
								onDragOver={handleDragOver}
								onDrop={handleDrop}
								data-dragging={isDragging || undefined}
								className={clsx(
									'border-input flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed p-4 transition-colors',
									'hover:bg-accent/50 has-[input:focus]:border-ring',
									'data-[dragging=true]:bg-accent/50',
									files.length > 0 && 'pointer-events-none opacity-50',
								)}
							>
								<input
									{...getInputProps()}
									id='xml-files'
									className='sr-only'
									aria-label='Upload files'
									// disabled={files.length >= maxFiles}
									multiple
								/>

								<div className='flex flex-col items-center justify-center text-center'>
									<div
										className='bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border'
										aria-hidden='true'
									>
										<UploadIcon className='size-4 opacity-60' />
									</div>
									<p className='mb-1.5 text-sm font-medium'>Enviar arquivos em lote</p>
									<p className='text-muted-foreground text-xs'>
										Arraste os arquivos ou clique para selecionar arquivos, {formatBytes(maxSize)} cada)
									</p>
								</div>
							</div>

							{errors.length > 0 && (
								<div className='text-destructive flex items-center gap-1 text-xs' role='alert'>
									<AlertCircleIcon className='size-3 shrink-0' />
									<span>{errors[0]}</span>
								</div>
							)}

							{/* File list */}
							{files.length > 0 && (
								<div className='space-y-2'>
									<div className='text-muted-foreground text-sm font-medium'>{files.length} arquivo(s) selecionado(s)</div>
									<div className='max-h-48 space-y-1 overflow-y-auto'>
										{files.map((file) => (
											<div key={file.id} className='flex items-center justify-between gap-2 rounded-lg border px-3 py-2'>
												<div className='flex items-center gap-2 overflow-hidden'>
													<PaperclipIcon className='size-4 shrink-0 opacity-60' aria-hidden='true' />
													<p className='truncate text-[13px] font-medium'>{truncateFileName(file.file.name)}</p>
													<span className='text-muted-foreground text-[12px]'>({formatBytes(file.file.size)})</span>
												</div>

												<Button
													size='icon'
													variant='ghost'
													className='text-muted-foreground/80 hover:text-foreground -me-2 size-8 hover:bg-transparent'
													onClick={() => removeFile(file.id)}
													aria-label='Remove file'
												>
													<XIcon className='size-4' aria-hidden='true' />
												</Button>
											</div>
										))}
									</div>
								</div>
							)}

							<p aria-live='polite' role='region' className='text-muted-foreground mt-2 text-center text-xs'>
								Selecione os arquivos XML que deseja importar (NFe ou CTe).
							</p>
						</div>
					) : (
						// Resultado detalhado
						<div className='space-y-4'>
							<div className='text-sm'>
								<p className='text-foreground mb-4 font-medium'>Resultado da importação:</p>

								{/* NFe Results */}
								{(nfeSuccess > 0 || nfeFailed > 0) && (
									<div className='mb-4 space-y-2 rounded-lg border border-green-200/50 bg-green-50/50 p-3 dark:border-green-900/30 dark:bg-green-950/20'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center gap-2'>
												<FileWarningIcon className='size-4 text-green-600' />
												<span className='font-medium text-green-900 dark:text-green-300'>NFe</span>
											</div>
											<div className='flex gap-2'>
												{nfeSuccess > 0 && (
													<Badge
														variant='outline'
														className='bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
													>
														✓ {nfeSuccess}
													</Badge>
												)}
												{nfeFailed > 0 && (
													<Badge variant='outline' className='bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'>
														✗ {nfeFailed}
													</Badge>
												)}
											</div>
										</div>
										{nfeFailed > 0 && (
											<div className='ml-6 space-y-1 text-xs text-red-700 dark:text-red-400'>
												{result.results.nfe.failed.map((item) => (
													<p key={item.filename}>
														• {item.filename}: {item.error}
													</p>
												))}
											</div>
										)}
									</div>
								)}

								{/* NFCe Results */}
								{(nfceSuccess > 0 || nfceFailed > 0) && (
									<div className='mb-4 space-y-2 rounded-lg border border-blue-200/50 bg-blue-50/50 p-3 dark:border-blue-900/30 dark:bg-blue-950/20'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center gap-2'>
												<FileWarningIcon className='size-4 text-blue-600' />
												<span className='font-medium text-blue-900 dark:text-blue-300'>NFCe</span>
											</div>
											<div className='flex gap-2'>
												{nfceSuccess > 0 && (
													<Badge
														variant='outline'
														className='bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
													>
														✓ {nfceSuccess}
													</Badge>
												)}
												{nfceFailed > 0 && (
													<Badge variant='outline' className='bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'>
														✗ {nfceFailed}
													</Badge>
												)}
											</div>
										</div>
										{nfceFailed > 0 && (
											<div className='ml-6 space-y-1 text-xs text-red-700 dark:text-red-400'>
												{result.results.nfce.failed.map((item) => (
													<p key={item.filename}>
														• {item.filename}: {item.error}
													</p>
												))}
											</div>
										)}
									</div>
								)}

								{/* CTe Results */}
								{(cteSuccess > 0 || cteFailed > 0) && (
									<div className='mb-4 space-y-2 rounded-lg border border-purple-200/50 bg-purple-50/50 p-3 dark:border-purple-900/30 dark:bg-purple-950/20'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center gap-2'>
												<FileWarningIcon className='size-4 text-purple-600' />
												<span className='font-medium text-purple-900 dark:text-purple-300'>CTe</span>
											</div>
											<div className='flex gap-2'>
												{cteSuccess > 0 && (
													<Badge
														variant='outline'
														className='bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
													>
														✓ {cteSuccess}
													</Badge>
												)}
												{cteFailed > 0 && (
													<Badge variant='outline' className='bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'>
														✗ {cteFailed}
													</Badge>
												)}
											</div>
										</div>
										{cteFailed > 0 && (
											<div className='ml-6 space-y-1 text-xs text-red-700 dark:text-red-400'>
												{result.results.cte.failed.map((item) => (
													<p key={item.filename}>
														• {item.filename}: {item.error}
													</p>
												))}
											</div>
										)}
									</div>
								)}

								{/* Unknown/Unsupported files */}
								{unknownCount > 0 && (
									<div className='space-y-2 rounded-lg border border-yellow-200/50 bg-yellow-50/50 p-3 dark:border-yellow-900/30 dark:bg-yellow-950/20'>
										<div className='flex items-center gap-2'>
											<AlertCircleIcon className='size-4 text-yellow-600' />
											<span className='font-medium text-yellow-900 dark:text-yellow-300'>
												{unknownCount} arquivo(s) não identificado(s)
											</span>
										</div>
										<div className='ml-6 space-y-1 text-xs text-yellow-700 dark:text-yellow-400'>
											{result.results.desconhecido.map((item) => (
												<p key={item.filename}>
													• {item.filename}: {item.error}
												</p>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					<DialogFooter>
						{!result ? (
							<Button type='submit' className='w-full' disabled={isUploading || files.length === 0}>
								{isUploading ? (
									<>
										<Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
										Importando...
									</>
								) : (
									`Importar ${files.length > 0 ? `(${files.length})` : ''}`
								)}
							</Button>
						) : (
							<Button
								type='button'
								className='w-full'
								onClick={() => {
									setModalOpen(false);
									files.forEach((file) => removeFile(file.id));
									setResult(null);
								}}
							>
								Fechar
							</Button>
						)}
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
