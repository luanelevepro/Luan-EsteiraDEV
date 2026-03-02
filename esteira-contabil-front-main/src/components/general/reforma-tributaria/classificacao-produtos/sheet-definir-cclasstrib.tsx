'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClassificacoesPorNcm, atualizarClassificacaoProduto, ClassificacaoNcm } from '@/services/api/reforma-tributaria';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, FileText, AlertCircle, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { ClassificacaoProdutoData } from '@/pages/reforma-tributaria/classificacao-produtos';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface SheetDefinirCClassTribProps {
	produto: ClassificacaoProdutoData;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

// Valores padrão para NCM
const DEFAULT_CST = '000';
const DEFAULT_CLASS_TRIB = '000001';

export default function SheetDefinirCClassTrib({ produto, open, onOpenChange }: SheetDefinirCClassTribProps) {
	const queryClient = useQueryClient();
	const [classificacaoSelecionada, setClassificacaoSelecionada] = useState<string | null>(null);

	// Buscar classificações
	const { data: classificacoes, isLoading } = useQuery<ClassificacaoNcm[]>({
		queryKey: ['classificacoes-por-ncm', produto.cd_ncm],
		queryFn: () => getClassificacoesPorNcm(produto.cd_ncm || ''),
		enabled: open && !!produto.cd_ncm,
	});

	// Inicializar seleção quando classificações carregarem
	useEffect(() => {
		if (!classificacoes || isLoading) return;

		// Se o produto já tem classificação padrão, selecionar automaticamente
		if (produto.classificacao?.cd_class_trib === DEFAULT_CLASS_TRIB) {
			setClassificacaoSelecionada('padrao');
			return;
		}

		// Se o produto já tem classificação, selecionar automaticamente
		if (produto.classificacao?.cd_class_trib && classificacoes) {
			const atualIndex = classificacoes.findIndex(
				(cl) => cl.CLTR_CD === produto.classificacao?.cd_class_trib
			);
			if (atualIndex >= 0) {
				setClassificacaoSelecionada(String(atualIndex));
			} else {
				setClassificacaoSelecionada(null);
			}
		} else {
			setClassificacaoSelecionada(null);
		}
	}, [classificacoes, isLoading, produto.classificacao?.cd_class_trib]);

	// Resetar seleção quando o sheet fechar
	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			setClassificacaoSelecionada(null);
		}
		onOpenChange(isOpen);
	};

	// Mutation para atualizar
	const updateMutation = useMutation({
		mutationFn: (dados: {
			cd_class_trib: string;
			cd_cst?: string;
			ds_class_trib_descr?: string | null;
			ds_tipo_aliquota?: string | null;
			ds_anexo_numero?: string | null;
			ds_anexo_descricao?: string | null;
			ds_anexo_numero_item?: string | null;
			ds_anexo_texto_item?: string | null;
		}) => atualizarClassificacaoProduto(produto.id, dados),
		onSuccess: () => {
			toast.success('CClassTrib definido com sucesso');
			queryClient.invalidateQueries({ queryKey: ['classificacao-produtos'] });
			onOpenChange(false);
			setClassificacaoSelecionada(null);
		},
		onError: () => {
			toast.error('Erro ao definir CClassTrib');
		},
	});

	const handleConfirmar = () => {
		if (classificacaoSelecionada === null) {
			toast.error('Selecione uma classificação antes de confirmar');
			return;
		}

		// Se selecionou usar NCM padrão
		if (classificacaoSelecionada === 'padrao') {
			updateMutation.mutate({
				cd_class_trib: DEFAULT_CLASS_TRIB,
				cd_cst: DEFAULT_CST,
				ds_class_trib_descr: null,
				ds_tipo_aliquota: null,
				ds_anexo_numero: null,
				ds_anexo_descricao: null,
				ds_anexo_numero_item: null,
				ds_anexo_texto_item: null,
			});
			return;
		}

		const index = parseInt(classificacaoSelecionada);
		const classificacao = classificacoes?.[index];
		if (!classificacao) return;

		const cdCst = classificacao.CLTR_CD?.slice(0, 3) || '000';
		updateMutation.mutate({
			cd_class_trib: classificacao.CLTR_CD,
			cd_cst: cdCst,
			ds_class_trib_descr: classificacao.CLTR_DESCRICAO,
			ds_tipo_aliquota: classificacao.CLTR_TIPO_ALIQUOTA,
			ds_anexo_numero: classificacao.ANXO_NUMERO,
			ds_anexo_descricao: classificacao.ANXO_DESCRICAO,
			ds_anexo_numero_item: classificacao.ANXO_NUMERO_ITEM,
			ds_anexo_texto_item: classificacao.ANXO_TEXTO_ITEM,
		});
	};

	const classificacaoAtual = produto.classificacao?.cd_class_trib;
	const isPadraoAtual = classificacaoAtual === DEFAULT_CLASS_TRIB;

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent side="right" className="!w-full !sm:max-w-xl !lg:max-w-2xl flex flex-col p-0">
				<SheetHeader className="px-6 pt-6 pb-4 border-b">
					<div className="flex items-start gap-3">
						<div className="p-2 rounded-lg bg-primary/10 shrink-0">
							<Calculator className="h-5 w-5 text-primary" />
						</div>
						<div className="flex-1 min-w-0">
							<SheetTitle className="text-xl">Definir CClassTrib</SheetTitle>
							<SheetDescription className="mt-2 text-sm">
								<div className="font-medium text-foreground mb-1 line-clamp-2">{produto.ds_nome}</div>
								<div className="flex items-center gap-2 text-muted-foreground flex-wrap">
									<span>NCM: {produto.cd_ncm || '-'}</span>
									{classificacaoAtual && (
										<>
											<span>•</span>
											<Badge variant="outline" className="text-xs">
												Atual: {classificacaoAtual}
											</Badge>
										</>
									)}
								</div>
							</SheetDescription>
						</div>
					</div>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-6 py-6">
					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
							<p className="text-sm text-muted-foreground">Buscando classificações...</p>
						</div>
					) : (
						<div className="space-y-4">
							{classificacoes && classificacoes.length > 0 && (
								<div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
									<div className="flex items-start gap-3">
										<AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
										<div className="flex-1">
											<p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
												{classificacoes.length} classificação{classificacoes.length !== 1 ? 'ões' : ''} disponível{classificacoes.length !== 1 ? 'eis' : ''}
											</p>
											<p className="text-xs text-blue-700 dark:text-blue-300">
												Selecione a classificação tributária correta para este produto. A classificação atual está destacada em verde. Você também pode optar por usar o NCM padrão.
											</p>
										</div>
									</div>
								</div>
							)}
							{classificacoes && classificacoes.length === 0 && (
								<div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4">
									<div className="flex items-start gap-3">
										<AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
										<div className="flex-1">
											<p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
												Nenhuma classificação encontrada
											</p>
											<p className="text-xs text-yellow-700 dark:text-yellow-300">
												Não há classificações disponíveis para o NCM <span className="font-mono font-medium">{produto.cd_ncm || 'informado'}</span> no banco de dados. Você pode usar o NCM padrão abaixo.
											</p>
										</div>
									</div>
								</div>
							)}
							<RadioGroup
								value={classificacaoSelecionada || ''}
								onValueChange={setClassificacaoSelecionada}
								className="space-y-3"
							>
								{/* Opção para usar NCM Padrão */}
								<Label
									htmlFor="classificacao-padrao"
									className={cn(
										'flex cursor-pointer rounded-xl border-2 p-5 transition-all',
										'hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm',
										classificacaoSelecionada === 'padrao' && 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20',
										isPadraoAtual && classificacaoSelecionada !== 'padrao' && 'border-green-500/50 bg-green-500/5'
									)}
								>
									<div className="flex items-start gap-4 flex-1">
										<RadioGroupItem
											value="padrao"
											id="classificacao-padrao"
											className="mt-1 shrink-0"
										/>
										<div className="flex-1 space-y-2 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<Badge
													variant={classificacaoSelecionada === 'padrao' ? 'default' : 'outline'}
													className="font-mono text-sm font-semibold px-2.5 py-1"
												>
													{DEFAULT_CLASS_TRIB}
												</Badge>
												<Badge variant="secondary" className="text-xs px-2 py-0.5">
													CST: {DEFAULT_CST}
												</Badge>
												<Badge variant="muted" className="text-xs px-2 py-0.5">
													NCM Padrão
												</Badge>
												{isPadraoAtual && (
													<Badge variant="success" className="text-xs px-2 py-0.5">
														<CheckCircle2 className="h-3 w-3 mr-1" />
														Atual
													</Badge>
												)}
											</div>
											<p className="text-sm font-medium text-foreground leading-relaxed pr-2">
												Usar classificação padrão (NCM não encontrado ou não aplicável)
											</p>
											<p className="text-xs text-muted-foreground">
												Esta opção permite ignorar o NCM encontrado e usar a classificação padrão do sistema.
											</p>
										</div>
									</div>
								</Label>

								{classificacoes?.map((cl: ClassificacaoNcm, index: number) => {
									const isSelecionada = classificacaoSelecionada === String(index);
									const isAtual = cl.CLTR_CD === classificacaoAtual;
									const cdCst = cl.CLTR_CD?.slice(0, 3) || '000';

									return (
										<Label
											key={index}
											htmlFor={`classificacao-${index}`}
											className={cn(
												'flex cursor-pointer rounded-xl border-2 p-5 transition-all',
												'hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm',
												isSelecionada && 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20',
												isAtual && !isSelecionada && 'border-green-500/50 bg-green-500/5'
											)}
										>
											<div className="flex items-start gap-4 flex-1">
												<RadioGroupItem
													value={String(index)}
													id={`classificacao-${index}`}
													className="mt-1 shrink-0"
												/>
												<div className="flex-1 space-y-3 min-w-0">
													<div className="space-y-2">
														<div className="flex items-center gap-2 flex-wrap">
															<Badge
																variant={isSelecionada ? 'default' : 'outline'}
																className="font-mono text-sm font-semibold px-2.5 py-1"
															>
																{cl.CLTR_CD}
															</Badge>
															<Badge variant="secondary" className="text-xs px-2 py-0.5">
																CST: {cdCst}
															</Badge>
															{cl.CLTR_TIPO_ALIQUOTA && (
																<Badge variant="info" className="text-xs px-2 py-0.5">
																	{cl.CLTR_TIPO_ALIQUOTA}
																</Badge>
															)}
															{isAtual && (
																<Badge variant="success" className="text-xs px-2 py-0.5">
																	<CheckCircle2 className="h-3 w-3 mr-1" />
																	Atual
																</Badge>
															)}
														</div>
														<p className="text-sm font-medium text-foreground leading-relaxed pr-2">
															{cl.CLTR_DESCRICAO}
														</p>
													</div>
													{cl.ANXO_NUMERO && (
														<div className="flex items-start gap-2 pt-3 border-t bg-muted/30 -mx-1 px-3 py-2 rounded-md">
															<FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
															<div className="flex-1 min-w-0">
																<div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
																	<span className="font-semibold text-foreground">Anexo {cl.ANXO_NUMERO}</span>
																	{cl.ANXO_NUMERO_ITEM && (
																		<>
																			<span className="text-muted-foreground/60">•</span>
																			<span>Item {cl.ANXO_NUMERO_ITEM}</span>
																		</>
																	)}
																</div>
																{cl.ANXO_TEXTO_ITEM && (
																	<p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={cl.ANXO_TEXTO_ITEM}>
																		{cl.ANXO_TEXTO_ITEM}
																	</p>
																)}
															</div>
														</div>
													)}
												</div>
											</div>
										</Label>
									);
								})}
							</RadioGroup>
						</div>
					)}
				</div>

				<SheetFooter className="border-t px-6 py-4 mt-auto">
					<div className="flex items-center justify-between w-full gap-3">
						<div className="text-xs text-muted-foreground">
							{classificacaoSelecionada !== null ? (
								<span className="flex items-center gap-1.5">
									<CheckCircle2 className="h-3.5 w-3.5 text-primary" />
									<span>Classificação selecionada</span>
								</span>
							) : (
								<span className="flex items-center gap-1.5">
									<AlertCircle className="h-3.5 w-3.5" />
									<span>Selecione uma classificação acima</span>
								</span>
							)}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={updateMutation.isPending}
							>
								Cancelar
							</Button>
							<Button
								onClick={handleConfirmar}
								disabled={updateMutation.isPending || classificacaoSelecionada === null}
								className="min-w-[140px]"
							>
								{updateMutation.isPending ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Salvando...
									</>
								) : (
									<>
										<CheckCircle2 className="h-4 w-4 mr-2" />
										Confirmar
									</>
								)}
							</Button>
						</div>
					</div>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}